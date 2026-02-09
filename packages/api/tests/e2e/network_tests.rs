// E2E tests for Network API endpoints
//
// Tests cover:
// - WAN configuration (GET/PUT /api/wan/config)
// - LAN configuration (GET/PUT /api/lan/config)
// - VLAN management (GET/POST/PUT/DELETE /api/lan/vlans)
// - WiFi configuration (radios, networks, clients)
// - DHCP configuration (config, leases, reservations)

mod common;

use common::{auth::*, client::*, fixtures::*, TestConfig};
use reqwest::StatusCode;

// ========== WAN Tests ==========

#[tokio::test]
async fn test_wan_config_read() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client.get("/api/wan/config").await.expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.get("mode").is_some(), "Missing mode field");
}

#[tokio::test]
async fn test_wan_config_update_dhcp() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let wan_config = WanConfigFixture::dhcp();

    let response = client
        .put("/api/wan/config", &wan_config)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::OK || response.status() == StatusCode::ACCEPTED,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_wan_config_update_static() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let wan_config = WanConfigFixture::static_ip();

    let response = client
        .put("/api/wan/config", &wan_config)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::OK || response.status() == StatusCode::ACCEPTED,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_wan_status_info() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client.get("/api/wan/status").await.expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.get("connected").is_some(), "Missing connected field");
}

// ========== LAN Tests ==========

#[tokio::test]
async fn test_lan_config_read() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client.get("/api/lan/config").await.expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.get("ip").is_some(), "Missing ip field");
    assert!(body.get("netmask").is_some(), "Missing netmask field");
}

#[tokio::test]
async fn test_lan_config_update() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let lan_config = LanConfigFixture::default();

    let response = client
        .put("/api/lan/config", &lan_config)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::OK || response.status() == StatusCode::ACCEPTED,
        "Unexpected status: {}",
        response.status()
    );
}

// ========== VLAN Tests ==========

#[tokio::test]
async fn test_lan_vlans_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client.get("/api/lan/vlans").await.expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of VLANs");
}

#[tokio::test]
async fn test_lan_vlan_create() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let vlan = VlanFixture::guest_network();

    let response = client
        .post("/api/lan/vlans", &vlan)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::CREATED || response.status() == StatusCode::OK,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_lan_vlan_create_invalid_id() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    // VLAN ID 0 is invalid
    let vlan = VlanFixture::custom(0, "invalid", "192.168.99.0");

    let response = client
        .post("/api/lan/vlans", &vlan)
        .await
        .expect("Request failed");

    assert_eq!(
        response.status(),
        StatusCode::BAD_REQUEST,
        "Should reject invalid VLAN ID"
    );
}

// ========== WiFi Tests ==========

#[tokio::test]
async fn test_wifi_radios_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/wifi/radios")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of radios");
}

#[tokio::test]
async fn test_wifi_networks_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/wifi/networks")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of networks");
}

#[tokio::test]
async fn test_wifi_network_create() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let network = WiFiNetworkFixture::home_network();

    let response = client
        .post("/api/wifi/networks", &network)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::CREATED || response.status() == StatusCode::OK,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_wifi_network_create_weak_password() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    // Password too short
    let network = WiFiNetworkFixture::custom("TestNet", "weak");

    let response = client
        .post("/api/wifi/networks", &network)
        .await
        .expect("Request failed");

    assert_eq!(
        response.status(),
        StatusCode::BAD_REQUEST,
        "Should reject weak password"
    );
}

#[tokio::test]
async fn test_wifi_clients_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/wifi/clients")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of clients");
}

// ========== DHCP Tests ==========

#[tokio::test]
async fn test_dhcp_config_read() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/dhcp/config")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.get("enabled").is_some(), "Missing enabled field");
}

#[tokio::test]
async fn test_dhcp_leases_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/dhcp/leases")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of leases");
}

#[tokio::test]
async fn test_dhcp_reservations_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/dhcp/reservations")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.is_array(), "Expected array of reservations");
}

#[tokio::test]
async fn test_dhcp_reservation_create() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let reservation = DhcpReservationFixture::server();

    let response = client
        .post("/api/dhcp/reservations", &reservation)
        .await
        .expect("Request failed");

    assert!(
        response.status() == StatusCode::CREATED || response.status() == StatusCode::OK,
        "Unexpected status: {}",
        response.status()
    );
}

#[tokio::test]
async fn test_dhcp_reservation_create_invalid_mac() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(&config.test_user_id, Some("pro".to_string()));

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    // Invalid MAC address
    let reservation = DhcpReservationFixture::custom("invalid-mac", "192.168.1.50", None);

    let response = client
        .post("/api/dhcp/reservations", &reservation)
        .await
        .expect("Request failed");

    assert_eq!(
        response.status(),
        StatusCode::BAD_REQUEST,
        "Should reject invalid MAC"
    );
}
