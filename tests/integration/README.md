# NGFW Agent Integration Test Environment

Complete testing infrastructure for the NGFW router agent, simulating an ASUS RT-AX92U router running Merlin firmware.

## Overview

This test environment enables end-to-end testing of the NGFW agent binary without physical hardware. It provides two approaches:

1. **Docker** — Fast, CI-friendly containerized testing
2. **QEMU VM** — Full system emulation with real kernel and cloud-init

Both approaches simulate the RT-AX92U router environment and validate the complete agent-to-API communication flow over WebSocket.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Test Environment                           │
│                                                                │
│  ┌──────────────┐         ┌──────────────┐                   │
│  │  Mock API    │◄────────┤  NGFW Agent  │                   │
│  │   (Bun)      │ WebSocket│  (aarch64)  │                   │
│  │              │         │              │                   │
│  │  Port 8787   │         │  Mock Bins   │                   │
│  └──────────────┘         │  Mock Sysfs  │                   │
│                           │  Mock Procfs │                   │
│                           └──────────────┘                   │
│                                                                │
│  Docker: Alpine aarch64 via QEMU user-mode                    │
│  QEMU:   Full Alpine VM with UEFI boot + cloud-init          │
└──────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
tests/integration/
├── mock-api/
│   ├── server.ts          # Bun WebSocket server (RPC protocol)
│   └── package.json       # Dependencies
├── mock-bins/
│   ├── nvram              # ASUS NVRAM simulator
│   ├── wl                 # Wireless CLI simulator
│   ├── ip                 # iproute2 simulator
│   ├── iptables           # iptables noop
│   └── service            # service noop
├── mock-sysfs/
│   └── class/
│       ├── thermal/       # Temperature sensors
│       └── net/           # Network interface statistics
├── docker/
│   ├── Dockerfile         # Multi-stage build (cross-compile + runtime)
│   ├── compose.yaml       # Docker Compose orchestration
│   ├── config.toml        # Agent configuration for Docker
│   └── entrypoint.sh      # Container startup script
├── qemu/
│   ├── build-image.sh     # Download and patch Alpine cloud image
│   ├── launch.sh          # QEMU system launcher
│   └── user-data.yaml     # cloud-init configuration
├── run-docker.sh          # Docker test runner
└── run-qemu.sh            # QEMU test runner
```

## Quick Start

### Run Docker Tests

```bash
bun run test:integration:docker
```

**Expected duration:** 2-5 minutes (first run may take longer for cross-compilation)

### Run QEMU Tests

```bash
bun run test:integration:qemu
```

**Expected duration:** 3-6 minutes (includes VM boot time)

## Prerequisites

### Docker Approach

- Docker with BuildKit enabled
- QEMU user-mode emulation (one-time setup):
  ```bash
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
  ```

### QEMU Approach

- `qemu-system-aarch64` — QEMU system emulator
- `edk2-aarch64` — UEFI firmware for ARM64
- `cross` — Rust cross-compilation tool
- `mkisofs` or `genisoimage` — ISO image creation

**Arch Linux installation:**
```bash
sudo pacman -S qemu-system-aarch64 edk2-aarch64 cdrtools
cargo install cross
```

## Test Flow

### Docker Test Flow

1. Register QEMU binfmt handlers if needed
2. Cross-compile the agent for `aarch64-unknown-linux-musl`
3. Build Alpine ARM64 container with agent and mocks
4. Start mock API server
5. Start agent container
6. Verify authentication and metrics flow
7. Display logs and cleanup

### QEMU Test Flow

1. Cross-compile the agent for `aarch64-unknown-linux-musl`
2. Download Alpine cloud image (cached after first run)
3. Patch cloud-init datasource from Azure to NoCloud
4. Generate cloud-init seed ISO
5. Start mock API server
6. Serve agent binary over HTTP (port 9999)
7. Boot Alpine VM with QEMU
8. VM downloads agent via cloud-init and starts it
9. Verify authentication and metrics flow
10. Cleanup and shutdown

## Mock API Server

The mock API server (`mock-api/server.ts`) implements the full RPC protocol used by the Rust API server.

### Endpoints

| Endpoint | Type | Purpose |
|----------|------|---------|
| `ws://localhost:8787/agent/ws` | WebSocket | Agent connection endpoint |
| `http://localhost:8787/health` | HTTP | Healthcheck (returns `{"status":"ok"}`) |
| `http://localhost:8787/status` | HTTP | Latest agent state for test assertions |

### RPC Message Flow

