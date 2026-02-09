# Test Environment Architecture

Technical architecture documentation for the NGFW agent integration test environment.

## System Components

### 1. Mock API Server (Bun + WebSocket)

**Location:** `mock-api/server.ts`

**Purpose:** Simulates the production Rust API server at `api.ngfw.sh` for testing agent-to-API communication.

**Implementation:**
- Bun HTTP server with WebSocket upgrade on `/agent/ws`
- RPC envelope protocol handler
- Connection state tracking per device
- HTTP endpoints for test assertions

**Key Features:**
```typescript
// WebSocket upgrade with query parameters
ws://localhost:8787/agent/ws?device_id=...&owner_id=...

// Per-connection state
interface ConnectionState {
  authenticated: boolean;
  device_id: string | null;
  firmware_version: string | null;
  last_status: Record<string, unknown> | null;
  last_metrics: Record<string, unknown> | null;
}

// Global device registry for test assertions
const device_states = new Map<string, ConnectionState>();
```

**Endpoints:**

| Path | Method | Purpose |
|------|--------|---------|
| `/agent/ws` | WebSocket | Agent connection with RPC protocol |
| `/health` | GET | Healthcheck (`{"status":"ok"}`) |
| `/status` | GET | Latest agent state (for test assertions) |

**RPC Message Handlers:**

| Type | Handler | Response |
|------|---------|----------|
| `AUTH` | `handleAuth()` | `AUTH_OK` or `AUTH_FAIL` |
| `STATUS` | `handleStatus()` | `STATUS_OK` |
| `METRICS` | `handleMetrics()` | (no response, stored) |
| `PING` | `handlePing()` | `PONG` |
| `LOG` | `handleLog()` | (logged to console) |
| `ALERT` | `handleAlert()` | (logged to console) |

**Authentication:**

Hardcoded test credentials in `TEST_CREDENTIALS` map:
```typescript
const TEST_CREDENTIALS: Record<string, string> = {
  "test-api-key-secret-001": "test-device-001",
};
```

Validates:
1. API key exists in map
2. device_id matches expected value for that API key

### 2. NGFW Agent (Rust, aarch64)

**Location:** `packages/agent/` (compiled to aarch64-unknown-linux-musl)

**Purpose:** Production agent binary running in simulated RT-AX92U environment.

**Runtime Dependencies:**

| Dependency | Source | Mock Strategy |
|------------|--------|---------------|
| CPU metrics | `/proc/stat` | Host procfs (Docker) or VM kernel (QEMU) |
| Memory metrics | `/proc/meminfo` | Host procfs (Docker) or VM kernel (QEMU) |
| Uptime | `/proc/uptime` | Host procfs (Docker) or VM kernel (QEMU) |
| Load average | `/proc/loadavg` | Host procfs (Docker) or VM kernel (QEMU) |
| Temperature | `/sys/class/thermal/thermal_zone0/temp` | Mock file (45000 = 45.0°C) |
| Network stats | `/sys/class/net/*/statistics/*` | Mock files |
| NVRAM | `nvram` binary | Shell script returning canned values |
| Wireless | `wl` binary | Shell script returning mock status |
| Interfaces | `ip` binary | Shell script returning JSON |
| Firewall | `iptables` binary | Noop script (exit 0) |
| Services | `service` binary | Noop script (exit 0) |

**Configuration:**

```toml
[agent]
device_id = "test-device-001"
api_key = "test-api-key-secret-001"
websocket_url = "ws://mock-api:8787/agent/ws"  # Docker
# websocket_url = "ws://10.0.2.2:8787/agent/ws"  # QEMU
log_level = "debug"
metrics_interval_secs = 5

[mode]
default = "observe"  # Read-only, no system modifications

[adapters]
iptables = true
dnsmasq = true
wifi = true
wireguard = false
system = true
```

### 3. Mock Binaries (Shell Scripts)

**Location:** `mock-bins/`

**Purpose:** Simulate ASUS Merlin router binaries that the agent calls.

#### nvram (ASUS NVRAM Key-Value Store)

```bash
#!/bin/sh
case "$1 $2" in
  "get firmver")       echo "3.0.0.4" ;;
  "get buildno")       echo "388" ;;
  "get model")         echo "RT-AX92U" ;;
  "get serial_no")     echo "MOCK-SN-001" ;;
  "get lan_ipaddr")    echo "192.168.1.1" ;;
  "get wan0_ipaddr")   echo "203.0.113.42" ;;
  "get wl0_ssid")      echo "NGFW-Test-2G" ;;
  "get wl1_ssid")      echo "NGFW-Test-5G" ;;
  *)                   echo "" ;;
esac
```

