//! Durable Object for managing WebSocket connections with router agents
//!
//! This Durable Object handles:
//! - WebSocket connection lifecycle
//! - Authentication handshake
//! - Bidirectional message passing
//! - Status updates and metrics collection
//! - Command execution requests

use crate::models::rpc::*;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;
use worker::*;

/// State stored in the Durable Object
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct AgentState {
    device_id: Option<String>,
    owner_id: Option<String>,
    authenticated: bool,
    last_status: Option<StatusPayload>,
    last_seen: Option<i64>,
    pending_commands: HashMap<String, PendingCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PendingCommand {
    command_type: String,
    payload: Option<serde_json::Value>,
    created_at: i64,
}

/// Durable Object for managing agent connections
/// Uses RefCell for interior mutability since fetch takes &self in workers-rs 0.7+
#[durable_object]
pub struct AgentConnection {
    state: State,
    env: Env,
    websocket: RefCell<Option<WebSocket>>,
    agent_state: RefCell<AgentState>,
}

impl DurableObject for AgentConnection {
    fn new(state: State, env: Env) -> Self {
        Self {
            state,
            env,
            websocket: RefCell::new(None),
            agent_state: RefCell::new(AgentState::default()),
        }
    }

    async fn fetch(&self, req: Request) -> Result<Response> {
        let url = req.url()?;
        let path = url.path();

        match path {
            "/websocket" => self.handle_websocket(req).await,
            "/command" => self.handle_command(req).await,
            "/status" => self.handle_status_request().await,
            "/disconnect" => self.handle_disconnect().await,
            _ => Response::error("Not found", 404),
        }
    }
}

impl AgentConnection {
    /// Handle WebSocket upgrade and connection
    async fn handle_websocket(&self, req: Request) -> Result<Response> {
        // Load state from storage
        self.load_state().await?;

        // Parse query parameters
        let url = req.url()?;
        let params: HashMap<_, _> = url.query_pairs().collect();

        if let (Some(device_id), Some(owner_id)) = (params.get("device_id"), params.get("owner_id"))
        {
            let mut agent_state = self.agent_state.borrow_mut();
            agent_state.device_id = Some(device_id.to_string());
            agent_state.owner_id = Some(owner_id.to_string());
        }

        // Create WebSocket pair
        let pair = WebSocketPair::new()?;
        let server = pair.server;
        let client = pair.client;

        // Accept the WebSocket connection with hibernation
        server.accept()?;

        // Store the server socket
        *self.websocket.borrow_mut() = Some(server.clone());

        // Set up event handlers using hibernation API
        self.state.accept_web_socket(&server);

        // Save initial state
        self.save_state().await?;

        Response::from_websocket(client)
    }

    /// Handle incoming command from API
    async fn handle_command(&self, mut req: Request) -> Result<Response> {
        self.load_state().await?;

        {
            let agent_state = self.agent_state.borrow();
            if !agent_state.authenticated {
                return Response::error("Device not connected", 503);
            }
        }

        let websocket = self.websocket.borrow();
        let ws = match websocket.as_ref() {
            Some(ws) => ws,
            None => {
                return Response::error("Device not connected", 503);
            }
        };

        // Parse command
        let cmd: serde_json::Value = req.json().await?;
        let command_type = cmd
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("UNKNOWN");
        let payload = cmd.get("payload").cloned();

        // Create RPC message
        let msg_type = match command_type.to_uppercase().as_str() {
            "CONFIG_PUSH" => MessageType::ConfigPush,
            "CONFIG_FULL" => MessageType::ConfigFull,
            "EXEC" => MessageType::Exec,
            "REBOOT" => MessageType::Reboot,
            "UPGRADE" => MessageType::Upgrade,
            "STATUS_REQUEST" => MessageType::StatusRequest,
            "SHUTDOWN" => MessageType::Reboot, // Map shutdown to reboot for simplicity
            _ => MessageType::Exec,
        };

        let message = RpcMessage::new(msg_type, payload.clone().unwrap_or(serde_json::json!({})));
        let msg_id = message.id.clone();

        // Store pending command
        {
            let mut agent_state = self.agent_state.borrow_mut();
            agent_state.pending_commands.insert(
                msg_id.clone(),
                PendingCommand {
                    command_type: command_type.to_string(),
                    payload,
                    created_at: chrono::Utc::now().timestamp(),
                },
            );
        }

        // Send to device
        let msg_str = serde_json::to_string(&message)?;
        ws.send_with_str(&msg_str)?;

        self.save_state().await?;

        Response::from_json(&serde_json::json!({
            "status": "sent",
            "command_id": msg_id
        }))
    }

    /// Return current device status
    async fn handle_status_request(&self) -> Result<Response> {
        self.load_state().await?;

        let agent_state = self.agent_state.borrow();
        let status = serde_json::json!({
            "device_id": agent_state.device_id,
            "authenticated": agent_state.authenticated,
            "last_seen": agent_state.last_seen,
            "status": agent_state.last_status,
        });

        Response::from_json(&status)
    }

    /// Disconnect the WebSocket
    async fn handle_disconnect(&self) -> Result<Response> {
        {
            let websocket = self.websocket.borrow();
            if let Some(ws) = websocket.as_ref() {
                ws.close(Some(1000), Some("Disconnected by server"))?;
            }
        }

        {
            let mut agent_state = self.agent_state.borrow_mut();
            agent_state.authenticated = false;
        }
        *self.websocket.borrow_mut() = None;
        self.save_state().await?;

        Response::ok("Disconnected")
    }

    /// Process incoming WebSocket message
    async fn process_message(&self, msg: &str) -> Result<()> {
        let message: RpcMessage = serde_json::from_str(msg)?;

        match message.msg_type {
            MessageType::Auth => {
                self.handle_auth_message(&message).await?;
            }
            MessageType::Status => {
                self.handle_status_message(&message).await?;
            }
            MessageType::ConfigAck | MessageType::ConfigFail => {
                self.handle_config_response(&message).await?;
            }
            MessageType::ExecResult => {
                self.handle_exec_result(&message).await?;
            }
            MessageType::Log => {
                self.handle_log_message(&message).await?;
            }
            MessageType::Alert => {
                self.handle_alert_message(&message).await?;
            }
            MessageType::Metrics => {
                self.handle_metrics_message(&message).await?;
            }
            MessageType::Pong => {
                // Update last seen
                let mut agent_state = self.agent_state.borrow_mut();
                agent_state.last_seen = Some(chrono::Utc::now().timestamp());
            }
            _ => {
                console_log!("Unknown message type: {:?}", message.msg_type);
            }
        }

        self.save_state().await?;
        Ok(())
    }

    /// Handle authentication message from agent
    async fn handle_auth_message(&self, message: &RpcMessage) -> Result<()> {
        let auth: AuthRequest = serde_json::from_value(message.payload.clone())?;

        let is_valid = {
            let agent_state = self.agent_state.borrow();
            agent_state
                .device_id
                .as_ref()
                .map(|id| id == &auth.device_id)
                .unwrap_or(false)
        };

        let response = if is_valid {
            {
                let mut agent_state = self.agent_state.borrow_mut();
                agent_state.authenticated = true;
                agent_state.last_seen = Some(chrono::Utc::now().timestamp());
            }

            RpcMessage::new(
                MessageType::AuthOk,
                serde_json::json!({
                    "success": true,
                    "server_time": chrono::Utc::now().timestamp()
                }),
            )
        } else {
            RpcMessage::new(
                MessageType::AuthFail,
                serde_json::json!({
                    "success": false,
                    "error": "Invalid device credentials"
                }),
            )
        };

        self.send_message(&response)?;

        // Update device status in KV
        if is_valid {
            self.update_device_online_status(true).await?;
        }

        Ok(())
    }

    /// Handle status update from agent
    async fn handle_status_message(&self, message: &RpcMessage) -> Result<()> {
        let status: StatusPayload = serde_json::from_value(message.payload.clone())?;

        let device_id = {
            let mut agent_state = self.agent_state.borrow_mut();
            agent_state.last_status = Some(status.clone());
            agent_state.last_seen = Some(chrono::Utc::now().timestamp());
            agent_state.device_id.clone()
        };

        // Store status in KV for quick access
        if let Some(device_id) = device_id {
            let kv = self.env.kv("CONFIGS")?;
            let status_json = serde_json::to_string(&status)?;
            kv.put(&format!("status:{}", device_id), &status_json)?
                .expiration_ttl(300) // 5 minute TTL
                .execute()
                .await?;
        }

        // Send acknowledgment
        let response = RpcMessage::with_id(
            message.id.clone(),
            MessageType::StatusOk,
            serde_json::json!({}),
        );
        self.send_message(&response)?;

        Ok(())
    }

    /// Handle config acknowledgment/failure
    async fn handle_config_response(&self, message: &RpcMessage) -> Result<()> {
        // Remove from pending commands
        {
            let mut agent_state = self.agent_state.borrow_mut();
            agent_state.pending_commands.remove(&message.id);
        }

        // Log the result
        if message.msg_type == MessageType::ConfigFail {
            console_log!("Config push failed: {:?}", message.payload);
        }

        Ok(())
    }

    /// Handle command execution result
    async fn handle_exec_result(&self, message: &RpcMessage) -> Result<()> {
        let result: ExecResult = serde_json::from_value(message.payload.clone())?;

        let device_id = {
            let mut agent_state = self.agent_state.borrow_mut();
            // Remove from pending commands
            agent_state.pending_commands.remove(&result.command_id);
            agent_state.device_id.clone()
        };

        // Store result in KV for retrieval
        if let Some(device_id) = device_id {
            let kv = self.env.kv("CACHE")?;
            let result_json = serde_json::to_string(&result)?;
            kv.put(
                &format!("exec_result:{}:{}", device_id, result.command_id),
                &result_json,
            )?
            .expiration_ttl(3600) // 1 hour TTL
            .execute()
            .await?;
        }

        Ok(())
    }

    /// Handle log message from agent
    async fn handle_log_message(&self, message: &RpcMessage) -> Result<()> {
        let log: LogMessage = serde_json::from_value(message.payload.clone())?;

        // In production, forward to logging service (e.g., Loki)
        console_log!(
            "[{}] {}: {}",
            format!("{:?}", log.level),
            log.component,
            log.message
        );

        Ok(())
    }

    /// Handle security alert from agent
    async fn handle_alert_message(&self, message: &RpcMessage) -> Result<()> {
        let alert: AlertMessage = serde_json::from_value(message.payload.clone())?;

        let device_id = self.agent_state.borrow().device_id.clone();

        // Store alert in KV
        if let Some(device_id) = device_id {
            let kv = self.env.kv("CACHE")?;
            let alert_id = uuid::Uuid::new_v4().to_string();
            let alert_json = serde_json::to_string(&alert)?;

            kv.put(&format!("alert:{}:{}", device_id, alert_id), &alert_json)?
                .expiration_ttl(86400 * 7) // 7 day TTL
                .execute()
                .await?;

            // TODO: Trigger webhooks for business plan users
        }

        Ok(())
    }

    /// Handle metrics update from agent
    async fn handle_metrics_message(&self, message: &RpcMessage) -> Result<()> {
        let metrics: MetricsPayload = serde_json::from_value(message.payload.clone())?;

        let device_id = self.agent_state.borrow().device_id.clone();

        // Store metrics for time-series analysis
        if let Some(device_id) = device_id {
            let kv = self.env.kv("CACHE")?;
            let metrics_json = serde_json::to_string(&metrics)?;

            // Store with timestamp-based key for time series
            let ts = metrics.timestamp;
            kv.put(&format!("metrics:{}:{}", device_id, ts), &metrics_json)?
                .expiration_ttl(86400) // 24 hour TTL
                .execute()
                .await?;
        }

        {
            let mut agent_state = self.agent_state.borrow_mut();
            agent_state.last_seen = Some(chrono::Utc::now().timestamp());
        }
        Ok(())
    }

    /// Send a message to the connected WebSocket
    fn send_message(&self, message: &RpcMessage) -> Result<()> {
        let msg_str = serde_json::to_string(message)?;

        let websocket = self.websocket.borrow();
        if let Some(ws) = websocket.as_ref() {
            ws.send_with_str(&msg_str)?;
        }

        Ok(())
    }

    /// Update device online status in KV
    async fn update_device_online_status(&self, online: bool) -> Result<()> {
        let device_id = self.agent_state.borrow().device_id.clone();

        if let Some(device_id) = device_id {
            let kv = self.env.kv("DEVICES")?;
            let status = serde_json::json!({
                "online": online,
                "last_seen": chrono::Utc::now().timestamp()
            });

            kv.put(
                &format!("device_status:{}", device_id),
                &serde_json::to_string(&status)?,
            )?
            .execute()
            .await?;
        }
        Ok(())
    }

    /// Load state from Durable Object storage
    async fn load_state(&self) -> Result<()> {
        if let Some(state) = self.state.storage().get::<AgentState>("agent_state").await? {
            *self.agent_state.borrow_mut() = state;
        }
        Ok(())
    }

    /// Save state to Durable Object storage
    async fn save_state(&self) -> Result<()> {
        let agent_state = self.agent_state.borrow().clone();
        self.state
            .storage()
            .put("agent_state", &agent_state)
            .await?;
        Ok(())
    }
}

// Note: WebSocket event handlers (websocket_message, websocket_close, websocket_error)
// are automatically generated by the #[durable_object] macro in workers-rs 0.7+
// If you need custom handling, implement the DurableObjectWebSocket trait instead.
