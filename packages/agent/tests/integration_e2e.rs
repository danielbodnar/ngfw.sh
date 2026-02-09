//! End-to-end integration tests
//!
//! Tests complete agent lifecycle including initialization, WebSocket connection,
//! authentication, command handling, metrics collection, mode transitions,
//! and graceful shutdown. These tests verify the entire system working together.

use ngfw_agent::config::{AgentConfig, AgentSection, ModeSection, AdaptersSection};
use ngfw_protocol::{AgentMode, MessageType, ModeConfig, RpcMessage};
use serde_json::json;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::sync::{mpsc, watch, Mutex};
use tokio::time::timeout;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};

/// Mock API server for E2E testing
struct MockApiServer {
    addr: SocketAddr,
    received_messages: Arc<Mutex<Vec<RpcMessage>>>,
}

impl MockApiServer {
    async fn new() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let received = Arc::new(Mutex::new(Vec::new()));
        let received_clone = received.clone();

        tokio::spawn(async move {
            if let Ok((stream, _)) = listener.accept().await {
                if let Ok(mut ws) = accept_async(stream).await {
                    // Handle AUTH
                    if let Some(Ok(Message::Text(text))) = ws.next().await {
                        let msg: RpcMessage = serde_json::from_str(&text).unwrap();
                        received_clone.lock().await.push(msg.clone());

                        if msg.msg_type == MessageType::Auth {
                            let response = RpcMessage::new(MessageType::AuthOk, json!({}));
                            ws.send(Message::Text(serde_json::to_string(&response).unwrap()))
                                .await
                                .ok();
                        }
                    }

                    // Handle STATUS
                    if let Some(Ok(Message::Text(text))) = ws.next().await {
                        let msg: RpcMessage = serde_json::from_str(&text).unwrap();
                        received_clone.lock().await.push(msg);
                    }

                    // Keep connection open for metrics
                    while let Some(Ok(Message::Text(text))) = ws.next().await {
                        if let Ok(msg) = serde_json::from_str::<RpcMessage>(&text) {
                            received_clone.lock().await.push(msg);
                        }
                    }
                }
            }
        });

        Self {
            addr,
            received_messages: received,
        }
    }

    fn url(&self) -> String {
        format!("ws://{}/agent/ws", self.addr)
    }

    async fn get_messages(&self) -> Vec<RpcMessage> {
        self.received_messages.lock().await.clone()
    }
}

#[tokio::test]
async fn test_e2e_agent_startup_and_shutdown() {
    let server = MockApiServer::new().await;

    let config = AgentConfig {
        agent: AgentSection {
            device_id: "e2e-test-001".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: server.url(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 1,
        },
        mode: ModeSection {
            default: "observe".to_string(),
        },
        adapters: AdaptersSection {
            iptables: true,
            dnsmasq: true,
            wifi: false,
            wireguard: false,
            system: true,
        },
    };

    let (outbound_tx, outbound_rx) = mpsc::channel(256);
    let (inbound_tx, inbound_rx) = mpsc::channel(256);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn all agent components
    let conn_task = tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::connection::connection_loop(config, outbound_rx, inbound_tx, shutdown)
                .await
        }
    });

    let disp_task = tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::dispatcher::dispatcher_loop(
                config,
                inbound_rx,
                outbound_tx.clone(),
                mode_tx,
                mode_rx,
                shutdown,
            )
            .await
        }
    });

    let coll_task = tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::collector::metrics_loop(config, outbound_tx, shutdown).await
        }
    });

    // Wait for agent to connect and send initial messages
    tokio::time::sleep(Duration::from_secs(2)).await;

    // Verify messages received by server
    let messages = server.get_messages().await;
    assert!(messages.len() >= 2, "Should have AUTH and STATUS");

    let has_auth = messages.iter().any(|m| m.msg_type == MessageType::Auth);
    let has_status = messages
        .iter()
        .any(|m| m.msg_type == MessageType::Status);

    assert!(has_auth, "Should have sent AUTH");
    assert!(has_status, "Should have sent STATUS");

    // Trigger shutdown
    shutdown_tx.send(true).unwrap();

    // All tasks should exit cleanly
    let results = timeout(
        Duration::from_secs(3),
        tokio::join!(conn_task, disp_task, coll_task),
    )
    .await;

    assert!(results.is_ok(), "All tasks should shut down cleanly");
}

