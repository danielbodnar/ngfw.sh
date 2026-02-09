# Rust Test Debugging Guide

## Overview

This guide provides step-by-step instructions for debugging the 20 failing tests in the ngfw.sh project.

---

## Test Failure Categories & Debugging Strategies

### Category 1: Adapter Configuration Tests (15 failures)

#### Debug Strategy: Environment Verification

**Step 1: Check Test Environment**
```bash
# Verify system configuration availability
ls -la /etc/config/
ls -la /etc/dnsmasq/
iptables --list
ip link show wg0
```

**Step 2: Run Individual Adapter Tests**
```bash
# Test DNS adapter in isolation
cargo test test_dnsmasq_adapter_read_config -- --nocapture --test-threads=1

# Test iptables adapter
cargo test test_iptables_adapter_read_config -- --nocapture --test-threads=1

# Test WiFi adapter
cargo test test_wifi_adapter_read_config -- --nocapture --test-threads=1

# Test WireGuard adapter
cargo test test_wireguard_adapter_read_config -- --nocapture --test-threads=1
```

**Step 3: Enable Debug Logging**
```bash
# Run with debug output
RUST_LOG=debug cargo test test_adapter_read_config -- --nocapture

# Run with backtraces
RUST_BACKTRACE=1 cargo test test_adapter_read_config
```

**Step 4: Inspect Adapter Implementation**

Look at the adapter mock implementations:
```bash
# Find adapter mock code
grep -r "mock_adapter\|MockAdapter" packages/agent/

# Check for file system paths being used
grep -r "/etc/\|/sys/\|/proc/" packages/agent/src/adapters/
```

**Step 5: Review Test Fixtures**

Check the test fixture setup:
```bash
# Look for test configuration
grep -r "test_config\|fixture" packages/agent/tests/
```

#### Expected Root Cause
All adapter tests rely on system interfaces that are not available in the test environment. The tests likely need either:
1. Proper mock implementations of system calls
2. Docker environment with services running
3. Skip conditions when adapters not available

---

### Category 2: Mode Update Logic (2 failures)

#### Debug Strategy: State Machine Analysis

**Step 1: Reproduce Failure**
```bash
cargo test test_dispatcher_mode_update -- --nocapture --test-threads=1
```

**Step 2: Add Debug Output**

Modify the test to print payloads:
```rust
// After receiving response at line 476
println!("Response payload: {:#?}", response.payload);
println!("Success value: {}", response.payload["success"]);
println!("Mode config: {:#?}", response.payload["mode_config"]);

assert_eq!(response.payload["success"], true);
```

**Step 3: Trace Mode Update Handler**

Find the mode update handler:
```bash
grep -n "MessageType::ModeUpdate" packages/agent/src/
grep -n "ModeAck\|success" packages/agent/src/
```

**Step 4: Check State Machine**

Look for mode transition logic:
```bash
grep -r "mode.*shadow\|takeover\|observe" packages/agent/src/ | grep -i transition
```

**Step 5: Verify Response Creation**

Check how ModeAck is created:
```bash
grep -A 10 "MessageType::ModeAck" packages/agent/src/
```

#### Expected Fix
The response payload likely isn't correctly setting `"success": true`. The mode transition may be failing internally, or the response creation may be skipping the success field.

---

### Category 3: WebSocket Connection Tests (3 failures)

#### Debug Strategy: Async Test Debugging

**Step 1: Reproduce Each Failure**
```bash
# Auth handshake
cargo test test_connection_auth_handshake_failure -- --nocapture --test-threads=1

# Message routing
cargo test test_message_routing_inbound_to_dispatcher -- --nocapture --test-threads=1

# Reconnection
cargo test test_reconnection_with_backoff -- --nocapture --test-threads=1
```

**Step 2: Increase Timeout for Diagnosis**

Edit test timeout in `packages/agent/tests/integration_websocket.rs`:
```rust
// Change from:
timeout(Duration::from_secs(2), server_task)

// To:
timeout(Duration::from_secs(10), server_task)
```

Then run to see if test passes with longer timeout.

**Step 3: Add Diagnostic Logging**

Add debug output before assertions:
```rust
// Before the await
println!("Starting server task...");

timeout(Duration::from_secs(2), server_task)
    .await
    .inspect_err(|e| println!("Timeout error: {:?}", e))
    .expect("Server should complete")
```

**Step 4: Verify Mock Server**

Check mock server implementation:
```bash
grep -n "TcpListener\|WebSocket" packages/agent/tests/integration_websocket.rs | head -20
```

**Step 5: Check Port Availability**

Verify test ports are available:
```bash
# Check if ports used in tests are free
netstat -an | grep 9997
netstat -an | grep 9998
netstat -an | grep 9999
```

#### Expected Issues
1. **Auth Handshake Timeout:** Server not accepting connections quickly enough
2. **Message Routing:** Channel not properly wired between components
3. **Reconnection:** Timer or backoff logic not working as expected

---

## General Debugging Commands

