//! User and billing models

use serde::{Deserialize, Serialize};

/// User profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    pub email_verified: bool,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
}

/// Update profile request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

/// Change password request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

/// 2FA status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFactorStatus {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backup_codes_remaining: Option<u32>,
}

/// Enable 2FA request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Enable2faRequest {
    pub totp_code: String,
}

/// Enable 2FA response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Enable2faResponse {
    pub backup_codes: Vec<String>,
}

/// 2FA setup response (before enabling)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFactorSetup {
    pub secret: String,
    pub qr_svg: String,
    pub otpauth_url: String,
}

/// User session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub id: String,
    pub created_at: i64,
    pub last_active: i64,
    pub ip_address: String,
    pub user_agent: String,
    pub current: bool,
}

/// Subscription plan
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Plan {
    Free,
    Home,
    HomePlus,
    Pro,
    Business,
}

/// Billing plan details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingPlan {
    pub plan: Plan,
    pub price_monthly: u32,
    pub price_yearly: u32,
    pub device_limit: Option<u32>,
    pub features: Vec<String>,
}

/// Current subscription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub plan: Plan,
    pub status: SubscriptionStatus,
    pub billing_cycle: BillingCycle,
    pub current_period_start: i64,
    pub current_period_end: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancel_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionStatus {
    Active,
    Trialing,
    PastDue,
    Canceled,
    Unpaid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BillingCycle {
    Monthly,
    Yearly,
}

/// Change plan request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangePlanRequest {
    pub plan: Plan,
    pub billing_cycle: BillingCycle,
}

/// Usage meters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageMeters {
    pub devices: UsageMeter,
    pub dns_queries: UsageMeter,
    pub vpn_peers: UsageMeter,
    pub api_calls: UsageMeter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageMeter {
    pub current: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u64>,
    pub period_start: i64,
    pub period_end: i64,
}

/// Payment method
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMethod {
    pub id: String,
    pub method_type: PaymentMethodType,
    pub last4: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub brand: Option<String>,
    pub exp_month: u8,
    pub exp_year: u16,
    pub default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PaymentMethodType {
    Card,
    Sepa,
    Paypal,
}

/// Add payment method request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddPaymentMethodRequest {
    pub payment_method_id: String,
    #[serde(default)]
    pub set_default: bool,
}

/// Invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub number: String,
    pub status: InvoiceStatus,
    pub amount: u32,
    pub currency: String,
    pub created_at: i64,
    pub paid_at: Option<i64>,
    pub period_start: i64,
    pub period_end: i64,
    pub pdf_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum InvoiceStatus {
    Draft,
    Open,
    Paid,
    Void,
    Uncollectible,
}
