//! NVRAM adapter — utility wrapper around the `nvram` CLI
//!
//! Asuswrt-Merlin stores most router settings in NVRAM (non-volatile RAM).
//! This adapter shells out to the `nvram` binary to get/set/commit values.
//! It is used internally by the WiFi and WireGuard adapters rather than
//! being exposed as a standalone subsystem.

use ngfw_protocol::rpc::ConfigSection;
use serde_json::{Value, json};
use tokio::process::Command;
use tracing::{debug, warn};

use super::{ConfigDiff, SubsystemAdapter, ValidationIssue};

#[derive(Default)]
pub struct NvramAdapter;

impl NvramAdapter {
    pub fn new() -> Self {
        Self
    }

    /// Run `nvram get <key>` and return the trimmed stdout.
    pub async fn get(key: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let output = Command::new("nvram").arg("get").arg(key).output().await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("nvram get {} failed: {}", key, stderr).into());
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    /// Run `nvram set key=value`.
    pub async fn set(
        key: &str,
        value: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let output = Command::new("nvram")
            .arg("set")
            .arg(format!("{}={}", key, value))
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("nvram set {}={} failed: {}", key, value, stderr).into());
        }

        debug!("nvram set {}={}", key, value);
        Ok(())
    }

    /// Run `nvram commit` to persist staged changes to flash.
    pub async fn commit() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let output = Command::new("nvram").arg("commit").output().await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("nvram commit failed: {}", stderr).into());
        }

        debug!("nvram commit succeeded");
        Ok(())
    }

    /// Run `nvram show` and parse all key=value pairs into a JSON object.
    pub async fn show_all()
    -> Result<serde_json::Map<String, Value>, Box<dyn std::error::Error + Send + Sync>> {
        let output = Command::new("nvram").arg("show").output().await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("nvram show failed: {}", stderr).into());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut map = serde_json::Map::new();

        for line in stdout.lines() {
            // Lines are "key=value"; some values contain '=' so only split on first.
            if let Some(pos) = line.find('=') {
                let key = &line[..pos];
                let value = &line[pos + 1..];
                map.insert(key.to_string(), json!(value));
            }
        }

        Ok(map)
    }

    /// Read multiple NVRAM keys matching a prefix and return them as a JSON object.
    pub async fn get_prefix(
        prefix: &str,
    ) -> Result<serde_json::Map<String, Value>, Box<dyn std::error::Error + Send + Sync>> {
        let all = Self::show_all().await?;
        let filtered: serde_json::Map<String, Value> = all
            .into_iter()
            .filter(|(k, _)| k.starts_with(prefix))
            .collect();
        Ok(filtered)
    }
}

#[async_trait::async_trait]
impl SubsystemAdapter for NvramAdapter {
    fn section(&self) -> ConfigSection {
        // NVRAM is a utility adapter, not a first-class config section.
        // Map it to System as the closest match.
        ConfigSection::System
    }

    async fn read_config(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        let map = Self::show_all().await?;
        Ok(Value::Object(map))
    }

    async fn validate(
        &self,
        config: &Value,
    ) -> Result<Vec<ValidationIssue>, Box<dyn std::error::Error + Send + Sync>> {
        let mut issues = Vec::new();

        if let Some(obj) = config.as_object() {
            for (key, value) in obj {
                if !value.is_string() {
                    issues.push(ValidationIssue {
                        field: key.clone(),
                        message: "NVRAM values must be strings".to_string(),
                    });
                }
            }
        } else {
            issues.push(ValidationIssue {
                field: "*".to_string(),
                message: "expected a JSON object of key-value pairs".to_string(),
            });
        }

        Ok(issues)
    }

    async fn diff(
        &self,
        proposed: &Value,
    ) -> Result<ConfigDiff, Box<dyn std::error::Error + Send + Sync>> {
        let current = Self::show_all().await?;
        let proposed_obj = proposed
            .as_object()
            .ok_or("proposed config must be a JSON object")?;

        let mut additions = Vec::new();
        let mut changes = Vec::new();

        for (key, new_val) in proposed_obj {
            let new_str = new_val.as_str().unwrap_or_default();
            match current.get(key) {
                Some(old_val) => {
                    let old_str = old_val.as_str().unwrap_or_default();
                    if old_str != new_str {
                        changes.push((key.clone(), old_str.to_string(), new_str.to_string()));
                    }
                }
                None => {
                    additions.push(format!("{}={}", key, new_str));
                }
            }
        }

        Ok(ConfigDiff {
            section: ConfigSection::System,
            additions,
            removals: Vec::new(),
            changes,
        })
    }

    async fn apply(
        &self,
        config: &Value,
        _version: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let obj = config
            .as_object()
            .ok_or("config must be a JSON object of key-value pairs")?;

        for (key, value) in obj {
            let val_str = value.as_str().unwrap_or_default();
            Self::set(key, val_str).await?;
        }

        Self::commit().await?;
        Ok(())
    }

    async fn rollback(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        warn!("nvram rollback is not supported; reboot to discard uncommitted changes");
        Err("nvram adapter does not support rollback".into())
    }

    async fn collect_metrics(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        // NVRAM has no runtime metrics; return entry count.
        let all = Self::show_all().await?;
        Ok(json!({ "total_keys": all.len() }))
    }
}
