//! RPC message models for router agent communication

use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;

/// RPC message envelope.
///
/// All WebSocket communication between agent and server uses this envelope format.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "msg_abc123",
    "type": "STATUS",
    "payload": {}
}))]
pub struct RpcMessage {
    /// Unique message identifier for correlation
    pub id: String,
    /// Message type discriminator
    #[serde(rename = "type")]
    pub msg_type: MessageType,
    /// Message payload (structure depends on msg_type)
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

/// Message types for RPC communication.
///
/// Defines all message types exchanged between agent and server over WebSocket.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[schema(example = "STATUS")]
pub enum MessageType {
    // Server to agent
    /// Push configuration changes to agent
    ConfigPush,
    /// Request full configuration sync
    ConfigFull,
    /// Execute a command on the device
    Exec,
    /// Reboot the device
    Reboot,
    /// Upgrade device firmware
    Upgrade,
    /// Request current status from agent
    StatusRequest,
    /// Ping for keepalive
    Ping,
    /// Update agent operating mode
    ModeUpdate,

    // Agent to server
    /// Authentication request from agent
    Auth,
    /// Authentication successful
    AuthOk,
    /// Authentication failed
    AuthFail,
    /// Status update from agent
    Status,
    /// Status request acknowledged
    StatusOk,
    /// Configuration change acknowledged
    ConfigAck,
    /// Configuration change failed
    ConfigFail,
    /// Command execution result
    ExecResult,
    /// Log message from agent
    Log,
    /// Security alert from agent
    Alert,
    /// Periodic metrics from agent
    Metrics,
    /// Pong response to ping
    Pong,
    /// Mode change acknowledged
    ModeAck,

    // Errors
    /// Error response
    Error,
}

/// Authentication request from agent.
///
/// First message sent by agent after WebSocket connection is established.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuthRequest {
    /// Device identifier
    pub device_id: String,
    /// API key for authentication
    pub api_key: String,
    /// Current firmware version
    pub firmware_version: String,
}

/// Authentication response from server.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    /// Whether authentication was successful
    pub success: bool,
    /// Error message if authentication failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Server time for clock sync (Unix timestamp)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_time: Option<i64>,
}

/// Status payload from agent.
///
/// Detailed status information sent periodically by the agent.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatusPayload {
    /// System uptime in seconds
    pub uptime: u64,
    /// CPU usage percentage (0-100)
    pub cpu: f32,
    /// Memory usage percentage (0-100)
    pub memory: f32,
    /// CPU temperature in Celsius
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// Load averages (1, 5, 15 minutes)
    pub load: [f32; 3],
    /// Network interface metrics
    pub interfaces: Vec<InterfaceMetrics>,
    /// Number of active connections
    pub connections: u32,
    /// Public WAN IP address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_ip: Option<String>,
    /// Current firmware version
    pub firmware: String,
}

/// Network interface metrics.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceMetrics {
    /// Interface name (e.g., eth0, wlan0)
    pub name: String,
    /// Interface status (up, down, etc.)
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

/// Metrics payload from agent.
///
/// Lightweight metrics sent frequently (every 5 seconds) for real-time monitoring.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MetricsPayload {
    /// Unix timestamp of the metrics sample
    pub timestamp: i64,
    /// CPU usage percentage (0-100)
    pub cpu: f32,
    /// Memory usage percentage (0-100)
    pub memory: f32,
    /// CPU temperature in Celsius
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// Per-interface transfer rates (keyed by interface name)
    pub interfaces: std::collections::HashMap<String, InterfaceRates>,
    /// Connection counts by protocol
    pub connections: ConnectionCounts,
    /// DNS resolver metrics
    pub dns: DnsMetrics,
}

/// Network interface transfer rates.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InterfaceRates {
    /// Current receive rate (bytes/sec)
    pub rx_rate: u64,
    /// Current transmit rate (bytes/sec)
    pub tx_rate: u64,
}

/// Connection counts by protocol.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConnectionCounts {
    /// Total active connections
    pub total: u32,
    /// TCP connections
    pub tcp: u32,
    /// UDP connections
    pub udp: u32,
}

