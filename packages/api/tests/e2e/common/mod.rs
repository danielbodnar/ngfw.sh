// Common test utilities for E2E API tests

pub mod auth;
pub mod client;
pub mod fixtures;

use std::env;

/// Test configuration loaded from environment variables
#[derive(Clone, Debug)]
pub struct TestConfig {
    pub api_base_url: String,
    pub websocket_url: String,
    pub clerk_secret: String,
    pub test_user_id: String,
    pub test_device_id: String,
    pub test_api_key: String,
}

impl TestConfig {
    /// Load test configuration from environment variables
    pub fn from_env() -> Self {
        Self {
            api_base_url: env::var("API_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8787".to_string()),
            websocket_url: env::var("WS_URL")
                .unwrap_or_else(|_| "ws://localhost:8787".to_string()),
            clerk_secret: env::var("CLERK_SECRET_KEY")
                .unwrap_or_else(|_| "test_clerk_secret".to_string()),
            test_user_id: env::var("TEST_USER_ID")
                .unwrap_or_else(|_| "test_user_123".to_string()),
            test_device_id: env::var("TEST_DEVICE_ID")
                .unwrap_or_else(|_| "test_device_456".to_string()),
            test_api_key: env::var("TEST_API_KEY")
                .unwrap_or_else(|_| "test_key_789".to_string()),
        }
    }

    /// Create a new test config with default values for testing
    pub fn default_test() -> Self {
        Self {
            api_base_url: "http://localhost:8787".to_string(),
            websocket_url: "ws://localhost:8787".to_string(),
            clerk_secret: "test_clerk_secret".to_string(),
            test_user_id: "test_user_123".to_string(),
            test_device_id: "test_device_456".to_string(),
            test_api_key: "test_key_789".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_from_env_with_defaults() {
        let config = TestConfig::from_env();
        assert!(!config.api_base_url.is_empty());
        assert!(!config.websocket_url.is_empty());
    }

    #[test]
    fn test_config_default_test() {
        let config = TestConfig::default_test();
        assert_eq!(config.api_base_url, "http://localhost:8787");
        assert_eq!(config.test_user_id, "test_user_123");
    }
}
