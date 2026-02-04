//! Authentication middleware for Clerk JWT validation

#![allow(dead_code)]

use crate::models::{ApiError, ApiResult};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
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

    /// Get the user's plan or default to "starter"
    pub fn get_plan(&self) -> &str {
        self.plan.as_deref().unwrap_or("starter")
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
            plan: claims.plan.unwrap_or_else(|| "starter".to_string()),
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

// ---------------------------------------------------------------------------
// JWKS types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct JwksResponse {
    keys: Vec<JwkKey>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct JwkKey {
    kid: String,
    kty: String,
    n: String,
    e: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    alg: Option<String>,
}

#[derive(Deserialize)]
struct JwtHeader {
    #[serde(default)]
    kid: Option<String>,
    alg: String,
}

// ---------------------------------------------------------------------------
// Token extraction and decoding
// ---------------------------------------------------------------------------

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

/// Decode JWT header to extract `kid` and `alg`
fn decode_jwt_header(token: &str) -> ApiResult<JwtHeader> {
    let header_end = token
        .find('.')
        .ok_or_else(|| ApiError::unauthorized("Invalid token format"))?;
    let header_bytes = URL_SAFE_NO_PAD
        .decode(&token[..header_end])
        .map_err(|_| ApiError::unauthorized("Invalid token header encoding"))?;
    serde_json::from_slice(&header_bytes)
        .map_err(|_| ApiError::unauthorized("Invalid token header"))
}

/// Decode JWT claims without signature verification (dev fallback)
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

// ---------------------------------------------------------------------------
// JWKS fetching with KV cache
// ---------------------------------------------------------------------------

const DEFAULT_JWKS_URL: &str =
    "https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json";

/// Fetch JWKS keys from Clerk, caching in CACHE KV for 1 hour.
async fn fetch_jwks(env: &Env) -> ApiResult<Vec<JwkKey>> {
    let cache_key = "clerk:jwks";

    // Try KV cache first
    if let Ok(cache) = env.kv("CACHE")
        && let Ok(Some(cached)) = cache.get(cache_key).text().await
        && let Ok(keys) = serde_json::from_str::<Vec<JwkKey>>(&cached)
    {
        return Ok(keys);
    }

    let jwks_url = env
        .var("CLERK_JWKS_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| DEFAULT_JWKS_URL.to_string());

    let request = Request::new(&jwks_url, Method::Get)
        .map_err(|e| ApiError::internal(format!("JWKS request failed: {e}")))?;
    let mut resp = Fetch::Request(request)
        .send()
        .await
        .map_err(|e| ApiError::internal(format!("JWKS fetch failed: {e}")))?;
    let text = resp
        .text()
        .await
        .map_err(|e| ApiError::internal(format!("JWKS read failed: {e}")))?;

    let jwks: JwksResponse = serde_json::from_str(&text)
        .map_err(|_| ApiError::internal("Invalid JWKS response"))?;

    // Best-effort cache write (1 hour TTL)
    if let Ok(cache) = env.kv("CACHE")
        && let Ok(json) = serde_json::to_string(&jwks.keys)
        && let Ok(builder) = cache.put(cache_key, json)
    {
        let _ = builder.expiration_ttl(3600).execute().await;
    }

    Ok(jwks.keys)
}

// ---------------------------------------------------------------------------
// RS256 signature verification via Web Crypto API
// ---------------------------------------------------------------------------

/// Verify an RS256 signature using the Workers Web Crypto API (SubtleCrypto).
///
/// `signing_input` is the `header.payload` portion of the JWT (ASCII).
/// `signature` is the raw decoded signature bytes.
/// `key` is the JWK public key from the JWKS endpoint.
async fn verify_rs256(signing_input: &str, signature: &[u8], key: &JwkKey) -> ApiResult<bool> {
    use js_sys::{Array, Function, Object, Promise, Reflect, Uint8Array};
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;

    // Access crypto.subtle from the Workers global scope
    let global = js_sys::global();
    let crypto = Reflect::get(&global, &"crypto".into())
        .map_err(|_| ApiError::internal("crypto global not available"))?;
    let subtle = Reflect::get(&crypto, &"subtle".into())
        .map_err(|_| ApiError::internal("crypto.subtle not available"))?;

    // Build JWK object: { kty, n, e, alg, ext }
    let jwk_obj = Object::new();
    let _ = Reflect::set(&jwk_obj, &"kty".into(), &key.kty.as_str().into());
    let _ = Reflect::set(&jwk_obj, &"n".into(), &key.n.as_str().into());
    let _ = Reflect::set(&jwk_obj, &"e".into(), &key.e.as_str().into());
    let _ = Reflect::set(&jwk_obj, &"alg".into(), &"RS256".into());
    let _ = Reflect::set(&jwk_obj, &"ext".into(), &true.into());

    // Algorithm: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } }
    let hash = Object::new();
    let _ = Reflect::set(&hash, &"name".into(), &"SHA-256".into());
    let algo = Object::new();
    let _ = Reflect::set(&algo, &"name".into(), &"RSASSA-PKCS1-v1_5".into());
    let _ = Reflect::set(&algo, &"hash".into(), &hash.into());

    // Key usages
    let usages = Array::new();
    usages.push(&"verify".into());

    // crypto.subtle.importKey("jwk", jwk, algo, false, ["verify"])
    let import_fn: Function = Reflect::get(&subtle, &"importKey".into())
        .map_err(|_| ApiError::internal("importKey not available"))?
        .unchecked_into();
    let import_args = Array::new();
    import_args.push(&"jwk".into());
    import_args.push(&jwk_obj.into());
    import_args.push(&algo.into());
    import_args.push(&false.into());
    import_args.push(&usages.into());
    let import_promise: Promise = Reflect::apply(&import_fn, &subtle, &import_args)
        .map_err(|_| ApiError::internal("importKey call failed"))?
        .unchecked_into();
    let crypto_key =
        JsFuture::from(import_promise)
            .await
            .map_err(|_| ApiError::internal("Failed to import signing key"))?;

    // crypto.subtle.verify(algo, key, signature, data)
    let verify_algo = Object::new();
    let _ = Reflect::set(&verify_algo, &"name".into(), &"RSASSA-PKCS1-v1_5".into());

    let sig_arr = Uint8Array::new_with_length(signature.len() as u32);
    sig_arr.copy_from(signature);
    let data_arr = Uint8Array::new_with_length(signing_input.len() as u32);
    data_arr.copy_from(signing_input.as_bytes());

    let verify_fn: Function = Reflect::get(&subtle, &"verify".into())
        .map_err(|_| ApiError::internal("verify not available"))?
        .unchecked_into();
    let verify_args = Array::new();
    verify_args.push(&verify_algo.into());
    verify_args.push(&crypto_key);
    verify_args.push(&sig_arr.buffer().into());
    verify_args.push(&data_arr.buffer().into());
    let verify_promise: Promise = Reflect::apply(&verify_fn, &subtle, &verify_args)
        .map_err(|_| ApiError::internal("verify call failed"))?
        .unchecked_into();
    let result = JsFuture::from(verify_promise)
        .await
        .map_err(|_| ApiError::unauthorized("Signature verification failed"))?;

    Ok(result.as_bool().unwrap_or(false))
}

// ---------------------------------------------------------------------------
// JWT verification (header decode → JWKS lookup → signature check)
// ---------------------------------------------------------------------------

/// Verify a JWT token against Clerk JWKS: decode header, fetch keys, check RS256 signature.
async fn verify_jwt(token: &str, env: &Env) -> ApiResult<JwtClaims> {
    let header = decode_jwt_header(token)?;
    if header.alg != "RS256" {
        return Err(ApiError::unauthorized("Unsupported JWT algorithm"));
    }
    let kid = header
        .kid
        .ok_or_else(|| ApiError::unauthorized("JWT missing kid header"))?;

    let keys = fetch_jwks(env).await?;
    let key = keys
        .iter()
        .find(|k| k.kid == kid)
        .ok_or_else(|| ApiError::unauthorized("No matching signing key"))?;

    // Decode claims (also checks expiry)
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err(ApiError::unauthorized("Invalid token format"));
    }
    let claims = decode_jwt_unverified(token)?;

    // Verify RS256 signature over header.payload
    let signing_input = format!("{}.{}", parts[0], parts[1]);
    let signature = URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|_| ApiError::unauthorized("Invalid signature encoding"))?;

    if !verify_rs256(&signing_input, &signature, key).await? {
        return Err(ApiError::unauthorized("Invalid JWT signature"));
    }

    Ok(claims)
}

// ---------------------------------------------------------------------------
// Public authentication entry points
// ---------------------------------------------------------------------------

/// Authenticate a user request via Clerk JWT.
///
/// When `CLERK_JWKS_URL` is set (production), verifies the RS256 signature
/// against the Clerk JWKS endpoint. Otherwise falls back to unverified
/// decoding for local development.
pub async fn authenticate(req: &Request, env: &Env) -> ApiResult<AuthContext> {
    let token = extract_bearer_token(req)?;

    if env.var("CLERK_JWKS_URL").is_ok() {
        let claims = verify_jwt(&token, env).await?;
        return Ok(AuthContext::from(claims));
    }

    // Dev fallback — no JWKS URL configured
    let claims = decode_jwt_unverified(&token)?;
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
pub async fn check_device_access(auth: &AuthContext, device_id: &str, env: &Env) -> ApiResult<()> {
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
    let has_access =
        device.owner_id == auth.user_id || (auth.org_id.is_some() && auth.org_id == device.org_id);

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
