# Quick Start Guide - Docker Integration Tests

Get up and running with NGFW.sh integration tests in under 5 minutes.

## Prerequisites

```bash
# 1. Docker with BuildKit
docker --version  # Need >= 20.10

# 2. Install cross-compilation tools
cargo install cross

# 3. Register QEMU (required for aarch64)
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

## Run Tests

### Basic Test (60 seconds)

```bash
# From repository root
bun run test:integration:docker

# Or directly
cd tests/integration
./run-docker.sh
```

**What it tests:**
- Agent builds successfully
- WebSocket connection works
- Authentication succeeds
- STATUS messages sent
- METRICS collected

**Expected output:**
```
=== NGFW Agent Integration Test (Docker) ===
Building agent container...
Starting mock API + agent...
Agent authenticated successfully!
=== Integration test passed ===
```

### All Tests (2-3 minutes)

```bash
cd tests/integration
./docker/run-all-tests.sh
```

**What it tests:**
- Firmware adapter (mock binaries)
- Full API stack (all RPC messages)
- Error handling
- Performance metrics

### Specific Tests

```bash
# Firmware adapter only
./docker/test-firmware-adapter.sh

# Full stack integration
./docker/test-full-stack.sh

# Performance benchmarks
./docker/test-performance.sh

# Load testing (10 agents)
./docker/test-load.sh --agents 10 --duration 60
```

## CI/CD Mode

```bash
# Non-interactive, JSON output
CI=true ./run-ci.sh
```

## Debugging

### View Logs

```bash
cd tests/integration

# All services
docker compose -f docker/compose.yaml logs

# Follow in real-time
docker compose -f docker/compose.yaml logs -f

# Agent only
docker compose -f docker/compose.yaml logs agent

# Mock API only
docker compose -f docker/compose.yaml logs mock-api
```

### Check Status

```bash
# Agent authentication status
curl http://localhost:8787/status | jq

# Mock API health
curl http://localhost:8787/health
```

### Interactive Shell

```bash
# Execute shell in agent container
docker compose -f docker/compose.yaml exec agent sh

# Test mock binaries
docker compose -f docker/compose.yaml exec agent /mock-bins/nvram get model

# Check sysfs
docker compose -f docker/compose.yaml exec agent cat /mock-sysfs/class/thermal/thermal_zone0/temp
```

## Common Issues

### "exec format error"

**Problem:** QEMU not registered

**Solution:**
```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### "Connection refused"

**Problem:** Mock API not healthy

**Solution:**
```bash
# Check API health
curl http://localhost:8787/health

# Restart services
docker compose -f docker/compose.yaml restart
```

### "TIMEOUT: Agent did not authenticate"

**Problem:** Agent can't connect or auth failed

**Solution:**
```bash
# Check logs
docker compose -f docker/compose.yaml logs agent
docker compose -f docker/compose.yaml logs mock-api

# Verify config
docker compose -f docker/compose.yaml exec agent cat /etc/ngfw/config.toml

# Try with debug logging
AGENT_LOG_LEVEL=debug docker compose -f docker/compose.yaml up agent
```

### Build failures

**Solution:**
```bash
# Clean build cache
docker compose -f docker/compose.yaml build --no-cache agent

# Verify cross toolchain
cross --version
rustup target list --installed | grep aarch64
```

## Environment Variables

```bash
# Custom log level
AGENT_LOG_LEVEL=debug ./run-docker.sh

# Custom timeout
TEST_TIMEOUT=120 ./run-docker.sh

# Use full stack config
COMPOSE_FILE=docker/compose-full.yaml ./run-docker.sh
```

## Next Steps

- Read [DOCKER_TESTING.md](DOCKER_TESTING.md) for comprehensive guide
- See [README.md](README.md) for integration test framework
- Check [ARCHITECTURE.md](../../ARCHITECTURE.md) for system overview

---

**Need help?** Check the [Troubleshooting section](DOCKER_TESTING.md#troubleshooting) in DOCKER_TESTING.md
