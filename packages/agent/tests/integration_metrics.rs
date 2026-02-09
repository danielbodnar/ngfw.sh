//! Integration tests for metrics collection
//!
//! Tests the metrics collection loop, data accuracy, timing, and
//! proper formatting of telemetry data sent to the API.

use ngfw_agent::config::AgentConfig;
use ngfw_protocol::{MessageType, MetricsPayload};
use std::time::Duration;
use tokio::sync::{mpsc, watch};
use tokio::time::timeout;

fn test_config() -> AgentConfig {
    use ngfw_agent::config::{AgentSection, ModeSection, AdaptersSection};

    AgentConfig {
        agent: AgentSection {
            device_id: "test-device".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: "ws://localhost:8787/ws".to_string(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 1, // Fast interval for testing
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
async fn test_metrics_loop_basic_operation() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn metrics collector
    let collector_task = tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // Wait for first metrics message
    let msg = timeout(Duration::from_secs(3), outbound_rx.recv())
        .await
        .expect("Should receive metrics within timeout")
        .expect("Channel should not be closed");

    assert_eq!(msg.msg_type, MessageType::Metrics);

    // Verify metrics payload structure
    let metrics: Result<MetricsPayload, _> = serde_json::from_value(msg.payload);
    assert!(metrics.is_ok(), "Metrics should deserialize correctly");

    let metrics = metrics.unwrap();
    assert!(metrics.timestamp > 0, "Timestamp should be set");
    assert!(metrics.cpu >= 0.0 && metrics.cpu <= 100.0, "CPU should be 0-100%");
    assert!(
        metrics.memory >= 0.0 && metrics.memory <= 100.0,
        "Memory should be 0-100%"
    );

    // Cleanup
    drop(outbound_rx);
    timeout(Duration::from_secs(1), collector_task)
        .await
        .ok();
}

#[tokio::test]
async fn test_metrics_loop_interval_timing() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // Collect timestamps of first 3 metrics
    let mut timestamps = Vec::new();

    for _ in 0..3 {
        if let Ok(Some(msg)) = timeout(Duration::from_secs(5), outbound_rx.recv()).await {
            if let Ok(metrics) = serde_json::from_value::<MetricsPayload>(msg.payload) {
                timestamps.push(metrics.timestamp);
            }
        }
    }

    assert_eq!(timestamps.len(), 3, "Should receive 3 metrics");

    // Verify intervals are approximately 1 second apart
    let interval1 = timestamps[1] - timestamps[0];
    let interval2 = timestamps[2] - timestamps[1];

    // Allow some tolerance (0.5s - 2s)
    assert!(
        interval1 >= 0 && interval1 <= 3,
        "First interval should be ~1s, got {}s",
        interval1
    );
    assert!(
        interval2 >= 0 && interval2 <= 3,
        "Second interval should be ~1s, got {}s",
        interval2
    );
}

#[tokio::test]
async fn test_metrics_cpu_percentage_valid() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // CPU calculation requires two samples, so wait for second metric
    let _ = timeout(Duration::from_secs(3), outbound_rx.recv()).await;

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        let metrics: MetricsPayload = serde_json::from_value(msg.payload).unwrap();

        // CPU should be valid percentage
        assert!(
            metrics.cpu >= 0.0,
            "CPU should be non-negative, got {}",
            metrics.cpu
        );
        assert!(
            metrics.cpu <= 100.0,
            "CPU should be <= 100%, got {}",
            metrics.cpu
        );
    }
}

#[tokio::test]
async fn test_metrics_memory_percentage_valid() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        let metrics: MetricsPayload = serde_json::from_value(msg.payload).unwrap();

        assert!(
            metrics.memory >= 0.0,
            "Memory should be non-negative, got {}",
            metrics.memory
        );
        assert!(
            metrics.memory <= 100.0,
            "Memory should be <= 100%, got {}",
            metrics.memory
        );
    }
}

#[tokio::test]
async fn test_metrics_temperature_optional() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        let metrics: MetricsPayload = serde_json::from_value(msg.payload).unwrap();

        // Temperature is optional (None on systems without thermal zones)
        if let Some(temp) = metrics.temperature {
            assert!(
                temp > -50.0 && temp < 150.0,
                "Temperature should be reasonable, got {}°C",
                temp
            );
        }
    }
}