**Agent Usage:**
```rust
// Firmware version detection
let version = Command::new("nvram")
    .args(["get", "firmver"])
    .output()?;
// Returns: "3.0.0.4"
```

#### wl (Broadcom Wireless CLI)

```bash
#!/bin/sh
case "$1" in
  "status")    echo "Status: Connected" ;;
  "assoclist") echo "assoclist 00:11:22:33:44:55" ;;
  *)           echo "" ;;
esac
```

**Agent Usage:**
```rust
// Check wireless status
let status = Command::new("wl").arg("status").output()?;
// Returns: "Status: Connected"
```

#### ip (iproute2 Network Configuration)

```bash
#!/bin/sh
case "$*" in
  "-j addr show"|"addr show")
    cat <<'JSON'
[{"ifname":"eth0","addr_info":[{"family":"inet","local":"203.0.113.42","prefixlen":24}]},
 {"ifname":"br0","addr_info":[{"family":"inet","local":"192.168.1.1","prefixlen":24}]}]
JSON
    ;;
  "-j link show"|"link show")
    cat <<'JSON'
[{"ifname":"eth0","operstate":"UP","mtu":1500},
 {"ifname":"br0","operstate":"UP","mtu":1500}]
JSON
    ;;
  *) echo "[]" ;;
esac
```

**Agent Usage:**
```rust
// Get interface list
let interfaces = Command::new("ip")
    .args(["-j", "addr", "show"])
    .output()?;
// Returns: JSON array of interfaces
```

### 4. Mock Sysfs (Temperature & Network Stats)

**Location:** `mock-sysfs/class/`

**Purpose:** Provide static system metrics files that the agent reads.

**File Structure:**
```
mock-sysfs/
└── class/
    ├── thermal/
    │   └── thermal_zone0/
    │       └── temp                     # 45000 (45.0°C)
    └── net/
        ├── eth0/
        │   └── statistics/
        │       ├── rx_bytes             # 123456789
        │       └── tx_bytes             # 987654321
        └── br0/
            └── statistics/
                ├── rx_bytes             # 55555555
                └── tx_bytes             # 44444444
```

**Agent Usage:**
```rust
// Read temperature
let temp = std::fs::read_to_string("/sys/class/thermal/thermal_zone0/temp")?;
// Returns: "45000"

// Read network stats
let rx = std::fs::read_to_string("/sys/class/net/eth0/statistics/rx_bytes")?;
// Returns: "123456789"
```

## Execution Environments

### Docker Environment

**Approach:** QEMU user-mode emulation (binfmt_misc)

**Components:**
```yaml
services:
  mock-api:
    image: oven/bun:1
    # Native x86_64, runs on host arch
    ports: ["8787:8787"]

  agent:
    image: alpine:3.21 (linux/arm64)
    # aarch64 Alpine via QEMU user-mode
    # Agent binary: aarch64-unknown-linux-musl
    volumes:
      - /proc:/proc:ro        # Host procfs
    tmpfs:
      - /sys:exec             # Mock sysfs overlaid
```

**Networking:**
- Bridge network with `mock-api` hostname resolution
- Agent connects to `ws://mock-api:8787/agent/ws`

**File Layout:**
```
Container filesystem:
├── /usr/local/bin/ngfw-agent      # Agent binary (aarch64)
├── /mock-bins/                     # Mock binaries (prepended to PATH)
├── /mock-sysfs/                    # Source for tmpfs overlay
├── /sys/                           # tmpfs with mock sysfs copied in
├── /proc/                          # Bind mount from host (read-only)
└── /etc/ngfw/config.toml           # Agent config
```

**Entrypoint Script:**
```bash
#!/bin/sh
# Copy mock sysfs into /sys tmpfs
cp -r /mock-sysfs/* /sys/

# Prepend mock binaries to PATH
export PATH="/mock-bins:$PATH"

# Wait for mock API health
until wget -q -O /dev/null http://mock-api:8787/health; do
  sleep 1
done

# Start agent
exec /usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml
```

**Advantages:**
- Fast startup (2-3 minutes cached)
- CI-friendly (GitHub Actions, GitLab CI)
- No sudo required (after binfmt registration)
- Reproducible builds

**Limitations:**
- Shares host kernel (procfs reflects host state)
- Requires one-time binfmt registration
- Linux hosts only

### QEMU VM Environment

**Approach:** Full system emulation (qemu-system-aarch64)

**Components:**
- Alpine Linux 3.21 (aarch64) cloud image
- UEFI firmware (EDK2)
- cloud-init (NoCloud datasource)
- User-mode networking

