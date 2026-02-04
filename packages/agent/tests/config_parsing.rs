//! Integration test: load AgentConfig from a temporary file on disk.

use std::io::Write;

use ngfw_agent::config::AgentConfig;

#[tokio::test]
async fn load_full_config_from_file() {
    let toml_content = r#"
[agent]
device_id = "RT-AX86U-INTEG"
api_key = "sk_test_integration_key"
websocket_url = "wss://staging.ngfw.sh/ws"
log_level = "trace"
metrics_interval_secs = 15

[mode]
default = "takeover"

[adapters]
iptables = true
dnsmasq = true
wifi = false
wireguard = true
system = true
"#;

    let dir = tempfile::tempdir().expect("failed to create temp dir");
    let config_path = dir.path().join("config.toml");

    {
        let mut file = std::fs::File::create(&config_path).expect("failed to create config file");
        file.write_all(toml_content.as_bytes())
            .expect("failed to write config");
    }

    let config = AgentConfig::load(config_path.to_str().unwrap())
        .await
        .expect("AgentConfig::load should succeed");

    // Agent section
    assert_eq!(config.agent.device_id, "RT-AX86U-INTEG");
    assert_eq!(config.agent.api_key, "sk_test_integration_key");
    assert_eq!(config.agent.websocket_url, "wss://staging.ngfw.sh/ws");
    assert_eq!(config.agent.log_level.as_deref(), Some("trace"));
    assert_eq!(config.agent.metrics_interval_secs, 15);

    // Mode section
    assert_eq!(config.mode.default, "takeover");

    // Adapters section
    assert!(config.adapters.iptables);
    assert!(config.adapters.dnsmasq);
    assert!(!config.adapters.wifi);
    assert!(config.adapters.wireguard);
    assert!(config.adapters.system);
}

#[tokio::test]
async fn load_minimal_config_from_file() {
    let toml_content = r#"
[agent]
device_id = "minimal-dev"
api_key = "minimal-key"
"#;

    let dir = tempfile::tempdir().expect("failed to create temp dir");
    let config_path = dir.path().join("config.toml");
    std::fs::write(&config_path, toml_content).expect("failed to write config");

    let config = AgentConfig::load(config_path.to_str().unwrap())
        .await
        .expect("minimal config should load");

    assert_eq!(config.agent.device_id, "minimal-dev");
    assert_eq!(config.agent.api_key, "minimal-key");
    assert_eq!(config.agent.websocket_url, "wss://api.ngfw.sh/ws");
    assert_eq!(config.agent.metrics_interval_secs, 5);
    assert_eq!(config.mode.default, "observe");
    assert!(!config.adapters.wireguard);
}

#[tokio::test]
async fn load_nonexistent_file_returns_error() {
    let result = AgentConfig::load("/tmp/ngfw-test-nonexistent-path/config.toml").await;
    assert!(result.is_err(), "loading a missing file must return Err");
}

#[tokio::test]
async fn load_invalid_toml_returns_error() {
    let dir = tempfile::tempdir().expect("failed to create temp dir");
    let config_path = dir.path().join("bad.toml");
    std::fs::write(&config_path, "this is not valid toml {{{{").expect("write");

    let result = AgentConfig::load(config_path.to_str().unwrap()).await;
    assert!(result.is_err(), "invalid TOML must return Err");
}
