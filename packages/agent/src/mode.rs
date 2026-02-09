//! Mode enforcement — determines what actions the agent can take per subsystem

use ngfw_protocol::{AgentMode, ConfigSection, ModeConfig};
use tracing::{info, warn};

const MODE_FILE: &str = "/jffs/ngfw/mode.json";

/// Load persisted mode from disk, falling back to Observe
pub async fn load_persisted_mode() -> ModeConfig {
    match tokio::fs::read_to_string(MODE_FILE).await {
        Ok(contents) => match serde_json::from_str(&contents) {
            Ok(mode) => {
                info!("Loaded persisted mode config");
                mode
            }
            Err(e) => {
                warn!(
                    "Failed to parse {}: {}, defaulting to Observe",
                    MODE_FILE, e
                );
                ModeConfig::default()
            }
        },
        Err(_) => {
            info!("No persisted mode found, defaulting to Observe");
            ModeConfig::default()
        }
    }
}

/// Persist mode config to disk so it survives restarts.
///
/// Creates the parent directory if it does not already exist so that
/// the write succeeds on first-boot and in test environments where
/// `/jffs/ngfw/` has not been provisioned yet.
pub async fn persist_mode(mode_config: &ModeConfig) -> Result<(), std::io::Error> {
    let json = serde_json::to_string_pretty(mode_config).map_err(std::io::Error::other)?;

    // Ensure the parent directory exists (e.g. /jffs/ngfw/)
    if let Some(parent) = std::path::Path::new(MODE_FILE).parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    tokio::fs::write(MODE_FILE, json).await?;
    info!("Persisted mode config to {}", MODE_FILE);
    Ok(())
}

/// Check whether an action is allowed in the current mode for a given section
#[allow(dead_code)]
pub fn can_apply(mode_config: &ModeConfig, section: &ConfigSection) -> bool {
    matches!(mode_config.effective_mode(section), AgentMode::Takeover)
}

/// Check whether shadow validation (diff without apply) is allowed
#[allow(dead_code)]
pub fn can_shadow(mode_config: &ModeConfig, section: &ConfigSection) -> bool {
    matches!(
        mode_config.effective_mode(section),
        AgentMode::Shadow | AgentMode::Takeover
    )
}

/// Check whether exec commands beyond status queries are allowed
pub fn can_exec(mode_config: &ModeConfig) -> bool {
    matches!(mode_config.mode, AgentMode::Takeover)
}

