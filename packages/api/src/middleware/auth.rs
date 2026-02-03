//! Authentication middleware for Clerk JWT validation

use crate::models::{ApiError, ApiResult};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use worker::*;

/// JWT claims from Clerk
/// See: https://clerk.com/docs/backend-requests/handling/manual-jwt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    /// Subject (User ID)
    pub sub: String,
    /// Organization ID (for business plans)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub org_id: Option<String>,
    /// Subscription plan identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<String>,
    /// Expiration timestamp
    pub exp: i64,
    /// Issued at timestamp
    pub iat: i64,
    /// Issuer
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iss: Option<String>,
    /// Audience
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aud: Option<String>,
    /// Email address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

impl JwtClaims {
    /// Check if the token is expired
    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now().timestamp();
        self.exp < now
    }

    /// Get the user's plan or default to "free"
    pub fn get_plan(&self) -> &str {
        self.plan.as_deref().unwrap_or("free")
    }
}

/// Authenticated user context
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub org_id: Option<String>,
    pub plan: String,
    pub email: Option<String>,
}

impl From<JwtClaims> for AuthContext {
    fn from(claims: JwtClaims) -> Self {
        Self {
            user_id: claims.sub,
            org_id: claims.org_id,
            plan: claims.plan.unwrap_or_else(|| "free".to_string()),
            email: claims.email,
        }
    }
}

/// Device authentication context (for router agents)
#[derive(Debug, Clone)]
pub struct DeviceAuthContext {
    pub device_id: String,
    pub owner_id: String,
}

/// Extract and validate the authorization header
pub fn extract_bearer_token(req: &Request) -> ApiResult<String> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .map_err(|_| ApiError::unauthorized("Missing Authorization header"))?
        .ok_or_else(|| ApiError::unauthorized("Missing Authorization header"))?;

    if !auth_header.starts_with("Bearer ") {
        return Err(ApiError::unauthorized("Invalid authorization format"));
    }

    Ok(auth_header[7..].to_string())
}

/// Decode JWT without verification (for development/testing)
/// In production, use proper JWKS validation
pub fn decode_jwt_unverified(token: &str) -> ApiResult<JwtClaims> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err(ApiError::unauthorized("Invalid token format"));
    }

    let payload = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| ApiError::unauthorized("Invalid token encoding"))?;

    let claims: JwtClaims = serde_json::from_slice(&payload)
        .map_err(|_| ApiError::unauthorized("Invalid token payload"))?;

    if claims.is_expired() {
        return Err(ApiError::unauthorized("Token expired"));
    }

    Ok(claims)
}

/// Authenticate request and return auth context
pub async fn authenticate(req: &Request, _env: &Env) -> ApiResult<AuthContext> {
    let token = extract_bearer_token(req)?;
    let claims = decode_jwt_unverified(&token)?;

    // TODO: In production, validate the JWT signature against Clerk JWKS
    // let jwks_url = env.var("CLERK_JWKS_URL").unwrap().to_string();
    // Default: "https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json"
    // Fetch JWKS, find the key matching the token's kid, verify signature

    Ok(AuthContext::from(claims))
}

/// Authenticate device API key
pub async fn authenticate_device(api_key: &str, env: &Env) -> ApiResult<DeviceAuthContext> {
    let kv = env
        .kv("DEVICES")
        .map_err(|_| ApiError::internal("Failed to access device store"))?;

    // API keys are stored as "apikey:{key}" -> device_id
    let key = format!("apikey:{}", api_key);
    let device_id = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to lookup device"))?
        .ok_or_else(|| ApiError::unauthorized("Invalid API key"))?;

    // Get device info to find owner
    let device_key = format!("device:{}", device_id);
    let device_data = kv
        .get(&device_key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to lookup device"))?
        .ok_or_else(|| ApiError::unauthorized("Device not found"))?;

    #[derive(Deserialize)]
    struct DeviceRecord {
        owner_id: String,
    }

    let device: DeviceRecord = serde_json::from_str(&device_data)
        .map_err(|_| ApiError::internal("Invalid device record"))?;

    Ok(DeviceAuthContext {
        device_id,
        owner_id: device.owner_id,
    })
}

/// Check if user has access to a specific device
pub async fn check_device_access(
    auth: &AuthContext,
    device_id: &str,
    env: &Env,
) -> ApiResult<()> {
    let kv = env
        .kv("DEVICES")
        .map_err(|_| ApiError::internal("Failed to access device store"))?;

    let device_key = format!("device:{}", device_id);
    let device_data = kv
        .get(&device_key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to lookup device"))?
        .ok_or_else(|| ApiError::not_found("Device"))?;

    #[derive(Deserialize)]
    struct DeviceRecord {
        owner_id: String,
        #[serde(default)]
        org_id: Option<String>,
    }

    let device: DeviceRecord = serde_json::from_str(&device_data)
        .map_err(|_| ApiError::internal("Invalid device record"))?;

    // Check if user owns the device or is in the same organization
    let has_access = device.owner_id == auth.user_id
        || (auth.org_id.is_some() && auth.org_id == device.org_id);

    if !has_access {
        return Err(ApiError::forbidden("Access denied to this device"));
    }

    Ok(())
}

/// Plan-based feature gate
pub fn require_plan(auth: &AuthContext, required_plans: &[&str]) -> ApiResult<()> {
    if !required_plans.contains(&auth.plan.as_str()) {
        return Err(ApiError::plan_limit(format!(
            "This feature requires one of the following plans: {}",
            required_plans.join(", ")
        )));
    }
    Ok(())
}
