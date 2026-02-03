//! Rate limiting middleware

use crate::models::{ApiError, ApiResult};
use worker::*;

/// Rate limit configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests per window
    pub limit: u64,
    /// Window duration in seconds
    pub window_secs: u64,
}

impl RateLimitConfig {
    pub fn new(limit: u64, window_secs: u64) -> Self {
        Self { limit, window_secs }
    }
}

/// Rate limit configurations for different endpoint patterns
pub fn get_rate_limit(path: &str) -> RateLimitConfig {
    if path.starts_with("/api/auth/") {
        // Auth endpoints: 10/min
        RateLimitConfig::new(10, 60)
    } else if path.starts_with("/api/traffic/logs") {
        // Traffic logs: 60/min
        RateLimitConfig::new(60, 60)
    } else if path.contains("/stream") {
        // WebSocket streams: 5 concurrent (handled separately)
        RateLimitConfig::new(5, 60)
    } else {
        // All other endpoints: 120/min
        RateLimitConfig::new(120, 60)
    }
}

/// Check rate limit for a request
/// Returns Ok if within limits, Err with rate limit error if exceeded
pub async fn check_rate_limit(
    user_id: &str,
    path: &str,
    env: &Env,
) -> ApiResult<()> {
    let config = get_rate_limit(path);
    let kv = env
        .kv("CACHE")
        .map_err(|_| ApiError::internal("Failed to access rate limit store"))?;

    // Create a rate limit key based on user and path pattern
    let pattern = get_path_pattern(path);
    let window = chrono::Utc::now().timestamp() / config.window_secs as i64;
    let key = format!("ratelimit:{}:{}:{}", user_id, pattern, window);

    // Get current count
    let current: u64 = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to check rate limit"))?
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    if current >= config.limit {
        let reset_at = (window + 1) * config.window_secs as i64;
        return Err(ApiError::rate_limit(config.limit, reset_at));
    }

    // Increment counter
    let new_count = (current + 1).to_string();
    let ttl = config.window_secs + 1;

    kv.put(&key, &new_count)
        .map_err(|_| ApiError::internal("Failed to update rate limit"))?
        .expiration_ttl(ttl)
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to update rate limit"))?;

    Ok(())
}

/// Get a pattern for grouping similar paths
fn get_path_pattern(path: &str) -> String {
    // Replace UUIDs and numeric IDs with placeholders
    let parts: Vec<&str> = path.split('/').collect();
    let normalized: Vec<String> = parts
        .iter()
        .map(|part| {
            if is_uuid(part) || is_numeric(part) {
                ":id".to_string()
            } else {
                (*part).to_string()
            }
        })
        .collect();
    normalized.join("/")
}

fn is_uuid(s: &str) -> bool {
    s.len() == 36
        && s.chars()
            .all(|c| c.is_ascii_hexdigit() || c == '-')
}

fn is_numeric(s: &str) -> bool {
    !s.is_empty() && s.chars().all(|c| c.is_ascii_digit())
}

/// Rate limit headers to include in responses
pub struct RateLimitHeaders {
    pub limit: u64,
    pub remaining: u64,
    pub reset: i64,
}

impl RateLimitHeaders {
    pub fn apply(&self, response: Response) -> Result<Response> {
        let headers = response.headers().clone();
        headers.set("X-RateLimit-Limit", &self.limit.to_string())?;
        headers.set("X-RateLimit-Remaining", &self.remaining.to_string())?;
        headers.set("X-RateLimit-Reset", &self.reset.to_string())?;
        Ok(response.with_headers(headers))
    }
}