/// Check whether diagnostic-level exec is allowed (shadow + takeover)
pub fn can_exec_diagnostics(mode_config: &ModeConfig) -> bool {
    matches!(mode_config.mode, AgentMode::Shadow | AgentMode::Takeover)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    /// ModeConfig::default() produces Observe mode with no overrides.
    #[test]
    fn default_mode_is_observe() {
        let mc = ModeConfig::default();
        assert_eq!(mc.mode, AgentMode::Observe);
        assert!(mc.section_overrides.is_empty());
    }

    // -----------------------------------------------------------------------
    // can_apply
    // -----------------------------------------------------------------------

    #[test]
    fn can_apply_false_for_observe() {
        let mc = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: HashMap::new(),
        };
        assert!(!can_apply(&mc, &ConfigSection::Firewall));
        assert!(!can_apply(&mc, &ConfigSection::Dns));
    }

    #[test]
    fn can_apply_false_for_shadow() {
        let mc = ModeConfig {
            mode: AgentMode::Shadow,
            section_overrides: HashMap::new(),
        };
        assert!(!can_apply(&mc, &ConfigSection::Wifi));
        assert!(!can_apply(&mc, &ConfigSection::Wan));
    }

    #[test]
    fn can_apply_true_for_takeover() {
        let mc = ModeConfig {
            mode: AgentMode::Takeover,
            section_overrides: HashMap::new(),
        };
        assert!(can_apply(&mc, &ConfigSection::Firewall));
        assert!(can_apply(&mc, &ConfigSection::Dns));
        assert!(can_apply(&mc, &ConfigSection::Lan));
    }

    // -----------------------------------------------------------------------
    // can_shadow
    // -----------------------------------------------------------------------

    #[test]
    fn can_shadow_false_for_observe() {
        let mc = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: HashMap::new(),
        };
        assert!(!can_shadow(&mc, &ConfigSection::Firewall));
    }

    #[test]
    fn can_shadow_true_for_shadow() {
        let mc = ModeConfig {
            mode: AgentMode::Shadow,
            section_overrides: HashMap::new(),
        };
        assert!(can_shadow(&mc, &ConfigSection::Firewall));
        assert!(can_shadow(&mc, &ConfigSection::Dns));
    }

    #[test]
    fn can_shadow_true_for_takeover() {
        let mc = ModeConfig {
            mode: AgentMode::Takeover,
            section_overrides: HashMap::new(),
        };
        assert!(can_shadow(&mc, &ConfigSection::Wifi));
    }

    // -----------------------------------------------------------------------
    // can_exec / can_exec_diagnostics
    // -----------------------------------------------------------------------

    #[test]
    fn can_exec_only_in_takeover() {
        let observe = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: HashMap::new(),
        };
        let shadow = ModeConfig {
            mode: AgentMode::Shadow,
            section_overrides: HashMap::new(),
        };
        let takeover = ModeConfig {
            mode: AgentMode::Takeover,
            section_overrides: HashMap::new(),
        };

        assert!(!can_exec(&observe));
        assert!(!can_exec(&shadow));
        assert!(can_exec(&takeover));
    }

    #[test]
    fn can_exec_diagnostics_in_shadow_and_takeover() {
        let observe = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: HashMap::new(),
        };
        let shadow = ModeConfig {
            mode: AgentMode::Shadow,
            section_overrides: HashMap::new(),
        };
        let takeover = ModeConfig {
            mode: AgentMode::Takeover,
            section_overrides: HashMap::new(),
        };

        assert!(!can_exec_diagnostics(&observe));
        assert!(can_exec_diagnostics(&shadow));
        assert!(can_exec_diagnostics(&takeover));
    }

    // -----------------------------------------------------------------------
    // effective_mode with section overrides
    // -----------------------------------------------------------------------

    #[test]
    fn effective_mode_uses_base_when_no_override() {
        let mc = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: HashMap::new(),
        };
        assert_eq!(
            mc.effective_mode(&ConfigSection::Firewall),
            &AgentMode::Observe
        );
        assert_eq!(mc.effective_mode(&ConfigSection::Dns), &AgentMode::Observe);
    }

    #[test]
    fn effective_mode_uses_override_for_specific_section() {
        let mut overrides = HashMap::new();
        overrides.insert(ConfigSection::Firewall, AgentMode::Takeover);

        let mc = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: overrides,
        };

        // Firewall is overridden to Takeover
        assert_eq!(
            mc.effective_mode(&ConfigSection::Firewall),
            &AgentMode::Takeover
        );

        // DNS has no override, falls back to base (Observe)
        assert_eq!(mc.effective_mode(&ConfigSection::Dns), &AgentMode::Observe);
    }

    #[test]
    fn can_apply_respects_section_override() {
        let mut overrides = HashMap::new();
        overrides.insert(ConfigSection::Firewall, AgentMode::Takeover);
        overrides.insert(ConfigSection::Wifi, AgentMode::Shadow);

        let mc = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: overrides,
        };

        // Firewall overridden to Takeover -> can_apply = true
        assert!(can_apply(&mc, &ConfigSection::Firewall));

        // Wifi overridden to Shadow -> can_apply = false
        assert!(!can_apply(&mc, &ConfigSection::Wifi));

        // Dns falls back to base Observe -> can_apply = false
        assert!(!can_apply(&mc, &ConfigSection::Dns));
    }

    #[test]
    fn can_shadow_respects_section_override() {
        let mut overrides = HashMap::new();
        overrides.insert(ConfigSection::Dns, AgentMode::Shadow);

        let mc = ModeConfig {
            mode: AgentMode::Observe,
            section_overrides: overrides,
        };

        // DNS overridden to Shadow -> can_shadow = true
        assert!(can_shadow(&mc, &ConfigSection::Dns));

        // Firewall falls back to Observe -> can_shadow = false
        assert!(!can_shadow(&mc, &ConfigSection::Firewall));
    }

    /// ModeConfig with multiple section overrides: verify each section
    /// resolves independently.
    #[test]
    fn mixed_overrides_across_sections() {
        let mut overrides = HashMap::new();
        overrides.insert(ConfigSection::Firewall, AgentMode::Takeover);
        overrides.insert(ConfigSection::Dns, AgentMode::Shadow);
        overrides.insert(ConfigSection::Vpn, AgentMode::Observe);

        let mc = ModeConfig {
            mode: AgentMode::Shadow, // base
            section_overrides: overrides,
        };

        // Firewall -> Takeover (override)
        assert_eq!(
            mc.effective_mode(&ConfigSection::Firewall),
            &AgentMode::Takeover
        );
        assert!(can_apply(&mc, &ConfigSection::Firewall));
        assert!(can_shadow(&mc, &ConfigSection::Firewall));

        // DNS -> Shadow (override, same as base here but explicit)
        assert_eq!(mc.effective_mode(&ConfigSection::Dns), &AgentMode::Shadow);
        assert!(!can_apply(&mc, &ConfigSection::Dns));
        assert!(can_shadow(&mc, &ConfigSection::Dns));

        // VPN -> Observe (override)
        assert_eq!(mc.effective_mode(&ConfigSection::Vpn), &AgentMode::Observe);
        assert!(!can_apply(&mc, &ConfigSection::Vpn));
        assert!(!can_shadow(&mc, &ConfigSection::Vpn));

        // Wifi -> Shadow (base, no override)
        assert_eq!(mc.effective_mode(&ConfigSection::Wifi), &AgentMode::Shadow);
        assert!(!can_apply(&mc, &ConfigSection::Wifi));
        assert!(can_shadow(&mc, &ConfigSection::Wifi));
    }
}
