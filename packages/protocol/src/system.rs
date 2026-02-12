//! System-related models

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// System status response.
///
/// High-level system information and resource usage.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SystemStatus {
    /// System uptime in seconds
    pub uptime: u64,
    /// CPU usage percentage (0-100)
    pub cpu_percent: f32,
    /// Memory usage percentage (0-100)
    pub memory_percent: f32,
    /// CPU temperature in Celsius
    pub temperature: Option<f32>,
    /// Load averages (1, 5, 15 minutes)
    pub load: [f32; 3],
    /// Current firmware version
    pub firmware_version: String,
    /// Router model
    pub model: String,
    /// Device serial number
    pub serial: String,
}

/// Detailed network interface information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceInfo {
    /// Interface name (e.g., eth0, wlan0)
    pub name: String,
    /// Interface operational status
    pub status: InterfaceInfoStatus,
    /// MAC address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mac: Option<String>,
    /// IPv4 address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    /// IPv6 address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip6: Option<String>,
    /// Total bytes received
    pub rx_bytes: u64,
    /// Total bytes transmitted
    pub tx_bytes: u64,
    /// Current receive rate (bytes/sec)
    pub rx_rate: u64,
    /// Current transmit rate (bytes/sec)
    pub tx_rate: u64,
    /// Maximum transmission unit
    pub mtu: u32,
}

/// Network interface status values.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "up")]
pub enum InterfaceInfoStatus {
    /// Interface is up and running
    Up,
    /// Interface is down
    Down,
    /// Interface status is unknown
    Unknown,
}

/// Detailed hardware information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HardwareInfo {
    /// CPU information
    pub cpu: CpuInfo,
    /// Memory information
    pub memory: MemoryInfo,
    /// Storage devices
    pub storage: Vec<StorageInfo>,
    /// Network interface hardware
    pub interfaces: Vec<InterfaceHardware>,
    /// Temperature sensors (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature_sensors: Option<Vec<TemperatureSensor>>,
    /// Cooling fans (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fans: Option<Vec<FanInfo>>,
}

/// CPU information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CpuInfo {
    /// CPU model name
    pub model: String,
    /// Number of CPU cores
    pub cores: u32,
    /// Clock frequency in MHz
    pub frequency_mhz: u32,
    /// Current CPU usage percentage (0-100)
    pub usage_percent: f32,
}

/// Memory information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MemoryInfo {
    /// Total memory in MB
    pub total_mb: u64,
    /// Used memory in MB
    pub used_mb: u64,
    /// Free memory in MB
    pub free_mb: u64,
    /// Memory usage percentage (0-100)
    pub percent_used: f32,
}

/// Storage device information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StorageInfo {
    /// Device name (e.g., /dev/sda1)
    pub device: String,
    /// Mount point path
    pub mount_point: String,
    /// Filesystem type (e.g., ext4, btrfs)
    pub filesystem: String,
    /// Total capacity in MB
    pub total_mb: u64,
    /// Used space in MB
    pub used_mb: u64,
    /// Usage percentage (0-100)
    pub percent_used: f32,
}

/// Network interface hardware information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceHardware {
    /// Interface name
    pub name: String,
    /// Driver name
    pub driver: String,
    /// Link speed in Mbps
    pub speed_mbps: Option<u32>,
    /// Duplex mode (full, half)
    pub duplex: Option<String>,
    /// Whether link is detected
    pub link: bool,
}

/// Temperature sensor reading.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemperatureSensor {
    /// Sensor name
    pub name: String,
    /// Current temperature in Celsius
    pub temperature_c: f32,
    /// Critical temperature threshold in Celsius
    #[serde(skip_serializing_if = "Option::is_none")]
    pub critical_c: Option<f32>,
}

/// Fan status information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FanInfo {
    /// Fan name
    pub name: String,
    /// Current speed in RPM
    pub rpm: u32,
    /// Speed as percentage of maximum
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<u32>,
}

/// Firmware information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FirmwareInfo {
    /// Firmware version string
    pub version: String,
    /// Build date (ISO 8601 format)
    pub build_date: String,
    /// Release channel
    pub channel: FirmwareChannel,
    /// Build hash (git commit or build ID)
    pub hash: String,
}

/// Firmware release channels.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "stable")]
pub enum FirmwareChannel {
    /// Stable release
    Stable,
    /// Beta release (testing)
    Beta,
    /// Nightly builds (development)
    Nightly,
}

/// Available firmware update information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FirmwareUpdate {
    /// Version string of the update
    pub version: String,
    /// Build date (ISO 8601 format)
    pub build_date: String,
    /// Release channel
    pub channel: FirmwareChannel,
    /// Size of the firmware file in bytes
    pub size_bytes: u64,
    /// Release notes / changelog
    pub changelog: String,
    /// URL to download the firmware
    pub download_url: String,
    /// Cryptographic signature for verification
    pub signature: String,
}

/// Boot slot information for dual-boot systems.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BootSlot {
    /// Slot identifier (0 or 1)
    pub id: u32,
    /// Whether this is the currently active slot
    pub active: bool,
    /// Whether this slot contains a bootable image
    pub bootable: bool,
    /// Firmware version in this slot
    #[serde(skip_serializing_if = "Option::is_none")]
    pub firmware_version: Option<String>,
    /// Date the firmware was installed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_date: Option<String>,
}

/// Configuration backup metadata.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BackupInfo {
    /// Unique backup identifier
    pub id: String,
    /// Unix timestamp of when backup was created
    pub created_at: i64,
    /// Size of the backup file in bytes
    pub size_bytes: u64,
    /// Whether the backup is encrypted
    pub encrypted: bool,
    /// User-provided description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Firmware version at time of backup
    pub firmware_version: String,
}
