//! iptables (firewall) adapter stub

use ngfw_protocol::rpc::ConfigSection;
use serde_json::Value;

use super::{ConfigDiff, SubsystemAdapter, ValidationIssue};

#[derive(Default)]
pub struct IptablesAdapter;

impl IptablesAdapter {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl SubsystemAdapter for IptablesAdapter {
    fn section(&self) -> ConfigSection {
        ConfigSection::Firewall
    }

    async fn read_config(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        todo!("iptables read_config not yet implemented")
    }

    async fn validate(
        &self,
        _config: &Value,
    ) -> Result<Vec<ValidationIssue>, Box<dyn std::error::Error + Send + Sync>> {
        todo!("iptables validate not yet implemented")
    }

    async fn diff(
        &self,
        _proposed: &Value,
    ) -> Result<ConfigDiff, Box<dyn std::error::Error + Send + Sync>> {
        todo!("iptables diff not yet implemented")
    }

    async fn apply(
        &self,
        _config: &Value,
        _version: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        todo!("iptables apply not yet implemented")
    }

    async fn rollback(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        todo!("iptables rollback not yet implemented")
    }

    async fn collect_metrics(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        todo!("iptables collect_metrics not yet implemented")
    }
}
