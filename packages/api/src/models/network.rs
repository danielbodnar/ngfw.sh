//! Network configuration models

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// WAN connection types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WanType {
    Dhcp,
    Static,
    Pppoe,
}

/// WAN configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WanConfig {
    pub interface: String,
    pub wan_type: WanType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub static_config: Option<StaticWanConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pppoe_config: Option<PppoeConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vlan_id: Option<u16>,
    pub mtu: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mac_clone: Option<String>,
    pub ipv6_enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipv6_config: Option<Ipv6WanConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaticWanConfig {
    pub ip: String,
    pub subnet_mask: String,
    pub gateway: String,
    pub dns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PppoeConfig {
    pub username: String,
    #[serde(skip_serializing)]
    pub password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub service_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ipv6WanConfig {
    pub mode: Ipv6Mode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prefix_delegation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub static_ip: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Ipv6Mode {
    Auto,
    Dhcpv6,
    Slaac,
    Static,
    Disabled,
}

/// WAN status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WanStatus {
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip6: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gateway: Option<String>,
    pub dns: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lease_expires: Option<i64>,
}

/// LAN configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanConfig {
    pub interface: String,
    pub ip: String,
    pub subnet_mask: String,
    pub bridge_interfaces: Vec<String>,
    pub ipv6_enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipv6_prefix: Option<String>,
}

/// VLAN configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VlanConfig {
    pub id: u32,
    pub vlan_id: u16,
    pub name: String,
    pub interface: String,
    pub ip: String,
    pub subnet_mask: String,
    pub tagged_ports: Vec<String>,
    pub untagged_ports: Vec<String>,
    pub enabled: bool,
}

/// WiFi radio configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiRadio {
    pub id: String,
    pub enabled: bool,
    pub band: WifiBand,
    pub channel: WifiChannel,
    pub width: ChannelWidth,
    pub power: u8,
    pub country_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WifiBand {
    #[serde(rename = "2.4ghz")]
    Band2_4,
    #[serde(rename = "5ghz")]
    Band5,
    #[serde(rename = "6ghz")]
    Band6,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum WifiChannel {
    Auto,
    Channel(u8),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChannelWidth {
    #[serde(rename = "20")]
    Width20,
    #[serde(rename = "40")]
    Width40,
    #[serde(rename = "80")]
    Width80,
    #[serde(rename = "160")]
    Width160,
}

/// WiFi network (SSID) configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiNetwork {
    pub id: u32,
    pub ssid: String,
    pub enabled: bool,
    pub hidden: bool,
    pub radio: String,
    pub security: WifiSecurity,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vlan: Option<u16>,
    pub isolated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bandwidth_limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiSecurity {
    pub mode: WifiSecurityMode,
    #[serde(skip_serializing)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub radius: Option<RadiusConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WifiSecurityMode {
    Open,
    Wpa2,
    Wpa3,
    #[serde(rename = "wpa2/wpa3")]
    Wpa2Wpa3,
    #[serde(rename = "wpa2-enterprise")]
    Wpa2Enterprise,
    #[serde(rename = "wpa3-enterprise")]
    Wpa3Enterprise,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadiusConfig {
    pub server: String,
    pub port: u16,
    #[serde(skip_serializing)]
    pub secret: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backup_server: Option<String>,
}

/// WiFi client information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiClient {
    pub mac: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    pub ssid: String,
    pub radio: String,
    pub signal_dbm: i32,
    pub noise_dbm: i32,
    pub tx_rate_mbps: u32,
    pub rx_rate_mbps: u32,
    pub connected_at: i64,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

/// DHCP server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DhcpConfig {
    pub enabled: bool,
    pub interface: String,
    pub range_start: String,
    pub range_end: String,
    pub lease_time: u32,
    pub gateway: String,
    pub dns: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ntp: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pxe: Option<PxeConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PxeConfig {
    pub server: String,
    pub filename: String,
}

/// DHCP lease
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DhcpLease {
    pub ip: String,
    pub mac: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    pub starts: i64,
    pub expires: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
}

/// Static DHCP reservation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DhcpReservation {
    pub mac: String,
    pub ip: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Route type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RouteType {
    Static,
    Dynamic,
    Policy,
}

/// Static/policy route request body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteRequest {
    pub destination: String,
    pub gateway: String,
    pub interface: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metric: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub route_type: Option<RouteType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}
