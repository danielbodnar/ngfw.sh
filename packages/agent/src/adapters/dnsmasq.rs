//! dnsmasq (DNS/DHCP) adapter stub

use ngfw_protocol::rpc::ConfigSection;
use serde_json::Value;

use super::{ConfigDiff, SubsystemAdapter, ValidationIssue};

#[derive(Default)]
pub struct DnsmasqAdapter;

impl DnsmasqAdapter {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl SubsystemAdapter for DnsmasqAdapter {
    fn section(&self) -> ConfigSection {
        ConfigSection::Dns
    }

    async fn read_config(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        todo!("dnsmasq read_config not yet implemented")
    }

    async fn validate(
        &self,
        _config: &Value,
    ) -> Result<Vec<ValidationIssue>, Box<dyn std::error::Error + Send + Sync>> {
        todo!("dnsmasq validate not yet implemented")
    }

    async fn diff(
        &self,
        _proposed: &Value,
    ) -> Result<ConfigDiff, Box<dyn std::error::Error + Send + Sync>> {
        todo!("dnsmasq diff not yet implemented")
    }

    async fn apply(
        &self,
        _config: &Value,
        _version: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        todo!("dnsmasq apply not yet implemented")
    }

    async fn rollback(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        todo!("dnsmasq rollback not yet implemented")
    }

    async fn collect_metrics(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        todo!("dnsmasq collect_metrics not yet implemented")
    }
}