### Run All Failing Tests with Details
```bash
cargo test --all-targets --all-features --no-fail-fast 2>&1 | tee test_results.txt
```

### Run Specific Test Module
```bash
# Adapter tests only
cargo test --test integration_adapters

# Dispatcher tests only
cargo test --test integration_dispatcher

# E2E tests only
cargo test --test integration_e2e

# WebSocket tests only
cargo test --test integration_websocket
```

### Run with Environment Variables
```bash
# Debug logging
RUST_LOG=debug cargo test

# Backtrace on panic
RUST_BACKTRACE=full cargo test

# Combine both
RUST_LOG=debug RUST_BACKTRACE=full cargo test
```

### Run Single Test with Full Output
```bash
cargo test test_dispatcher_mode_update -- --nocapture --test-threads=1
```

### Check for Async Issues
```bash
# Use tokio-console for async runtime visibility (if available)
TOKIO_CONSOLE=1 cargo test

# Or use flamegraph to profile test execution
cargo install flamegraph
cargo flamegraph --test integration_dispatcher
```

---

## Code Investigation Checklist

### For Each Failing Test:

- [ ] Understand what the test is trying to verify
- [ ] Identify all dependencies (network, filesystem, etc.)
- [ ] Check if mocks are properly initialized
- [ ] Verify timeout values are reasonable
- [ ] Check for channel/message passing issues
- [ ] Look for state management problems
- [ ] Verify async/await coordination
- [ ] Check for race conditions

### Key Files to Examine

**Adapter Tests:**
- `packages/agent/src/adapters/mod.rs` - Adapter interface
- `packages/agent/src/adapters/nvram.rs` - NVRAM adapter
- `packages/agent/src/adapters/dnsmasq.rs` - DNS adapter (if exists)
- `packages/agent/src/adapters/iptables.rs` - Firewall adapter (if exists)
- `packages/agent/src/adapters/wifi.rs` - WiFi adapter (if exists)
- `packages/agent/src/adapters/wireguard.rs` - VPN adapter (if exists)

**Mode Logic:**
- `packages/agent/src/dispatcher.rs` - Dispatcher including mode handling
- `packages/agent/src/mode.rs` - Mode configuration and logic
- `packages/agent/tests/integration_dispatcher.rs` - Test with mode_update

**WebSocket:**
- `packages/agent/src/connection.rs` - WebSocket connection handler
- `packages/agent/src/main.rs` - Connection startup
- `packages/agent/tests/integration_websocket.rs` - WebSocket tests

---

## Common Issues & Solutions

### Issue: Timeout in Tests

**Symptoms:**
```
thread 'test_name' panicked at 'Server should complete: Elapsed(())'
```

**Solutions:**
1. Increase timeout: `Duration::from_secs(10)` instead of 2
2. Check if services are running: `systemctl status service-name`
3. Verify port is available: `netstat -an | grep PORT`
4. Check for blocking operations in test setup

### Issue: Assertion Failure with Bool

**Symptoms:**
```
assertion `left == right` failed
  left: Bool(false)
 right: true
```

**Solutions:**
1. Add debug output to see actual vs expected
2. Check if the field is being set at all
3. Look for early returns in the handler
4. Verify state was properly updated before assertion

### Issue: Channel Closed Unexpectedly

**Symptoms:**
```
Channel closed or receiver dropped
```

**Solutions:**
1. Check for unwrap() calls that panic
2. Verify task is still running (not exited)
3. Check for premature shutdown signals
4. Verify all channel senders/receivers are properly initialized

### Issue: Race Condition

**Symptoms:**
```
Test passes sometimes, fails sometimes
```

**Solutions:**
1. Add explicit synchronization (Barrier, Event)
2. Use `--test-threads=1` to serialize tests
3. Add delays before assertions
4. Use `tokio::sync` primitives for coordination

---

## Performance & Profiling

### Check Test Performance
```bash
# Run tests with timing
cargo test --all-targets -- --nocapture --test-threads=1 2>&1 | grep -E "test.*ok|test.*FAILED"
```

### Profile Slow Tests
```bash
# Use flamegraph
cargo install flamegraph
cargo flamegraph --test integration_websocket -- test_reconnection_with_backoff
```

### Memory Usage
```bash
# Check for memory leaks
cargo test --all-targets --test-threads=1 -- --nocapture
```

---

## Next Steps After Debugging

1. **Document findings** in this file or issue tracker
2. **Create fix** based on root cause
3. **Add regression test** if needed
4. **Run full test suite** to verify no new failures
5. **Update CI/CD** if environment changes needed

---

## Resources

- [Tokio Testing Guide](https://tokio.rs/tokio/tutorial/select)
- [Rust Testing Documentation](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Async Rust Testing Patterns](https://rust-lang.github.io/async-book/)
- [Mockall Crate Documentation](https://docs.rs/mockall/latest/mockall/)

---

**Last Updated:** 2026-02-09
**Status:** Active - Use this guide when debugging failing tests
