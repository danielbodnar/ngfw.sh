//! Agent mode and configuration types

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;

use crate::rpc::ConfigSection;

/// Operating mode for the agent or a specific subsystem
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum AgentMode {
    /// Read-only mode: collect metrics, send logs/alerts, report configuration state without making changes
    #[default]
    Observe,
    /// Shadow mode: validate and diff proposed configurations without applying them
    Shadow,
    /// Takeover mode: full control with ability to validate, apply, and rollback configurations
    Takeover,
}

/// Agent mode configuration with optional per-section overrides
#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "mode": "observe",
    "section_overrides": {
        "firewall": "takeover",
        "wifi": "shadow"
    }
}))]
pub struct ModeConfig {
    /// Base operating mode for all sections
    pub mode: AgentMode,
    /// Per-section mode overrides (e.g., Firewall=takeover while WiFi=observe)
    #[serde(default)]
    pub section_overrides: HashMap<ConfigSection, AgentMode>,
}

impl ModeConfig {
    /// Get the effective mode for a given config section
    pub fn effective_mode(&self, section: &ConfigSection) -> &AgentMode {
        self.section_overrides.get(section).unwrap_or(&self.mode)
    }
}

/// Server→Agent: mode change request payload
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ModeUpdatePayload {
    /// New mode configuration to apply
    pub mode_config: ModeConfig,
}

/// Agent→Server: mode change acknowledgment payload
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ModeAckPayload {
    /// Whether mode change was successful
    pub success: bool,
    /// Actual mode configuration now active
    pub mode_config: ModeConfig,
    /// Error message if mode change failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Agent identification and status information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AgentInfo {
    /// Agent software version
    pub version: String,
    /// Device identifier (UUID)
    pub device_id: String,
    /// Firmware version running on the device
    pub firmware_version: String,
    /// Hardware model
    pub model: String,
    /// Current operating mode
    pub mode: AgentMode,
}
