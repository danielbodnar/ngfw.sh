//! Fleet management models

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::agent::ModeConfig;

/// A managed router device in the fleet.
///
/// Represents a single router registered with the NGFW.sh service.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "dev_abc123",
    "name": "Living Room Router",
    "model": "RT-AX88U",
    "serial": "ABC123456789",
    "firmware_version": "3.0.0.4.386",
    "status": "online",
    "last_seen": 1700000000,
    "created_at": 1690000000,
    "tags": ["home", "primary"]
}))]
pub struct Device {
    /// Unique device identifier (UUID format)
    pub id: String,
    /// Human-readable device name set by the user
    pub name: String,
    /// Router model (e.g., RT-AX88U, GT-AX11000)
    pub model: String,
    /// Device serial number
    pub serial: String,
    /// Current firmware version running on the device
    pub firmware_version: String,
    /// Current device status
    pub status: DeviceStatus,
    /// Unix timestamp of last communication with the device
    pub last_seen: Option<i64>,
    /// Unix timestamp of when the device was registered
    pub created_at: i64,
    /// User-defined tags for organizing devices
    pub tags: Vec<String>,
    /// Physical location of the device
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    /// User notes about the device
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Current agent operating mode configuration
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_mode: Option<ModeConfig>,
}

/// Device status values.
///
/// Indicates the current operational state of a device.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "online")]
pub enum DeviceStatus {
    /// Device is connected and responding
    Online,
    /// Device is not reachable
    Offline,
    /// Device is applying a firmware update
    Updating,
    /// Device is in an error state
    Error,
    /// Device is being set up for the first time
    Provisioning,
}

/// Request to register a new device in the fleet.
///
/// Sent by users to add a router to their account using an activation code.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "name": "Office Router",
    "activation_code": "NGFW-XXXX-YYYY-ZZZZ",
    "tags": ["office", "primary"]
}))]
pub struct RegisterDeviceRequest {
    /// Human-readable name for the device
    pub name: String,
    /// Activation code from the router's setup screen
    pub activation_code: String,
    /// Optional tags for organizing the device
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Physical location of the device
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    /// Notes about the device
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Response after successful device registration.
///
/// Contains credentials the agent needs to connect to the cloud service.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceRegistration {
    /// Assigned device identifier
    pub device_id: String,
    /// API key for WebSocket authentication
    pub api_key: String,
    /// WebSocket URL to connect to
    pub websocket_url: String,
}

/// Device status update from the agent.
///
/// Periodic status report sent by the agent to the cloud service.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceStatusUpdate {
    /// System uptime in seconds
    pub uptime: u64,
    /// CPU usage percentage (0-100)
    pub cpu: f32,
    /// Memory usage percentage (0-100)
    pub memory: f32,
    /// CPU temperature in Celsius (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// Load averages (1, 5, 15 minutes)
    pub load: [f32; 3],
    /// Status of network interfaces
    pub interfaces: Vec<InterfaceStatus>,
    /// Number of active network connections
    pub connections: u32,
    /// Public WAN IP address (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_ip: Option<String>,
    /// Current firmware version
    pub firmware: String,
}

/// Network interface status information.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceStatus {
    /// Interface name (e.g., eth0, wlan0)
    pub name: String,
    /// Interface status (up, down, etc.)
    pub status: String,
    /// IPv4 address assigned to the interface
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    /// Total bytes received
    pub rx_bytes: u64,
    /// Total bytes transmitted
    pub tx_bytes: u64,
    /// Current receive rate in bytes/sec
    pub rx_rate: u64,
    /// Current transmit rate in bytes/sec
    pub tx_rate: u64,
}

/// Command to send to a device.
///
/// Used to trigger actions on managed routers.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "command": "reboot",
    "payload": null
}))]
pub struct DeviceCommand {
    /// Type of command to execute
    pub command: CommandType,
    /// Optional command-specific payload
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
}

