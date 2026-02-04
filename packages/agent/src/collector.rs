//! Metrics collection loop
//!
//! Reads system stats from /proc and /sys on a configurable interval,
//! computes derived values (CPU %, memory %, interface rates), and sends
//! a `MetricsPayload` over the outbound channel to the cloud API.

use std::collections::HashMap;

use ngfw_protocol::{
    ConnectionCounts, DnsMetrics, InterfaceRates, MessageType, MetricsPayload, RpcMessage,
};
use tokio::sync::{mpsc, watch};
use tracing::{debug, error, warn};

use crate::config::AgentConfig;

/// Interfaces to monitor for byte-rate calculations.
const MONITORED_INTERFACES: &[&str] = &["br0", "eth0"];

/// CPU sample window in milliseconds. Two reads of /proc/stat are taken
/// this far apart to compute a meaningful delta.
const CPU_SAMPLE_MS: u64 = 100;

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/// Long-running loop that collects system metrics and sends them to the
/// cloud API via `outbound_tx`.  Exits cleanly when `shutdown` fires.
pub async fn metrics_loop(
    config: AgentConfig,
    outbound_tx: mpsc::Sender<RpcMessage>,
    mut shutdown: watch::Receiver<bool>,
) {
    let interval_secs = config.agent.metrics_interval_secs;
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_secs));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    // Previous byte counts keyed by interface name, used for rate calculation.
    let mut prev_bytes: HashMap<String, (u64, u64)> = HashMap::new();
    let mut prev_ts = tokio::time::Instant::now();

    debug!("metrics collector started (interval={}s)", interval_secs);

    loop {
        tokio::select! {
            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    debug!("metrics collector received shutdown signal");
                    break;
                }
            }
            _ = interval.tick() => {}
        }

        if *shutdown.borrow() {
            break;
        }

        let now = tokio::time::Instant::now();
        let elapsed_secs = now.duration_since(prev_ts).as_secs_f64();

        let cpu = read_cpu().await;
        let memory = read_memory().await;
        let temperature = read_temperature().await;
        let (interfaces, new_bytes) = read_interfaces(&prev_bytes, elapsed_secs).await;
        let connections = read_connections().await;
        let dns = read_dns().await;

        prev_bytes = new_bytes;
        prev_ts = now;

        let payload = MetricsPayload {
            timestamp: chrono_timestamp(),
            cpu,
            memory,
            temperature,
            interfaces,
            connections,
            dns,
        };

        let value = match serde_json::to_value(&payload) {
            Ok(v) => v,
            Err(e) => {
                error!("failed to serialize metrics payload: {}", e);
                continue;
            }
        };

        let msg = RpcMessage::new(MessageType::Metrics, value);

        if let Err(e) = outbound_tx.send(msg).await {
            warn!("outbound channel closed, stopping metrics collector: {}", e);
            break;
        }

        debug!("sent metrics (cpu={:.1}% mem={:.1}%)", cpu, memory);
    }

    debug!("metrics collector stopped");
}

// ---------------------------------------------------------------------------
// CPU
// ---------------------------------------------------------------------------

/// Raw jiffies from the first line of /proc/stat.
struct CpuSnapshot {
    user: u64,
    nice: u64,
    system: u64,
    idle: u64,
    total: u64,
}

async fn read_cpu_snapshot() -> Option<CpuSnapshot> {
    let data = tokio::fs::read_to_string("/proc/stat").await.ok()?;
    let line = data.lines().next()?;
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 5 || parts[0] != "cpu" {
        return None;
    }

    let user: u64 = parts[1].parse().ok()?;
    let nice: u64 = parts[2].parse().ok()?;
    let system: u64 = parts[3].parse().ok()?;
    let idle: u64 = parts[4].parse().ok()?;
    // iowait, irq, softirq, steal, guest, guest_nice (optional)
    let extra: u64 = parts[5..]
        .iter()
        .filter_map(|v| v.parse::<u64>().ok())
        .sum();
    let total = user + nice + system + idle + extra;

    Some(CpuSnapshot {
        user,
        nice,
        system,
        idle,
        total,
    })
}

