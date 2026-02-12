# Docker-Based Integration Testing

Comprehensive guide to the Docker-based integration test environment for NGFW.sh.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Test Containers](#test-containers)
- [Test Suites](#test-suites)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Docker test environment provides isolated, reproducible testing for the entire NGFW.sh stack:

- **Firmware Layer**: Mock RT-AX92U hardware and system binaries
- **Agent Layer**: Cross-compiled aarch64 agent with real WebSocket client
- **API Layer**: Mock WebSocket API server and optional Schema API
- **Portal Layer**: Optional frontend for manual testing

### Test Approaches

| Approach | Speed | Isolation | Best For |
|----------|-------|-----------|----------|
| Docker | Fast (~2 min) | Container | CI/CD, development |
| QEMU | Slower (~5 min) | Full VM | Hardware validation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Test Network                          │
│                                                                   │
│  ┌──────────────┐      WebSocket       ┌──────────────┐         │
│  │  Mock API    │◄────────────────────►│    Agent     │         │
│  │  (Bun)       │                       │  (aarch64)   │         │
│  │              │                       │              │         │
│  │  - Auth      │                       │  Mock Bins:  │         │
│  │  - Status    │                       │  - nvram     │         │
│  │  - Metrics   │                       │  - wl        │         │
│  │  - RPC       │                       │  - ip        │         │
│  │              │                       │  - iptables  │         │
│  │  :8787       │                       │  - service   │         │
│  └──────────────┘                       │              │         │
│         │                                │  Mock Sysfs: │         │
│         │                                │  - network   │         │
│         │                                │  - thermal   │         │
│         │                                └──────────────┘         │
│         │                                                         │
│         │                                                         │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │               Test Runner Container                      │    │
│  │  - Executes test suites                                 │    │
│  │  - Validates API responses                              │    │
│  │  - Checks agent behavior                                │    │
│  │  - Generates reports                                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Optional:                                                        │
│  ┌──────────────┐                       ┌──────────────┐         │
│  │  Schema API  │                       │    Portal    │         │
│  │  (Hono)      │                       │  (Astro)     │         │
│  │  :8788       │                       │  :4321       │         │
│  └──────────────┘                       └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

```bash
# Docker with BuildKit
docker --version  # >= 20.10

# Cross-compilation toolchain
cargo install cross

# QEMU user-mode for aarch64 emulation
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### Run Basic Tests

```bash
# From repository root
bun run test:integration:docker

# Or directly
cd tests/integration
./run-docker.sh
```

### Expected Output

```
=== NGFW Agent Integration Test (Docker) ===
Registering QEMU binfmt handlers...
Building agent container (cross-compiling for aarch64)...
Starting mock API + agent...
Waiting for agent to authenticate and send metrics...
Agent authenticated successfully!
Latest status: {"authenticated":true,"device_id":"test-device-001",...}

=== Agent Logs ===
[INFO] ngfw_agent: Starting NGFW Agent v0.1.0
[INFO] ngfw_agent::agent: Connecting to ws://mock-api:8787/agent/ws
[INFO] ngfw_agent::agent: Successfully authenticated
[INFO] ngfw_agent::agent: Initial STATUS sent

Stopping containers...
=== Integration test passed ===
```

---

## Test Containers

### 1. Mock API Container

**Image**: `oven/bun:1`
**Purpose**: Simulates Cloudflare Workers Rust API
**Port**: 8787
**Health Check**: `http://localhost:8787/health`

**Endpoints**:
- `GET /health` - Health check
- `GET /status` - Current device states
- `WS /agent/ws` - WebSocket RPC endpoint

**Configuration**:
```yaml
services:
  mock-api:
    image: oven/bun:1
    working_dir: /app
    volumes:
      - ../mock-api:/app:ro
    command: bun run server.ts
    ports:
      - "8787:8787"
    healthcheck:
      test: ["CMD", "bun", "-e", "fetch('http://localhost:8787/health').then(r => { if (!r.ok) process.exit(1) })"]
      interval: 5s
      timeout: 3s
      retries: 5
```

### 2. Agent Container

**Base Image**: `alpine:3.21` (aarch64)
**Build**: Multi-stage with `cross-rs/aarch64-unknown-linux-musl`
**Purpose**: Run actual agent binary in simulated environment

**Build Process**:
1. Stage 1: Cross-compile agent for aarch64-musl
2. Stage 2: Copy binary to Alpine ARM64 runtime
3. Install mock binaries and sysfs fixtures
4. Configure agent with test credentials

**Configuration**:
```yaml
services:
  agent:
    build:
      context: ../../..
      dockerfile: tests/integration/docker/Dockerfile
    depends_on:
      mock-api:
        condition: service_healthy
    tmpfs:
      - /sys:exec
    volumes:
      - /proc:/proc:ro
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "2"
```

### 3. Test Runner Container (Optional)

**Image**: `oven/bun:1`
**Purpose**: Execute automated test suites
**Volumes**: Test scripts and reports

**Usage**:
```bash
docker compose -f docker/compose-test.yaml run test-runner
```

### 4. Schema API Container (Optional)

**Image**: Custom build with Wrangler
**Purpose**: Test full stack with REST API
**Port**: 8788

**Configuration**:
```yaml
services:
  schema-api:
    build:
      context: ../../../packages/schema
      dockerfile: Dockerfile
    environment:
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
    ports:
      - "8788:8788"
    depends_on:
      - mock-api
```

### 5. Portal Container (Optional)

**Image**: Custom build with Astro
**Purpose**: Manual E2E testing
**Port**: 4321

---

## Test Suites

### Suite 1: Basic Connectivity

**File**: `run-docker.sh`
**Duration**: ~60s
**Coverage**: WebSocket connection, auth, basic messaging

**Tests**:
- ✓ Agent builds successfully
- ✓ WebSocket connection establishes
- ✓ Authentication succeeds
- ✓ STATUS message sent and acknowledged
- ✓ METRICS sent periodically

**Run**:
```bash
./run-docker.sh
```

### Suite 2: Full API Integration

**File**: `docker/test-full-stack.sh`
**Duration**: ~2-3 min
**Coverage**: All RPC message types, error handling

**Tests**:
- ✓ AUTH flow (success and failure cases)
- ✓ STATUS updates
- ✓ METRICS collection
- ✓ PING/PONG keepalive
- ✓ LOG message routing
- ✓ ALERT message handling
- ✓ CONFIG_PUSH application
- ✓ EXEC command execution
- ✓ Connection recovery after disconnect

**Run**:
```bash
cd tests/integration
docker compose -f docker/compose.yaml up -d
./docker/test-full-stack.sh
docker compose -f docker/compose.yaml down
```

### Suite 3: Firmware Adapter Tests

**File**: `docker/test-firmware-adapter.sh`
**Duration**: ~2 min
**Coverage**: Mock binary interactions

**Tests**:
- ✓ NVRAM reads (model, firmware, MAC addresses)
- ✓ WiFi status (`wl` commands)
- ✓ Network interface stats (`ip` commands)
- ✓ Firewall rules (`iptables` commands)
- ✓ Service control (`service` commands)
- ✓ Sysfs reads (temperature, network stats)

**Run**:
```bash
./docker/test-firmware-adapter.sh
```

### Suite 4: Schema API Integration

**File**: `docker/test-schema-api.sh`
**Duration**: ~3 min
**Coverage**: REST API + WebSocket coordination

**Tests**:
- ✓ Device registration
- ✓ Device status polling
- ✓ Configuration CRUD operations
- ✓ Authentication with JWT
- ✓ Fleet management
- ✓ Metrics retrieval

**Prerequisites**:
```bash
export CLERK_SECRET_KEY="test_sk_..."
export VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

**Run**:
```bash
docker compose -f docker/compose-full.yaml up -d
./docker/test-schema-api.sh
docker compose -f docker/compose-full.yaml down
```

### Suite 5: Load Testing

**File**: `docker/test-load.sh`
**Duration**: Configurable (default 5 min)
**Coverage**: Multiple concurrent agents

**Tests**:
- ✓ Multiple agent connections (10-100)
- ✓ Message throughput
- ✓ Memory usage under load
- ✓ Connection stability
- ✓ API response times

**Run**:
```bash
./docker/test-load.sh --agents 50 --duration 300
```

### Suite 6: End-to-End Flow

**File**: `docker/test-e2e.sh`
**Duration**: ~5 min
**Coverage**: Complete user workflow

**Tests**:
- ✓ User registration (Clerk)
- ✓ Device registration via Portal
- ✓ Agent installation and connection
- ✓ Initial configuration push
- ✓ Real-time metrics in dashboard
- ✓ Configuration change application
- ✓ Alert generation and delivery

**Run**:
```bash
docker compose -f docker/compose-full.yaml up -d
./docker/test-e2e.sh
docker compose -f docker/compose-full.yaml down
```

---

## Docker Compose Configurations

### Basic (Agent + Mock API)

**File**: `docker/compose.yaml`

```yaml
services:
  mock-api:
    image: oven/bun:1
    # ... (see above)

  agent:
    build:
      context: ../../..
      dockerfile: tests/integration/docker/Dockerfile
    depends_on:
      mock-api:
        condition: service_healthy
```

**Usage**:
```bash
docker compose -f docker/compose.yaml up
```

### Full Stack (All Services)

**File**: `docker/compose-full.yaml`

```yaml
services:
  mock-api: # ...
  agent: # ...
  schema-api:
    build:
      context: ../../../packages/schema
  portal:
    build:
      context: ../../../packages/portal-astro
  test-runner:
    image: oven/bun:1
    volumes:
      - ./docker:/tests
```

**Usage**:
```bash
docker compose -f docker/compose-full.yaml up
```

### CI/CD (Test Runner Only)

**File**: `docker/compose-ci.yaml`

```yaml
services:
  mock-api: # ...
  agent: # ...
  test-runner:
    image: oven/bun:1
    command: bun run /tests/run-all-tests.ts
    depends_on:
      - agent
      - mock-api
    volumes:
      - ./docker:/tests
      - ./reports:/reports
```

**Usage**:
```bash
docker compose -f docker/compose-ci.yaml run --rm test-runner
```

---

## CI/CD Integration

### GitHub Actions

**File**: `.github/workflows/integration-tests.yml`

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  integration-docker:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
        with:
          platforms: arm64

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Install Bun
        uses: oven-sh/setup-bun@v1

      - name: Run integration tests
        run: bun run test:integration:docker

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: tests/integration/reports/

      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-logs
          path: tests/integration/logs/
```

### GitLab CI

**File**: `.gitlab-ci.yml`

```yaml
integration:docker:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache bash curl
    - docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
  script:
    - cd tests/integration
    - ./run-ci.sh
  artifacts:
    when: always
    reports:
      junit: tests/integration/reports/junit.xml
    paths:
      - tests/integration/logs/
      - tests/integration/reports/
    expire_in: 1 week
  only:
    - merge_requests
    - main
```

### Pre-commit Hook

**File**: `.git/hooks/pre-push`

```bash
#!/bin/sh
set -e

echo "Running integration tests before push..."
cd tests/integration

if ! ./run-docker.sh; then
  echo "Integration tests failed. Push aborted."
  exit 1
fi

echo "Integration tests passed!"
```

Make executable:
```bash
chmod +x .git/hooks/pre-push
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_API_PORT` | 8787 | Mock API WebSocket port |
| `AGENT_LOG_LEVEL` | info | Agent log level (trace, debug, info, warn, error) |
| `AGENT_DEVICE_ID` | test-device-001 | Test device identifier |
| `AGENT_API_KEY` | test-api-key-secret-001 | API authentication key |
| `AGENT_OWNER_ID` | test-owner-001 | Device owner identifier |
| `TEST_TIMEOUT` | 60 | Test timeout in seconds |
| `COMPOSE_FILE` | docker/compose.yaml | Docker Compose file to use |
| `AGENT_METRICS_INTERVAL` | 5 | Metrics reporting interval (seconds) |
| `CI` | false | CI mode (no TTY, JSON output) |

**Usage**:
```bash
# Run with custom settings
AGENT_LOG_LEVEL=debug TEST_TIMEOUT=120 ./run-docker.sh

# Run in CI mode
CI=true ./run-ci.sh

# Use full stack configuration
COMPOSE_FILE=docker/compose-full.yaml ./run-docker.sh
```

---

## Troubleshooting

### QEMU User-Mode Not Registered

**Symptoms**:
```
exec /usr/local/bin/ngfw-agent: exec format error
```

**Solution**:
```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

**Verify**:
```bash
docker run --rm --platform linux/arm64 alpine:3.21 uname -m
# Should output: aarch64
```

### Agent Fails to Authenticate

**Symptoms**:
```
TIMEOUT: Agent did not authenticate within 60s
```

**Debug Steps**:

1. Check mock API logs:
```bash
docker compose -f docker/compose.yaml logs mock-api
```

2. Check agent logs with verbose output:
```bash
AGENT_LOG_LEVEL=debug docker compose -f docker/compose.yaml up agent
```

3. Verify configuration:
```bash
docker compose -f docker/compose.yaml exec agent cat /etc/ngfw/config.toml
```

4. Test WebSocket connection:
```bash
docker compose -f docker/compose.yaml exec agent wget -O- http://mock-api:8787/health
```

### Build Failures

**Symptoms**:
```
error: failed to compile ngfw-agent
```

**Solutions**:

1. Clean build cache:
```bash
docker compose -f docker/compose.yaml build --no-cache agent
```

2. Verify Rust toolchain:
```bash
rustup target list --installed | grep aarch64
cargo --version
```

3. Build manually:
```bash
cd ../../..
cross build -p ngfw-agent --release --target aarch64-unknown-linux-musl
```

4. Check cross installation:
```bash
cross --version
docker images | grep cross
```

### Mock API Connection Refused

**Symptoms**:
```
Connection refused (os error 111)
```

**Debug Steps**:

1. Verify mock API health:
```bash
curl http://localhost:8787/health
```

2. Check Docker network:
```bash
docker network inspect integration_default
```

3. Test connectivity from agent container:
```bash
docker compose -f docker/compose.yaml exec agent ping -c 3 mock-api
docker compose -f docker/compose.yaml exec agent wget -O- http://mock-api:8787/health
```

4. Check service dependencies:
```bash
docker compose -f docker/compose.yaml ps
```

### Memory/CPU Limits

**Symptoms**:
```
Container killed (OOMKilled)
```

**Solutions**:

1. Increase resource limits in `compose.yaml`:
```yaml
services:
  agent:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "4"
```

2. Check current usage:
```bash
docker stats
```

3. Monitor during test:
```bash
docker compose -f docker/compose.yaml up -d
docker stats --no-stream
```

### View Logs

```bash
# All services
docker compose -f docker/compose.yaml logs

# Follow in real-time
docker compose -f docker/compose.yaml logs -f

# Specific service
docker compose -f docker/compose.yaml logs agent
docker compose -f docker/compose.yaml logs mock-api

# Last N lines
docker compose -f docker/compose.yaml logs --tail 100 agent

# Save to file
docker compose -f docker/compose.yaml logs > test-run.log
```

### Debug Inside Containers

```bash
# Execute shell
docker compose -f docker/compose.yaml exec agent sh
docker compose -f docker/compose.yaml exec mock-api sh

# Check mock binaries
docker compose -f docker/compose.yaml exec agent /mock-bins/nvram get model
docker compose -f docker/compose.yaml exec agent /mock-bins/wl status

# Check sysfs
docker compose -f docker/compose.yaml exec agent cat /mock-sysfs/class/thermal/thermal_zone0/temp

# Check network
docker compose -f docker/compose.yaml exec agent ip addr
docker compose -f docker/compose.yaml exec agent ping -c 3 mock-api
```

---

## Test Data

### Mock Credentials

| Device ID | API Key | Owner ID | Notes |
|-----------|---------|----------|-------|
| test-device-001 | test-api-key-secret-001 | test-owner-001 | Primary test device |
| test-device-002 | test-api-key-secret-002 | test-owner-001 | Same owner |
| test-device-003 | test-api-key-secret-003 | test-owner-002 | Different owner |

Add in `mock-api/server.ts`:
```typescript
const TEST_CREDENTIALS: Record<string, string> = {
  "test-api-key-secret-001": "test-device-001",
  "test-api-key-secret-002": "test-device-002",
  "test-api-key-secret-003": "test-device-003",
};
```

### Mock Hardware Specs

Simulated ASUS RT-AX92U:

| Parameter | Value |
|-----------|-------|
| Model | RT-AX92U |
| Firmware | 388.1_0 |
| Architecture | aarch64 |
| CPU Cores | 4 |
| Memory | 512 MB |
| WAN Interface | eth0 |
| LAN Interface | br0 |
| WiFi Radios | wlan0 (2.4GHz), wlan1 (5GHz), wlan2 (5GHz-2) |

---

## Performance Benchmarks

Target metrics:

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Build time (agent) | < 5 min | ~3 min | Cross-compilation |
| Test execution (basic) | < 2 min | ~60s | Connection + auth |
| Agent startup | < 5s | ~2s | Container + process |
| Auth handshake | < 1s | ~200ms | WebSocket + JWT |
| Memory (agent idle) | < 50 MB | ~25 MB | Runtime memory |
| Memory (agent active) | < 100 MB | ~35 MB | With metrics |
| CPU (idle) | < 5% | ~2% | No active work |
| Message latency | < 100ms | ~50ms | Mock API RTT |

Run benchmarks:
```bash
./docker/test-performance.sh
```

---

## Development Workflow

### Adding New Tests

1. **Create test script**:
```bash
touch docker/test-new-feature.sh
chmod +x docker/test-new-feature.sh
```

2. **Implement test**:
```bash
#!/bin/sh
set -e

echo "=== Testing New Feature ==="

# Start services
docker compose -f docker/compose.yaml up -d

# Run test logic
curl http://localhost:8787/new-endpoint

# Verify results
# ...

# Cleanup
docker compose -f docker/compose.yaml down
```

3. **Add to test suite**:
```bash
# Edit run-all-tests.sh
./docker/test-new-feature.sh
```

4. **Update documentation**:
```bash
# Edit this file (DOCKER_TESTING.md)
```

### Modifying Mock API

**File**: `mock-api/server.ts`

```typescript
// Add new RPC message handler
function handleNewMessage(ws, msg) {
  log("NEW_MESSAGE", ws.data.device_id, "Processing...");

  // Process message
  const result = processNewMessage(msg.payload);

  // Send response
  ws.send(response("NEW_MESSAGE_OK", result, msg.id));
}

// Register in message switch
switch (msg.type) {
  case "NEW_MESSAGE":
    handleNewMessage(ws, msg);
    break;
  // ... existing handlers
}
```

### Adding Mock Binaries

**Directory**: `mock-bins/`

```bash
#!/bin/sh
# mock-bins/new-command

# Parse arguments
CMD="$1"
shift

case "$CMD" in
  status)
    echo "Status: OK"
    exit 0
    ;;
  info)
    echo "Info: Mock data"
    exit 0
    ;;
  *)
    echo "Usage: new-command {status|info}"
    exit 1
    ;;
esac
```

Make executable:
```bash
chmod +x mock-bins/new-command
```

### Adding Mock Sysfs Files

**Directory**: `mock-sysfs/`

```bash
# Create directory structure
mkdir -p mock-sysfs/class/hwmon/hwmon0

# Add mock data
echo "45000" > mock-sysfs/class/hwmon/hwmon0/temp1_input
echo "50000" > mock-sysfs/class/hwmon/hwmon0/temp2_input

# Verify
cat mock-sysfs/class/hwmon/hwmon0/temp1_input
```

---

## References

- [Integration Test Framework](./README.md) - Overall test framework
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [PROJECT.md](../../PROJECT.md) - Project status
- [API README](../../packages/api/README.md) - Rust API server

---

*Last updated: 2026-02-09*