```
Agent → Server: AUTH { device_id, api_key, firmware_version }
Server → Agent: AUTH_OK { success: true, server_time }

Agent → Server: STATUS { uptime, cpu, memory, temperature, ... }
Server → Agent: STATUS_OK {}

Agent → Server: METRICS { timestamp, cpu, memory, interfaces, ... }
(periodic, every 5 seconds)

Agent ↔ Server: PING / PONG (keepalive)
```

### Test Credentials

Hardcoded in `mock-api/server.ts`:

```typescript
device_id: "test-device-001"
api_key:   "test-api-key-secret-001"
owner_id:  "test-owner-001"
```

## Mock Environment

### Mock Binaries

The agent expects these ASUS Merlin binaries:

| Binary | Purpose | Mock Behavior |
|--------|---------|---------------|
| `nvram` | NVRAM key-value store | Returns canned firmware version, model, IP addresses, SSIDs |
| `wl` | Broadcom wireless CLI | Returns mock wireless status and client list |
| `ip` | iproute2 network config | Returns JSON interface list (eth0, br0) |
| `iptables` | Netfilter firewall | Noop (exits 0) |
| `service` | Service control | Noop (exits 0) |

**Example NVRAM queries:**
```bash
$ nvram get model
RT-AX92U

$ nvram get firmver
3.0.0.4

$ nvram get wan0_ipaddr
203.0.113.42
```

### Mock Sysfs

The agent reads system metrics from sysfs:

```
/sys/class/thermal/thermal_zone0/temp       → 45000 (45.0°C)
/sys/class/net/eth0/statistics/rx_bytes     → 123456789
/sys/class/net/eth0/statistics/tx_bytes     → 987654321
/sys/class/net/br0/statistics/rx_bytes      → 55555555
/sys/class/net/br0/statistics/tx_bytes      → 44444444
```

### Mock Procfs

Docker: Bind-mounts host `/proc` read-only
QEMU: Real kernel procfs from Alpine VM

The agent reads from:
- `/proc/stat` — CPU usage
- `/proc/meminfo` — Memory statistics
- `/proc/uptime` — System uptime
- `/proc/loadavg` — Load averages
- `/proc/net/tcp`, `/proc/net/udp` — Connection tracking

## Configuration

### Agent Configuration

Both Docker and QEMU use similar agent configs (`config.toml`):

```toml
[agent]
device_id = "test-device-001"
api_key = "test-api-key-secret-001"
websocket_url = "ws://mock-api:8787/agent/ws"  # Docker
# websocket_url = "ws://10.0.2.2:8787/agent/ws"  # QEMU (host gateway)
log_level = "debug"
metrics_interval_secs = 5

[mode]
default = "observe"

[adapters]
iptables = true
dnsmasq = true
wifi = true
wireguard = false
system = true
```

### Docker Networking

- Mock API container: `mock-api` hostname on default bridge network
- Agent container: Connects to `mock-api:8787`
- Host access: `localhost:8787` for test assertions

### QEMU Networking

QEMU user-mode networking provides:
- Host gateway: `10.0.2.2` (VM can reach host services)
- SSH forwarding: `localhost:2222` → VM port 22
- HTTP forwarding: `localhost:8080` → VM port 80

Agent connects to `ws://10.0.2.2:8787/agent/ws` to reach mock API on host.

## Manual Testing

### Start Mock API Server

```bash
cd tests/integration/mock-api
bun run start
```

Check status:
```bash
curl http://localhost:8787/health
curl http://localhost:8787/status
```

### Docker Manual Run

```bash
cd tests/integration

# Build and start
docker compose -f docker/compose.yaml up --build

# In another terminal
curl http://localhost:8787/status

# Cleanup
docker compose -f docker/compose.yaml down
```

### QEMU Manual Run

```bash
cd tests/integration

# Build VM image
qemu/build-image.sh

# Start mock API (in background)
cd mock-api && bun run start &

# Serve agent binary
cd ../../target/aarch64-unknown-linux-musl/release
bun -e "Bun.serve({port:9999,fetch(r){const f=Bun.file('ngfw-agent');return f.exists().then(e=>e?new Response(f):new Response('not found',{status:404}))}})" &

# Launch VM
cd ../../../tests/integration
qemu/launch.sh

# VM will boot, cloud-init will download agent and start it
# Watch serial console for boot progress
# Press Ctrl-A X to exit QEMU
```

## Debugging

### View Agent Logs (Docker)

```bash
docker compose -f tests/integration/docker/compose.yaml logs agent
```

### View Mock API Logs (Docker)