**VM Specifications:**
```
CPU:    Cortex-A53 (2 cores)
Memory: 512 MB
Disk:   2 GB (qcow2, snapshot mode)
Seed:   cloud-init ISO (cidata volume)
```

**Networking:**
```
QEMU user-mode networking:
- Host gateway: 10.0.2.2
- VM can reach host via 10.0.2.2
- Host forwards:
  - localhost:2222 → VM port 22 (SSH)
  - localhost:8080 → VM port 80 (HTTP)

Agent connects to: ws://10.0.2.2:8787/agent/ws
```

**Boot Process:**

1. **QEMU Launch:**
   ```bash
   qemu-system-aarch64 \
     -M virt -cpu cortex-a53 -smp 2 -m 512 \
     -bios /usr/share/edk2/aarch64/QEMU_EFI.fd \
     -drive file=ngfw-test.qcow2,format=qcow2,if=virtio,snapshot=on \
     -drive file=seed.iso,format=raw,if=virtio \
     -netdev user,id=net0,hostfwd=tcp::2222-:22 \
     -device virtio-net-pci,netdev=net0 \
     -nographic
   ```

2. **UEFI Boot:** Firmware loads kernel from qcow2

3. **Kernel Boot:** Alpine Linux kernel starts

4. **cloud-init:** Reads seed ISO (`/dev/vdb`):
   - Creates `ngfw` user
   - Writes mock binaries to `/usr/local/bin/`
   - Writes agent config to `/etc/ngfw/config.toml`
   - Downloads agent binary from host HTTP server (`http://10.0.2.2:9999/ngfw-agent`)
   - Starts agent in background

5. **Agent Connects:** WebSocket to mock API at `ws://10.0.2.2:8787/agent/ws`

**cloud-init user-data.yaml:**
```yaml
#cloud-config
hostname: ngfw-test-router

users:
  - name: ngfw
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/ash

write_files:
  - path: /usr/local/bin/nvram
    permissions: "0755"
    content: |
      #!/bin/sh
      # Mock NVRAM script

  - path: /etc/ngfw/config.toml
    permissions: "0644"
    content: |
      [agent]
      device_id = "test-device-001"
      websocket_url = "ws://10.0.2.2:8787/agent/ws"

runcmd:
  - wget -O /usr/local/bin/ngfw-agent http://10.0.2.2:9999/ngfw-agent
  - chmod +x /usr/local/bin/ngfw-agent
  - /usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml &
```

**Image Preparation:**

1. Download Alpine cloud VHD (Azure variant)
2. Convert VHD to qcow2
3. Patch cloud-init datasource (Azure → NoCloud)
4. Clear cached cloud-init state
5. Generate seed ISO with user-data and meta-data

**Advantages:**
- Real kernel with real procfs/sysfs
- Full isolation from host
- Accurate system simulation
- SSH access for debugging

**Limitations:**
- Slower (5-6 minutes total)
- Requires QEMU system packages
- Requires sudo for NBD mount (image patching)
- More resource intensive

## RPC Protocol

### Message Envelope

All messages use JSON envelopes:

```typescript
interface RpcMessage {
  id: string;           // UUID v4
  type: string;         // SCREAMING_SNAKE_CASE
  payload: object;      // Message-specific data
}
```

### Agent → Server Messages

#### AUTH

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "AUTH",
  "payload": {
    "device_id": "test-device-001",
    "api_key": "test-api-key-secret-001",
    "firmware_version": "3.0.0.4.388.7"
  }
}
```

**Response:** `AUTH_OK` or `AUTH_FAIL`

#### STATUS

```json
{
  "id": "...",
  "type": "STATUS",
  "payload": {
    "uptime": 1234567,
    "cpu": 23.5,
    "memory": 41.2,
    "temperature": 45.0,
    "load": [0.42, 0.38, 0.35],
    "interfaces": [
      {
        "name": "eth0",
        "status": "up",
        "ip": "203.0.113.42/24",
        "rx_bytes": 847293847234,
        "tx_bytes": 234827348123,
        "rx_rate": 12847293,
        "tx_rate": 3948273
      }
    ],
    "connections": 847,
    "wan_ip": "203.0.113.42",
    "firmware": "3.0.0.4.388.7"
  }
}
```

**Response:** `STATUS_OK`

#### METRICS

Sent every 5 seconds (configurable via `metrics_interval_secs`):

```json
{
  "id": "...",
  "type": "METRICS",
  "payload": {
    "timestamp": 1703520000,
    "cpu": 23.5,
    "memory": 41.2,
    "temperature": 45.0,
    "interfaces": {
      "eth0": { "rx_rate": 12847293, "tx_rate": 3948273 },
      "br0": { "rx_rate": 8473920, "tx_rate": 12938470 }
    },
    "connections": {
      "total": 847,
      "tcp": 623,
      "udp": 224
    }
  }
}
```

**Response:** None (fire-and-forget)

#### PING

Keepalive message:

```json
{
  "id": "...",
  "type": "PING",
  "payload": {}
}
```

**Response:** `PONG`

### Server → Agent Messages

#### AUTH_OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "AUTH_OK",
  "payload": {
    "success": true,
    "server_time": 1703520000000
  }
}
```

