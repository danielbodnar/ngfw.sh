//! Security-related models (Firewall, NAT, DNS, IDS/IPS)

use serde::{Deserialize, Serialize};

/// Firewall zone
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Zone {
    Wan,
    Lan,
    Guest,
    Iot,
    Dmz,
    #[serde(untagged)]
    Custom(String),
}

/// Firewall rule action
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RuleAction {
    Accept,
    Drop,
    Reject,
    Limit,
    Shape,
}

/// Protocol
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    All,
    Tcp,
    Udp,
    Icmp,
    Icmpv6,
    Gre,
    Esp,
    Ah,
}

/// Firewall rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallRule {
    pub id: u32,
    pub name: String,
    pub enabled: bool,
    pub zone_from: Zone,
    pub zone_to: Zone,
    pub source: String,
    pub destination: String,
    pub protocol: Protocol,
    pub port: String,
    pub action: RuleAction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule: Option<RuleSchedule>,
    pub log: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hits: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleSchedule {
    pub enabled: bool,
    pub start: String,
    pub end: String,
    pub days: Vec<u8>,
}

/// Create/update firewall rule request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallRuleRequest {
    pub name: String,
    pub enabled: bool,
    pub zone_from: Zone,
    pub zone_to: Zone,
    pub source: String,
    pub destination: String,
    pub protocol: Protocol,
    pub port: String,
    pub action: RuleAction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule: Option<RuleSchedule>,
    pub log: bool,
}

/// Rule order request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleOrderRequest {
    pub rule_ids: Vec<u32>,
}

/// Zone configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneConfig {
    pub id: String,
    pub name: String,
    pub interfaces: Vec<String>,
    pub masquerade: bool,
    pub mss_clamping: bool,
}

/// Zone policy (default action between zones)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZonePolicy {
    pub from: Zone,
    pub to: Zone,
    pub action: RuleAction,
    pub log: bool,
}

/// NAT rule type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NatType {
    Dnat,
    Snat,
    #[serde(rename = "1:1")]
    OneToOne,
    Masquerade,
}

/// NAT rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NatRule {
    pub id: u32,
    pub name: String,
    pub enabled: bool,
    pub nat_type: NatType,
    pub protocol: Protocol,
    pub source: String,
    pub source_port: Option<String>,
    pub destination: String,
    pub destination_port: Option<String>,
    pub translate_to: String,
    pub translate_port: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interface: Option<String>,
    pub log: bool,
}

/// UPnP lease
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpnpLease {
    pub id: String,
    pub protocol: Protocol,
    pub external_port: u16,
    pub internal_ip: String,
    pub internal_port: u16,
    pub description: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub client: String,
}

/// DNS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsConfig {
    pub enabled: bool,
    pub listen_address: String,
    pub upstream_dns: Vec<String>,
    pub dnssec: bool,
    pub cache_size: u32,
    pub min_ttl: u32,
    pub max_ttl: u32,
    pub block_mode: DnsBlockMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DnsBlockMode {
    Null,
    Nxdomain,
    ZeroIp,
}

/// DNS blocklist subscription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsBlocklist {
    pub id: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
    pub entries: u64,
    pub last_updated: Option<i64>,
    pub update_interval: u32,
}

/// DNS allowlist entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsAllowlistEntry {
    pub domain: String,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}

/// DNS query log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsQuery {
    pub timestamp: i64,
    pub client: String,
    pub domain: String,
    pub query_type: String,
    pub status: DnsQueryStatus,
    pub response_time_ms: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blocked_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DnsQueryStatus {
    Allowed,
    Blocked,
    Cached,
    Error,
}

/// DNS statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsStats {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub cached_queries: u64,
    pub avg_response_time_ms: f32,
    pub top_domains: Vec<DomainCount>,
    pub top_blocked: Vec<DomainCount>,
    pub top_clients: Vec<ClientQueryCount>,
    pub queries_over_time: Vec<TimeSeriesPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainCount {
    pub domain: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientQueryCount {
    pub client: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesPoint {
    pub timestamp: i64,
    pub value: u64,
}

/// IDS/IPS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdsConfig {
    pub enabled: bool,
    pub mode: IdsMode,
    pub interfaces: Vec<String>,
    pub update_interval: u32,
    pub alert_threshold: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IdsMode {
    Ids,
    Ips,
}

/// IDS rule category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdsCategory {
    pub id: String,
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub mode: IdsCategoryMode,
    pub rule_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IdsCategoryMode {
    Alert,
    Block,
    Disabled,
}

/// Custom IDS rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdsRule {
    pub id: String,
    pub name: String,
    pub rule: String,
    pub enabled: bool,
    pub category: String,
}

/// IDS alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdsAlert {
    pub id: String,
    pub timestamp: i64,
    pub severity: AlertSeverity,
    pub signature: String,
    pub category: String,
    pub source_ip: String,
    pub source_port: u16,
    pub destination_ip: String,
    pub destination_port: u16,
    pub protocol: Protocol,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload_preview: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Traffic log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficLogEntry {
    pub id: String,
    pub timestamp: i64,
    pub action: RuleAction,
    pub interface: String,
    pub protocol: Protocol,
    pub source_ip: String,
    pub source_port: u16,
    pub destination_ip: String,
    pub destination_port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rule_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub threat: Option<String>,
    pub bytes: u64,
    pub packets: u64,
}

/// Traffic statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficStats {
    pub total_bytes: u64,
    pub total_packets: u64,
    pub accepted: u64,
    pub dropped: u64,
    pub rejected: u64,
    pub by_protocol: Vec<ProtocolStats>,
    pub by_application: Vec<AppStats>,
    pub by_geo: Vec<GeoStats>,
    pub over_time: Vec<TimeSeriesPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolStats {
    pub protocol: Protocol,
    pub bytes: u64,
    pub packets: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStats {
    pub app: String,
    pub bytes: u64,
    pub connections: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoStats {
    pub country_code: String,
    pub country_name: String,
    pub bytes: u64,
    pub connections: u64,
}

/// Top client by bandwidth
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopClient {
    pub ip: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mac: Option<String>,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub connections: u64,
}

/// Top destination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopDestination {
    pub ip: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geo: Option<String>,
    pub bytes: u64,
    pub connections: u64,
}