#[tokio::test]
async fn test_e2e_metrics_collection_flow() {
    let server = MockApiServer::new().await;

    let config = AgentConfig {
        agent: AgentSection {
            device_id: "e2e-metrics-001".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: server.url(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 1,
        },
        mode: ModeSection {
            default: "observe".to_string(),
        },
        adapters: AdaptersSection {
            iptables: true,
            dnsmasq: true,
            wifi: false,
            wireguard: false,
            system: true,
        },
    };

    let (outbound_tx, outbound_rx) = mpsc::channel(256);
    let (inbound_tx, _inbound_rx) = mpsc::channel(256);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn connection and collector
    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::connection::connection_loop(config, outbound_rx, inbound_tx, shutdown)
                .await
        }
    });

    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::collector::metrics_loop(config, outbound_tx, shutdown).await
        }
    });

    // Wait for metrics to be collected and sent
    tokio::time::sleep(Duration::from_secs(4)).await;

    // Verify metrics messages received
    let messages = server.get_messages().await;
    let metrics_count = messages
        .iter()
        .filter(|m| m.msg_type == MessageType::Metrics)
        .count();

    assert!(
        metrics_count >= 2,
        "Should have received multiple metrics, got {}",
        metrics_count
    );
}

#[tokio::test]
async fn test_e2e_command_execution_flow() {
    let server = MockApiServer::new().await;

    let config = AgentConfig {
        agent: AgentSection {
            device_id: "e2e-exec-001".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: server.url(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 60, // Long interval to avoid metrics noise
        },
        mode: ModeSection {
            default: "shadow".to_string(),
        },
        adapters: AdaptersSection {
            iptables: true,
            dnsmasq: true,
            wifi: false,
            wireguard: false,
            system: true,
        },
    };

    let (outbound_tx, mut outbound_rx) = mpsc::channel(256);
    let (inbound_tx, inbound_rx) = mpsc::channel(256);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn dispatcher
    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::dispatcher::dispatcher_loop(
                config,
                inbound_rx,
                outbound_tx,
                mode_tx,
                mode_rx,
                shutdown,
            )
            .await
        }
    });

    // Send EXEC command
    let exec = RpcMessage::new(
        MessageType::Exec,
        json!({
            "command_id": "e2e-cmd-001",
            "command": "uptime",
            "args": null,
            "timeout_secs": 5
        }),
    );

    inbound_tx.send(exec).await.unwrap();

    // Wait for ExecResult
    let result = timeout(Duration::from_secs(7), async {
        while let Some(msg) = outbound_rx.recv().await {
            if msg.msg_type == MessageType::ExecResult {
                return Some(msg);
            }
        }
        None
    })
    .await;

    assert!(result.is_ok(), "Should receive ExecResult");
    let result_msg = result.unwrap();
    assert!(result_msg.is_some(), "ExecResult should be present");
}

#[tokio::test]
async fn test_e2e_mode_transition() {
    let server = MockApiServer::new().await;

    let config = AgentConfig {
        agent: AgentSection {
            device_id: "e2e-mode-001".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: server.url(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 60,
        },
        mode: ModeSection {
            default: "observe".to_string(),
        },
        adapters: AdaptersSection {
            iptables: true,
            dnsmasq: true,
            wifi: false,
            wireguard: false,
            system: true,
        },
    };

    let (outbound_tx, mut outbound_rx) = mpsc::channel(256);
    let (inbound_tx, inbound_rx) = mpsc::channel(256);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn dispatcher
    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::dispatcher::dispatcher_loop(
                config,
                inbound_rx,
                outbound_tx,
                mode_tx,
                mode_rx,
                shutdown,
            )
            .await
        }
    });

    // Send mode update
    let mode_update = RpcMessage::new(
        MessageType::ModeUpdate,
        json!({
            "mode_config": {
                "mode": "takeover",
                "section_overrides": null
            }
        }),
    );

    inbound_tx.send(mode_update).await.unwrap();

    // Wait for ModeAck
    let result = timeout(Duration::from_secs(2), async {
        while let Some(msg) = outbound_rx.recv().await {
            if msg.msg_type == MessageType::ModeAck {
                return Some(msg);
            }
        }
        None
    })
    .await;

    assert!(result.is_ok(), "Should receive ModeAck");
    let ack_msg = result.unwrap();
    assert!(ack_msg.is_some(), "ModeAck should be present");

    let ack = ack_msg.unwrap();
    assert_eq!(ack.payload["success"], true);
    assert_eq!(ack.payload["mode_config"]["mode"], "takeover");
}

