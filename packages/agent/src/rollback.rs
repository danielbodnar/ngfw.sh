//! Backup and restore of configuration state before applying changes.
//!
//! Each config section is backed up as a standalone JSON file under
//! `/jffs/ngfw/rollback/`. A `versions.json` file tracks the last
//! successfully applied version number per section. Only the most
//! recent backup per section is kept (overwritten on each backup).

use ngfw_protocol::ConfigSection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tracing::{error, info, warn};

const ROLLBACK_DIR: &str = "/jffs/ngfw/rollback";

/// Tracks the last known config version per section.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct VersionMap {
    versions: HashMap<String, u64>,
}

/// Derive the lowercase section name used for file paths.
fn section_name(section: &ConfigSection) -> String {
    // ConfigSection uses `#[serde(rename_all = "lowercase")]`, so
    // serializing the variant as a JSON string produces `"firewall"` etc.
    serde_json::to_value(section)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_else(|| format!("{:?}", section).to_lowercase())
}

/// Path to the backup file for a given section.
fn backup_path(section: &ConfigSection) -> PathBuf {
    PathBuf::from(ROLLBACK_DIR).join(format!("{}.json", section_name(section)))
}

/// Path to the version map file.
fn versions_path() -> PathBuf {
    PathBuf::from(ROLLBACK_DIR).join("versions.json")
}

/// Create the rollback directory if it does not already exist.
pub async fn ensure_rollback_dir() {
    if let Err(e) = tokio::fs::create_dir_all(ROLLBACK_DIR).await {
        error!(
            "Failed to create rollback directory {}: {}",
            ROLLBACK_DIR, e
        );
    }
}

/// Save the current config state for `section` so it can be restored later.
///
/// Overwrites any previous backup for the same section.
pub async fn backup(
    section: &ConfigSection,
    config: &serde_json::Value,
) -> Result<(), std::io::Error> {
    ensure_rollback_dir().await;

    let path = backup_path(section);
    let data = serde_json::to_string_pretty(config)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    tokio::fs::write(&path, data).await?;
    info!(
        "Backed up {} config to {}",
        section_name(section),
        path.display()
    );
    Ok(())
}

/// Restore the previously backed-up config for `section`.
///
/// Returns the JSON value read from disk. If the backup file does not
/// exist (e.g. first run), an error is returned rather than panicking.
pub async fn restore(
    section: &ConfigSection,
) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let path = backup_path(section);

    let data = match tokio::fs::read_to_string(&path).await {
        Ok(d) => d,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            warn!(
                "No rollback backup found for {} at {}",
                section_name(section),
                path.display()
            );
            return Err(Box::new(e));
        }
        Err(e) => return Err(Box::new(e)),
    };

    let value: serde_json::Value = serde_json::from_str(&data)?;
    info!(
        "Restored {} config from {}",
        section_name(section),
        path.display()
    );
    Ok(value)
}

/// Update the persisted version number for `section`.
pub async fn update_version(section: &ConfigSection, version: u64) -> Result<(), std::io::Error> {
    ensure_rollback_dir().await;

    let path = versions_path();
    let mut map = load_version_map().await;

    map.versions.insert(section_name(section), version);

    let data = serde_json::to_string_pretty(&map)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    tokio::fs::write(&path, data).await?;
    info!("Updated {} version to {}", section_name(section), version);
    Ok(())
}

/// Get the last known version for `section`, or `None` if untracked.
pub async fn get_version(section: &ConfigSection) -> Option<u64> {
    let map = load_version_map().await;
    map.versions.get(&section_name(section)).copied()
}

/// Read the version map from disk, returning an empty map on any failure.
async fn load_version_map() -> VersionMap {
    let path = versions_path();

    let data = match tokio::fs::read_to_string(&path).await {
        Ok(d) => d,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return VersionMap::default(),
        Err(e) => {
            warn!("Failed to read {}: {}", path.display(), e);
            return VersionMap::default();
        }
    };

    match serde_json::from_str(&data) {
        Ok(m) => m,
        Err(e) => {
            warn!("Corrupt versions.json, resetting: {}", e);
            VersionMap::default()
        }
    }
}
