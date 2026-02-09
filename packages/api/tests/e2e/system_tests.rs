// E2E tests for System API endpoints
//
// Tests cover:
// - GET /api/system/status
// - GET /api/system/interfaces
// - GET /api/system/hardware
// - POST /api/system/reboot
// - POST /api/system/shutdown
// - GET /api/metrics/latest

mod common;

use common::{auth::*, client::*, fixtures::*, TestConfig};
use reqwest::StatusCode;
use serde_json::json;

#[tokio::test]
async fn test_health_check_no_auth() {
    let config = TestConfig::from_env();
    let client = ApiClient::new_unauthenticated(config.api_base_url.clone());

    let response = client.get("/health").await.expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.text().await.expect("Failed to read body");
    assert_eq!(body, "OK");
}

#[tokio::test]
async fn test_system_status_authorized() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/system/status")
        .await
        .expect("Request failed");

    // Should return 200 OK with system status
    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");

    // Verify expected fields are present
    assert!(body.get("uptime").is_some(), "Missing uptime field");
    assert!(body.get("cpu").is_some(), "Missing cpu field");
    assert!(body.get("memory").is_some(), "Missing memory field");
}

#[tokio::test]
async fn test_system_status_missing_device_id() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    // Create client without device ID
    let client = ApiClient::new(config.api_base_url.clone(), token, String::new());

    let response = client
        .get("/api/system/status")
        .await
        .expect("Request failed");

    // Should return 400 Bad Request
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_system_status_unauthorized() {
    let config = TestConfig::from_env();

    // No auth token
    let client = ApiClient::new_unauthenticated(config.api_base_url.clone());

    let response = client
        .get("/api/system/status")
        .await
        .expect("Request failed");

    // Should return 401 Unauthorized
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_system_status_expired_token() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let expired_token = token_gen.generate_expired_token(&config.test_user_id);

    let client = ApiClient::new(
        config.api_base_url.clone(),
        expired_token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/system/status")
        .await
        .expect("Request failed");

    // Should return 401 Unauthorized for expired token
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_system_interfaces_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/system/interfaces")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");

    // Should return an array of interfaces
    assert!(body.is_array(), "Expected array of interfaces");

    if let Some(interfaces) = body.as_array() {
        if !interfaces.is_empty() {
            let first = &interfaces[0];
            // Verify interface structure
            assert!(first.get("name").is_some(), "Missing interface name");
            assert!(first.get("mac").is_some(), "Missing MAC address");
            assert!(first.get("status").is_some(), "Missing status");
        }
    }
}

#[tokio::test]
async fn test_system_hardware_info() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/system/hardware")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");

    // Verify hardware info fields
    assert!(body.get("model").is_some(), "Missing model");
    assert!(body.get("cpu").is_some(), "Missing CPU info");
    assert!(body.get("memory").is_some(), "Missing memory info");
}

#[tokio::test]
async fn test_system_reboot_command() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .post("/api/system/reboot", &json!({}))
        .await
        .expect("Request failed");

    // Should return 200 OK if device is online
    // Or 503 Service Unavailable if device is offline
    assert!(
        response.status() == StatusCode::OK
            || response.status() == StatusCode::SERVICE_UNAVAILABLE,
        "Unexpected status code: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_system_shutdown_command() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .post("/api/system/shutdown", &json!({}))
        .await
        .expect("Request failed");

    // Should return 200 OK if device is online
    // Or 503 Service Unavailable if device is offline
    assert!(
        response.status() == StatusCode::OK
            || response.status() == StatusCode::SERVICE_UNAVAILABLE,
        "Unexpected status code: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_metrics_latest_polling() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/metrics/latest")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");

    // Verify metrics structure
    assert!(body.get("timestamp").is_some(), "Missing timestamp");
    assert!(body.get("cpu").is_some(), "Missing CPU metrics");
    assert!(body.get("memory").is_some(), "Missing memory metrics");
    assert!(body.get("network").is_some(), "Missing network metrics");

    // Verify CPU metrics
    if let Some(cpu) = body.get("cpu") {
        assert!(cpu.get("usage").is_some(), "Missing CPU usage");
    }

    // Verify memory metrics
    if let Some(memory) = body.get("memory") {
        assert!(memory.get("total").is_some(), "Missing total memory");
        assert!(memory.get("used").is_some(), "Missing used memory");
        assert!(memory.get("free").is_some(), "Missing free memory");
    }
}

#[tokio::test]
async fn test_system_status_device_not_owned() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    // Use a different device ID that doesn't belong to this user
    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        "not_owned_device_id".to_string(),
    );

    let response = client
        .get("/api/system/status")
        .await
        .expect("Request failed");

    // Should return 403 Forbidden
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}
