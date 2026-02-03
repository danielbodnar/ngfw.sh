//! System-related models

use serde::{Deserialize, Serialize};

/// System status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStatus {
    pub uptime: u64,
    pub cpu_percent: f32,
    pub memory_percent: f32,
    pub temperature: Option<f32>,
    pub load: [f32; 3],
    pub firmware_version: String,
    pub model: String,
    pub serial: String,
}

/// Network interface information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceInfo {
    pub name: String,
    pub status: InterfaceStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mac: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip6: Option<String>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_rate: u64,
    pub tx_rate: u64,
    pub mtu: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum InterfaceStatus {
    Up,
    Down,
    Unknown,
}

/// Hardware information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub storage: Vec<StorageInfo>,
    pub interfaces: Vec<InterfaceHardware>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature_sensors: Option<Vec<TemperatureSensor>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fans: Option<Vec<FanInfo>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub model: String,
    pub cores: u32,
    pub frequency_mhz: u32,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total_mb: u64,
    pub used_mb: u64,
    pub free_mb: u64,
    pub percent_used: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageInfo {
    pub device: String,
    pub mount_point: String,
    pub filesystem: String,
    pub total_mb: u64,
    pub used_mb: u64,
    pub percent_used: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceHardware {
    pub name: String,
    pub driver: String,
    pub speed_mbps: Option<u32>,
    pub duplex: Option<String>,
    pub link: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemperatureSensor {
    pub name: String,
    pub temperature_c: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub critical_c: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FanInfo {
    pub name: String,
    pub rpm: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<u32>,
}

/// Firmware information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmwareInfo {
    pub version: String,
    pub build_date: String,
    pub channel: FirmwareChannel,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FirmwareChannel {
    Stable,
    Beta,
    Nightly,
}

/// Available firmware update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmwareUpdate {
    pub version: String,
    pub build_date: String,
    pub channel: FirmwareChannel,
    pub size_bytes: u64,
    pub changelog: String,
    pub download_url: String,
    pub signature: String,
}

/// Boot slot information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BootSlot {
    pub id: u32,
    pub active: bool,
    pub bootable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub firmware_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_date: Option<String>,
}

/// Backup metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub created_at: i64,
    pub size_bytes: u64,
    pub encrypted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub firmware_version: String,
}
