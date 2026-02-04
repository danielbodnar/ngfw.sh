//! RPC message models for router agent communication

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// RPC message envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcMessage {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: MessageType,
    pub payload: Value,
}

impl RpcMessage {
    /// Create a new RPC message with an auto-generated UUID
    #[cfg(any(feature = "native", feature = "js"))]
    pub fn new(msg_type: MessageType, payload: Value) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            msg_type,
            payload,
        }
    }

    /// Create a new RPC message with a provided ID
    pub fn with_id(id: String, msg_type: MessageType, payload: Value) -> Self {
        Self {
            id,
            msg_type,
            payload,
        }
    }
}

/// Message types for RPC communication
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MessageType {
    // Server to agent
    ConfigPush,
    ConfigFull,
    Exec,
    Reboot,
    Upgrade,
    StatusRequest,
    Ping,
    ModeUpdate,

    // Agent to server
    Auth,
    AuthOk,
    AuthFail,
    Status,
    StatusOk,
    ConfigAck,
    ConfigFail,
    ExecResult,
    Log,
    Alert,
    Metrics,
    Pong,
    ModeAck,

    // Errors
    Error,
}

/// Authentication request from agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthRequest {
    pub device_id: String,
    pub api_key: String,
    pub firmware_version: String,
}

/// Authentication response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_time: Option<i64>,
}

/// Status payload from agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusPayload {
    pub uptime: u64,
    pub cpu: f32,
    pub memory: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    pub load: [f32; 3],
    pub interfaces: Vec<InterfaceMetrics>,
    pub connections: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_ip: Option<String>,
    pub firmware: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceMetrics {
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_rate: u64,
    pub tx_rate: u64,
}

/// Metrics payload from agent (sent every 5 seconds)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsPayload {
    pub timestamp: i64,
    pub cpu: f32,
    pub memory: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    pub interfaces: std::collections::HashMap<String, InterfaceRates>,
    pub connections: ConnectionCounts,
    pub dns: DnsMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceRates {
    pub rx_rate: u64,
    pub tx_rate: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionCounts {
    pub total: u32,
    pub tcp: u32,
    pub udp: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsMetrics {
    pub queries: u64,
    pub blocked: u64,
    pub cached: u64,
}

/// Configuration push to agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigPush {
    pub section: ConfigSection,
    pub config: Value,
    pub version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum ConfigSection {
    Wan,
    Lan,
    Wifi,
    Dhcp,
    Firewall,
    Nat,
    Dns,
    Ids,
    Vpn,
    Qos,
    System,
    Full,
}

/// Configuration acknowledgment from agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigAck {
    pub section: ConfigSection,
    pub version: u64,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Execute command on agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecCommand {
    pub command_id: String,
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_secs: Option<u32>,
}

/// Command execution result from agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecResult {
    pub command_id: String,
    pub exit_code: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr: Option<String>,
    pub duration_ms: u64,
}

/// Log message from agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogMessage {
    pub timestamp: i64,
    pub level: LogLevel,
    pub component: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
    Critical,
}

/// Security alert from agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertMessage {
    pub timestamp: i64,
    pub severity: AlertSeverity,
    pub alert_type: AlertType,
    pub source: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AlertType {
    IntrusionAttempt,
    MalwareDetected,
    BruteForce,
    PortScan,
    DdosAttempt,
    PolicyViolation,
    ConfigChange,
    SystemAnomaly,
}

/// Firmware upgrade command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeCommand {
    pub version: String,
    pub download_url: String,
    pub checksum: String,
    pub signature: String,
    #[serde(default)]
    pub force: bool,
}
