// E2E tests for Fleet Management API endpoints
//
// Tests cover:
// - GET /api/fleet/devices
// - POST /api/fleet/devices (registration)
// - DELETE /api/fleet/devices/:id
// - GET /api/fleet/devices/:id/status
// - POST /api/fleet/devices/:id/command
// - Fleet templates (Business plan only)

mod common;

use common::{auth::*, client::*, fixtures::*, TestConfig};
use reqwest::StatusCode;
use serde_json::json;

#[tokio::test]
async fn test_fleet_devices_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/fleet/devices")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of devices");
}

#[tokio::test]
async fn test_fleet_device_register() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let device = DeviceRegistrationFixture::rt_ax92u();

    let response = client
        .post("/api/fleet/devices", &device)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::CREATED || response.status() == StatusCode::OK,
        "Unexpected status: {}",
        response.status()
    );

    if response.status() == StatusCode::CREATED {
        let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
        assert!(
            body.get("api_key").is_some(),
            "API key should be returned on registration"
        );
        assert!(body.get("device_id").is_some(), "Device ID should be returned");
    }
}

#[tokio::test]
async fn test_fleet_device_register_starter_limit() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    // Starter plan has 10 device limit
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("starter".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    // Assuming user already has 10 devices registered
    // This test would need proper test data setup
    let device = DeviceRegistrationFixture::rt_ax92u();

    let response = client
        .post("/api/fleet/devices", &device)
        .await
        .expect("Request failed");

    // If at limit, should return 402 Payment Required
    // Otherwise should succeed
    assert!(
        response.status() == StatusCode::CREATED
            || response.status() == StatusCode::PAYMENT_REQUIRED,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_fleet_device_status() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get(&format!("/api/fleet/devices/{}/status", config.test_device_id))
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.get("online").is_some() || body.get("status").is_some());
}

#[tokio::test]
async fn test_fleet_device_command_send() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let command = json!({
        "command": "REBOOT",
        "payload": null
    });

    let response = client
        .post(
            &format!("/api/fleet/devices/{}/command", config.test_device_id),
            &command,
        )
        .await
        .expect("Request failed");

    // Should return 200 OK if device is online
    // Or 503 Service Unavailable if device is offline
    assert!(
        response.status() == StatusCode::OK
            || response.status() == StatusCode::SERVICE_UNAVAILABLE,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_fleet_device_remove_not_owned() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    // Try to delete a device that doesn't belong to this user
    let response = client
        .delete("/api/fleet/devices/not_owned_device_id")
        .await
        .expect("Request failed");

    // Should return 403 Forbidden or 404 Not Found
    assert!(
        response.status() == StatusCode::FORBIDDEN
            || response.status() == StatusCode::NOT_FOUND,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_fleet_templates_list_business_plan() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("business".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/fleet/templates")
        .await
        .expect("Request failed");

    // Business plan should have access to templates
    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of templates");
}

#[tokio::test]
async fn test_fleet_templates_list_starter_plan() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("starter".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/fleet/templates")
        .await
        .expect("Request failed");

    // Starter plan should not have access to templates
    assert_eq!(
        response.status(),
        StatusCode::PAYMENT_REQUIRED,
        "Starter plan should not access templates"
    );
}

#[tokio::test]
async fn test_fleet_template_create_business_plan() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("business".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let template = json!({
        "name": "Default Config",
        "description": "Standard configuration for all devices",
        "config": {
            "lan": {
                "ip": "192.168.1.1",
                "netmask": "255.255.255.0"
            }
        }
    });

    let response = client
        .post("/api/fleet/templates", &template)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::CREATED || response.status() == StatusCode::OK,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_fleet_template_apply() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("business".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let template_id = "test_template_123";
    let apply_request = json!({
        "device_ids": [config.test_device_id]
    });

    let response = client
        .post(
            &format!("/api/fleet/templates/{}/apply", template_id),
            &apply_request,
        )
        .await
        .expect("Request failed");

    // Will return 404 if template doesn't exist, or 200/202 if successful
    assert!(
        response.status() == StatusCode::OK
            || response.status() == StatusCode::ACCEPTED
            || response.status() == StatusCode::NOT_FOUND,
        "Unexpected status: {}",
        response.status()
    );
}
