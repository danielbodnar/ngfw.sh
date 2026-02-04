//! Subsystem adapters for router management
//!
//! Each adapter owns one router subsystem (firewall, DNS, WiFi, etc.) and
//! provides a uniform interface for reading, validating, diffing, applying,
//! and rolling back configuration as well as collecting runtime metrics.

pub mod dnsmasq;
pub mod iptables;
pub mod nvram;
pub mod system;
pub mod wifi;
pub mod wireguard;

#[allow(unused_imports)]
pub use dnsmasq::DnsmasqAdapter;
#[allow(unused_imports)]
pub use iptables::IptablesAdapter;
#[allow(unused_imports)]
pub use nvram::NvramAdapter;
#[allow(unused_imports)]
pub use system::SystemAdapter;
#[allow(unused_imports)]
pub use wifi::WifiAdapter;
#[allow(unused_imports)]
pub use wireguard::WireguardAdapter;

use ngfw_protocol::rpc::ConfigSection;
use serde_json::Value;

/// A single issue found during configuration validation.
#[derive(Debug, Clone)]
pub struct ValidationIssue {
    pub field: String,
    pub message: String,
}

/// The delta between the running configuration and a proposed configuration.
#[derive(Debug, Clone)]
pub struct ConfigDiff {
    pub section: ConfigSection,
    pub additions: Vec<String>,
    pub removals: Vec<String>,
    /// Each tuple is (key, old_value, new_value).
    pub changes: Vec<(String, String, String)>,
}

/// Uniform interface implemented by every router subsystem adapter.
#[async_trait::async_trait]
pub trait SubsystemAdapter: Send + Sync {
    /// Which configuration section this adapter owns.
    fn section(&self) -> ConfigSection;

    /// Read the current running configuration from the router.
    async fn read_config(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>>;

    /// Validate a proposed configuration without applying it.
    async fn validate(
        &self,
        config: &Value,
    ) -> Result<Vec<ValidationIssue>, Box<dyn std::error::Error + Send + Sync>>;

    /// Compute the diff between the running config and a proposed config.
    async fn diff(
        &self,
        proposed: &Value,
    ) -> Result<ConfigDiff, Box<dyn std::error::Error + Send + Sync>>;

    /// Apply a configuration atomically and tag it with `version`.
    async fn apply(
        &self,
        config: &Value,
        version: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;

    /// Roll back to the previous configuration snapshot.
    async fn rollback(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;

    /// Collect runtime metrics from this subsystem.
    async fn collect_metrics(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>>;
}
