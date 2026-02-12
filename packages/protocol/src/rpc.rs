//! RPC message models for router agent communication

use serde::{Deserialize, Serialize};
use serde_json::Value;
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;

/// RPC message envelope for all WebSocket communication
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "CONFIG_PUSH",
    "payload": {
        "section": "firewall",
        "config": {"default_policy": "deny"},
        "version": 42
    }
}))]
pub struct RpcMessage {
    /// Unique message identifier (UUID)
    pub id: String,
    /// Message type indicating the operation
    #[serde(rename = "type")]
    pub msg_type: MessageType,
    /// Message-specific payload data
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

/// Message types for RPC communication between server and agent
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MessageType {
    // Server to agent commands
    /// Push partial configuration update to agent
    ConfigPush,
    /// Send complete configuration to agent
    ConfigFull,
    /// Execute shell command on agent
    Exec,
    /// Reboot the device
    Reboot,
    /// Upgrade firmware
    Upgrade,
    /// Request status update from agent
    StatusRequest,
    /// Ping to check connection
    Ping,
    /// Update agent operating mode
    ModeUpdate,

    // Agent to server responses
    /// Initial authentication request
    Auth,
    /// Authentication successful
    AuthOk,
    /// Authentication failed
    AuthFail,
    /// Status update from agent
    Status,
    /// Status request acknowledged
    StatusOk,
    /// Configuration applied successfully
    ConfigAck,
    /// Configuration application failed
    ConfigFail,
    /// Command execution result
    ExecResult,
    /// Log message from agent
    Log,
    /// Security alert from agent
    Alert,
    /// Performance metrics from agent
    Metrics,
    /// Ping response
    Pong,
    /// Mode update acknowledged
    ModeAck,

    // Errors
    /// Error occurred during message processing
    Error,
}

/// Authentication request from agent on WebSocket connect
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuthRequest {
    /// Device identifier
    pub device_id: String,
    /// API key for authentication
    pub api_key: String,
    /// Agent firmware version
    pub firmware_version: String,
}

/// Authentication response from server
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    /// Whether authentication succeeded
    pub success: bool,
    /// Error message if authentication failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Server timestamp (for clock sync)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_time: Option<i64>,
}

/// Comprehensive status payload sent by agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatusPayload {
    /// System uptime in seconds
    pub uptime: u64,
    /// CPU utilization percentage (0-100)
    pub cpu: f32,
    /// Memory utilization percentage (0-100)
    pub memory: f32,
    /// CPU temperature in Celsius
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// System load averages [1min, 5min, 15min]
    pub load: [f32; 3],
    /// Network interface metrics
    pub interfaces: Vec<InterfaceMetrics>,
    /// Total active connections
    pub connections: u32,
    /// WAN IP address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_ip: Option<String>,
    /// Current firmware version
    pub firmware: String,
}

/// Network interface metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceMetrics {
    /// Interface name (e.g., eth0, wlan0)
    pub name: String,
    /// Status string (e.g., "up", "down")
    pub status: String,
    /// IPv4 address
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

/// Real-time performance metrics sent every 5 seconds
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MetricsPayload {
    /// Unix timestamp when metrics were collected
    pub timestamp: i64,
    /// CPU utilization percentage (0-100)
    pub cpu: f32,
    /// Memory utilization percentage (0-100)
    pub memory: f32,
    /// CPU temperature in Celsius
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// Per-interface transfer rates
    pub interfaces: std::collections::HashMap<String, InterfaceRates>,
    /// Connection count breakdown
    pub connections: ConnectionCounts,
    /// DNS statistics
    pub dns: DnsMetrics,
}

/// Transfer rates for a network interface
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceRates {
    /// Receive rate in bytes per second
    pub rx_rate: u64,
    /// Transmit rate in bytes per second
    pub tx_rate: u64,
}

/// Active connection counts by protocol
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConnectionCounts {
    /// Total active connections
    pub total: u32,
    /// TCP connections
    pub tcp: u32,
    /// UDP connections
    pub udp: u32,
}

