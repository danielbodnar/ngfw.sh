# NGFW Agent Integration Tests

Comprehensive integration test suite for the NGFW router agent layer.

## Test Coverage

### 1. WebSocket Connection Layer (`integration_websocket.rs`)
Tests agent<->API communication:
- Authentication handshake (success/failure)
- Connection lifecycle (connect, auth, message routing, disconnect)
- Keepalive ping/pong mechanism
- Reconnection with exponential backoff
- Message routing between connection and dispatcher
- Graceful shutdown handling
- WebSocket protocol compliance

### 2. Dispatcher Layer (`integration_dispatcher.rs`)
Tests message handling and command execution:
- Ping/pong responses
- Status request/response
- Command execution (allowed/blocked)
- Command allowlist enforcement
- Mode-based permission checks (observe/shadow/takeover)
- Config validation and application
- Mode transitions
- Reboot and upgrade commands
- Error handling and recovery

### 3. Adapter Layer (`integration_adapters.rs`)
Tests firmware communication through adapters:
- Adapter interface compliance
- Config read/validate/apply/rollback
- Metrics collection
- Concurrent operations
- Error handling
- Large config handling
- Timeout handling

Adapters tested:
- `IptablesAdapter` - Firewall rules
- `DnsmasqAdapter` - DNS/DHCP configuration
- `NvramAdapter` - NVRAM settings
- `SystemAdapter` - System metrics
- `WifiAdapter` - WiFi configuration
- `WireguardAdapter` - VPN configuration

### 4. Metrics Collection (`integration_metrics.rs`)
Tests telemetry gathering:
- Metrics loop timing and intervals
- CPU percentage calculation
- Memory usage calculation
- Temperature readings (optional)
- Interface statistics (rx/tx rates)
- Connection counts (TCP/UDP)
- DNS metrics
- Data serialization/deserialization
- Multiple collection cycles
- Shutdown cleanup

### 5. End-to-End Tests (`integration_e2e.rs`)
Tests complete agent lifecycle:
- Full startup and shutdown sequence
- Metrics collection flow
- Command execution workflow
- Mode transition workflow
- Config push workflow
- Concurrent operations (connection + dispatcher + collector)
- Multi-component integration

## Running Tests

### All Integration Tests
```bash
cargo test --test '*' -- --test-threads=1
```

### Specific Test Suite
```bash
# WebSocket tests
cargo test --test integration_websocket

# Dispatcher tests
cargo test --test integration_dispatcher

# Adapter tests
cargo test --test integration_adapters

# Metrics tests
cargo test --test integration_metrics

# E2E tests
cargo test --test integration_e2e
```

### Individual Test
```bash
cargo test --test integration_websocket test_connection_auth_handshake_success
```

### With Logging
```bash
RUST_LOG=debug cargo test --test integration_dispatcher -- --nocapture
```

## Test Environment Setup

### Mock Binaries
Tests use mock binaries located in `tests/integration/mock-bins/`:
- `iptables` - Mock firewall command
- `ip` - Mock network command
- `nvram` - Mock NVRAM command
- `wl` - Mock wireless command
- `service` - Mock service manager

These simulate firmware commands without requiring actual system changes.

### Mock Sysfs
Tests use mock sysfs files in `tests/integration/mock-sysfs/`:
- `/class/net/{interface}/statistics/` - Network interface statistics
- `/class/thermal/thermal_zone0/temp` - Temperature readings

### Mock API Server
E2E tests spawn a lightweight WebSocket server that:
- Accepts connections
- Handles authentication
- Receives and records messages
- Responds to commands

## Test Architecture

### Portable Design
Tests are designed to run in multiple environments:
- **Native** - Direct execution on development machine
- **Docker** - Containerized test environment
- **QEMU** - Emulated router environment
- **CI/CD** - Automated testing pipelines

### Mock Strategy
1. **System calls** - Mocked via test binaries in PATH
2. **File system** - Mocked via test fixtures
3. **Network** - Local loopback connections
4. **Time** - Fast intervals for testing (1s vs 30s)

### Isolation
Each test:
- Uses unique ports to avoid conflicts
- Creates isolated channels
- Manages its own lifecycle
- Cleans up resources on completion

## Test Patterns

### Setup Pattern
```rust
fn test_config() -> AgentConfig {
    AgentConfig {
        agent: AgentSettings {
            device_id: "test-device".to_string(),
            api_key: "test-key".to_string(),
            websocket_url: "ws://localhost:8787/ws".to_string(),
            log_level: Some("debug".to_string()),
            metrics_interval_secs: 1,
        },
        // ... rest of config
    }
}
```

### Async Test Pattern
```rust
#[tokio::test]
async fn test_something() {
    let config = test_config();
    let (tx, rx) = mpsc::channel(10);

    // Spawn task
    tokio::spawn(async move {
        // Test code
    });

    // Verify behavior
    let result = timeout(Duration::from_secs(5), rx.recv()).await;
    assert!(result.is_ok());
}
```

### Mock Server Pattern
```rust
let server = MockApiServer::new().await;
let config = test_config_with_url(&server.url());

// Run test
// ...

// Verify messages
let messages = server.get_messages().await;
assert!(messages.iter().any(|m| m.msg_type == MessageType::Auth));
```

## Troubleshooting

### Test Timeout
If tests timeout:
1. Increase timeout duration
2. Check for deadlocks in channels
3. Verify mock binaries are executable
4. Enable logging: `RUST_LOG=debug`

### Port Conflicts
Tests use random ports where possible. If conflicts occur:
- Run with `--test-threads=1` for serial execution
- Ensure no other services are using test ports

### Mock Binary Issues
Ensure mock binaries are executable:
```bash
chmod +x tests/integration/mock-bins/*
```

### File Permission Issues
Tests may require write access to:
- `/tmp` directory for PID files
- Test fixture directories

## Continuous Integration

Tests run automatically on:
- Pull requests
- Merges to main
- Release builds

CI configuration:
- Runs all test suites
- Collects coverage reports
- Publishes test results
- Fails build on test failure

## Coverage Goals

Current coverage targets:
- **Unit tests**: 70%+ line coverage
- **Integration tests**: 80%+ critical path coverage
- **E2E tests**: 100% major workflows

## Contributing

When adding new tests:
1. Follow existing patterns
2. Use descriptive test names
3. Add documentation comments
4. Ensure tests are isolated
5. Clean up resources
6. Update this README

## Future Enhancements

Planned improvements:
- [ ] Property-based testing with `proptest`
- [ ] Fuzz testing for protocol parsing
- [ ] Performance benchmarks
- [ ] Load testing for concurrent connections
- [ ] Chaos engineering tests
- [ ] Security penetration tests
- [ ] Memory leak detection
- [ ] Long-running stability tests
