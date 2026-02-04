//! WebSocket client with auth handshake, reconnection, and keepalive

use futures_util::{SinkExt, StreamExt};
use ngfw_protocol::{AuthRequest, MessageType, RpcMessage, StatusPayload};
use tokio::sync::{mpsc, watch};
use tokio::time::{Duration, sleep, timeout};
use tokio_tungstenite::tungstenite::Message;
use tracing::{debug, error, info, warn};
use url::Url;

use crate::config::AgentConfig;

/// Maximum reconnection backoff
const MAX_BACKOFF: Duration = Duration::from_secs(60);
/// Keepalive ping interval
const PING_INTERVAL: Duration = Duration::from_secs(30);
/// Auth handshake timeout
const AUTH_TIMEOUT: Duration = Duration::from_secs(10);

/// Main connection loop — connects, authenticates, and routes messages.
/// Reconnects with exponential backoff on disconnection.
pub async fn connection_loop(
    config: AgentConfig,
    mut outbound_rx: mpsc::Receiver<RpcMessage>,
    inbound_tx: mpsc::Sender<RpcMessage>,
    mut shutdown: watch::Receiver<bool>,
) {
    let mut backoff = Duration::from_secs(1);

    loop {
        if *shutdown.borrow() {
            info!("Connection loop shutting down");
            return;
        }

        // Build WebSocket URL with query params
        let ws_url = format!(
            "{}?device_id={}&owner_id={}",
            config.agent.websocket_url, config.agent.device_id, config.agent.device_id
        );

        info!("Connecting to {}", config.agent.websocket_url);

        match connect_and_run(
            &ws_url,
            &config,
            &mut outbound_rx,
            &inbound_tx,
            &mut shutdown,
        )
        .await
        {
            Ok(()) => {
                info!("Connection closed cleanly");
                backoff = Duration::from_secs(1); // Reset on clean close
            }
            Err(e) => {
                error!("Connection error: {}", e);
            }
        }

        if *shutdown.borrow() {
            return;
        }

        warn!("Reconnecting in {:?}", backoff);
        tokio::select! {
            _ = sleep(backoff) => {}
            _ = shutdown.changed() => { return; }
        }

        // Exponential backoff: 1s → 2s → 4s → ... → 60s max
        backoff = (backoff * 2).min(MAX_BACKOFF);
    }
}

async fn connect_and_run(
    ws_url: &str,
    config: &AgentConfig,
    outbound_rx: &mut mpsc::Receiver<RpcMessage>,
    inbound_tx: &mpsc::Sender<RpcMessage>,
    shutdown: &mut watch::Receiver<bool>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Validate URL format, then pass the string to connect_async
    let _url = Url::parse(ws_url)?;
    let (ws_stream, _response) = tokio_tungstenite::connect_async(ws_url).await?;
    let (mut ws_tx, mut ws_rx) = ws_stream.split();

    info!("WebSocket connected, sending auth...");

    // Send AUTH message
    let auth_msg = RpcMessage::new(
        MessageType::Auth,
        serde_json::to_value(AuthRequest {
            device_id: config.agent.device_id.clone(),
            api_key: config.agent.api_key.clone(),
            firmware_version: "unknown".to_string(), // TODO: read from nvram
        })?,
    );
    let auth_json = serde_json::to_string(&auth_msg)?;
    ws_tx.send(Message::Text(auth_json.into())).await?;

    // Wait for AUTH_OK / AUTH_FAIL with timeout
    let auth_result = timeout(AUTH_TIMEOUT, async {
        while let Some(msg) = ws_rx.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(rpc) = serde_json::from_str::<RpcMessage>(&text) {
                        match rpc.msg_type {
                            MessageType::AuthOk => return Ok(()),
                            MessageType::AuthFail => {
                                let err = rpc
                                    .payload
                                    .get("error")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown");
                                return Err(format!("Auth failed: {}", err));
                            }
                            _ => {
                                debug!("Ignoring pre-auth message: {:?}", rpc.msg_type);
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => return Err("Connection closed during auth".to_string()),
                Err(e) => return Err(format!("WebSocket error during auth: {}", e)),
                _ => {} // Ignore ping/pong/binary during auth
            }
        }
        Err("Connection closed before auth response".to_string())
    })
    .await;

    match auth_result {
        Ok(Ok(())) => info!("Authenticated successfully"),
        Ok(Err(e)) => return Err(e.into()),
        Err(_) => return Err("Auth handshake timed out".into()),
    }

    // Send initial STATUS
    let status_msg = RpcMessage::new(
        MessageType::Status,
        serde_json::to_value(StatusPayload {
            uptime: 0, // TODO: read actual uptime
            cpu: 0.0,
            memory: 0.0,
            temperature: None,
            load: [0.0, 0.0, 0.0],
            interfaces: vec![],
            connections: 0,
            wan_ip: None,
            firmware: "unknown".to_string(),
        })?,
    );
    let status_json = serde_json::to_string(&status_msg)?;
    ws_tx.send(Message::Text(status_json.into())).await?;

    info!("Entering message loop");

    let mut ping_interval = tokio::time::interval(PING_INTERVAL);
    ping_interval.tick().await; // Skip first immediate tick

    // Main message loop
    loop {
        tokio::select! {
            // Incoming message from server
            msg = ws_rx.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<RpcMessage>(&text) {
                            Ok(rpc) => {
                                if inbound_tx.send(rpc).await.is_err() {
                                    warn!("Dispatcher channel closed");
                                    return Ok(());
                                }
                            }
                            Err(e) => {
                                warn!("Failed to parse RPC message: {}", e);
                            }
                        }
                    }
                    Some(Ok(Message::Ping(data))) => {
                        ws_tx.send(Message::Pong(data)).await?;
                    }
                    Some(Ok(Message::Close(_))) => {
                        info!("Server closed connection");
                        return Ok(());
                    }
                    Some(Err(e)) => {
                        return Err(format!("WebSocket error: {}", e).into());
                    }
                    None => {
                        return Ok(());
                    }
                    _ => {} // Ignore binary, pong
                }
            }

            // Outbound message from agent internals (metrics, logs, etc.)
            msg = outbound_rx.recv() => {
                match msg {
                    Some(rpc) => {
                        let json = serde_json::to_string(&rpc)?;
                        ws_tx.send(Message::Text(json.into())).await?;
                    }
                    None => {
                        info!("Outbound channel closed");
                        return Ok(());
                    }
                }
            }

            // Keepalive ping
            _ = ping_interval.tick() => {
                let ping_msg = RpcMessage::new(
                    MessageType::Ping,
                    serde_json::json!({}),
                );
                let json = serde_json::to_string(&ping_msg)?;
                ws_tx.send(Message::Text(json.into())).await?;
            }

            // Shutdown signal
            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    info!("Shutdown signal received, closing WebSocket");
                    ws_tx.close().await?;
                    return Ok(());
                }
            }
        }
    }
}
