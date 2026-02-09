# QEMU Test Environment Quick Start

Fast guide to running integration tests for the NGFW agent.

## TL;DR

```bash
# Docker (fastest, CI-friendly)
bun run test:integration:docker

# QEMU (full VM emulation)
bun run test:integration:qemu
```

## What Gets Tested

The integration tests validate:

1. **Agent Authentication** — Device credentials verified via WebSocket
2. **RPC Protocol** — Complete message flow (AUTH, STATUS, METRICS, PING/PONG)
3. **System Metrics** — CPU, memory, temperature, network stats from procfs/sysfs
4. **Router Simulation** — Mock ASUS RT-AX92U binaries (nvram, wl, ip, iptables)
5. **Configuration Loading** — Agent reads and applies config.toml
6. **Network Communication** — WebSocket connection stability and reconnection

## Prerequisites

### Quick Check

```bash
# Check if QEMU binfmt is registered
docker run --rm --platform linux/arm64 alpine:3.21 uname -m
# Expected: aarch64

# If not, register it (one-time)
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### For QEMU Tests (Optional)

```bash
# Arch Linux
sudo pacman -S qemu-system-aarch64 edk2-aarch64 cdrtools
cargo install cross

# Ubuntu/Debian
sudo apt install qemu-system-aarch64 qemu-efi-aarch64 genisoimage
cargo install cross
```

## Test Output

### Success

```
=== NGFW Agent Integration Test (Docker) ===
Registering QEMU binfmt handlers...
Building agent container (cross-compiling for aarch64)...
Starting mock API + agent...
Waiting for agent to authenticate and send metrics...
Agent authenticated successfully!
Latest status: {"authenticated":true,"device_id":"test-device-001",...}

=== Agent Logs ===
[INFO] Agent starting (device_id=test-device-001)
[INFO] Connecting to ws://mock-api:8787/agent/ws
[INFO] WebSocket connected
[INFO] Sent AUTH message
[INFO] Received AUTH_OK
[INFO] Sent STATUS message
[INFO] Sent METRICS message

Stopping containers...
=== Integration test passed ===
```

### Failure

If authentication fails:
```
TIMEOUT: Agent did not authenticate within 60s
[ERROR] Authentication failed: Invalid API key
```

Check:
- Test credentials match in `mock-api/server.ts` and `docker/config.toml`
- Mock API server is running and healthy
- Network connectivity between containers

## Test Credentials

All tests use these hardcoded credentials:

```
device_id: "test-device-001"
api_key:   "test-api-key-secret-001"
owner_id:  "test-owner-001"
```

**Do not use these in production.**

## Manual Testing

### Start Mock API Only

```bash
cd tests/integration/mock-api
bun run start

# In another terminal
curl http://localhost:8787/health
curl http://localhost:8787/status
```

### Test WebSocket Connection

```bash
# Install websocat
cargo install websocat

# Connect and send AUTH
websocat ws://localhost:8787/agent/ws?device_id=test-device-001
{"id":"1","type":"AUTH","payload":{"device_id":"test-device-001","api_key":"test-api-key-secret-001","firmware_version":"1.0.0"}}

# Expected response
{"id":"1","type":"AUTH_OK","payload":{"success":true,"server_time":...}}
```

### Run Agent Locally

```bash
# Cross-compile agent
cross build -p ngfw-agent --release --target aarch64-unknown-linux-musl

# Copy test config
cp tests/integration/docker/config.toml /tmp/agent-config.toml

# Run in Docker (aarch64)
docker run --rm -it \
  --platform linux/arm64 \
  -v /tmp/agent-config.toml:/etc/ngfw/config.toml:ro \
  -v ./target/aarch64-unknown-linux-musl/release/ngfw-agent:/usr/local/bin/ngfw-agent:ro \
  alpine:3.21 \
  /usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml
```

## Debugging

### View Logs

```bash
# Docker
docker compose -f tests/integration/docker/compose.yaml logs -f

# Specific service
docker compose -f tests/integration/docker/compose.yaml logs -f agent
```

### Access Container

```bash
docker compose -f tests/integration/docker/compose.yaml exec agent sh
```

### Check Mock Binaries

```bash
# Inside container
nvram get model          # → RT-AX92U
nvram get firmver        # → 3.0.0.4
ip addr show             # → JSON interface list
```

### View Mock API State

```bash
curl http://localhost:8787/status | jq
```

## Performance

Typical run times on AMD Ryzen 9 5950X:

| Test | First Run | Cached |
|------|-----------|--------|
| Docker | 4m 30s | 2m 15s |
| QEMU | 5m 45s | 3m 30s |

Docker is recommended for CI/CD pipelines.

## Common Issues

### "exec format error"

QEMU binfmt not registered. Fix:
```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### "Agent did not authenticate"

1. Check mock API is running:
   ```bash
   curl http://localhost:8787/health
   ```

2. Check credentials in config.toml match mock-api/server.ts

3. View agent logs:
   ```bash
   docker compose -f tests/integration/docker/compose.yaml logs agent
   ```

### "UEFI firmware not found" (QEMU only)

Install UEFI firmware:
```bash
# Arch
sudo pacman -S edk2-aarch64

# Ubuntu
sudo apt install qemu-efi-aarch64
```

## CI/CD

### GitHub Actions

```yaml
- name: Setup QEMU
  run: docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

- name: Run tests
  run: bun run test:integration:docker
```

### GitLab CI

```yaml
test:
  image: oven/bun:1
  services:
    - docker:dind
  before_script:
    - docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
  script:
    - bun run test:integration:docker
```

## Next Steps

- Read full documentation: [README.md](./README.md)
- Explore mock API: [mock-api/server.ts](./mock-api/server.ts)
- Check agent protocol: [../../packages/protocol/src/rpc.rs](../../packages/protocol/src/rpc.rs)
- View mock binaries: [mock-bins/](./mock-bins/)

## Support

For issues or questions:
- Check [troubleshooting section](./README.md#troubleshooting)
- Review agent logs
- Inspect mock API state at `http://localhost:8787/status`
