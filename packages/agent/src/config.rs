//! Configuration loading from TOML

use serde::Deserialize;

/// Top-level agent configuration (loaded from /jffs/ngfw/config.toml)
#[derive(Debug, Clone, Deserialize)]
pub struct AgentConfig {
    pub agent: AgentSection,
    #[serde(default)]
    pub mode: ModeSection,
    #[serde(default)]
    pub adapters: AdaptersSection,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgentSection {
    pub device_id: String,
    pub api_key: String,
    #[serde(default = "default_ws_url")]
    pub websocket_url: String,
    pub log_level: Option<String>,
    #[serde(default = "default_metrics_interval")]
    pub metrics_interval_secs: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ModeSection {
    #[serde(default = "default_mode")]
    pub default: String,
}

impl Default for ModeSection {
    fn default() -> Self {
        Self {
            default: default_mode(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdaptersSection {
    #[serde(default = "default_true")]
    pub iptables: bool,
    #[serde(default = "default_true")]
    pub dnsmasq: bool,
    #[serde(default = "default_true")]
    pub wifi: bool,
    #[serde(default)]
    pub wireguard: bool,
    #[serde(default = "default_true")]
    pub system: bool,
}

impl Default for AdaptersSection {
    fn default() -> Self {
        Self {
            iptables: true,
            dnsmasq: true,
            wifi: true,
            wireguard: false,
            system: true,
        }
    }
}

fn default_ws_url() -> String {
    "wss://api.ngfw.sh/ws".to_string()
}

fn default_metrics_interval() -> u64 {
    5
}

fn default_mode() -> String {
    "observe".to_string()
}

fn default_true() -> bool {
    true
}

impl AgentConfig {
    /// Load configuration from a TOML file
    pub async fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let contents = tokio::fs::read_to_string(path).await?;
        let config: AgentConfig = toml::from_str(&contents)?;
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Parse a complete, valid TOML config and verify every field.
    #[test]
    fn parse_full_config() {
        let toml = r#"
[agent]
device_id = "RT-AX88U-001"
api_key = "sk_test_abc123"
websocket_url = "wss://custom.example.com/ws"
log_level = "debug"
metrics_interval_secs = 10

[mode]
default = "shadow"

[adapters]
iptables = true
dnsmasq = false
wifi = true
wireguard = true
system = false
"#;

        let config: AgentConfig = toml::from_str(toml).expect("valid TOML should parse");

        assert_eq!(config.agent.device_id, "RT-AX88U-001");
        assert_eq!(config.agent.api_key, "sk_test_abc123");
        assert_eq!(config.agent.websocket_url, "wss://custom.example.com/ws");
        assert_eq!(config.agent.log_level.as_deref(), Some("debug"));
        assert_eq!(config.agent.metrics_interval_secs, 10);
        assert_eq!(config.mode.default, "shadow");
        assert!(config.adapters.iptables);
        assert!(!config.adapters.dnsmasq);
        assert!(config.adapters.wifi);
        assert!(config.adapters.wireguard);
        assert!(!config.adapters.system);
    }

    /// Only the required fields (device_id, api_key) are specified;
    /// everything else should fall back to defaults.
    #[test]
    fn parse_minimal_config_uses_defaults() {
        let toml = r#"
[agent]
device_id = "dev-001"
api_key = "key-001"
"#;

        let config: AgentConfig = toml::from_str(toml).expect("minimal config should parse");

        // Agent defaults
        assert_eq!(config.agent.device_id, "dev-001");
        assert_eq!(config.agent.api_key, "key-001");
        assert_eq!(config.agent.websocket_url, "wss://api.ngfw.sh/ws");
        assert!(config.agent.log_level.is_none());
        assert_eq!(config.agent.metrics_interval_secs, 5);

        // Mode defaults
        assert_eq!(config.mode.default, "observe");

        // Adapter defaults
        assert!(config.adapters.iptables);
        assert!(config.adapters.dnsmasq);
        assert!(config.adapters.wifi);
        assert!(!config.adapters.wireguard); // wireguard defaults to false
        assert!(config.adapters.system);
    }

    /// Verify that default values for websocket_url and metrics_interval
    /// match the expected constants.
    #[test]
    fn default_values_match_expectations() {
        assert_eq!(default_ws_url(), "wss://api.ngfw.sh/ws");
        assert_eq!(default_metrics_interval(), 5);
        assert_eq!(default_mode(), "observe");
        assert!(default_true());
    }

    /// Override a single adapter flag (wireguard = true) while the rest
    /// inherit their defaults.
    #[test]
    fn adapter_override_wireguard_enabled() {
        let toml = r#"
[agent]
device_id = "dev-002"
api_key = "key-002"

[adapters]
wireguard = true
"#;

        let config: AgentConfig = toml::from_str(toml).expect("adapter override should parse");

        // Explicitly set
        assert!(config.adapters.wireguard);

        // Other adapters keep their defaults
        assert!(config.adapters.iptables);
        assert!(config.adapters.dnsmasq);
        assert!(config.adapters.wifi);
        assert!(config.adapters.system);
    }

    /// Missing [agent] section entirely should fail to parse since
    /// device_id and api_key are required.
    #[test]
    fn missing_agent_section_fails() {
        let toml = r#"
[mode]
default = "takeover"
"#;

        let result = toml::from_str::<AgentConfig>(toml);
        assert!(result.is_err(), "config without [agent] section must fail");
    }

    /// Missing device_id within [agent] should fail.
    #[test]
    fn missing_device_id_fails() {
        let toml = r#"
[agent]
api_key = "key-only"
"#;

        let result = toml::from_str::<AgentConfig>(toml);
        assert!(result.is_err(), "config without device_id must fail");
    }

    /// AdaptersSection::default() produces the expected values.
    #[test]
    fn adapters_section_default() {
        let adapters = AdaptersSection::default();
        assert!(adapters.iptables);
        assert!(adapters.dnsmasq);
        assert!(adapters.wifi);
        assert!(!adapters.wireguard);
        assert!(adapters.system);
    }

    /// ModeSection::default() produces "observe".
    #[test]
    fn mode_section_default() {
        let mode = ModeSection::default();
        assert_eq!(mode.default, "observe");
    }
}
