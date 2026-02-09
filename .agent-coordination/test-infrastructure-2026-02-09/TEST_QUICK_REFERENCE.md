# E2E Testing Quick Reference

## Setup (One-Time)

```bash
# 1. Install dependencies
cd packages/api
cargo build --tests

# 2. Set environment variables
export CLERK_SECRET_KEY="your_clerk_secret"
export API_BASE_URL="http://localhost:8787"
```

## Running Tests

### Start Test Environment

```bash
# Docker (recommended for CI)
bun run test:integration:docker

# QEMU (full system emulation)
bun run test:integration:qemu
```

### Execute Tests

```bash
cd packages/api

# All tests
./run-e2e-tests.sh

# Specific suite
./run-e2e-tests.sh system_tests
./run-e2e-tests.sh network_tests
./run-e2e-tests.sh fleet_tests

# Single test
cargo test --test system_tests test_health_check_no_auth

# Verbose output
cargo test --test system_tests -- --nocapture
```

## Test Suites

| Command | Tests | Coverage |
|---------|-------|----------|
| `./run-e2e-tests.sh system_tests` | 11 | Health, status, interfaces, hardware, metrics |
| `./run-e2e-tests.sh network_tests` | 17 | WAN, LAN, VLAN, WiFi, DHCP |
| `./run-e2e-tests.sh fleet_tests` | 10 | Devices, registration, commands, templates |

## Writing Tests

### Basic Test Structure

```rust
mod common;

use common::{auth::*, client::*, fixtures::*, TestConfig};
use reqwest::StatusCode;

#[tokio::test]
async fn test_endpoint_name() {
    // 1. Setup
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

    // 2. Execute
    let response = client.get("/api/endpoint").await.expect("Request failed");

    // 3. Assert
    assert_eq!(response.status(), StatusCode::OK);

    let body: serde_json::Value = response.json().await.expect("Failed to parse JSON");
    assert!(body.get("field").is_some(), "Missing expected field");
}
```

### Using Fixtures

```rust
// WAN configuration
let wan = WanConfigFixture::dhcp();
let wan = WanConfigFixture::static_ip();

// VLAN
let vlan = VlanFixture::guest_network();
let vlan = VlanFixture::custom(10, "test", "192.168.10.0");

// WiFi
let wifi = WiFiNetworkFixture::home_network();

// Device
let device = DeviceRegistrationFixture::rt_ax92u();
```

### Testing Different Plans

```rust
// Pro plan
let token = token_gen.generate_valid_token(user_id, Some("pro".to_string()));

// Business plan
let token = token_gen.generate_valid_token(user_id, Some("business".to_string()));

// Starter plan
let token = token_gen.generate_valid_token(user_id, Some("starter".to_string()));
```

### Testing Auth Scenarios

```rust
// Valid token
let token = token_gen.generate_valid_token(user_id, Some("pro".to_string()));

// Expired token
let token = token_gen.generate_expired_token(user_id);

// No auth
let client = ApiClient::new_unauthenticated(base_url);
```

## Common Commands

```bash
# Check API server health
curl http://localhost:8787/health

# Watch test logs
cargo test --test system_tests -- --nocapture 2>&1 | tee test.log

# Run tests in parallel (use with caution)
export TEST_THREADS=4
./run-e2e-tests.sh

# Clean test artifacts
cargo clean
rm -rf target/debug/deps/*test*
```

## Debugging

### Test Failures

```bash
# Run single test with verbose output
cargo test --test system_tests test_health_check_no_auth -- --nocapture --exact

# Show full backtrace
RUST_BACKTRACE=1 cargo test --test system_tests

# Show all output
RUST_LOG=debug cargo test --test system_tests -- --nocapture
```

### API Issues

```bash
# Check API server is running
curl -v http://localhost:8787/health

# Check WebSocket connection
wscat -c ws://localhost:8787/agent/ws?api_key=test_key_789

# View API logs (if running in Docker)
docker logs ngfw-api-test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:8787` | API server base URL |
| `WS_URL` | `ws://localhost:8787` | WebSocket URL |
| `CLERK_SECRET_KEY` | - | **Required** Clerk JWT secret |
| `TEST_USER_ID` | `test_user_123` | Test user identifier |
| `TEST_DEVICE_ID` | `test_device_456` | Test device identifier |
| `TEST_API_KEY` | `test_key_789` | Device API key |
| `TEST_THREADS` | `1` | Number of parallel test threads |

## Status Codes

| Code | Meaning | When to Expect |
|------|---------|----------------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST (new resource) |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid auth token |
| 402 | Payment Required | Plan limit exceeded |
| 403 | Forbidden | Not authorized for resource |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 413 | Payload Too Large | File upload too large |
| 503 | Service Unavailable | Device offline |

## File Locations

```
packages/api/
├── Cargo.toml              # Dependencies (reqwest, tokio)
├── run-e2e-tests.sh        # Test runner
└── tests/
    ├── README.md           # Full documentation
    └── e2e/
        ├── common/         # Shared utilities
        │   ├── mod.rs     # TestConfig
        │   ├── auth.rs    # TokenGenerator
        │   ├── client.rs  # ApiClient
        │   └── fixtures.rs # Test data
        ├── system_tests.rs    # 11 tests
        ├── network_tests.rs   # 17 tests
        └── fleet_tests.rs     # 10 tests
```

## Coverage Status

| Category | Routes | Tests | Status |
|----------|--------|-------|--------|
| Health | 1 | 1 | ✅ Complete |
| System | 8 | 10 | ✅ Complete |
| Network | 23 | 17 | 🟡 Partial |
| Fleet | 6 | 10 | ✅ Complete |
| Security | 31 | 0 | ❌ Not Started |
| Services | 16 | 0 | ❌ Not Started |
| Firmware/Backup | 12 | 0 | ❌ Not Started |
| User/Billing | 13 | 0 | ❌ Not Started |
| WebSocket | 1 | 0 | ❌ Not Started |
| **TOTAL** | **97** | **38** | **39%** |

## Documentation

| Document | Purpose |
|----------|---------|
| `/E2E_TEST_PLAN.md` | Complete test specifications for all 97 routes |
| `/E2E_TEST_IMPLEMENTATION.md` | Detailed implementation guide |
| `/TESTING_SUMMARY.md` | High-level overview |
| `/TEST_QUICK_REFERENCE.md` | This document |
| `/packages/api/tests/README.md` | Test usage and best practices |

## Get Help

- Test failures → Check `/packages/api/tests/README.md` troubleshooting section
- API issues → See `/packages/api/README.md`
- Architecture questions → See `/ARCHITECTURE.md`
- Feature specs → See `/E2E_TEST_PLAN.md`