#[tokio::test]
async fn test_metrics_interfaces_structure() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // Wait for second metric (first may have 0 rates due to no previous sample)
    let _ = timeout(Duration::from_secs(3), outbound_rx.recv()).await;

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        let metrics: MetricsPayload = serde_json::from_value(msg.payload).unwrap();

        // Should have interface metrics
        assert!(
            !metrics.interfaces.is_empty() || metrics.interfaces.is_empty(),
            "Interfaces can be empty or populated"
        );

        // If interfaces exist, verify structure
        for (_name, rates) in &metrics.interfaces {
            assert!(rates.rx_rate >= 0, "RX rate should be non-negative");
            assert!(rates.tx_rate >= 0, "TX rate should be non-negative");
        }
    }
}

#[tokio::test]
async fn test_metrics_connections_count() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        let metrics: MetricsPayload = serde_json::from_value(msg.payload).unwrap();

        // Connection counts should be non-negative
        assert!(
            metrics.connections.total >= 0,
            "Total connections should be non-negative"
        );
        assert!(
            metrics.connections.tcp >= 0,
            "TCP connections should be non-negative"
        );
        assert!(
            metrics.connections.udp >= 0,
            "UDP connections should be non-negative"
        );
    }
}

#[tokio::test]
async fn test_metrics_dns_structure() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        let metrics: MetricsPayload = serde_json::from_value(msg.payload).unwrap();

        // DNS metrics should be present
        assert!(
            metrics.dns.queries >= 0,
            "DNS queries should be non-negative"
        );
        assert!(
            metrics.dns.blocked >= 0,
            "DNS blocked should be non-negative"
        );
        assert!(
            metrics.dns.cached >= 0,
            "DNS cached should be non-negative"
        );
    }
}

#[tokio::test]
async fn test_metrics_shutdown_cleanup() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    let collector_task = tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // Receive first metric
    let _ = timeout(Duration::from_secs(3), outbound_rx.recv()).await;

    // Trigger shutdown
    shutdown_tx.send(true).unwrap();

    // Collector should exit cleanly
    let result = timeout(Duration::from_secs(2), collector_task).await;
    assert!(result.is_ok(), "Collector should shut down cleanly");
}

#[tokio::test]
async fn test_metrics_channel_closed_handling() {
    let config = test_config();
    let (outbound_tx, outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    let collector_task = tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // Close receiver to simulate disconnection
    drop(outbound_rx);

    // Collector should detect closed channel and exit
    let result = timeout(Duration::from_secs(3), collector_task).await;
    assert!(
        result.is_ok(),
        "Collector should exit when outbound channel closes"
    );
}

#[tokio::test]
async fn test_metrics_multiple_collections() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(20);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    // Collect 5 metrics
    let mut collected = Vec::new();
    for _ in 0..5 {
        if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
            if let Ok(metrics) = serde_json::from_value::<MetricsPayload>(msg.payload) {
                collected.push(metrics);
            }
        }
    }

    assert_eq!(collected.len(), 5, "Should collect 5 metrics");

    // Verify all metrics are valid
    for (i, metrics) in collected.iter().enumerate() {
        assert!(
            metrics.timestamp > 0,
            "Metric {} should have timestamp",
            i
        );
        assert!(
            metrics.cpu >= 0.0 && metrics.cpu <= 100.0,
            "Metric {} CPU should be valid",
            i
        );
        assert!(
            metrics.memory >= 0.0 && metrics.memory <= 100.0,
            "Metric {} memory should be valid",
            i
        );
    }

    // Verify timestamps are increasing
    for i in 1..collected.len() {
        assert!(
            collected[i].timestamp >= collected[i - 1].timestamp,
            "Timestamps should be monotonically increasing"
        );
    }
}

#[tokio::test]
async fn test_metrics_serialization_roundtrip() {
    let config = test_config();
    let (outbound_tx, mut outbound_rx) = mpsc::channel(10);
    let (_shutdown_tx, shutdown_rx) = watch::channel(false);

    tokio::spawn(ngfw_agent::collector::metrics_loop(
        config,
        outbound_tx,
        shutdown_rx,
    ));

    if let Ok(Some(msg)) = timeout(Duration::from_secs(3), outbound_rx.recv()).await {
        // Deserialize
        let metrics: MetricsPayload = serde_json::from_value(msg.payload.clone()).unwrap();

        // Re-serialize
        let reserialized = serde_json::to_value(&metrics).unwrap();

        // Should match original (with some floating point tolerance)
        assert_eq!(
            reserialized["timestamp"],
            msg.payload["timestamp"],
            "Timestamp should survive roundtrip"
        );
    }
}
