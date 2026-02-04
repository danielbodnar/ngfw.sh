//! System adapter — read-only metrics from /proc and /sys
//!
//! This adapter does not manage configuration; it only collects host-level
//! telemetry (CPU, memory, temperature, network interface counters).

use ngfw_protocol::rpc::ConfigSection;
use serde_json::{Value, json};
use tracing::{debug, warn};

use super::{ConfigDiff, SubsystemAdapter, ValidationIssue};

#[derive(Default)]
pub struct SystemAdapter;

impl SystemAdapter {
    pub fn new() -> Self {
        Self
    }

    /// Parse /proc/stat and return aggregate CPU usage as a percentage.
    async fn read_cpu(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let stat = tokio::fs::read_to_string("/proc/stat").await?;
        let mut cpu = json!({});

        for line in stat.lines() {
            if let Some(rest) = line.strip_prefix("cpu ") {
                let fields: Vec<u64> = rest
                    .split_whitespace()
                    .filter_map(|f| f.parse().ok())
                    .collect();

                if fields.len() >= 4 {
                    let user = fields[0];
                    let nice = fields[1];
                    let system = fields[2];
                    let idle = fields[3];
                    let total = user + nice + system + idle;
                    let usage = if total > 0 {
                        ((total - idle) as f64 / total as f64) * 100.0
                    } else {
                        0.0
                    };

                    cpu = json!({
                        "user": user,
                        "nice": nice,
                        "system": system,
                        "idle": idle,
                        "usage_percent": (usage * 100.0).round() / 100.0,
                    });
                }
                break;
            }
        }

        Ok(cpu)
    }

    /// Parse /proc/meminfo and return memory statistics in kB.
    async fn read_memory(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let meminfo = tokio::fs::read_to_string("/proc/meminfo").await?;
        let mut mem = serde_json::Map::new();

        for line in meminfo.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let key = parts[0].trim_end_matches(':');
                if let Ok(val) = parts[1].parse::<u64>() {
                    match key {
                        "MemTotal" | "MemFree" | "MemAvailable" | "Buffers" | "Cached"
                        | "SwapTotal" | "SwapFree" => {
                            mem.insert(key.to_string(), json!(val));
                        }
                        _ => {}
                    }
                }
            }
        }

        // Derive usage percentage when possible.
        if let (Some(total), Some(available)) = (
            mem.get("MemTotal").and_then(|v| v.as_u64()),
            mem.get("MemAvailable").and_then(|v| v.as_u64()),
        ) && total > 0
        {
            let pct = ((total - available) as f64 / total as f64) * 100.0;
            mem.insert(
                "usage_percent".to_string(),
                json!((pct * 100.0).round() / 100.0),
            );
        }

        Ok(Value::Object(mem))
    }

    /// Read thermal zone temperatures from sysfs.
    async fn read_temperature(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let mut temps = Vec::new();
        let mut idx = 0u32;

        loop {
            let path = format!("/sys/class/thermal/thermal_zone{}/temp", idx);
            match tokio::fs::read_to_string(&path).await {
                Ok(raw) => {
                    if let Ok(millideg) = raw.trim().parse::<i64>() {
                        let celsius = millideg as f64 / 1000.0;
                        temps.push(json!({
                            "zone": idx,
                            "celsius": (celsius * 10.0).round() / 10.0,
                        }));
                    }
                    idx += 1;
                }
                Err(_) => break,
            }
        }

        if temps.is_empty() {
            debug!("no thermal zones found in sysfs");
        }

        Ok(json!(temps))
    }

    /// Read per-interface RX/TX byte counters from /sys/class/net/*/statistics/.
    async fn read_interface_stats(
        &self,
    ) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let mut ifaces = serde_json::Map::new();

        let mut entries = tokio::fs::read_dir("/sys/class/net").await?;
        while let Some(entry) = entries.next_entry().await? {
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip loopback.
            if name == "lo" {
                continue;
            }

            let base = format!("/sys/class/net/{}/statistics", name);
            let rx = Self::read_stat_file(&format!("{}/rx_bytes", base)).await;
            let tx = Self::read_stat_file(&format!("{}/tx_bytes", base)).await;
            let rx_packets = Self::read_stat_file(&format!("{}/rx_packets", base)).await;
            let tx_packets = Self::read_stat_file(&format!("{}/tx_packets", base)).await;
            let rx_errors = Self::read_stat_file(&format!("{}/rx_errors", base)).await;
            let tx_errors = Self::read_stat_file(&format!("{}/tx_errors", base)).await;

            ifaces.insert(
                name,
                json!({
                    "rx_bytes": rx,
                    "tx_bytes": tx,
                    "rx_packets": rx_packets,
                    "tx_packets": tx_packets,
                    "rx_errors": rx_errors,
                    "tx_errors": tx_errors,
                }),
            );
        }

        Ok(Value::Object(ifaces))
    }

    async fn read_stat_file(path: &str) -> u64 {
        match tokio::fs::read_to_string(path).await {
            Ok(raw) => raw.trim().parse().unwrap_or(0),
            Err(_) => 0,
        }
    }
}

#[async_trait::async_trait]
impl SubsystemAdapter for SystemAdapter {
    fn section(&self) -> ConfigSection {
        ConfigSection::System
    }

    /// System adapter has no writable configuration — returns host info.
    async fn read_config(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let hostname = tokio::fs::read_to_string("/proc/sys/kernel/hostname")
            .await
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        let uptime_raw = tokio::fs::read_to_string("/proc/uptime")
            .await
            .unwrap_or_default();
        let uptime_secs: f64 = uptime_raw
            .split_whitespace()
            .next()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        Ok(json!({
            "hostname": hostname,
            "uptime_secs": uptime_secs,
        }))
    }

    async fn validate(
        &self,
        _config: &Value,
    ) -> Result<Vec<ValidationIssue>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(vec![ValidationIssue {
            field: "*".to_string(),
            message: "system adapter is read-only; configuration changes are not supported"
                .to_string(),
        }])
    }

    async fn diff(
        &self,
        _proposed: &Value,
    ) -> Result<ConfigDiff, Box<dyn std::error::Error + Send + Sync>> {
        Ok(ConfigDiff {
            section: ConfigSection::System,
            additions: Vec::new(),
            removals: Vec::new(),
            changes: Vec::new(),
        })
    }

    async fn apply(
        &self,
        _config: &Value,
        _version: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        Err("system adapter is read-only; configuration cannot be applied".into())
    }

    async fn rollback(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        Err("system adapter is read-only; rollback is not supported".into())
    }

    async fn collect_metrics(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let cpu = self.read_cpu().await.unwrap_or_else(|e| {
            warn!("failed to read CPU stats: {}", e);
            json!(null)
        });

        let memory = self.read_memory().await.unwrap_or_else(|e| {
            warn!("failed to read memory stats: {}", e);
            json!(null)
        });

        let temperature = self.read_temperature().await.unwrap_or_else(|e| {
            warn!("failed to read temperature: {}", e);
            json!(null)
        });

        let interfaces = self.read_interface_stats().await.unwrap_or_else(|e| {
            warn!("failed to read interface stats: {}", e);
            json!(null)
        });

        Ok(json!({
            "cpu": cpu,
            "memory": memory,
            "temperature": temperature,
            "interfaces": interfaces,
        }))
    }
}
