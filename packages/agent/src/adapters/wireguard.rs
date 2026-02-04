//! WireGuard VPN adapter stub

use ngfw_protocol::rpc::ConfigSection;
use serde_json::Value;

use super::{ConfigDiff, SubsystemAdapter, ValidationIssue};

#[derive(Default)]
pub struct WireguardAdapter;

impl WireguardAdapter {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl SubsystemAdapter for WireguardAdapter {
    fn section(&self) -> ConfigSection {
        ConfigSection::Vpn
    }

    async fn read_config(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        todo!("wireguard read_config not yet implemented")
    }

    async fn validate(
        &self,
        _config: &Value,
    ) -> Result<Vec<ValidationIssue>, Box<dyn std::error::Error + Send + Sync>> {
        todo!("wireguard validate not yet implemented")
    }

    async fn diff(
        &self,
        _proposed: &Value,
    ) -> Result<ConfigDiff, Box<dyn std::error::Error + Send + Sync>> {
        todo!("wireguard diff not yet implemented")
    }

    async fn apply(
        &self,
        _config: &Value,
        _version: u64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        todo!("wireguard apply not yet implemented")
    }

    async fn rollback(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        todo!("wireguard rollback not yet implemented")
    }

    async fn collect_metrics(&self) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
        todo!("wireguard collect_metrics not yet implemented")
    }
}
