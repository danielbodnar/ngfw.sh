# NGFW Agent Testing Strategy

Comprehensive testing documentation for the router agent layer.

## Overview

The NGFW agent test suite provides comprehensive coverage of:
- **Agent <-> API communication** (WebSocket protocol)
- **Agent <-> Firmware communication** (adapter interfaces)
- **State synchronization** (mode transitions, config updates)
- **Event handling** (commands, metrics, status)
- **Error handling** (timeouts, failures, recovery)

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Integration Tests                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebSocket   │  │  Dispatcher  │  │   Adapters   │      │
│  │    Tests     │  │    Tests     │  │    Tests     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────────────────────────┐    │
│  │   Metrics    │  │        E2E Tests                  │    │
│  │    Tests     │  │   (Full System Integration)       │    │
│  └──────────────┘  └──────────────────────────────────┘    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      Mock Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Mock API Server  │  Mock Binaries  │  Mock Sysfs           │
└─────────────────────────────────────────────────────────────┘
```

## Test Files

### `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/`

| File | Lines | Coverage | Description |
|------|-------|----------|-------------|
| `integration_websocket.rs` | ~600 | WebSocket connection, auth, reconnection |
| `integration_dispatcher.rs` | ~900 | Message routing, command handling |
| `integration_adapters.rs` | ~700 | Firmware communication, adapters |
| `integration_metrics.rs` | ~600 | Telemetry collection, timing |
| `integration_e2e.rs` | ~700 | End-to-end workflows |
| `config_parsing.rs` | ~100 | Config file parsing (existing) |

**Total: ~3,600 lines of integration tests**

## Test Execution

### Quick Start
```bash
# Run all tests
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent
cargo test --tests

# Run with helper script
./tests/run-tests.sh
```

### Specific Suites
```bash
# WebSocket layer
cargo test --test integration_websocket

# Dispatcher layer
cargo test --test integration_dispatcher

# Adapter layer
cargo test --test integration_adapters

# Metrics collection
cargo test --test integration_metrics

# End-to-end
cargo test --test integration_e2e
```

### With Options
```bash
# Verbose output
RUST_LOG=debug cargo test --test integration_websocket -- --nocapture

# Single-threaded (avoid port conflicts)
cargo test --tests -- --test-threads=1