#[tokio::test]
async fn test_e2e_config_push_workflow() {
    let server = MockApiServer::new().await;

    let config = AgentConfig {
        agent: AgentSection {
            device_id: "e2e-config-001".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: server.url(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 60,
        },
        mode: ModeSection {
            default: "shadow".to_string(),
        },
        adapters: AdaptersSection {
            iptables: true,
            dnsmasq: true,
            wifi: false,
            wireguard: false,
            system: true,
        },
    };

    let (outbound_tx, mut outbound_rx) = mpsc::channel(256);
    let (inbound_tx, inbound_rx) = mpsc::channel(256);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn dispatcher
    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::dispatcher::dispatcher_loop(
                config,
                inbound_rx,
                outbound_tx,
                mode_tx,
                mode_rx,
                shutdown,
            )
            .await
        }
    });

    // Send config push
    let config_push = RpcMessage::new(
        MessageType::ConfigPush,
        json!({
            "section": "firewall",
            "version": 10,
            "config": {
                "rules": [
                    {"chain": "INPUT", "action": "ACCEPT", "source": "192.168.1.0/24"}
                ]
            }
        }),
    );

    inbound_tx.send(config_push).await.unwrap();

    // Wait for ConfigAck
    let result = timeout(Duration::from_secs(2), async {
        while let Some(msg) = outbound_rx.recv().await {
            if msg.msg_type == MessageType::ConfigAck {
                return Some(msg);
            }
        }
        None
    })
    .await;

    assert!(result.is_ok(), "Should receive ConfigAck");
    let ack_msg = result.unwrap();
    assert!(ack_msg.is_some(), "ConfigAck should be present");

    let ack = ack_msg.unwrap();
    assert_eq!(ack.payload["success"], true);
    assert_eq!(ack.payload["version"], 10);
}

#[tokio::test]
async fn test_e2e_concurrent_operations() {
    let server = MockApiServer::new().await;

    let config = AgentConfig {
        agent: AgentSection {
            device_id: "e2e-concurrent-001".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: server.url(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 1,
        },
        mode: ModeSection {
            default: "shadow".to_string(),
        },
        adapters: AdaptersSection {
            iptables: true,
            dnsmasq: true,
            wifi: false,
            wireguard: false,
            system: true,
        },
    };

    let (outbound_tx, outbound_rx) = mpsc::channel(256);
    let (inbound_tx, inbound_rx) = mpsc::channel(256);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn all components
    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::connection::connection_loop(config, outbound_rx, inbound_tx, shutdown)
                .await
        }
    });

    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::dispatcher::dispatcher_loop(
                config,
                inbound_rx,
                outbound_tx.clone(),
                mode_tx,
                mode_rx,
                shutdown,
            )
            .await
        }
    });

    tokio::spawn({
        let config = config.clone();
        let shutdown = shutdown_rx.clone();
        async move {
            ngfw_agent::collector::metrics_loop(config, outbound_tx, shutdown).await
        }
    });

    // Wait for system to stabilize
    tokio::time::sleep(Duration::from_secs(3)).await;

    // Verify multiple types of messages received
    let messages = server.get_messages().await;

    let has_auth = messages.iter().any(|m| m.msg_type == MessageType::Auth);
    let has_status = messages
        .iter()
        .any(|m| m.msg_type == MessageType::Status);
    let has_metrics = messages
        .iter()
        .any(|m| m.msg_type == MessageType::Metrics);

    assert!(has_auth, "Should have AUTH");
    assert!(has_status, "Should have STATUS");
    assert!(has_metrics, "Should have METRICS");
}