/// Available device command types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
#[schema(example = "reboot")]
pub enum CommandType {
    /// Reboot the device
    Reboot,
    /// Shut down the device
    Shutdown,
    /// Request immediate status update
    RefreshStatus,
    /// Apply pending configuration changes
    ApplyConfig,
    /// Run network diagnostics
    RunDiagnostics,
    /// Clear cached data (DNS cache, connection tracking, etc.)
    ClearCache,
    /// Restart a specific service
    RestartService,
}

/// Result of a command execution.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CommandResult {
    /// Unique command identifier
    pub command_id: String,
    /// Current execution status
    pub status: CommandStatus,
    /// Command output data (if successful)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    /// Error message (if failed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Unix timestamp when execution started
    pub started_at: i64,
    /// Unix timestamp when execution completed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
}

/// Command execution status values.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "completed")]
pub enum CommandStatus {
    /// Command is queued
    Pending,
    /// Command is currently executing
    Running,
    /// Command completed successfully
    Completed,
    /// Command failed
    Failed,
    /// Command execution timed out
    Timeout,
}

/// A reusable configuration template.
///
/// Templates allow saving and applying configuration presets to multiple devices.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigTemplate {
    /// Unique template identifier
    pub id: String,
    /// Template name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Version number (incremented on each update)
    pub version: u32,
    /// The configuration data
    pub config: serde_json::Value,
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Unix timestamp of last update
    pub updated_at: i64,
    /// User ID who created the template
    pub created_by: String,
}

/// Request to create a new configuration template.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "name": "Office Router Standard",
    "description": "Standard configuration for office routers",
    "config": {"firewall": {"enabled": true}}
}))]
pub struct CreateTemplateRequest {
    /// Template name
    pub name: String,
    /// Optional description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// The configuration data
    pub config: serde_json::Value,
}

/// Request to apply a template to devices.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "device_ids": ["dev_abc123", "dev_xyz789"],
    "merge": true
}))]
pub struct ApplyTemplateRequest {
    /// List of device IDs to apply the template to
    pub device_ids: Vec<String>,
    /// If true, merge with existing config; if false, replace entirely
    #[serde(default)]
    pub merge: bool,
}

/// Result of applying a template to devices.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemplateApplicationResult {
    /// Template that was applied
    pub template_id: String,
    /// Results for each device
    pub results: Vec<DeviceApplicationResult>,
}

/// Result of applying a template to a single device.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DeviceApplicationResult {
    /// Device identifier
    pub device_id: String,
    /// Whether application was successful
    pub success: bool,
    /// Error message if failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Webhook configuration for receiving event notifications.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "wh_abc123",
    "url": "https://example.com/webhook",
    "events": ["device_online", "threat_detected"],
    "enabled": true,
    "created_at": 1700000000
}))]
pub struct WebhookConfig {
    /// Unique webhook identifier
    pub id: String,
    /// URL to send webhook events to
    pub url: String,
    /// List of events to subscribe to
    pub events: Vec<WebhookEvent>,
    /// Whether the webhook is active
    pub enabled: bool,
    /// Webhook signing secret (never serialized in responses)
    #[serde(skip_serializing)]
    pub secret: Option<String>,
    /// Unix timestamp of creation
    pub created_at: i64,
}

/// Webhook event types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
#[schema(example = "device_online")]
pub enum WebhookEvent {
    /// Device came online
    DeviceOnline,
    /// Device went offline
    DeviceOffline,
    /// Security threat was detected
    ThreatDetected,
    /// Configuration was changed
    ConfigChanged,
    /// New firmware is available
    FirmwareAvailable,
}

/// Audit log entry for tracking user actions.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditLogEntry {
    /// Unique log entry identifier
    pub id: String,
    /// Unix timestamp of the action
    pub timestamp: i64,
    /// User who performed the action
    pub user_id: String,
    /// Device affected (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    /// Action performed (e.g., "create", "update", "delete")
    pub action: String,
    /// Type of resource affected
    pub resource_type: String,
    /// ID of the resource affected
    pub resource_id: String,
    /// Details of changes made
    pub changes: Option<serde_json::Value>,
    /// IP address of the request
    pub ip_address: String,
    /// User agent string
    pub user_agent: String,
}
