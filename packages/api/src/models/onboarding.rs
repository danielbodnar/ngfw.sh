//! Onboarding models for router purchase and setup flow

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// Router hardware specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterSpec {
    pub cpu: String,
    pub ram: String,
    pub storage: String,
    pub wan_ports: String,
    pub lan_ports: String,
    pub wifi: String,
    pub max_devices: u32,
}

/// Router option for display in selector
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterOption {
    pub id: String,
    pub name: String,
    pub manufacturer: String,
    pub firmware: String,
    pub price: u32,
    pub specs: RouterSpec,
    pub features: Vec<String>,
    pub image: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recommended: Option<bool>,
    pub in_stock: bool,
}

/// WAN connection type options
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OnboardingWanType {
    Dhcp,
    Static,
    Pppoe,
    Lte,
}

/// Security preset options
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SecurityPreset {
    Standard,
    Strict,
    Custom,
}

/// Subscription plan options
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionPlan {
    Free,
    Pro,
    Enterprise,
}

impl Default for SubscriptionPlan {
    fn default() -> Self {
        Self::Free
    }
}

/// Shipping address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShippingAddress {
    pub full_name: String,
    pub address_line1: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_line2: Option<String>,
    pub city: String,
    pub state: String,
    pub zip_code: String,
    #[serde(default = "default_country")]
    pub country: String,
    pub phone_number: String,
}

fn default_country() -> String {
    "US".to_string()
}

/// WiFi configuration for onboarding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingWifiConfig {
    pub ssid: String,
    #[serde(skip_serializing)]
    pub password: String,
    #[serde(default)]
    pub hide_ssid: bool,
}

/// WAN-specific configuration options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingWanConfig {
    /// PPPoE username
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    /// PPPoE password
    #[serde(skip_serializing)]
    pub password: Option<String>,
    /// Static IP address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,
    /// Subnet mask
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subnet: Option<String>,
    /// Gateway IP
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gateway: Option<String>,
    /// Primary DNS
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dns1: Option<String>,
    /// Secondary DNS
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dns2: Option<String>,
}

/// Onboarding device configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingConfig {
    pub device_name: String,
    pub shipping_address: ShippingAddress,
    pub wifi_config: OnboardingWifiConfig,
    pub wan_type: OnboardingWanType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wan_config: Option<OnboardingWanConfig>,
    #[serde(skip_serializing)]
    pub admin_password: String,
    pub security_preset: SecurityPreset,
    #[serde(default = "default_true")]
    pub enable_ips: bool,
    #[serde(default = "default_true")]
    pub enable_dns_filter: bool,
    #[serde(default = "default_true")]
    pub enable_auto_updates: bool,
}

fn default_true() -> bool {
    true
}

/// Order submission request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderSubmission {
    pub router_id: String,
    pub config: OnboardingConfig,
    #[serde(default)]
    pub subscription_plan: SubscriptionPlan,
}

/// Order status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Pending,
    Processing,
    Shipped,
    Delivered,
}

/// Order response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderResponse {
    pub order_id: String,
    pub device_id: String,
    pub estimated_delivery: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tracking_url: Option<String>,
    pub setup_instructions: String,
    pub status: OrderStatus,
    pub created_at: String,
}

/// Onboarding step
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum OnboardingStep {
    RouterSelection,
    Configuration,
    OrderPlaced,
    DeviceShipped,
    DeviceDelivered,
    DeviceConnected,
    Complete,
}

/// Onboarding status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingStatus {
    pub completed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_online: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_step: Option<OnboardingStep>,
    pub last_updated: String,
}
