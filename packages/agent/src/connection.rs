//! WebSocket client with auth handshake, reconnection, and keepalive

use futures_util::{SinkExt, StreamExt};
use ngfw_protocol::{AuthRequest, MessageType, RpcMessage, StatusPayload};
use tokio::sync::{mpsc, watch};
use tokio::time::{Duration, sleep, timeout};
use tokio_tungstenite::tungstenite::Message;
use tracing::{debug, error, info, info_span, warn, Instrument};
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
    let mut attempt: u64 = 0;

    let span = info_span!("connection", device_id = %config.agent.device_id);

    async {
    loop {
        if *shutdown.borrow() {
            info!("Connection loop shutting down");
            return;
        }

        attempt += 1;

        // Build WebSocket URL with query params
        let ws_url = format!(
            "{}?device_id={}&owner_id={}",
            config.agent.websocket_url, config.agent.device_id, config.agent.device_id
        );

        info!(attempt = attempt, "Connecting to {}", config.agent.websocket_url);

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
                attempt = 0; // Reset attempt counter on clean close
            }
            Err(e) => {
                error!("Connection error: {}", e);
            }
        }

        if *shutdown.borrow() {
            return;
        }

        info!(attempt = attempt, delay_ms = backoff.as_millis() as u64, "Reconnecting");
        tokio::select! {
            _ = sleep(backoff) => {}
            _ = shutdown.changed() => { return; }
        }

        // Exponential backoff: 1s → 2s → 4s → ... → 60s max
        backoff = (backoff * 2).min(MAX_BACKOFF);
    }
    }.instrument(span).await;
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

    // Read firmware version from NVRAM, fall back to crate version
    let firmware_version = read_firmware_version().await;

    // Send AUTH message
    let auth_msg = RpcMessage::new(
        MessageType::Auth,
        serde_json::to_value(AuthRequest {
            device_id: config.agent.device_id.clone(),
            api_key: config.agent.api_key.clone(),
            firmware_version,
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
        Ok(Ok(())) => {
            debug!(device_id = %config.agent.device_id, "Auth succeeded");
            info!("Authenticated successfully");
        }
        Ok(Err(ref e)) => {
            debug!(device_id = %config.agent.device_id, error = %e, "Auth failed");
            return Err(auth_result.unwrap().unwrap_err().into());
        }
        Err(_) => {
            debug!(device_id = %config.agent.device_id, "Auth handshake timed out");
            return Err("Auth handshake timed out".into());
        }
    }

    // Collect real system metrics for the initial STATUS message
    let uptime = read_uptime().await;
    let memory = read_memory_percent().await;
    let temperature = read_temperature().await;
    let load = read_loadavg().await;
    let connections = read_connection_count().await;
    let firmware = read_firmware_version().await;

    let status_msg = RpcMessage::new(
        MessageType::Status,
        serde_json::to_value(StatusPayload {
            uptime,
            cpu: 0.0, // CPU % requires two time-separated samples; use 0.0 for initial
            memory,
            temperature,
            load,
            interfaces: vec![],
            connections,
            wan_ip: None,
            firmware,
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

// ---------------------------------------------------------------------------
// System metric helpers
// ---------------------------------------------------------------------------

/// Read system uptime in seconds from `/proc/uptime`.
/// Returns 0 on non-Linux systems or if the file is unreadable.
async fn read_uptime() -> u64 {
    match tokio::fs::read_to_string("/proc/uptime").await {
        Ok(contents) => contents
            .split_whitespace()
            .next()
            .and_then(|s| s.parse::<f64>().ok())
            .map(|f| f as u64)
            .unwrap_or(0),
        Err(_) => 0,
    }
}

/// Read memory usage as a percentage from `/proc/meminfo`.
/// Computes `(MemTotal - MemAvailable) / MemTotal * 100`.
/// Returns 0.0 on non-Linux systems or if the file is unreadable.
async fn read_memory_percent() -> f32 {
    let data = match tokio::fs::read_to_string("/proc/meminfo").await {
        Ok(d) => d,
        Err(_) => return 0.0,
    };

    let mut total: Option<u64> = None;
    let mut available: Option<u64> = None;

    for line in data.lines() {
        if let Some(rest) = line.strip_prefix("MemTotal:") {
            total = rest.split_whitespace().next().and_then(|s| s.parse().ok());
        } else if let Some(rest) = line.strip_prefix("MemAvailable:") {
            available = rest.split_whitespace().next().and_then(|s| s.parse().ok());
        }
        if total.is_some() && available.is_some() {
            break;
        }
    }

    match (total, available) {
        (Some(t), Some(a)) if t > 0 => {
            let used = t.saturating_sub(a);
            (used as f64 / t as f64 * 100.0) as f32
        }
        _ => 0.0,
    }
}

/// Read load averages from `/proc/loadavg` (first 3 fields).
/// Returns `[0.0, 0.0, 0.0]` on non-Linux systems.
async fn read_loadavg() -> [f32; 3] {
    match tokio::fs::read_to_string("/proc/loadavg").await {
        Ok(contents) => {
            let parts: Vec<f32> = contents
                .split_whitespace()
                .take(3)
                .filter_map(|s| s.parse().ok())
                .collect();
            if parts.len() == 3 {
                [parts[0], parts[1], parts[2]]
            } else {
                [0.0, 0.0, 0.0]
            }
        }
        Err(_) => [0.0, 0.0, 0.0],
    }
}

/// Read CPU/SoC temperature from `/sys/class/thermal/thermal_zone0/temp`.
/// The kernel reports millidegrees Celsius; we divide by 1000.
/// Returns `None` if the file does not exist (non-Linux or no thermal zone).
async fn read_temperature() -> Option<f32> {
    match tokio::fs::read_to_string("/sys/class/thermal/thermal_zone0/temp").await {
        Ok(contents) => contents.trim().parse::<f32>().ok().map(|t| t / 1000.0),
        Err(_) => None,
    }
}

/// Count active network connections from `/proc/net/tcp` (minus header line).
/// Returns 0 on non-Linux systems.
async fn read_connection_count() -> u32 {
    match tokio::fs::read_to_string("/proc/net/tcp").await {
        Ok(contents) => contents.lines().count().saturating_sub(1) as u32,
        Err(_) => 0,
    }
}

/// Read the router firmware version.
///
/// Attempts to read from NVRAM (`nvram get firmver` + `nvram get buildno`)
/// which is available on asuswrt-merlin routers. Falls back to the agent's
/// own crate version if NVRAM is unavailable (e.g. dev environments).
async fn read_firmware_version() -> String {
    // Try NVRAM first (asuswrt-merlin stores firmware info here)
    if let Ok(output) = tokio::process::Command::new("nvram")
        .args(["get", "firmver"])
        .output()
        .await
    {
        if output.status.success() {
            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !ver.is_empty() {
                // Also try to get the build number for a more complete version string
                if let Ok(build_output) = tokio::process::Command::new("nvram")
                    .args(["get", "buildno"])
                    .output()
                    .await
                {
                    if build_output.status.success() {
                        let build = String::from_utf8_lossy(&build_output.stdout)
                            .trim()
                            .to_string();
                        if !build.is_empty() {
                            return format!("{}.{}", ver, build);
                        }
                    }
                }
                return ver;
            }
        }
    }

    // Fall back to the agent's own version
    env!("CARGO_PKG_VERSION").to_string()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn read_uptime_returns_nonzero_on_linux() {
        let uptime = read_uptime().await;
        // On Linux CI/dev, uptime should be > 0. On non-Linux, it returns 0.
        if cfg!(target_os = "linux") {
            assert!(uptime > 0, "uptime should be > 0 on Linux, got {}", uptime);
        } else {
            assert_eq!(uptime, 0);
        }
    }

    #[tokio::test]
    async fn read_memory_percent_in_valid_range() {
        let mem = read_memory_percent().await;
        // On Linux, memory should be between 0 and 100. On non-Linux, 0.0.
        assert!(
            (0.0..=100.0).contains(&mem),
            "memory percentage should be 0-100, got {}",
            mem,
        );
    }

    #[tokio::test]
    async fn read_loadavg_returns_three_values() {
        let load = read_loadavg().await;
        // All values should be non-negative
        for val in &load {
            assert!(*val >= 0.0, "load average should be >= 0, got {}", val);
        }
    }

    #[tokio::test]
    async fn read_temperature_returns_valid_range_or_none() {
        let temp = read_temperature().await;
        if let Some(t) = temp {
            // Sanity check: temperature should be between -50 and 150 degrees C
            assert!(
                (-50.0..=150.0).contains(&t),
                "temperature should be reasonable, got {}",
                t,
            );
        }
        // None is fine on systems without thermal zones
    }

    #[tokio::test]
    async fn read_connection_count_returns_valid_value() {
        let count = read_connection_count().await;
        // Just verify it doesn't panic; on non-Linux it returns 0
        assert!(count < 1_000_000, "connection count seems unreasonable: {}", count);
    }

    #[tokio::test]
    async fn read_firmware_version_returns_non_empty() {
        let ver = read_firmware_version().await;
        assert!(!ver.is_empty(), "firmware version should not be empty");
        // On dev environments without nvram, should fall back to CARGO_PKG_VERSION
    }
}
