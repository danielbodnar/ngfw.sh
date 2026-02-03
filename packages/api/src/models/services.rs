//! Service models (VPN, QoS, DDNS)

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// VPN server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnServerConfig {
    pub enabled: bool,
    pub listen_port: u16,
    pub interface: String,
    pub address: String,
    pub dns: Vec<String>,
    pub allowed_ips: Vec<String>,
    pub mtu: u32,
    pub persistent_keepalive: u32,
}

/// VPN peer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnPeer {
    pub id: u32,
    pub name: String,
    pub public_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preshared_key: Option<String>,
    pub allowed_ips: Vec<String>,
    pub persistent_keepalive: u32,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_handshake: Option<i64>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

/// Create VPN peer request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnPeerRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_key: Option<String>,
    pub allowed_ips: Vec<String>,
    #[serde(default = "default_keepalive")]
    pub persistent_keepalive: u32,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_keepalive() -> u32 {
    25
}

fn default_true() -> bool {
    true
}

/// VPN peer QR code response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnPeerQr {
    pub peer_id: u32,
    pub config: String,
    pub qr_svg: String,
}

/// VPN peer status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnPeerStatus {
    pub peer_id: u32,
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_handshake: Option<i64>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

/// VPN client profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnClientProfile {
    pub id: u32,
    pub name: String,
    pub provider: VpnProvider,
    pub config: serde_json::Value,
    pub enabled: bool,
    pub kill_switch: bool,
    pub split_tunnel: Option<SplitTunnel>,
    pub auto_connect: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VpnProvider {
    WireGuard,
    OpenVPN,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitTunnel {
    pub mode: SplitTunnelMode,
    pub ips: Vec<String>,
    pub domains: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SplitTunnelMode {
    Include,
    Exclude,
}

/// VPN client status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnClientStatus {
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profile_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connected_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_ip: Option<String>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

/// QoS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QosConfig {
    pub enabled: bool,
    pub upload_mbps: u32,
    pub download_mbps: u32,
    pub scheduler: QosScheduler,
    pub cake_enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cake_options: Option<CakeOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum QosScheduler {
    #[serde(rename = "fq_codel")]
    FqCodel,
    Htb,
    Cake,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CakeOptions {
    pub bandwidth: String,
    pub rtt: String,
    pub ack_filter: bool,
    pub wash: bool,
    pub ingress: bool,
}

/// Traffic class
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficClass {
    pub id: u32,
    pub name: String,
    pub priority: u8,
    pub guaranteed_mbps: Option<u32>,
    pub max_mbps: Option<u32>,
    pub applications: Vec<String>,
    pub dscp_markings: Vec<u8>,
    pub ports: Vec<String>,
}

/// Device bandwidth limit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceLimit {
    pub mac: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upload_mbps: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_mbps: Option<u32>,
    pub priority: Option<u8>,
}

/// DDNS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DdnsConfig {
    pub enabled: bool,
    pub provider: DdnsProvider,
    pub hostname: String,
    #[serde(skip_serializing)]
    pub credentials: serde_json::Value,
    pub update_interval: u32,
    pub ipv6: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DdnsProvider {
    Cloudflare,
    DuckDns,
    NoIp,
    Dynu,
    Custom,
}

/// DDNS status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DdnsStatus {
    pub last_update: Option<i64>,
    pub last_ip: Option<String>,
    pub last_ip6: Option<String>,
    pub status: DdnsUpdateStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub history: Vec<DdnsUpdateEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DdnsUpdateStatus {
    Success,
    Failed,
    Pending,
    NoChange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DdnsUpdateEvent {
    pub timestamp: i64,
    pub ip: String,
    pub status: DdnsUpdateStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
