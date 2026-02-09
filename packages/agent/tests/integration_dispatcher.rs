//! Integration tests for message dispatcher and command handling
//!
//! Tests agent state management, mode transitions, command execution,
//! config validation/application, and protocol compliance.

use ngfw_agent::config::AgentConfig;
use ngfw_protocol::{
    AgentMode, MessageType, ModeConfig, RpcMessage,
};
use serde_json::json;
use std::time::Duration;
use tokio::sync::{mpsc, watch};
use tokio::time::timeout;

/// Helper to create test config
fn test_config() -> AgentConfig {
    use ngfw_agent::config::{AgentSection, ModeSection, AdaptersSection};

    AgentConfig {
        agent: AgentSection {
            device_id: "test-device".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: "ws://localhost:8787/ws".to_string(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 5,
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
    }
}

#[tokio::test]
async fn test_dispatcher_ping_pong() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn dispatcher
    let dispatcher_task = tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send PING
    let ping = RpcMessage::new(MessageType::Ping, json!({}));
    inbound_tx.send(ping).await.unwrap();

    // Expect PONG
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive response")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::Pong);

    // Cleanup
    drop(inbound_tx);
    timeout(Duration::from_secs(1), dispatcher_task)
        .await
        .ok();
}

#[tokio::test]
async fn test_dispatcher_status_request() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send StatusRequest
    let request = RpcMessage::new(MessageType::StatusRequest, json!({}));
    inbound_tx.send(request).await.unwrap();

    // Expect Status response
    let response = timeout(Duration::from_secs(2), outbound_rx.recv())
        .await
        .expect("Should receive status")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::Status);

    // Verify status payload has expected fields
    let status = &response.payload;
    assert!(status.get("uptime").is_some());
    assert!(status.get("cpu").is_some());
    assert!(status.get("memory").is_some());
}

#[tokio::test]
async fn test_dispatcher_exec_command_allowed() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send diagnostic command (allowed in shadow mode)
    let exec = RpcMessage::new(
        MessageType::Exec,
        json!({
            "command_id": "cmd-001",
            "command": "uptime",
            "args": null,
            "timeout_secs": 5
        }),
    );
    inbound_tx.send(exec).await.unwrap();

    // Expect ExecResult
    let response = timeout(Duration::from_secs(7), outbound_rx.recv())
        .await
        .expect("Should receive result")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ExecResult);

    let result = &response.payload;
    assert_eq!(result["command_id"], "cmd-001");
    assert!(result["exit_code"].is_number());
}

#[tokio::test]
async fn test_dispatcher_exec_command_blocked_in_observe() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Try to execute diagnostic command in observe mode (should be denied)
    let exec = RpcMessage::new(
        MessageType::Exec,
        json!({
            "command_id": "cmd-002",
            "command": "ls",
            "args": ["/tmp"],
            "timeout_secs": 5
        }),
    );
    inbound_tx.send(exec).await.unwrap();

    // Expect ExecResult with error
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive result")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ExecResult);

    let result = &response.payload;
    assert_eq!(result["command_id"], "cmd-002");
    assert_eq!(result["exit_code"], -1);
    assert!(result["stderr"]
        .as_str()
        .unwrap()
        .contains("Diagnostics require at least shadow mode"));
}

#[tokio::test]
async fn test_dispatcher_exec_command_not_in_allowlist() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Takeover,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Try to execute command not in allowlist
    let exec = RpcMessage::new(
        MessageType::Exec,
        json!({
            "command_id": "cmd-003",
            "command": "rm",
            "args": ["-rf", "/"],
            "timeout_secs": 5
        }),
    );
    inbound_tx.send(exec).await.unwrap();

    // Expect ExecResult with blocked error
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive result")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ExecResult);

    let result = &response.payload;
    assert_eq!(result["command_id"], "cmd-003");
    assert_eq!(result["exit_code"], -1);
    assert!(result["stderr"]
        .as_str()
        .unwrap()
        .contains("not in the allowlist"));
}

#[tokio::test]
async fn test_dispatcher_config_push_observe_mode() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send ConfigPush in observe mode
    let config_push = RpcMessage::new(
        MessageType::ConfigPush,
        json!({
            "section": "firewall",
            "version": 1,
            "config": {
                "rules": []
            }
        }),
    );
    inbound_tx.send(config_push).await.unwrap();

    // Expect ConfigAck (config received but not applied)
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive ack")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ConfigAck);

    let ack = &response.payload;
    assert_eq!(ack["section"], "firewall");
    assert_eq!(ack["version"], 1);
    assert_eq!(ack["success"], true);
}

