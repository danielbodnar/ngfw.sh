//! NGFW.sh Protocol — shared RPC types for agent-server communication
//!
//! This crate provides the canonical definitions for all message types
//! exchanged over WebSocket between the router agent and the cloud API.
//! Both `ngfw-api` (WASM) and `ngfw-agent` (native) depend on this crate.
//!
//! All types implement [`utoipa::ToSchema`] for automatic OpenAPI 3.1 schema generation.

pub mod agent;
pub mod fleet;
pub mod rpc;
pub mod system;

pub use agent::*;
pub use fleet::*;
pub use rpc::*;
pub use system::*;

// Re-export utoipa for downstream crates
pub use utoipa;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};
    use std::collections::HashMap;

    // ─── 1. RpcMessage serialization roundtrip ───────────────────────────

    #[test]
    fn rpc_message_roundtrip() {
        let msg = RpcMessage::with_id(
            "test-id-001".to_string(),
            MessageType::StatusRequest,
            json!({"device_id": "dev-42"}),
        );

        let serialized = serde_json::to_string(&msg).unwrap();
        let deserialized: RpcMessage = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.id, "test-id-001");
        assert_eq!(deserialized.msg_type, MessageType::StatusRequest);
        assert_eq!(deserialized.payload, json!({"device_id": "dev-42"}));
    }

    #[test]
    fn rpc_message_type_field_renamed_to_type() {
        let msg = RpcMessage::with_id("id-1".to_string(), MessageType::Ping, Value::Null);
        let v: Value = serde_json::to_value(&msg).unwrap();
        assert!(
            v.get("type").is_some(),
            "field should be serialized as 'type'"
        );
        assert!(
            v.get("msg_type").is_none(),
            "field should NOT appear as 'msg_type'"
        );
    }

    // ─── 2. MessageType SCREAMING_SNAKE_CASE serde ──────────────────────

    #[test]
    fn message_type_serde_screaming_snake_case() {
        let cases: Vec<(MessageType, &str)> = vec![
            (MessageType::ConfigPush, "\"CONFIG_PUSH\""),
            (MessageType::ConfigFull, "\"CONFIG_FULL\""),
            (MessageType::Exec, "\"EXEC\""),
            (MessageType::Reboot, "\"REBOOT\""),
            (MessageType::Upgrade, "\"UPGRADE\""),
            (MessageType::StatusRequest, "\"STATUS_REQUEST\""),
            (MessageType::Ping, "\"PING\""),
            (MessageType::ModeUpdate, "\"MODE_UPDATE\""),
            (MessageType::Auth, "\"AUTH\""),
            (MessageType::AuthOk, "\"AUTH_OK\""),
            (MessageType::AuthFail, "\"AUTH_FAIL\""),
            (MessageType::Status, "\"STATUS\""),
            (MessageType::StatusOk, "\"STATUS_OK\""),
            (MessageType::ConfigAck, "\"CONFIG_ACK\""),
            (MessageType::ConfigFail, "\"CONFIG_FAIL\""),
            (MessageType::ExecResult, "\"EXEC_RESULT\""),
            (MessageType::Log, "\"LOG\""),
            (MessageType::Alert, "\"ALERT\""),
            (MessageType::Metrics, "\"METRICS\""),
            (MessageType::Pong, "\"PONG\""),
            (MessageType::ModeAck, "\"MODE_ACK\""),
            (MessageType::Error, "\"ERROR\""),
        ];

        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(
                &serialized, expected_json,
                "MessageType::{variant:?} serialized to {serialized}, expected {expected_json}"
            );
            let deserialized: MessageType = serde_json::from_str(expected_json).unwrap();
            assert_eq!(
                &deserialized, variant,
                "failed to deserialize {expected_json} back to {variant:?}"
            );
        }
    }

    // ─── 3. ConfigSection lowercase serde ────────────────────────────────

    #[test]
    fn config_section_serde_lowercase() {
        let cases: Vec<(ConfigSection, &str)> = vec![
            (ConfigSection::Wan, "\"wan\""),
            (ConfigSection::Lan, "\"lan\""),
            (ConfigSection::Wifi, "\"wifi\""),
            (ConfigSection::Dhcp, "\"dhcp\""),
            (ConfigSection::Firewall, "\"firewall\""),
            (ConfigSection::Nat, "\"nat\""),
            (ConfigSection::Dns, "\"dns\""),
            (ConfigSection::Ids, "\"ids\""),
            (ConfigSection::Vpn, "\"vpn\""),
            (ConfigSection::Qos, "\"qos\""),
            (ConfigSection::System, "\"system\""),
            (ConfigSection::Full, "\"full\""),
        ];

        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(
                &serialized, expected_json,
                "ConfigSection::{variant:?} serialized to {serialized}, expected {expected_json}"
            );
            let deserialized: ConfigSection = serde_json::from_str(expected_json).unwrap();
            assert_eq!(
                &deserialized, variant,
                "failed to deserialize {expected_json} back to {variant:?}"
            );
        }
    }

    // ─── 4. AgentMode lowercase serde ────────────────────────────────────

    #[test]
    fn agent_mode_serde_lowercase() {
        let cases: Vec<(AgentMode, &str)> = vec![
            (AgentMode::Observe, "\"observe\""),
            (AgentMode::Shadow, "\"shadow\""),
            (AgentMode::Takeover, "\"takeover\""),
        ];

        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(
                &serialized, expected_json,
                "AgentMode::{variant:?} serialized to {serialized}, expected {expected_json}"
            );
            let deserialized: AgentMode = serde_json::from_str(expected_json).unwrap();
            assert_eq!(
                &deserialized, variant,
                "failed to deserialize {expected_json} back to {variant:?}"
            );
        }
    }

    // ─── 5. ModeConfig effective_mode with section overrides ─────────────

    #[test]
    fn mode_config_effective_mode_uses_override() {
        let mut overrides = HashMap::new();
        overrides.insert(ConfigSection::Firewall, AgentMode::Takeover);
        overrides.insert(ConfigSection::Wifi, AgentMode::Shadow);

        let cfg = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: overrides,
        };

        // Overridden sections return their override
        assert_eq!(
            cfg.effective_mode(&ConfigSection::Firewall),
            &AgentMode::Takeover
        );
        assert_eq!(cfg.effective_mode(&ConfigSection::Wifi), &AgentMode::Shadow);

        // Non-overridden sections fall back to the base mode
        assert_eq!(cfg.effective_mode(&ConfigSection::Dns), &AgentMode::Observe);
        assert_eq!(cfg.effective_mode(&ConfigSection::Lan), &AgentMode::Observe);
    }

    // ─── 6. ModeConfig default ───────────────────────────────────────────

    #[test]
    fn mode_config_default_is_observe_with_empty_overrides() {
        let cfg = ModeConfig::default();
        assert_eq!(cfg.mode, AgentMode::Observe);
        assert!(cfg.section_overrides.is_empty());
    }

    #[test]
    fn agent_mode_default_is_observe() {
        assert_eq!(AgentMode::default(), AgentMode::Observe);
    }

    // ─── 7. ConfigPush roundtrip ─────────────────────────────────────────

    #[test]
    fn config_push_roundtrip() {
        let push = ConfigPush {
            section: ConfigSection::Firewall,
            config: json!({
                "default_policy": "deny",
                "rules": [
                    {"action": "allow", "port": 443, "proto": "tcp"}
                ]
            }),
            version: 17,
        };

        let serialized = serde_json::to_string(&push).unwrap();
        let deserialized: ConfigPush = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.section, ConfigSection::Firewall);
        assert_eq!(deserialized.version, 17);
        assert_eq!(deserialized.config["default_policy"], json!("deny"));
        assert_eq!(deserialized.config["rules"][0]["port"], json!(443));
    }

    #[test]
    fn config_push_section_serialized_lowercase() {
        let push = ConfigPush {
            section: ConfigSection::Wan,
            config: json!({}),
            version: 1,
        };
        let v: Value = serde_json::to_value(&push).unwrap();
        assert_eq!(v["section"], json!("wan"));
    }

    // ─── 8. MetricsPayload roundtrip ─────────────────────────────────────

    #[test]
    fn metrics_payload_roundtrip() {
        let mut interfaces = HashMap::new();
        interfaces.insert(
            "eth0".to_string(),
            InterfaceRates {
                rx_rate: 125_000,
                tx_rate: 42_000,
            },
        );
        interfaces.insert(
            "wlan0".to_string(),
            InterfaceRates {
                rx_rate: 80_000,
                tx_rate: 15_000,
            },
        );

        let payload = MetricsPayload {
            timestamp: 1_700_000_000,
            cpu: 42.5,
            memory: 68.2,
            temperature: Some(55.0),
            interfaces,
            connections: ConnectionCounts {
                total: 150,
                tcp: 120,
                udp: 30,
            },
            dns: DnsMetrics {
                queries: 10_000,
                blocked: 350,
                cached: 4_200,
            },
        };

        let serialized = serde_json::to_string(&payload).unwrap();
        let deserialized: MetricsPayload = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.timestamp, 1_700_000_000);
        assert!((deserialized.cpu - 42.5).abs() < f32::EPSILON);
        assert!((deserialized.memory - 68.2).abs() < f32::EPSILON);
        assert_eq!(deserialized.temperature, Some(55.0));
        assert_eq!(deserialized.interfaces.len(), 2);
        assert_eq!(deserialized.interfaces["eth0"].rx_rate, 125_000);
        assert_eq!(deserialized.interfaces["wlan0"].tx_rate, 15_000);
        assert_eq!(deserialized.connections.total, 150);
        assert_eq!(deserialized.connections.tcp, 120);
        assert_eq!(deserialized.connections.udp, 30);
        assert_eq!(deserialized.dns.queries, 10_000);
        assert_eq!(deserialized.dns.blocked, 350);
        assert_eq!(deserialized.dns.cached, 4_200);
    }

    #[test]
    fn metrics_payload_temperature_none_omitted() {
        let payload = MetricsPayload {
            timestamp: 0,
            cpu: 0.0,
            memory: 0.0,
            temperature: None,
            interfaces: HashMap::new(),
            connections: ConnectionCounts {
                total: 0,
                tcp: 0,
                udp: 0,
            },
            dns: DnsMetrics {
                queries: 0,
                blocked: 0,
                cached: 0,
            },
        };
        let v: Value = serde_json::to_value(&payload).unwrap();
        assert!(
            v.get("temperature").is_none(),
            "temperature=None should be omitted"
        );
    }

    // ─── 9. AlertType snake_case variants ────────────────────────────────

    #[test]
    fn alert_type_serde_snake_case() {
        let cases: Vec<(AlertType, &str)> = vec![
            (AlertType::IntrusionAttempt, "\"intrusion_attempt\""),
            (AlertType::MalwareDetected, "\"malware_detected\""),
            (AlertType::BruteForce, "\"brute_force\""),
            (AlertType::PortScan, "\"port_scan\""),
            (AlertType::DdosAttempt, "\"ddos_attempt\""),
            (AlertType::PolicyViolation, "\"policy_violation\""),
            (AlertType::ConfigChange, "\"config_change\""),
            (AlertType::SystemAnomaly, "\"system_anomaly\""),
        ];

        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(
                &serialized, expected_json,
                "AlertType::{variant:?} serialized to {serialized}, expected {expected_json}"
            );
            let deserialized: AlertType = serde_json::from_str(expected_json).unwrap();
            assert_eq!(
                &deserialized, variant,
                "failed to deserialize {expected_json} back to {variant:?}"
            );
        }
    }

    // ─── 10. DeviceStatus lowercase variants ─────────────────────────────

    #[test]
    fn device_status_serde_lowercase() {
        let cases: Vec<(DeviceStatus, &str)> = vec![
            (DeviceStatus::Online, "\"online\""),
            (DeviceStatus::Offline, "\"offline\""),
            (DeviceStatus::Updating, "\"updating\""),
            (DeviceStatus::Error, "\"error\""),
            (DeviceStatus::Provisioning, "\"provisioning\""),
        ];

        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(
                &serialized, expected_json,
                "DeviceStatus::{variant:?} serialized to {serialized}, expected {expected_json}"
            );
            let deserialized: DeviceStatus = serde_json::from_str(expected_json).unwrap();
            assert_eq!(
                &deserialized, variant,
                "failed to deserialize {expected_json} back to {variant:?}"
            );
        }
    }

    // ─── 11. UpgradeCommand force defaults to false ──────────────────────

    #[test]
    fn upgrade_command_force_defaults_to_false() {
        let json_str = r#"{
            "version": "2.1.0",
            "download_url": "https://fw.ngfw.sh/2.1.0.bin",
            "checksum": "sha256:abc123",
            "signature": "sig-xyz"
        }"#;
        let cmd: UpgradeCommand = serde_json::from_str(json_str).unwrap();
        assert!(!cmd.force, "force should default to false when missing");
    }

    #[test]
    fn upgrade_command_force_true_when_set() {
        let json_str = r#"{
            "version": "2.1.0",
            "download_url": "https://fw.ngfw.sh/2.1.0.bin",
            "checksum": "sha256:abc123",
            "signature": "sig-xyz",
            "force": true
        }"#;
        let cmd: UpgradeCommand = serde_json::from_str(json_str).unwrap();
        assert!(cmd.force, "force should be true when explicitly set");
    }

    #[test]
    fn upgrade_command_roundtrip() {
        let cmd = UpgradeCommand {
            version: "3.0.0".to_string(),
            download_url: "https://fw.ngfw.sh/3.0.0.bin".to_string(),
            checksum: "sha256:deadbeef".to_string(),
            signature: "sig-abc".to_string(),
            force: true,
        };
        let serialized = serde_json::to_string(&cmd).unwrap();
        let deserialized: UpgradeCommand = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.version, "3.0.0");
        assert!(deserialized.force);
    }

    // ─── 12. ExecCommand optional fields ─────────────────────────────────

    #[test]
    fn exec_command_optional_fields_none() {
        let json_str = r#"{
            "command_id": "cmd-001",
            "command": "uname -a"
        }"#;
        let cmd: ExecCommand = serde_json::from_str(json_str).unwrap();
        assert_eq!(cmd.command_id, "cmd-001");
        assert_eq!(cmd.command, "uname -a");
        assert!(cmd.args.is_none());
        assert!(cmd.timeout_secs.is_none());
    }

    #[test]
    fn exec_command_optional_fields_present() {
        let json_str = r#"{
            "command_id": "cmd-002",
            "command": "iptables",
            "args": ["-L", "-n", "-v"],
            "timeout_secs": 30
        }"#;
        let cmd: ExecCommand = serde_json::from_str(json_str).unwrap();
        assert_eq!(cmd.args.as_ref().unwrap().len(), 3);
        assert_eq!(cmd.args.as_ref().unwrap()[0], "-L");
        assert_eq!(cmd.timeout_secs, Some(30));
    }

    #[test]
    fn exec_command_none_fields_omitted_in_serialization() {
        let cmd = ExecCommand {
            command_id: "cmd-003".to_string(),
            command: "whoami".to_string(),
            args: None,
            timeout_secs: None,
        };
        let v: Value = serde_json::to_value(&cmd).unwrap();
        assert!(v.get("args").is_none(), "args=None should be omitted");
        assert!(
            v.get("timeout_secs").is_none(),
            "timeout_secs=None should be omitted"
        );
    }

    // ─── Additional coverage: complex nested roundtrips ──────────────────

    #[test]
    fn rpc_message_with_config_push_payload() {
        let push = ConfigPush {
            section: ConfigSection::Dns,
            config: json!({"upstream": ["1.1.1.1", "8.8.8.8"]}),
            version: 5,
        };
        let msg = RpcMessage::with_id(
            "msg-42".to_string(),
            MessageType::ConfigPush,
            serde_json::to_value(&push).unwrap(),
        );

        let serialized = serde_json::to_string(&msg).unwrap();
        let deserialized: RpcMessage = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.msg_type, MessageType::ConfigPush);
        let inner: ConfigPush = serde_json::from_value(deserialized.payload).unwrap();
        assert_eq!(inner.section, ConfigSection::Dns);
        assert_eq!(inner.version, 5);
    }

    #[test]
    fn rpc_message_with_alert_payload() {
        let alert = AlertMessage {
            timestamp: 1_700_000_000,
            severity: AlertSeverity::High,
            alert_type: AlertType::IntrusionAttempt,
            source: "192.168.1.100".to_string(),
            description: "SSH brute force detected".to_string(),
            details: Some(json!({"attempts": 50})),
        };
        let msg = RpcMessage::with_id(
            "msg-alert-1".to_string(),
            MessageType::Alert,
            serde_json::to_value(&alert).unwrap(),
        );

        let serialized = serde_json::to_string(&msg).unwrap();
        let deserialized: RpcMessage = serde_json::from_str(&serialized).unwrap();
        let inner: AlertMessage = serde_json::from_value(deserialized.payload).unwrap();
        assert_eq!(inner.alert_type, AlertType::IntrusionAttempt);
        assert_eq!(inner.severity, AlertSeverity::High);
    }

    #[test]
    fn mode_config_roundtrip_with_overrides() {
        let mut overrides = HashMap::new();
        overrides.insert(ConfigSection::Firewall, AgentMode::Takeover);
        overrides.insert(ConfigSection::Dns, AgentMode::Shadow);

        let cfg = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: overrides,
        };

        let serialized = serde_json::to_string(&cfg).unwrap();
        let deserialized: ModeConfig = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.mode, AgentMode::Observe);
        assert_eq!(deserialized.section_overrides.len(), 2);
        assert_eq!(
            deserialized.effective_mode(&ConfigSection::Firewall),
            &AgentMode::Takeover,
        );
        assert_eq!(
            deserialized.effective_mode(&ConfigSection::Dns),
            &AgentMode::Shadow,
        );
        assert_eq!(
            deserialized.effective_mode(&ConfigSection::Wan),
            &AgentMode::Observe,
        );
    }

    #[test]
    fn mode_config_section_overrides_defaults_to_empty() {
        let json_str = r#"{"mode": "observe"}"#;
        let cfg: ModeConfig = serde_json::from_str(json_str).unwrap();
        assert_eq!(cfg.mode, AgentMode::Observe);
        assert!(cfg.section_overrides.is_empty());
    }

    #[test]
    fn log_level_serde_lowercase() {
        let cases: Vec<(LogLevel, &str)> = vec![
            (LogLevel::Debug, "\"debug\""),
            (LogLevel::Info, "\"info\""),
            (LogLevel::Warn, "\"warn\""),
            (LogLevel::Error, "\"error\""),
            (LogLevel::Critical, "\"critical\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: LogLevel = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    #[test]
    fn alert_severity_serde_lowercase() {
        let cases: Vec<(AlertSeverity, &str)> = vec![
            (AlertSeverity::Low, "\"low\""),
            (AlertSeverity::Medium, "\"medium\""),
            (AlertSeverity::High, "\"high\""),
            (AlertSeverity::Critical, "\"critical\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: AlertSeverity = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    #[test]
    fn interface_info_status_serde() {
        let cases: Vec<(InterfaceInfoStatus, &str)> = vec![
            (InterfaceInfoStatus::Up, "\"up\""),
            (InterfaceInfoStatus::Down, "\"down\""),
            (InterfaceInfoStatus::Unknown, "\"unknown\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: InterfaceInfoStatus = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    #[test]
    fn firmware_channel_serde() {
        let cases: Vec<(FirmwareChannel, &str)> = vec![
            (FirmwareChannel::Stable, "\"stable\""),
            (FirmwareChannel::Beta, "\"beta\""),
            (FirmwareChannel::Nightly, "\"nightly\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: FirmwareChannel = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    #[test]
    fn command_type_serde_snake_case() {
        let cases: Vec<(CommandType, &str)> = vec![
            (CommandType::Reboot, "\"reboot\""),
            (CommandType::Shutdown, "\"shutdown\""),
            (CommandType::RefreshStatus, "\"refresh_status\""),
            (CommandType::ApplyConfig, "\"apply_config\""),
            (CommandType::RunDiagnostics, "\"run_diagnostics\""),
            (CommandType::ClearCache, "\"clear_cache\""),
            (CommandType::RestartService, "\"restart_service\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: CommandType = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    #[test]
    fn command_status_serde_lowercase() {
        let cases: Vec<(CommandStatus, &str)> = vec![
            (CommandStatus::Pending, "\"pending\""),
            (CommandStatus::Running, "\"running\""),
            (CommandStatus::Completed, "\"completed\""),
            (CommandStatus::Failed, "\"failed\""),
            (CommandStatus::Timeout, "\"timeout\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: CommandStatus = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    #[test]
    fn webhook_event_serde_snake_case() {
        let cases: Vec<(WebhookEvent, &str)> = vec![
            (WebhookEvent::DeviceOnline, "\"device_online\""),
            (WebhookEvent::DeviceOffline, "\"device_offline\""),
            (WebhookEvent::ThreatDetected, "\"threat_detected\""),
            (WebhookEvent::ConfigChanged, "\"config_changed\""),
            (WebhookEvent::FirmwareAvailable, "\"firmware_available\""),
        ];
        for (variant, expected_json) in &cases {
            let serialized = serde_json::to_string(variant).unwrap();
            assert_eq!(&serialized, expected_json);
            let deserialized: WebhookEvent = serde_json::from_str(expected_json).unwrap();
            assert_eq!(&deserialized, variant);
        }
    }

    // ─── 13. WebhookConfig secret never serialized ────────────────────────

    #[test]
    fn webhook_config_secret_never_serialized() {
        let config = WebhookConfig {
            id: "wh-001".to_string(),
            url: "https://example.com/hook".to_string(),
            events: vec![WebhookEvent::DeviceOnline, WebhookEvent::ThreatDetected],
            enabled: true,
            secret: Some("super-secret-value".to_string()),
            created_at: 1_700_000_000,
        };

        let v: Value = serde_json::to_value(&config).unwrap();
        assert!(
            v.get("secret").is_none(),
            "secret field must never appear in serialized output, even when Some"
        );

        // Also verify other fields are present
        assert_eq!(v["id"], json!("wh-001"));
        assert_eq!(v["url"], json!("https://example.com/hook"));
        assert_eq!(v["enabled"], json!(true));
    }

    // ─── 14. Device deserializes without agent_mode ───────────────────────

    #[test]
    fn device_deserializes_without_agent_mode() {
        let json_str = r#"{
            "id": "dev-001",
            "name": "Office Router",
            "model": "RT-AX88U",
            "serial": "SN-12345",
            "firmware_version": "1.0.0",
            "status": "online",
            "last_seen": null,
            "created_at": 1700000000,
            "tags": ["office", "main"]
        }"#;

        let device: Device = serde_json::from_str(json_str).unwrap();
        assert_eq!(device.id, "dev-001");
        assert_eq!(device.name, "Office Router");
        assert!(
            device.agent_mode.is_none(),
            "agent_mode should default to None when omitted from JSON"
        );
    }
}