#### AUTH_FAIL

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "AUTH_FAIL",
  "payload": {
    "success": false,
    "error": "Invalid device credentials"
  }
}
```

#### STATUS_OK

```json
{
  "id": "...",
  "type": "STATUS_OK",
  "payload": {}
}
```

#### PONG

```json
{
  "id": "...",
  "type": "PONG",
  "payload": {}
}
```

## Test Execution Flow

### Docker Flow

```
┌────────────────────────────────────────────────────────────┐
│ 1. Verify QEMU binfmt registered                           │
│    docker run --platform linux/arm64 alpine uname -m       │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Build agent container (multi-stage)                     │
│    Stage 1: cross-rs/aarch64-musl builder                  │
│      cargo build --target aarch64-unknown-linux-musl       │
│    Stage 2: alpine:3.21 (linux/arm64)                      │
│      Copy agent + mocks, set entrypoint                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Start services (docker compose)                         │
│    mock-api: Bun server on port 8787                       │
│      Wait for healthcheck (5s interval)                    │
│    agent: Wait for mock-api healthy condition              │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Agent startup (inside container)                        │
│    entrypoint.sh:                                           │
│      - Copy mock sysfs to /sys                             │
│      - Prepend /mock-bins to PATH                          │
│      - Wait for mock API health                            │
│      - Start agent                                         │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 5. Agent connects and authenticates                        │
│    WebSocket: ws://mock-api:8787/agent/ws                  │
│    Send AUTH → Receive AUTH_OK                             │
│    Send STATUS → Receive STATUS_OK                         │
│    Send METRICS (every 5s)                                 │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 6. Test verification (run-docker.sh)                       │
│    Poll http://localhost:8787/status every 1s              │
│    Wait for: {"authenticated":true,...}                    │
│    Timeout: 60 seconds                                     │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 7. Success or failure                                      │
│    Success: Show logs and cleanup                          │
│    Failure: Dump logs and exit 1                           │
└────────────────────────────────────────────────────────────┘
```

### QEMU Flow

```
┌────────────────────────────────────────────────────────────┐
│ 1. Cross-compile agent                                      │
│    cross build -p ngfw-agent --release --target            │
│      aarch64-unknown-linux-musl                             │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Build VM image (qemu/build-image.sh)                    │
│    - Download Alpine VHD (cached)                          │
│    - Convert VHD → qcow2                                   │
│    - Mount via NBD (sudo qemu-nbd)                         │
│    - Patch cloud-init: Azure → NoCloud                     │
│    - Clear cloud-init cache                                │
│    - Unmount                                               │
│    - Generate seed ISO (user-data + meta-data)             │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Start host services (background)                        │
│    mock-api: bun run server.ts (port 8787)                 │
│    agent-server: Bun HTTP server (port 9999)               │
│      Serves agent binary for VM download                   │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Launch QEMU VM (qemu/launch.sh)                         │
│    qemu-system-aarch64:                                     │
│      - UEFI boot                                           │
│      - 2 vCPUs, 512 MB RAM                                 │
│      - qcow2 disk (snapshot mode)                          │
│      - seed ISO (cloud-init)                               │
│      - User networking (10.0.2.2 = host)                   │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 5. VM boot and cloud-init                                  │
│    - UEFI → Kernel → Init                                  │
│    - cloud-init reads seed ISO                             │
│      - Create ngfw user                                    │
│      - Write mock binaries                                 │
│      - Write agent config                                  │
│      - Download agent: wget http://10.0.2.2:9999/...       │
│      - Start agent in background                           │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 6. Agent connects and authenticates                        │
│    WebSocket: ws://10.0.2.2:8787/agent/ws                  │
│    Send AUTH → Receive AUTH_OK                             │
│    Send STATUS → Receive STATUS_OK                         │
│    Send METRICS (every 5s)                                 │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 7. Test verification (run-qemu.sh)                         │
│    Poll http://localhost:8787/status every 1s              │
│    Wait for: {"authenticated":true,...}                    │
│    Timeout: 120 seconds (includes VM boot time)            │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 8. Success or failure                                      │
│    Success: Cleanup and exit 0                             │
│    Failure: Kill processes and exit 1                      │
└────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