/// DNS query statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DnsMetrics {
    /// Total DNS queries processed
    pub queries: u64,
    /// Queries blocked by DNS filtering
    pub blocked: u64,
    /// Queries served from cache
    pub cached: u64,
}

/// Configuration update to push to agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigPush {
    /// Which configuration section to update
    pub section: ConfigSection,
    /// Configuration data for the section
    pub config: Value,
    /// Configuration version number for tracking
    pub version: u64,
}

/// Configuration section categories
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ConfigSection {
    /// WAN interface configuration
    Wan,
    /// LAN interface configuration
    Lan,
    /// WiFi/wireless configuration
    Wifi,
    /// DHCP server configuration
    Dhcp,
    /// Firewall rules and policies
    Firewall,
    /// NAT configuration
    Nat,
    /// DNS configuration
    Dns,
    /// Intrusion detection system
    Ids,
    /// VPN configuration
    Vpn,
    /// Quality of Service rules
    Qos,
    /// System-level settings
    System,
    /// Complete configuration (all sections)
    Full,
}

/// Configuration acknowledgment from agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigAck {
    /// Which section was applied
    pub section: ConfigSection,
    /// Version number that was applied
    pub version: u64,
    /// Whether configuration was applied successfully
    pub success: bool,
    /// Error message if application failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Request to execute a shell command on the agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecCommand {
    /// Unique command identifier for tracking
    pub command_id: String,
    /// Command to execute
    pub command: String,
    /// Optional command arguments
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    /// Optional timeout in seconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_secs: Option<u32>,
}

/// Result of command execution from agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecResult {
    /// Command identifier matching ExecCommand
    pub command_id: String,
    /// Process exit code
    pub exit_code: i32,
    /// Standard output from command
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
    /// Standard error from command
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr: Option<String>,
    /// Execution duration in milliseconds
    pub duration_ms: u64,
}

/// Log message from agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LogMessage {
    /// Unix timestamp when log was generated
    pub timestamp: i64,
    /// Log severity level
    pub level: LogLevel,
    /// Component that generated the log
    pub component: String,
    /// Log message text
    pub message: String,
    /// Optional structured details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

/// Log severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    /// Detailed debugging information
    Debug,
    /// Informational messages
    Info,
    /// Warning messages
    Warn,
    /// Error messages
    Error,
    /// Critical system failures
    Critical,
}

/// Security alert from agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AlertMessage {
    /// Unix timestamp when alert was detected
    pub timestamp: i64,
    /// Alert severity level
    pub severity: AlertSeverity,
    /// Type of security event
    pub alert_type: AlertType,
    /// Source IP or identifier
    pub source: String,
    /// Human-readable alert description
    pub description: String,
    /// Optional structured alert details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum AlertSeverity {
    /// Low-priority informational alerts
    Low,
    /// Medium-priority alerts requiring attention
    Medium,
    /// High-priority security events
    High,
    /// Critical security incidents
    Critical,
}

/// Types of security alerts
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AlertType {
    /// Attempted unauthorized access
    IntrusionAttempt,
    /// Malware signature detected
    MalwareDetected,
    /// Repeated login failures
    BruteForce,
    /// Port scanning activity
    PortScan,
    /// Distributed denial-of-service attack
    DdosAttempt,
    /// Firewall policy violation
    PolicyViolation,
    /// Configuration was modified
    ConfigChange,
    /// Unusual system behavior detected
    SystemAnomaly,
}

/// Firmware upgrade command from server to agent
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpgradeCommand {
    /// Target firmware version
    pub version: String,
    /// URL to download firmware image
    pub download_url: String,
    /// SHA-256 checksum for verification
    pub checksum: String,
    /// Cryptographic signature for authenticity
    pub signature: String,
    /// Whether to force upgrade even if version is older
    #[serde(default)]
    pub force: bool,
}