/// Read CPU usage as a percentage (0.0 -- 100.0).
///
/// Takes two samples `CPU_SAMPLE_MS` apart and computes the delta to
/// derive how much time was spent outside idle.
async fn read_cpu() -> f32 {
    let before = match read_cpu_snapshot().await {
        Some(s) => s,
        None => return 0.0,
    };

    tokio::time::sleep(std::time::Duration::from_millis(CPU_SAMPLE_MS)).await;

    let after = match read_cpu_snapshot().await {
        Some(s) => s,
        None => return 0.0,
    };

    let total_delta = after.total.saturating_sub(before.total);
    if total_delta == 0 {
        return 0.0;
    }

    let idle_delta = after.idle.saturating_sub(before.idle);
    let busy = total_delta.saturating_sub(idle_delta) as f64;
    let pct = (busy / total_delta as f64) * 100.0;
    pct as f32
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

/// Read memory usage as a percentage from /proc/meminfo.
async fn read_memory() -> f32 {
    let data = match tokio::fs::read_to_string("/proc/meminfo").await {
        Ok(d) => d,
        Err(_) => return 0.0,
    };

    let mut total: Option<u64> = None;
    let mut available: Option<u64> = None;

    for line in data.lines() {
        if let Some(rest) = line.strip_prefix("MemTotal:") {
            total = parse_meminfo_kb(rest);
        } else if let Some(rest) = line.strip_prefix("MemAvailable:") {
            available = parse_meminfo_kb(rest);
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

/// Parse a meminfo value line like `"   16384 kB"` into kilobytes.
fn parse_meminfo_kb(s: &str) -> Option<u64> {
    s.split_whitespace().next()?.parse().ok()
}

// ---------------------------------------------------------------------------
// Temperature
// ---------------------------------------------------------------------------

/// Try to read CPU/SoC temperature.
///
/// First attempt: `/sys/class/thermal/thermal_zone*/temp` (value in
/// millidegrees Celsius).  Second attempt: run the Broadcom wireless
/// utility `wl -i eth6 phy_tempsense` and parse its output.
async fn read_temperature() -> Option<f32> {
    // Try thermal_zone files first
    if let Some(temp) = read_thermal_zone().await {
        return Some(temp);
    }

    // Fallback: wl phy_tempsense (Broadcom routers)
    read_wl_tempsense().await
}

async fn read_thermal_zone() -> Option<f32> {
    let mut dir = match tokio::fs::read_dir("/sys/class/thermal").await {
        Ok(d) => d,
        Err(_) => return None,
    };

    while let Ok(Some(entry)) = dir.next_entry().await {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if !name_str.starts_with("thermal_zone") {
            continue;
        }

        let temp_path = entry.path().join("temp");
        if let Ok(contents) = tokio::fs::read_to_string(&temp_path).await
            && let Ok(millideg) = contents.trim().parse::<i64>()
        {
            return Some(millideg as f32 / 1000.0);
        }
    }

    None
}

async fn read_wl_tempsense() -> Option<f32> {
    let output = tokio::process::Command::new("wl")
        .args(["-i", "eth6", "phy_tempsense"])
        .output()
        .await
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Output format: "78 (0x4e)"  — first token is temperature * 2 + 20
    // on some chips, or direct Celsius on others. We parse the first number.
    let raw: f32 = stdout.split_whitespace().next()?.parse().ok()?;
    // Broadcom tempsense returns half-degree units offset by 20:
    //   actual = raw / 2 + 20
    Some(raw / 2.0 + 20.0)
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/// Read interface byte counters and compute per-second rates based on
/// the delta from the previous collection cycle.
async fn read_interfaces(
    prev: &HashMap<String, (u64, u64)>,
    elapsed_secs: f64,
) -> (HashMap<String, InterfaceRates>, HashMap<String, (u64, u64)>) {
    let mut rates = HashMap::new();
    let mut current = HashMap::new();

    for &iface in MONITORED_INTERFACES {
        let base = format!("/sys/class/net/{}/statistics", iface);
        let rx = read_sysfs_u64(&format!("{}/rx_bytes", base)).await;
        let tx = read_sysfs_u64(&format!("{}/tx_bytes", base)).await;

        let (rx_bytes, tx_bytes) = match (rx, tx) {
            (Some(r), Some(t)) => (r, t),
            _ => continue, // interface doesn't exist, skip silently
        };

        current.insert(iface.to_string(), (rx_bytes, tx_bytes));

        let (rx_rate, tx_rate) = if let Some(&(prev_rx, prev_tx)) = prev.get(iface) {
            if elapsed_secs > 0.0 {
                let rx_delta = rx_bytes.saturating_sub(prev_rx);
                let tx_delta = tx_bytes.saturating_sub(prev_tx);
                (
                    (rx_delta as f64 / elapsed_secs) as u64,
                    (tx_delta as f64 / elapsed_secs) as u64,
                )
            } else {
                (0, 0)
            }
        } else {
            // First sample — no previous data to compute rate from.
            (0, 0)
        };

        rates.insert(iface.to_string(), InterfaceRates { rx_rate, tx_rate });
    }

    (rates, current)
}

async fn read_sysfs_u64(path: &str) -> Option<u64> {
    tokio::fs::read_to_string(path)
        .await
        .ok()?
        .trim()
        .parse()
        .ok()
}

// ---------------------------------------------------------------------------
// Connections (conntrack)
// ---------------------------------------------------------------------------

/// Read connection tracking counts.
///
/// Total comes from the kernel counter file. TCP/UDP breakdown comes from
/// parsing the conntrack table. Both paths are optional — missing files
/// yield zeros instead of errors.
async fn read_connections() -> ConnectionCounts {
    let total = read_sysfs_u64("/proc/sys/net/netfilter/nf_conntrack_count")
        .await
        .unwrap_or(0) as u32;

    let (tcp, udp) = count_conntrack_protocols().await;

    ConnectionCounts { total, tcp, udp }
}

/// Parse `/proc/net/nf_conntrack` and count TCP vs UDP entries.
async fn count_conntrack_protocols() -> (u32, u32) {
    let data = match tokio::fs::read_to_string("/proc/net/nf_conntrack").await {
        Ok(d) => d,
        Err(_) => return (0, 0),
    };

    let mut tcp: u32 = 0;
    let mut udp: u32 = 0;

    for line in data.lines() {
        // Lines look like:
        //   ipv4     2 tcp      6 300 ESTABLISHED src=... dst=...
        //   ipv4     2 udp      17 30 src=... dst=...
        let mut parts = line.split_whitespace();
        // Skip address family and protocol number
        let _family = parts.next();
        let _fam_num = parts.next();
        if let Some(proto) = parts.next() {
            match proto {
                "tcp" => tcp += 1,
                "udp" => udp += 1,
                _ => {}
            }
        }
    }

    (tcp, udp)
}

// ---------------------------------------------------------------------------
// DNS
// ---------------------------------------------------------------------------

/// Read dnsmasq statistics.
///
/// The standard approach is to send SIGUSR1 to dnsmasq then read its log
/// output. Because parsing syslog from the metrics loop is fragile and
/// racey, we return zeros here and let a dedicated adapter populate DNS
/// metrics via a separate mechanism in the future.
async fn read_dns() -> DnsMetrics {
    DnsMetrics {
        queries: 0,
        blocked: 0,
        cached: 0,
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Current Unix timestamp in seconds (no chrono dependency needed).
fn chrono_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
