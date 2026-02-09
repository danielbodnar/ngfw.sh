// JWT token generation and authentication utilities for testing

use chrono::{Duration, Utc};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};

/// JWT claims structure matching Clerk token format
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // User ID
    pub azp: String,        // Authorized party
    pub exp: usize,         // Expiration time
    pub iat: usize,         // Issued at
    pub iss: String,        // Issuer
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<String>, // Subscription plan
}

impl Claims {
    /// Create new claims for a test user
    pub fn new_test(user_id: &str, plan: Option<String>) -> Self {
        let now = Utc::now();
        let exp = now + Duration::hours(1);

        Self {
            sub: user_id.to_string(),
            azp: "test-application".to_string(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
            iss: "https://tough-unicorn-25.clerk.accounts.dev".to_string(),
            plan,
        }
    }

    /// Create expired claims for testing
    pub fn new_expired(user_id: &str) -> Self {
        let now = Utc::now();
        let exp = now - Duration::hours(1); // 1 hour ago

        Self {
            sub: user_id.to_string(),
            azp: "test-application".to_string(),
            exp: exp.timestamp() as usize,
            iat: (now - Duration::hours(2)).timestamp() as usize,
            iss: "https://tough-unicorn-25.clerk.accounts.dev".to_string(),
            plan: None,
        }
    }
}

/// JWT token generator for testing
pub struct TokenGenerator {
    encoding_key: EncodingKey,
}

impl TokenGenerator {
    /// Create a new token generator with a test secret
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
        }
    }

    /// Generate a valid JWT token for a test user
    pub fn generate_valid_token(&self, user_id: &str, plan: Option<String>) -> String {
        let claims = Claims::new_test(user_id, plan);
        let header = Header::new(Algorithm::HS256);

        encode(&header, &claims, &self.encoding_key)
            .expect("Failed to encode JWT token")
    }

    /// Generate an expired JWT token for testing
    pub fn generate_expired_token(&self, user_id: &str) -> String {
        let claims = Claims::new_expired(user_id);
        let header = Header::new(Algorithm::HS256);

        encode(&header, &claims, &self.encoding_key)
            .expect("Failed to encode JWT token")
    }

    /// Generate a malformed token (invalid signature)
    pub fn generate_invalid_token(&self, user_id: &str) -> String {
        let claims = Claims::new_test(user_id, None);
        let header = Header::new(Algorithm::HS256);
        let wrong_key = EncodingKey::from_secret(b"wrong_secret");

        encode(&header, &claims, &wrong_key)
            .expect("Failed to encode JWT token")
    }
}

/// Plan tiers for testing
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PlanTier {
    Starter,
    Pro,
    Business,
    BusinessPlus,
}

impl PlanTier {
    /// Get the plan name as a string
    pub fn as_str(&self) -> &str {
        match self {
            PlanTier::Starter => "starter",
            PlanTier::Pro => "pro",
            PlanTier::Business => "business",
            PlanTier::BusinessPlus => "business_plus",
        }
    }

    /// Get the device limit for this plan
    pub fn device_limit(&self) -> u32 {
        match self {
            PlanTier::Starter => 10,
            PlanTier::Pro | PlanTier::Business | PlanTier::BusinessPlus => u32::MAX,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claims_creation() {
        let claims = Claims::new_test("test_user", Some("pro".to_string()));
        assert_eq!(claims.sub, "test_user");
        assert_eq!(claims.plan, Some("pro".to_string()));
        assert!(claims.exp > claims.iat);
    }

    #[test]
    fn test_expired_claims() {
        let claims = Claims::new_expired("test_user");
        assert!(claims.exp < claims.iat);
    }

    #[test]
    fn test_token_generation() {
        let generator = TokenGenerator::new("test_secret");
        let token = generator.generate_valid_token("test_user", Some("pro".to_string()));
        assert!(!token.is_empty());
        assert!(token.starts_with("eyJ")); // JWT header prefix
    }

    #[test]
    fn test_plan_tier_limits() {
        assert_eq!(PlanTier::Starter.device_limit(), 10);
        assert_eq!(PlanTier::Pro.device_limit(), u32::MAX);
        assert_eq!(PlanTier::Business.as_str(), "business");
    }
}