### Docker

| Phase | Duration | Cached |
|-------|----------|--------|
| Agent cross-compilation | 2m 30s | 5s |
| Container build | 1m 45s | 10s |
| Service startup | 15s | 15s |
| Agent connect & auth | 5s | 5s |
| **Total** | **4m 35s** | **2m 15s** |

### QEMU

| Phase | Duration | Cached |
|-------|----------|--------|
| Agent cross-compilation | 2m 30s | 5s |
| Image preparation | 1m 30s | 45s |
| VM boot | 1m 15s | 1m 15s |
| cloud-init execution | 25s | 25s |
| Agent connect & auth | 5s | 5s |
| **Total** | **5m 45s** | **3m 30s** |

**Recommendations:**
- CI/CD: Use Docker (faster, more reliable)
- Local development: Use Docker for quick iterations
- Deep debugging: Use QEMU (SSH access, full system)

## Security Considerations

### Test Credentials

All test credentials are hardcoded and **must not** be used in production:

```
device_id: "test-device-001"
api_key:   "test-api-key-secret-001"
owner_id:  "test-owner-001"
```

These are defined in:
- `mock-api/server.ts` (TEST_CREDENTIALS map)
- `docker/config.toml` (agent config)
- `qemu/user-data.yaml` (agent config)

### Network Isolation

**Docker:**
- Bridge network isolates test environment
- Only port 8787 exposed to host

**QEMU:**
- User-mode networking (no bridge)
- VM cannot access host network beyond forwarded ports
- No internet access by default

### Container Permissions

Docker containers run as:
- Non-privileged (no `--privileged` flag)
- Read-only procfs mount
- Tmpfs for sysfs (ephemeral)
- Memory/CPU limits enforced

### Secret Management

No production secrets should ever be committed to this test environment. All credentials are mock values for testing only.

## Extending the Framework

### Adding New Mock Binaries

1. Create executable script in `mock-bins/`:
   ```bash
   #!/bin/sh
   echo "mock output"
   ```

2. Make executable:
   ```bash
   chmod +x tests/integration/mock-bins/new-binary
   ```

3. Automatically available in PATH for both Docker and QEMU

### Adding New Sysfs Files

1. Create file in `mock-sysfs/` hierarchy:
   ```bash
   mkdir -p tests/integration/mock-sysfs/class/custom
   echo "value" > tests/integration/mock-sysfs/class/custom/metric
   ```

2. For QEMU, add to `qemu/user-data.yaml` write_files section

### Adding New RPC Message Types

1. Update `mock-api/server.ts` message switch:
   ```typescript
   case "NEW_TYPE":
     handleNewType(ws, msg);
     break;
   ```

2. Implement handler:
   ```typescript
   function handleNewType(ws, msg) {
     log("NEW_TYPE", ws.data.device_id, "Processing...");
     ws.send(response("NEW_TYPE_OK", {}, msg.id));
   }
   ```

3. Test with websocat

## Debugging Guide

### Enable Verbose Logging

**Agent:**
```toml
[agent]
log_level = "trace"  # debug|info|warn|error|trace
```

**Mock API:**
```typescript
// server.ts already logs all messages
// View with:
docker compose -f tests/integration/docker/compose.yaml logs -f mock-api
```

### Inspect Agent State

**Docker:**
```bash
# Exec into container
docker compose -f tests/integration/docker/compose.yaml exec agent sh

# Check processes
ps aux | grep ngfw

# Check mocks work
nvram get model
ip addr show
cat /sys/class/thermal/thermal_zone0/temp
```

**QEMU:**
```bash
# SSH into VM
ssh -p 2222 ngfw@localhost

# Check cloud-init logs
cat /var/log/cloud-init-output.log
cat /var/log/cloud-init.log

# Check agent logs
journalctl -u ngfw-agent
```

### Network Debugging

```bash
# Test mock API from host
curl http://localhost:8787/health
curl http://localhost:8787/status | jq

# Test WebSocket connection
websocat ws://localhost:8787/agent/ws?device_id=test
```

## References

- Agent source: `../../packages/agent/`
- Protocol definitions: `../../packages/protocol/src/rpc.rs`
- Production API: `../../packages/api/`
- Docker documentation: https://docs.docker.com/
- QEMU documentation: https://www.qemu.org/docs/
- cloud-init documentation: https://cloudinit.readthedocs.io/
- Alpine Linux: https://alpinelinux.org/
