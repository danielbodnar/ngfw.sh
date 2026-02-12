//! Agent mode and configuration types

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::rpc::ConfigSection;

/// Operating mode for the agent or a specific subsystem.
///
/// Controls how the agent interacts with router configuration:
/// - `observe`: Read-only monitoring
/// - `shadow`: Validate configs without applying
/// - `takeover`: Full configuration control
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, ToSchema)]
#[serde(rename_all = "lowercase")]
#[schema(example = "observe")]
pub enum AgentMode {
    /// Read-only: collect metrics, send logs/alerts, report config state
    #[default]
    Observe,
    /// Validate and diff proposed configs without applying
    Shadow,
    /// Full control: validate, apply, rollback configurations
    Takeover,
}

/// Mode configuration with optional per-section overrides.
///
/// Allows fine-grained control where different router subsystems
/// can operate in different modes (e.g., firewall in takeover mode
/// while WiFi remains in observe mode).
#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct ModeConfig {
    /// Base operating mode for the agent
    pub mode: AgentMode,
    /// Per-section overrides (e.g., Firewall=takeover while WiFi=observe)
    #[serde(default)]
    pub section_overrides: HashMap<ConfigSection, AgentMode>,
}

impl ModeConfig {
    /// Get the effective mode for a given config section
    pub fn effective_mode(&self, section: &ConfigSection) -> &AgentMode {
        self.section_overrides.get(section).unwrap_or(&self.mode)
    }
}

/// Server→Agent: mode change request.
///
/// Sent from the cloud API to instruct an agent to change its operating mode.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ModeUpdatePayload {
    /// The new mode configuration to apply
    pub mode_config: ModeConfig,
}

/// Agent→Server: mode change acknowledgment.
///
/// Response from the agent confirming whether the mode change was successful.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ModeAckPayload {
    /// Whether the mode change was successful
    pub success: bool,
    /// The current mode configuration after the change attempt
    pub mode_config: ModeConfig,
    /// Error message if the mode change failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Agent configuration information.
///
/// Contains metadata about the running agent instance.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "version": "1.2.0",
    "device_id": "dev_abc123",
    "firmware_version": "3.0.0.4.386",
    "model": "RT-AX88U",
    "mode": "observe"
}))]
pub struct AgentInfo {
    /// Agent software version
    pub version: String,
    /// Unique device identifier
    pub device_id: String,
    /// Router firmware version
    pub firmware_version: String,
    /// Router model (e.g., RT-AX88U)
    pub model: String,
    /// Current operating mode
    pub mode: AgentMode,
}
