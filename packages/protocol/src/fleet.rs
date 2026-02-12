//! Fleet management models

use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;

use crate::agent::ModeConfig;

/// Managed router device in the fleet
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "dev_abc123",
    "name": "Living Room Router",
    "model": "RT-AX88U",
    "serial": "SN-12345",
    "firmware_version": "1.2.3",
    "status": "online",
    "last_seen": 1700000000,
    "created_at": 1700000000,
    "tags": ["office", "main"],
    "location": "Building A, Floor 2",
    "notes": "Primary office router"
}))]
pub struct Device {
    /// Unique device identifier (UUID format)
    pub id: String,
    /// Human-readable device name set by the user
    pub name: String,
    /// Device hardware model
    pub model: String,
    /// Device serial number
    pub serial: String,
    /// Current firmware version
    pub firmware_version: String,
    /// Current operational status
    pub status: DeviceStatus,
    /// Unix timestamp of last contact with the device
    pub last_seen: Option<i64>,
    /// Unix timestamp when device was registered
    pub created_at: i64,
    /// User-defined tags for organization
    pub tags: Vec<String>,
    /// Physical location description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    /// User notes or description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Agent operating mode configuration
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_mode: Option<ModeConfig>,
}

/// Device operational status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum DeviceStatus {
    /// Device is connected and operating normally
    Online,
    /// Device is not reachable
    Offline,
    /// Device is applying a firmware update
    Updating,
    /// Device is in an error state
    Error,
    /// Device is being provisioned
    Provisioning,
}

/// Request to register a new device with the fleet
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RegisterDeviceRequest {
    /// Desired device name
    pub name: String,
    /// One-time activation code for device enrollment
    pub activation_code: String,
    /// Optional tags for organization
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Optional physical location
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    /// Optional notes or description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Response containing credentials for a newly registered device
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceRegistration {
    /// Assigned unique device identifier
    pub device_id: String,
    /// API key for device authentication
    pub api_key: String,
    /// WebSocket URL for agent connection
    pub websocket_url: String,
}

/// Comprehensive status update sent periodically by the agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceStatusUpdate {
    /// System uptime in seconds
    pub uptime: u64,
    /// CPU utilization percentage (0-100)
    pub cpu: f32,
    /// Memory utilization percentage (0-100)
    pub memory: f32,
    /// CPU temperature in Celsius (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// System load averages [1min, 5min, 15min]
    pub load: [f32; 3],
    /// Network interface status list
    pub interfaces: Vec<InterfaceStatus>,
    /// Total active connections
    pub connections: u32,
    /// WAN IP address (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_ip: Option<String>,
    /// Current firmware version
    pub firmware: String,
}

/// Network interface status snapshot
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceStatus {
    /// Interface name (e.g., eth0, wlan0)
    pub name: String,
    /// Status string (e.g., "up", "down")
    pub status: String,
    /// IPv4 address (if assigned)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    /// Total bytes received
    pub rx_bytes: u64,
    /// Total bytes transmitted
    pub tx_bytes: u64,
    /// Current receive rate (bytes/sec)
    pub rx_rate: u64,
    /// Current transmit rate (bytes/sec)
    pub tx_rate: u64,
}

/// Command to send to a managed device
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceCommand {
    /// Type of command to execute
    pub command: CommandType,
    /// Optional command-specific payload
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
}

/// Type of administrative command
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CommandType {
    /// Reboot the device
    Reboot,
    /// Shutdown the device
    Shutdown,
    /// Request immediate status update
    RefreshStatus,
    /// Apply pending configuration
    ApplyConfig,
    /// Run system diagnostics
    RunDiagnostics,
    /// Clear system caches
    ClearCache,
    /// Restart a specific service
    RestartService,
}

/// Result of a command execution
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CommandResult {
    /// Unique command identifier
    pub command_id: String,
    /// Current status of the command
    pub status: CommandStatus,
    /// Command output or result data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    /// Error message if command failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Unix timestamp when command started
    pub started_at: i64,
    /// Unix timestamp when command completed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
}

/// Execution status of a command
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum CommandStatus {
    /// Command is queued for execution
    Pending,
    /// Command is currently executing
    Running,
    /// Command completed successfully
    Completed,
    /// Command failed with an error
    Failed,
    /// Command execution timed out
    Timeout,
}

/// Reusable configuration template for devices
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigTemplate {
    /// Unique template identifier
    pub id: String,
    /// Template name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Template version number
    pub version: u32,
    /// Configuration data (JSON structure)
    pub config: serde_json::Value,
    /// Unix timestamp when created
    pub created_at: i64,
    /// Unix timestamp of last update
    pub updated_at: i64,
    /// User ID who created the template
    pub created_by: String,
}

/// Request to create a new configuration template
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTemplateRequest {
    /// Template name
    pub name: String,
    /// Optional description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Configuration data (JSON structure)
    pub config: serde_json::Value,
}

/// Request to apply a template to devices
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApplyTemplateRequest {
    /// Target device IDs
    pub device_ids: Vec<String>,
    /// Whether to merge with existing config or replace
    #[serde(default)]
    pub merge: bool,
}

/// Result of applying a template to multiple devices
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemplateApplicationResult {
    /// ID of the applied template
    pub template_id: String,
    /// Per-device application results
    pub results: Vec<DeviceApplicationResult>,
}

/// Result of applying a template to a single device
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceApplicationResult {
    /// Device ID
    pub device_id: String,
    /// Whether application succeeded
    pub success: bool,
    /// Error message if application failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Webhook configuration for event notifications
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WebhookConfig {
    /// Unique webhook identifier
    pub id: String,
    /// Webhook destination URL
    pub url: String,
    /// Events that trigger this webhook
    pub events: Vec<WebhookEvent>,
    /// Whether webhook is enabled
    pub enabled: bool,
    /// Webhook signing secret (never serialized)
    #[serde(skip_serializing)]
    pub secret: Option<String>,
    /// Unix timestamp when created
    pub created_at: i64,
}

/// Event types that can trigger webhooks
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEvent {
    /// Device came online
    DeviceOnline,
    /// Device went offline
    DeviceOffline,
    /// Security threat detected
    ThreatDetected,
    /// Configuration changed
    ConfigChanged,
    /// New firmware available
    FirmwareAvailable,
}

/// Audit log entry for compliance and security tracking
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditLogEntry {
    /// Unique log entry identifier
    pub id: String,
    /// Unix timestamp of the action
    pub timestamp: i64,
    /// ID of user who performed the action
    pub user_id: String,
    /// Device ID if action was device-specific
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    /// Action performed (e.g., "create", "update", "delete")
    pub action: String,
    /// Type of resource affected
    pub resource_type: String,
    /// ID of the affected resource
    pub resource_id: String,
    /// Detailed change information
    pub changes: Option<serde_json::Value>,
    /// IP address of the client
    pub ip_address: String,
    /// User agent string
    pub user_agent: String,
}
