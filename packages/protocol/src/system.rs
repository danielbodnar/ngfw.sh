//! System-related models

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// System status snapshot
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SystemStatus {
    /// System uptime in seconds
    pub uptime: u64,
    /// CPU utilization percentage (0-100)
    pub cpu_percent: f32,
    /// Memory utilization percentage (0-100)
    pub memory_percent: f32,
    /// CPU temperature in Celsius
    pub temperature: Option<f32>,
    /// System load averages [1min, 5min, 15min]
    pub load: [f32; 3],
    /// Current firmware version
    pub firmware_version: String,
    /// Hardware model
    pub model: String,
    /// Device serial number
    pub serial: String,
}

/// Network interface information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceInfo {
    /// Interface name (e.g., eth0, wlan0)
    pub name: String,
    /// Current interface status
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

/// Network interface operational status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum InterfaceInfoStatus {
    /// Interface is up and operational
    Up,
    /// Interface is down
    Down,
    /// Interface status is unknown
    Unknown,
}

/// Complete hardware information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HardwareInfo {
    /// CPU information
    pub cpu: CpuInfo,
    /// Memory information
    pub memory: MemoryInfo,
    /// Storage device information
    pub storage: Vec<StorageInfo>,
    /// Network interface hardware details
    pub interfaces: Vec<InterfaceHardware>,
    /// Temperature sensors (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature_sensors: Option<Vec<TemperatureSensor>>,
    /// Fan information (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fans: Option<Vec<FanInfo>>,
}

/// CPU information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CpuInfo {
    /// CPU model name
    pub model: String,
    /// Number of CPU cores
    pub cores: u32,
    /// CPU frequency in MHz
    pub frequency_mhz: u32,
    /// Current CPU usage percentage
    pub usage_percent: f32,
}

/// Memory information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MemoryInfo {
    /// Total memory in MB
    pub total_mb: u64,
    /// Used memory in MB
    pub used_mb: u64,
    /// Free memory in MB
    pub free_mb: u64,
    /// Memory utilization percentage
    pub percent_used: f32,
}

/// Storage device information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StorageInfo {
    /// Device name (e.g., /dev/sda1)
    pub device: String,
    /// Mount point path
    pub mount_point: String,
    /// Filesystem type
    pub filesystem: String,
    /// Total storage in MB
    pub total_mb: u64,
    /// Used storage in MB
    pub used_mb: u64,
    /// Storage utilization percentage
    pub percent_used: f32,
}

/// Network interface hardware details
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
    /// Whether link is established
    pub link: bool,
}

/// Temperature sensor reading
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemperatureSensor {
    /// Sensor name or location
    pub name: String,
    /// Temperature in Celsius
    pub temperature_c: f32,
    /// Critical threshold temperature
    #[serde(skip_serializing_if = "Option::is_none")]
    pub critical_c: Option<f32>,
}

/// Cooling fan information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FanInfo {
    /// Fan name or location
    pub name: String,
    /// Fan speed in RPM
    pub rpm: u32,
    /// Fan speed as percentage of maximum
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<u32>,
}

/// Firmware version information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FirmwareInfo {
    /// Firmware version string
    pub version: String,
    /// Build date
    pub build_date: String,
    /// Release channel
    pub channel: FirmwareChannel,
    /// Build hash or commit ID
    pub hash: String,
}

/// Firmware release channel
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum FirmwareChannel {
    /// Stable production releases
    Stable,
    /// Beta testing releases
    Beta,
    /// Nightly development builds
    Nightly,
}

/// Available firmware update information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FirmwareUpdate {
    /// New firmware version
    pub version: String,
    /// Build date
    pub build_date: String,
    /// Release channel
    pub channel: FirmwareChannel,
    /// Update file size in bytes
    pub size_bytes: u64,
    /// Changelog or release notes
    pub changelog: String,
    /// Download URL for the update
    pub download_url: String,
    /// Cryptographic signature for verification
    pub signature: String,
}

/// Dual-boot slot information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BootSlot {
    /// Slot identifier (0 or 1)
    pub id: u32,
    /// Whether this is the currently active slot
    pub active: bool,
    /// Whether this slot is bootable
    pub bootable: bool,
    /// Firmware version in this slot
    #[serde(skip_serializing_if = "Option::is_none")]
    pub firmware_version: Option<String>,
    /// Installation date
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_date: Option<String>,
}

/// Configuration backup metadata
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BackupInfo {
    /// Unique backup identifier
    pub id: String,
    /// Unix timestamp when backup was created
    pub created_at: i64,
    /// Backup file size in bytes
    pub size_bytes: u64,
    /// Whether backup is encrypted
    pub encrypted: bool,
    /// Optional backup description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Firmware version at time of backup
    pub firmware_version: String,
}
