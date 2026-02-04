//! Agent mode and configuration types

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::rpc::ConfigSection;

/// Operating mode for the agent or a specific subsystem
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AgentMode {
    /// Read-only: collect metrics, send logs/alerts, report config state
    Observe,
    /// Validate and diff proposed configs without applying
    Shadow,
    /// Full control: validate, apply, rollback configurations
    Takeover,
}

impl Default for AgentMode {
    fn default() -> Self {
        Self::Observe
    }
}

/// Mode configuration with optional per-section overrides
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModeConfig {
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

/// Server→Agent: mode change request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModeUpdatePayload {
    pub mode_config: ModeConfig,
}

/// Agent→Server: mode change acknowledgment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModeAckPayload {
    pub success: bool,
    pub mode_config: ModeConfig,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Agent configuration (subset relevant to protocol)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub version: String,
    pub device_id: String,
    pub firmware_version: String,
    pub model: String,
    pub mode: AgentMode,
}
