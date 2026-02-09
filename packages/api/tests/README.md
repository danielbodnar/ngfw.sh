## NGFW.sh API E2E Tests

Comprehensive end-to-end tests for all Rust API routes.

### Directory Structure

```
tests/
├── e2e/
│   ├── common/              # Shared test utilities
│   │   ├── mod.rs          # Module exports and TestConfig
│   │   ├── auth.rs         # JWT token generation
│   │   ├── client.rs       # HTTP client wrapper
│   │   └── fixtures.rs     # Test data factories
│   ├── system_tests.rs     # System endpoint tests
│   ├── network_tests.rs    # WAN/LAN/WiFi/DHCP tests
│   ├── fleet_tests.rs      # Fleet management tests
│   └── ...                 # Additional test suites
└── README.md               # This file
```

### Running Tests

#### Prerequisites

1. **Test API Server Running**
   ```bash
   # Start the API server in test mode
   bun run test:integration:docker   # Docker environment
   # OR
   bun run test:integration:qemu     # QEMU environment
   ```

2. **Environment Variables**
   ```bash
   export API_BASE_URL="http://localhost:8787"
   export WS_URL="ws://localhost:8787"
   export CLERK_SECRET_KEY="your_clerk_secret"
   export TEST_USER_ID="test_user_123"
   export TEST_DEVICE_ID="test_device_456"
   export TEST_API_KEY="test_key_789"
   ```

#### Run All Tests

```bash
cd packages/api
cargo test --test '*' -- --test-threads=1
```

#### Run Specific Test Suite

```bash
# System tests only
cargo test --test system_tests

# Network tests only
cargo test --test network_tests

# Fleet tests only
cargo test --test fleet_tests
```

#### Run Individual Test

```bash
cargo test --test system_tests test_health_check_no_auth
```

### Test Categories

#### 1. System Tests (`system_tests.rs`)
- Health check
- System status
- Interfaces list
- Hardware info
- Reboot/shutdown commands
- Latest metrics polling
- Authorization tests

#### 2. Network Tests (`network_tests.rs`)
- WAN configuration (DHCP, static IP)
- LAN configuration
- VLAN management (create, update, delete)
- WiFi radios and networks
- WiFi client list
- DHCP configuration
- DHCP leases and reservations

#### 3. Fleet Tests (`fleet_tests.rs`)
- Device registration
- Device list
- Device status
- Send commands to devices
- Plan-based limits (Starter vs Business)
- Configuration templates (Business plan)

### Test Utilities

#### TestConfig
Loads configuration from environment variables:

```rust
let config = TestConfig::from_env();
// Or use defaults for local testing
let config = TestConfig::default_test();
```

#### TokenGenerator
Generates JWT tokens for authentication:

```rust
let token_gen = TokenGenerator::new(&clerk_secret);

// Valid token
let token = token_gen.generate_valid_token(user_id, Some("pro".to_string()));

// Expired token (for negative tests)
let expired = token_gen.generate_expired_token(user_id);

// Invalid token (wrong signature)
let invalid = token_gen.generate_invalid_token(user_id);
```

#### ApiClient
HTTP client wrapper with authentication:

```rust
let client = ApiClient::new(base_url, token, device_id);

// GET request
let response = client.get("/api/system/status").await?;

// POST request
let response = client.post("/api/wan/config", &config).await?;

// PUT request
let response = client.put("/api/lan/config", &config).await?;

// DELETE request
let response = client.delete("/api/dhcp/leases/192.168.1.100").await?;
```

#### Fixtures
Pre-built test data:

```rust
// WAN configuration
let wan = WanConfigFixture::dhcp();
let wan = WanConfigFixture::static_ip();

// VLAN
let vlan = VlanFixture::guest_network();
let vlan = VlanFixture::custom(10, "test", "192.168.10.0");

// WiFi network
let wifi = WiFiNetworkFixture::home_network();

// Firewall rule
let rule = FirewallRuleFixture::allow_ssh();

// Device registration
let device = DeviceRegistrationFixture::rt_ax92u();
```

### Writing New Tests

1. **Create a new test file** (e.g., `security_tests.rs`):

```rust
mod common;

use common::{auth::*, client::*, fixtures::*, TestConfig};
use reqwest::StatusCode;

#[tokio::test]
async fn test_firewall_rules_list() {
    let config = TestConfig::from_env();
    let token_gen = TokenGenerator::new(&config.clerk_secret);
    let token = token_gen.generate_valid_token(
        &config.test_user_id,
        Some("pro".to_string())
    );

    let client = ApiClient::new(
        config.api_base_url.clone(),
        token,
        config.test_device_id.clone(),
    );

    let response = client
        .get("/api/firewall/rules")
        .await
        .expect("Request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response
        .json()
        .await
        .expect("Failed to parse JSON");

    assert!(body.is_array(), "Expected array of rules");
}
```

2. **Add fixtures** if needed (`common/fixtures.rs`)

3. **Run the test**:
```bash
cargo test --test security_tests
```

### Testing Best Practices

1. **Isolation**: Each test should be independent and not depend on other tests
2. **Cleanup**: Clean up any resources created during tests
3. **Assertions**: Use descriptive assertion messages
4. **Error Handling**: Use `.expect()` with clear messages
5. **Plan Gates**: Test both allowed and forbidden scenarios for plan-gated features

### Test Coverage

Current coverage by category:

| Category | Routes Tested | Total Routes | Coverage |
|----------|---------------|--------------|----------|
| System | 6 | 8 | 75% |
| Network | 15 | 23 | 65% |
| Fleet | 6 | 6 | 100% |
| Security | 0 | 31 | 0% |
| Services | 0 | 16 | 0% |
| User/Billing | 0 | 13 | 0% |
| **Total** | **27** | **97** | **28%** |

### CI/CD Integration

Tests run automatically on:
- Pull requests to `main` and `develop`
- Pushes to `main` and `develop`
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for configuration.

### Troubleshooting

#### Tests Timeout
- Increase the request timeout in `ApiClient`
- Check if the API server is running
- Verify network connectivity

#### Authentication Failures
- Verify `CLERK_SECRET_KEY` is correct
- Check token expiration time in `Claims::new_test`
- Ensure API server JWT verification is working

#### 503 Service Unavailable
- Device is offline or not connected via WebSocket
- Check WebSocket connection in integration test environment
- Verify Durable Object is functioning

### Adding More Tests

To achieve 100% route coverage, add test files for:

1. **security_tests.rs** - Firewall, NAT, DNS filtering, IDS/IPS, Traffic monitoring
2. **services_tests.rs** - VPN (server/client), QoS, DDNS
3. **firmware_tests.rs** - Firmware management, boot slots
4. **backup_tests.rs** - Backup/restore, factory reset
5. **user_tests.rs** - Profile, password, 2FA, sessions
6. **billing_tests.rs** - Plans, usage, payment methods, invoices
7. **websocket_tests.rs** - Agent WebSocket connection and RPC

See `/E2E_TEST_PLAN.md` for detailed test specifications.