```bash
docker compose -f tests/integration/docker/compose.yaml logs mock-api
```

### Access QEMU VM via SSH

After VM boots, SSH is available on port 2222:

```bash
ssh -p 2222 ngfw@localhost
# Password authentication is disabled, use SSH key if configured in user-data.yaml
```

### Check Agent Status in VM

```bash
# Inside the VM
ps aux | grep ngfw-agent
cat /var/log/cloud-init-output.log
```

### Test RPC Protocol Manually

Use `websocat` to send raw RPC messages:

```bash
# Install websocat
cargo install websocat

# Connect to mock API
websocat ws://localhost:8787/agent/ws?device_id=test-device-001

# Send AUTH message
{"id":"test-123","type":"AUTH","payload":{"device_id":"test-device-001","api_key":"test-api-key-secret-001","firmware_version":"1.0.0"}}

# Server responds with AUTH_OK
{"id":"test-123","type":"AUTH_OK","payload":{"success":true,"server_time":1707500000000}}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test-agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        run: |
          docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

      - name: Install Bun
        uses: oven-sh/setup-bun@v2

      - name: Run Docker integration tests
        run: bun run test:integration:docker
```

Docker approach is recommended for CI as it's faster and more reliable than full VM emulation.

## Troubleshooting

### QEMU binfmt not registered

**Error:** `exec user process caused: exec format error`

**Fix:**
```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### Agent fails to connect to mock API

**Docker:** Check that `mock-api` service is healthy:
```bash
docker compose -f tests/integration/docker/compose.yaml ps
```

**QEMU:** Verify mock API is listening on host:
```bash
curl http://localhost:8787/health
```

### Cloud-init doesn't run in QEMU

**Symptom:** VM boots but agent never starts

**Debug:**
```bash
# Check cloud-init logs inside VM
cat /var/log/cloud-init-output.log
cat /var/log/cloud-init.log
```

**Common cause:** Azure datasource override not patched. Run `qemu/build-image.sh` again.

### Agent binary not found

**Error:** `/usr/local/bin/ngfw-agent: not found`

**Fix:** Ensure agent is cross-compiled before running tests:
```bash
cross build -p ngfw-agent --release --target aarch64-unknown-linux-musl
```

### UEFI firmware not found (QEMU)

**Error:** `ERROR: UEFI firmware not found`

**Fix (Arch Linux):**
```bash
sudo pacman -S edk2-aarch64
```

**Fix (Ubuntu):**
```bash
sudo apt install qemu-efi-aarch64
```

## Performance Benchmarks

Measured on AMD Ryzen 9 5950X, 64GB RAM:

| Test Type | First Run | Cached |
|-----------|-----------|--------|
| Docker | 4m 30s | 2m 15s |
| QEMU | 5m 45s | 3m 30s |

Caching improvements:
- Docker: Image layers cached by Docker
- QEMU: Alpine VHD downloaded once, qcow2 rebuilt from cache

## Extending the Tests

### Add New Mock Binaries

1. Create script in `mock-bins/`:
```bash
#!/bin/sh
# mock-bins/new-binary
echo "mock output"
```

2. Make executable:
```bash
chmod +x tests/integration/mock-bins/new-binary
```

3. Binary is automatically available via PATH in both Docker and QEMU

### Add New Mock Sysfs Files

1. Create file in `mock-sysfs/` hierarchy:
```bash
mkdir -p tests/integration/mock-sysfs/class/hwmon/hwmon0
echo "45000" > tests/integration/mock-sysfs/class/hwmon/hwmon0/temp1_input
```

2. Docker: Automatically copied to `/sys` by entrypoint
3. QEMU: Add to `user-data.yaml` write_files section

### Add New RPC Message Types

1. Update `mock-api/server.ts`:
```typescript
case "NEW_MESSAGE_TYPE":
  handleNewMessageType(ws, msg);
  break;
```

2. Implement handler function
3. Test with manual WebSocket connection

## References

- [NGFW Agent RPC Protocol](../../packages/protocol/src/rpc.rs)
- [Mock API Implementation](./mock-api/server.ts)
- [Docker Multi-platform Build](https://docs.docker.com/build/building/multi-platform/)
- [QEMU User-mode Emulation](https://www.qemu.org/docs/master/user/index.html)
- [cloud-init NoCloud Datasource](https://cloudinit.readthedocs.io/en/latest/reference/datasources/nocloud.html)
- [Alpine Linux Cloud Images](https://alpinelinux.org/cloud/)

## License

See repository root LICENSE file.
