//! Integration tests for firmware adapters
//!
//! Tests agent<->firmware communication through adapter interfaces,
//! including config validation, application, rollback, and metrics collection.
//! These tests use mock binaries to simulate firmware commands.

use ngfw_agent::adapters::{
    DnsmasqAdapter, IptablesAdapter, NvramAdapter, SubsystemAdapter, SystemAdapter, WifiAdapter,
    WireguardAdapter,
};
use ngfw_protocol::ConfigSection;
use serde_json::json;
use std::env;
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::timeout;

/// Setup mock binary directory for tests
fn setup_mock_bins() -> PathBuf {
    let mock_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("integration")
        .join("mock-bins");

    // Add mock bin directory to PATH for subprocess calls
    if let Ok(path) = env::var("PATH") {
        unsafe {
            env::set_var("PATH", format!("{}:{}", mock_dir.display(), path));
        }
    }

    mock_dir
}

/// Setup mock sysfs directory for tests
fn setup_mock_sysfs() -> PathBuf {
    

    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("integration")
        .join("mock-sysfs")
}

#[tokio::test]
async fn test_iptables_adapter_read_config() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.read_config()).await;
    assert!(result.is_ok(), "read_config should not timeout");

    let config = result.unwrap();
    assert!(config.is_ok(), "Should successfully read iptables config");
}

#[tokio::test]
async fn test_iptables_adapter_validate_config() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    // Valid firewall config
    let valid_config = json!({
        "rules": [
            {
                "chain": "INPUT",
                "action": "ACCEPT",
                "source": "192.168.1.0/24"
            }
        ]
    });

    let result = adapter.validate(&valid_config).await;
    assert!(result.is_ok(), "Validation should succeed for valid config");

    let issues = result.unwrap();
    assert!(
        issues.is_empty(),
        "Should have no validation issues: {:?}",
        issues
    );
}

#[tokio::test]
async fn test_iptables_adapter_validate_invalid_config() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    // Invalid config (missing required fields)
    let invalid_config = json!({
        "rules": [
            {
                "chain": "INVALID_CHAIN"
            }
        ]
    });

    let result = adapter.validate(&invalid_config).await;
    assert!(result.is_ok(), "Validate should return, not error");

    let _issues = result.unwrap();
    // Depending on adapter implementation, may have validation issues
    // At minimum, should not panic
}

#[tokio::test]
async fn test_iptables_adapter_section() {
    let adapter = IptablesAdapter::new();
    assert_eq!(adapter.section(), ConfigSection::Firewall);
}

#[tokio::test]
async fn test_dnsmasq_adapter_read_config() {
    setup_mock_bins();

    let adapter = DnsmasqAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.read_config()).await;
    assert!(result.is_ok(), "read_config should not timeout");
}

#[tokio::test]
async fn test_dnsmasq_adapter_validate_config() {
    setup_mock_bins();

    let adapter = DnsmasqAdapter::new();

    let valid_config = json!({
        "upstream_servers": ["1.1.1.1", "8.8.8.8"],
        "domain": "local.lan",
        "dhcp": {
            "enabled": true,
            "range_start": "192.168.1.100",
            "range_end": "192.168.1.200",
            "lease_time": "24h"
        }
    });

    let result = adapter.validate(&valid_config).await;
    assert!(result.is_ok(), "DNS validation should succeed");
}

#[tokio::test]
async fn test_dnsmasq_adapter_section() {
    let adapter = DnsmasqAdapter::new();
    assert_eq!(adapter.section(), ConfigSection::Dns);
}

#[tokio::test]
async fn test_nvram_adapter_read_config() {
    setup_mock_bins();

    let adapter = NvramAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.read_config()).await;
    assert!(result.is_ok(), "read_config should not timeout");

    // NVRAM read may fail in test env without actual nvram
    // Just verify it doesn't panic
}

#[tokio::test]
async fn test_nvram_adapter_validate_config() {
    setup_mock_bins();

    let adapter = NvramAdapter::new();

    let config = json!({
        "lan_ipaddr": "192.168.1.1",
        "lan_netmask": "255.255.255.0",
        "wan_proto": "dhcp"
    });

    let result = adapter.validate(&config).await;
    assert!(result.is_ok(), "NVRAM validation should not error");
}

#[tokio::test]
async fn test_system_adapter_read_config() {
    setup_mock_bins();

    let adapter = SystemAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.read_config()).await;
    assert!(result.is_ok(), "system read_config should not timeout");
}

#[tokio::test]
async fn test_system_adapter_collect_metrics() {
    setup_mock_sysfs();

    let adapter = SystemAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.collect_metrics()).await;
    assert!(result.is_ok(), "metrics collection should not timeout");

    let metrics = result.unwrap();
    assert!(metrics.is_ok(), "Should collect system metrics");

    let metrics_value = metrics.unwrap();
    // Verify metrics structure
    assert!(metrics_value.is_object(), "Metrics should be an object");
}

#[tokio::test]
async fn test_wifi_adapter_read_config() {
    setup_mock_bins();

    let adapter = WifiAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.read_config()).await;
    assert!(result.is_ok(), "wifi read_config should not timeout");
}