#[tokio::test]
async fn test_dispatcher_config_push_shadow_mode_validation() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send valid config
    let config_push = RpcMessage::new(
        MessageType::ConfigPush,
        json!({
            "section": "firewall",
            "version": 2,
            "config": {
                "rules": []
            }
        }),
    );
    inbound_tx.send(config_push).await.unwrap();

    // Expect ConfigAck after validation
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive ack")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ConfigAck);
    assert_eq!(response.payload["success"], true);
}

#[tokio::test]
async fn test_dispatcher_config_push_shadow_mode_invalid() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send invalid config (null payload)
    let config_push = RpcMessage::new(
        MessageType::ConfigPush,
        json!({
            "section": "firewall",
            "version": 3,
            "config": null
        }),
    );
    inbound_tx.send(config_push).await.unwrap();

    // Expect ConfigFail
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive fail")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ConfigFail);
    assert_eq!(response.payload["success"], false);
    assert!(response.payload["error"].as_str().unwrap().len() > 0);
}

#[tokio::test]
async fn test_dispatcher_config_push_takeover_mode() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Takeover,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send config in takeover mode (should be applied)
    let config_push = RpcMessage::new(
        MessageType::ConfigPush,
        json!({
            "section": "firewall",
            "version": 4,
            "config": {
                "rules": [
                    {"action": "ACCEPT", "source": "192.168.1.0/24"}
                ]
            }
        }),
    );
    inbound_tx.send(config_push).await.unwrap();

    // Expect ConfigAck after apply
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive ack")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ConfigAck);
    assert_eq!(response.payload["success"], true);
    assert_eq!(response.payload["version"], 4);
}

#[tokio::test]
async fn test_dispatcher_mode_update() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Send mode update to shadow
    let mode_update = RpcMessage::new(
        MessageType::ModeUpdate,
        json!({
            "mode_config": {
                "mode": "shadow",
                "section_overrides": null
            }
        }),
    );
    inbound_tx.send(mode_update).await.unwrap();

    // Expect ModeAck
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive ack")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::ModeAck);
    assert_eq!(response.payload["success"], true);
    assert_eq!(response.payload["mode_config"]["mode"], "shadow");
}

#[tokio::test]
async fn test_dispatcher_reboot_denied_in_observe() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Try to reboot in observe mode
    let reboot = RpcMessage::new(MessageType::Reboot, json!({}));
    inbound_tx.send(reboot).await.unwrap();

    // Expect error response
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive response")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::Error);
    assert!(response.payload["error"]
        .as_str()
        .unwrap()
        .contains("takeover mode"));
}

#[tokio::test]
async fn test_dispatcher_upgrade_denied_in_shadow() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Shadow,
        section_overrides: Default::default(),
    });
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Try to upgrade in shadow mode
    let upgrade = RpcMessage::new(
        MessageType::Upgrade,
        json!({
            "version": "0.2.0",
            "download_url": "https://example.com/agent",
            "checksum": "sha256:abc123"
        }),
    );
    inbound_tx.send(upgrade).await.unwrap();

    // Expect error response
    let response = timeout(Duration::from_millis(500), outbound_rx.recv())
        .await
        .expect("Should receive response")
        .expect("Channel should not be closed");

    assert_eq!(response.msg_type, MessageType::Error);
    assert!(response.payload["error"]
        .as_str()
        .unwrap()
        .contains("takeover mode"));
}

#[tokio::test]
async fn test_dispatcher_shutdown_cleanup() {
    let config = test_config();
    let (inbound_tx, inbound_rx) = mpsc::channel(10);
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (mode_tx, mode_rx) = watch::channel(ModeConfig {
        mode: AgentMode::Observe,
        section_overrides: Default::default(),
    });
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    let dispatcher_task = tokio::spawn(ngfw_agent::dispatcher::dispatcher_loop(
        config,
        inbound_rx,
        outbound_tx,
        mode_tx,
        mode_rx,
        shutdown_rx,
    ));

    // Give dispatcher time to start
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Trigger shutdown
    shutdown_tx.send(true).unwrap();

    // Dispatcher should exit cleanly
    let result = timeout(Duration::from_secs(1), dispatcher_task).await;
    assert!(result.is_ok(), "Dispatcher should shut down cleanly");
}
