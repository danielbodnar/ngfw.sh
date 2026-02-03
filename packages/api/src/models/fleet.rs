//! Fleet management models

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// Managed device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub model: String,
    pub serial: String,
    pub firmware_version: String,
    pub status: DeviceStatus,
    pub last_seen: Option<i64>,
    pub created_at: i64,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceStatus {
    Online,
    Offline,
    Updating,
    Error,
    Provisioning,
}

/// Register device request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterDeviceRequest {
    pub name: String,
    pub activation_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Device registration response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRegistration {
    pub device_id: String,
    pub api_key: String,
    pub websocket_url: String,
}

/// Device status update (from agent)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceStatusUpdate {
    pub uptime: u64,
    pub cpu: f32,
    pub memory: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    pub load: [f32; 3],
    pub interfaces: Vec<InterfaceStatus>,
    pub connections: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_ip: Option<String>,
    pub firmware: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceStatus {
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_rate: u64,
    pub tx_rate: u64,
}

/// Command to send to device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCommand {
    pub command: CommandType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CommandType {
    Reboot,
    Shutdown,
    RefreshStatus,
    ApplyConfig,
    RunDiagnostics,
    ClearCache,
    RestartService,
}

/// Command result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub command_id: String,
    pub status: CommandStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub started_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CommandStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Timeout,
}

/// Configuration template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: u32,
    pub config: serde_json::Value,
    pub created_at: i64,
    pub updated_at: i64,
    pub created_by: String,
}

/// Create template request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub config: serde_json::Value,
}

/// Apply template request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyTemplateRequest {
    pub device_ids: Vec<String>,
    #[serde(default)]
    pub merge: bool,
}

/// Template application result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateApplicationResult {
    pub template_id: String,
    pub results: Vec<DeviceApplicationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceApplicationResult {
    pub device_id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Webhook configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    pub id: String,
    pub url: String,
    pub events: Vec<WebhookEvent>,
    pub enabled: bool,
    #[serde(skip_serializing)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secret: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEvent {
    DeviceOnline,
    DeviceOffline,
    ThreatDetected,
    ConfigChanged,
    FirmwareAvailable,
}

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub timestamp: i64,
    pub user_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub changes: Option<serde_json::Value>,
    pub ip_address: String,
    pub user_agent: String,
}