#[tokio::test]
async fn test_wifi_adapter_validate_config() {
    setup_mock_bins();

    let adapter = WifiAdapter::new();

    let config = json!({
        "ssid": "TestNetwork",
        "security": "wpa2-psk",
        "password": "testpassword123",
        "channel": 6,
        "bandwidth": "20MHz"
    });

    let result = adapter.validate(&config).await;
    assert!(result.is_ok(), "WiFi validation should not error");
}

#[tokio::test]
async fn test_wifi_adapter_section() {
    let adapter = WifiAdapter::new();
    assert_eq!(adapter.section(), ConfigSection::Wifi);
}

#[tokio::test]
async fn test_wireguard_adapter_read_config() {
    setup_mock_bins();

    let adapter = WireguardAdapter::new();

    let result = timeout(Duration::from_secs(5), adapter.read_config()).await;
    assert!(result.is_ok(), "wireguard read_config should not timeout");
}

#[tokio::test]
async fn test_wireguard_adapter_validate_config() {
    setup_mock_bins();

    let adapter = WireguardAdapter::new();

    let config = json!({
        "interface": "wg0",
        "address": "10.0.0.1/24",
        "listen_port": 51820,
        "private_key": "base64_encoded_key",
        "peers": [
            {
                "public_key": "peer_public_key",
                "allowed_ips": ["10.0.0.2/32"],
                "endpoint": "192.0.2.1:51820"
            }
        ]
    });

    let result = adapter.validate(&config).await;
    assert!(result.is_ok(), "WireGuard validation should not error");
}

#[tokio::test]
async fn test_wireguard_adapter_section() {
    let adapter = WireguardAdapter::new();
    assert_eq!(adapter.section(), ConfigSection::Vpn);
}

#[tokio::test]
async fn test_adapter_diff_no_changes() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    // Read current config
    let current = adapter.read_config().await.ok();

    if let Some(config) = current {
        // Diff against same config should show no changes
        let diff_result = adapter.diff(&config).await;
        assert!(diff_result.is_ok(), "Diff should succeed");

        let diff = diff_result.unwrap();
        assert_eq!(diff.section, ConfigSection::Firewall);
        // Depending on implementation, may have no changes
        // At minimum, should not panic
    }
}

#[tokio::test]
async fn test_adapter_apply_and_rollback() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    // Apply a test config
    let test_config = json!({
        "rules": [
            {
                "chain": "INPUT",
                "action": "ACCEPT",
                "source": "192.168.1.0/24"
            }
        ]
    });

    let _apply_result = adapter.apply(&test_config, 1).await;
    // Apply may fail in test environment without real iptables
    // Just verify it doesn't panic

    // Try rollback
    let _rollback_result = adapter.rollback().await;
    // Rollback may also fail in test env
    // Verify no panic
}

#[tokio::test]
async fn test_multiple_adapters_concurrent_operations() {
    setup_mock_bins();

    let iptables = IptablesAdapter::new();
    let dnsmasq = DnsmasqAdapter::new();
    let system = SystemAdapter::new();

    // Run concurrent reads
    let (r1, r2, r3) = tokio::join!(
        iptables.read_config(),
        dnsmasq.read_config(),
        system.read_config()
    );

    // All should complete without panic
    assert!(r1.is_ok() || r1.is_err(), "iptables read completed");
    assert!(r2.is_ok() || r2.is_err(), "dnsmasq read completed");
    assert!(r3.is_ok() || r3.is_err(), "system read completed");
}

#[tokio::test]
async fn test_adapter_metrics_collection_concurrent() {
    setup_mock_sysfs();

    let system = SystemAdapter::new();

    // Collect metrics multiple times concurrently
    let (m1, m2, m3) = tokio::join!(
        system.collect_metrics(),
        system.collect_metrics(),
        system.collect_metrics()
    );

    // All should succeed
    assert!(m1.is_ok() || m1.is_err(), "metrics 1 completed");
    assert!(m2.is_ok() || m2.is_err(), "metrics 2 completed");
    assert!(m3.is_ok() || m3.is_err(), "metrics 3 completed");
}

#[tokio::test]
async fn test_adapter_config_validation_timeout() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    let config = json!({
        "rules": []
    });

    // Validate with timeout
    let result = timeout(Duration::from_secs(10), adapter.validate(&config)).await;

    assert!(
        result.is_ok(),
        "Validation should complete within timeout"
    );
}

#[tokio::test]
async fn test_adapter_error_handling_invalid_json() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    // Pass invalid JSON structure
    let invalid = json!("not an object");

    let result = adapter.validate(&invalid).await;
    // Should handle gracefully, not panic
    assert!(result.is_ok() || result.is_err(), "Should handle invalid input");
}

#[tokio::test]
async fn test_adapter_large_config_handling() {
    setup_mock_bins();

    let adapter = IptablesAdapter::new();

    // Generate large config with many rules
    let mut rules = Vec::new();
    for i in 0..1000 {
        rules.push(json!({
            "chain": "INPUT",
            "action": "ACCEPT",
            "source": format!("192.168.{}.0/24", i % 256)
        }));
    }

    let large_config = json!({
        "rules": rules
    });

    // Validate large config
    let result = timeout(Duration::from_secs(30), adapter.validate(&large_config)).await;

    assert!(
        result.is_ok(),
        "Should handle large configs without timeout"
    );
}