# Specific test
cargo test test_connection_auth_handshake_success
```

## Test Coverage Breakdown

### 1. WebSocket Communication (18 tests)
Tests in `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration_websocket.rs`:

✅ Authentication
- Successful handshake
- Failed authentication
- Timeout handling

✅ Connection Management
- Connect and disconnect
- Reconnection with backoff
- Graceful shutdown

✅ Message Routing
- Inbound message delivery
- Outbound message sending
- Ping/pong keepalive

### 2. Message Dispatcher (15 tests)
Tests in `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration_dispatcher.rs`:

✅ Command Handling
- Ping/pong responses
- Status requests
- Exec commands (allowed/blocked)
- Config push/validation
- Mode updates

✅ Permission Enforcement
- Mode-based restrictions
- Command allowlist
- Diagnostic commands

✅ Error Handling
- Invalid payloads
- Denied operations
- Shutdown cleanup

### 3. Firmware Adapters (20 tests)
Tests in `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration_adapters.rs`:

✅ Adapter Interface
- Config read/write
- Validation
- Diff calculation
- Apply and rollback

✅ Per-Adapter Tests
- IptablesAdapter (firewall)
- DnsmasqAdapter (DNS/DHCP)
- NvramAdapter (settings)
- SystemAdapter (metrics)
- WifiAdapter (wireless)
- WireguardAdapter (VPN)

✅ Concurrent Operations
- Multiple adapters
- Concurrent reads
- Timeout handling

### 4. Metrics Collection (15 tests)
Tests in `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration_metrics.rs`:

✅ Data Accuracy
- CPU percentage (0-100%)
- Memory usage (0-100%)
- Temperature (optional)
- Interface rates
- Connection counts
- DNS metrics

✅ Timing
- Interval accuracy
- Multiple collections
- Timestamp monotonicity

✅ Lifecycle
- Channel handling
- Shutdown cleanup
- Serialization

### 5. End-to-End (8 tests)
Tests in `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration_e2e.rs`:

✅ Complete Workflows
- Startup and shutdown
- Metrics flow
- Command execution flow
- Mode transition flow
- Config push workflow

✅ Multi-Component
- Connection + dispatcher + collector
- Concurrent operations
- Message ordering

## Mock Infrastructure

### Mock API Server
Location: Used in test files
- Accepts WebSocket connections
- Handles authentication
- Records messages
- Responds to commands

### Mock Binaries
Location: `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration/mock-bins/`
- `iptables` - Firewall simulator
- `ip` - Network command
- `nvram` - NVRAM access
- `wl` - Wireless command
- `service` - Service manager

### Mock Sysfs
Location: `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration/mock-sysfs/`
- Network statistics
- Thermal zones
- System information

## Environment Portability

Tests are designed to run in:

### ✅ Native (Development)
```bash
cargo test --tests
```

### ✅ Docker
```bash
cd tests/integration
docker compose -f docker/compose.yaml up
```

### ✅ QEMU (Emulated Router)
```bash
# QEMU setup with cross-compilation
cross build --target armv7-unknown-linux-gnueabihf
# Deploy to QEMU and run tests
```

### ✅ CI/CD
- GitHub Actions workflow
- Automated on PRs and merges
- Coverage reporting
- Security audits

## Continuous Integration

Workflow: `/workspaces/code/github.com/danielbodnar/ngfw.sh/.github/workflows/agent-tests.yml`

Pipeline stages:
1. **Build** - Compile agent
2. **Lint** - Format and clippy checks
3. **Test** - All integration suites
4. **Coverage** - Generate coverage report
5. **Docker** - Container-based tests
6. **Security** - Audit dependencies

Coverage targets:
- Line coverage: 80%+
- Critical paths: 100%
- Adapter interfaces: 90%+

## Performance Benchmarks

Typical test execution times:
- WebSocket tests: ~10s
- Dispatcher tests: ~8s
- Adapter tests: ~15s
- Metrics tests: ~12s
- E2E tests: ~20s

**Total suite: ~65 seconds**

## Debugging Tests

### Enable Verbose Logging
```bash
RUST_LOG=trace cargo test --test integration_websocket -- --nocapture
```

### Run Single Test
```bash
cargo test test_connection_auth_handshake_success -- --nocapture
```

### Debug in IDE
Set breakpoints in:
- Test functions
- Agent code under test
- Helper functions

### Common Issues

**Port conflicts:**
```bash
# Run sequentially
cargo test --tests -- --test-threads=1
```

**Mock binary not found:**
```bash
chmod +x tests/integration/mock-bins/*
export PATH="$PWD/tests/integration/mock-bins:$PATH"
```

**Timeout errors:**
Increase timeout in test:
```rust
timeout(Duration::from_secs(10), operation).await
```

## Test Maintenance

### Adding New Tests

1. **Choose appropriate file:**
   - WebSocket layer → `integration_websocket.rs`
   - Command handling → `integration_dispatcher.rs`
   - Firmware ops → `integration_adapters.rs`
   - Metrics → `integration_metrics.rs`
   - Full workflow → `integration_e2e.rs`

2. **Follow naming convention:**
   ```rust
   #[tokio::test]
   async fn test_<component>_<scenario>() {
       // Test code
   }
   ```

3. **Use helper functions:**
   ```rust
   fn test_config() -> AgentConfig { /* ... */ }
   ```

4. **Clean up resources:**
   ```rust
   drop(tx);
   timeout(Duration::from_secs(1), task).await.ok();
   ```

### Updating Mocks

Mock binaries:
```bash
#!/usr/bin/env bash
# tests/integration/mock-bins/new-command
echo "mock output"
exit 0
```

Mock sysfs:
```bash
mkdir -p tests/integration/mock-sysfs/path/to/file
echo "1234" > tests/integration/mock-sysfs/path/to/file
```

## Coverage Analysis

Generate coverage report:
```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate HTML report
cd packages/agent
cargo tarpaulin --tests --out Html --output-dir coverage

# Open report
open coverage/index.html
```

View inline coverage:
```bash
# Install llvm-cov
rustup component add llvm-tools-preview
cargo install cargo-llvm-cov

# Run with coverage
cargo llvm-cov --tests --html
```

## Security Testing

### Dependency Audit
```bash
cargo install cargo-audit
cargo audit
```

### Vulnerability Scan
```bash
cargo install cargo-deny
cargo deny check
```

### Input Validation
Tests verify:
- Command allowlist enforcement
- Path traversal prevention
- Injection protection
- Timeout enforcement

## Performance Testing

### Load Testing
```bash
# High-frequency metrics
cargo test test_metrics_multiple_collections -- --nocapture

# Concurrent operations
cargo test test_adapter_concurrent_operations
```

### Memory Profiling
```bash
# Install valgrind
sudo apt-get install valgrind

# Run with memcheck
cargo build --tests
valgrind --leak-check=full target/debug/integration_e2e-*
```

## Future Enhancements

### Planned Additions
- [ ] Property-based testing with `proptest`
- [ ] Fuzz testing for protocol parsing
- [ ] Chaos engineering tests
- [ ] Long-running stability tests
- [ ] Performance benchmarks
- [ ] Memory leak detection
- [ ] Security penetration tests

### Test Infrastructure
- [ ] Shared test fixtures
- [ ] Test data generators
- [ ] Snapshot testing
- [ ] Visual regression tests
- [ ] API contract tests

## Resources

- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tokio Testing](https://tokio.rs/tokio/topics/testing)
- [Integration Testing Best Practices](https://matklad.github.io/2021/05/31/how-to-test.html)

## Support

For test-related issues:
1. Check this documentation
2. Review test output and logs
3. Consult CI pipeline results
4. Ask in team chat or open an issue