/// DNS resolver metrics.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DnsMetrics {
    /// Total DNS queries processed
    pub queries: u64,
    /// Queries blocked by filtering rules
    pub blocked: u64,
    /// Queries served from cache
    pub cached: u64,
}

/// Configuration push to agent.
///
/// Server sends this to apply configuration changes to a specific section.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigPush {
    /// Configuration section being updated
    pub section: ConfigSection,
    /// New configuration data
    pub config: Value,
    /// Version number for conflict detection
    pub version: u64,
}

/// Configuration section identifiers.
///
/// Router configuration is divided into logical sections for granular updates.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "firewall")]
pub enum ConfigSection {
    /// WAN interface configuration
    Wan,
    /// LAN interface configuration
    Lan,
    /// WiFi configuration
    Wifi,
    /// DHCP server configuration
    Dhcp,
    /// Firewall rules
    Firewall,
    /// NAT rules
    Nat,
    /// DNS resolver configuration
    Dns,
    /// Intrusion Detection System
    Ids,
    /// VPN configuration
    Vpn,
    /// Quality of Service rules
    Qos,
    /// System settings
    System,
    /// Full configuration (all sections)
    Full,
}

/// Configuration acknowledgment from agent.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigAck {
    /// Configuration section that was updated
    pub section: ConfigSection,
    /// Version number that was applied
    pub version: u64,
    /// Whether the configuration was applied successfully
    pub success: bool,
    /// Error message if application failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Execute command on agent.
///
/// Server sends this to execute a shell command on the device.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecCommand {
    /// Unique command identifier for correlation
    pub command_id: String,
    /// Command to execute
    pub command: String,
    /// Command arguments
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    /// Execution timeout in seconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_secs: Option<u32>,
}

/// Command execution result from agent.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecResult {
    /// Command identifier (matches ExecCommand.command_id)
    pub command_id: String,
    /// Process exit code
    pub exit_code: i32,
    /// Standard output (if captured)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
    /// Standard error (if captured)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr: Option<String>,
    /// Execution duration in milliseconds
    pub duration_ms: u64,
}

/// Log message from agent.
///
/// Agent forwards selected log entries to the server.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LogMessage {
    /// Unix timestamp of the log entry
    pub timestamp: i64,
    /// Log severity level
    pub level: LogLevel,
    /// Component that generated the log
    pub component: String,
    /// Log message text
    pub message: String,
    /// Additional structured details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

/// Log severity levels.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "info")]
pub enum LogLevel {
    /// Debug-level messages
    Debug,
    /// Informational messages
    Info,
    /// Warning messages
    Warn,
    /// Error messages
    Error,
    /// Critical errors
    Critical,
}

/// Security alert from agent.
///
/// Agent sends this when a security event is detected.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AlertMessage {
    /// Unix timestamp of the alert
    pub timestamp: i64,
    /// Alert severity level
    pub severity: AlertSeverity,
    /// Type of security event
    pub alert_type: AlertType,
    /// Source of the threat (IP, hostname, etc.)
    pub source: String,
    /// Human-readable description
    pub description: String,
    /// Additional details about the alert
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

/// Alert severity levels.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "high")]
pub enum AlertSeverity {
    /// Low severity - informational
    Low,
    /// Medium severity - potential threat
    Medium,
    /// High severity - active threat
    High,
    /// Critical - immediate action required
    Critical,
}

/// Security alert types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
#[schema(example = "intrusion_attempt")]
pub enum AlertType {
    /// Intrusion attempt detected
    IntrusionAttempt,
    /// Malware communication detected
    MalwareDetected,
    /// Brute force attack detected
    BruteForce,
    /// Port scan detected
    PortScan,
    /// DDoS attack detected
    DdosAttempt,
    /// Firewall policy violation
    PolicyViolation,
    /// Configuration change detected
    ConfigChange,
    /// System anomaly detected
    SystemAnomaly,
}

/// Firmware upgrade command.
///
/// Server sends this to initiate a firmware upgrade on the device.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpgradeCommand {
    /// Target firmware version
    pub version: String,
    /// URL to download the firmware
    pub download_url: String,
    /// SHA256 checksum of the firmware file
    pub checksum: String,
    /// Cryptographic signature for verification
    pub signature: String,
    /// Force upgrade even if current version is newer
    #[serde(default)]
    pub force: bool,
}
