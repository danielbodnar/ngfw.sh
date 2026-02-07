# RT-AX92U Router Test Environment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local test environment that simulates an ASUS RT-AX92U router so we can run the NGFW agent binary end-to-end against a mock API server -- without real hardware.

**Architecture:** Two approaches, both producing a working agent-to-API test loop:
1. **Docker** (fast, CI-friendly) -- Alpine aarch64 container via QEMU user-mode emulation, mock procfs/sysfs, mock shell binaries
2. **QEMU VM** (full system emulation) -- Alpine aarch64 VM with UEFI, cloud-init provisioning, real kernel with real procfs/sysfs

**Tech Stack:** Docker + QEMU user-mode (binfmt_misc), Bun (mock API WebSocket server), cross-rs (aarch64 agent cross-compilation), QEMU system aarch64, cloud-init

---

## Agent Runtime Dependencies (from codebase analysis)

The agent reads from these sources at runtime:

| Source | Files | Mock Strategy |
|--------|-------|---------------|
| procfs | `/proc/stat`, `/proc/meminfo`, `/proc/uptime`, `/proc/loadavg`, `/proc/net/tcp`, `/proc/net/udp`, `/proc/net/nf_conntrack` | Docker: host procfs (read-only bind mount). QEMU: real kernel procfs |
| sysfs | `/sys/class/thermal/thermal_zone*/temp`, `/sys/class/net/*/statistics/*` | Docker: tmpfs with synthetic files. QEMU: real kernel sysfs |
| Binaries | `nvram`, `wl`, `ip`, `iptables`, `service`, `hostapd_cli`, `wg` | Docker: shell script stubs returning canned output. QEMU: same stubs |
| Config | `/jffs/ngfw/config.toml` | Mounted/provisioned config file |
| Network | WebSocket to `wss://api.ngfw.sh/agent/ws` | Local mock API server on `ws://host:8787/agent/ws` |

### RPC Protocol (from `packages/protocol/src/rpc.rs`)

```
Agent → API:  AUTH { device_id, api_key, firmware_version }
API → Agent:  AUTH_OK { success: true, server_time }
Agent → API:  STATUS { uptime, cpu, memory, temperature, load, interfaces, connections, wan_ip, firmware }
Agent → API:  METRICS { timestamp, cpu, memory, temperature, interfaces, connections, dns }  (periodic)
Agent ↔ API:  PING / PONG  (keepalive)
```

Envelope: `{ "id": "<uuid>", "type": "SCREAMING_SNAKE_CASE", "payload": { ... } }`

---

## Directory Structure

All test infrastructure lives in `tests/integration/`:

```
tests/integration/
  mock-api/
    server.ts              # Bun WebSocket server speaking RPC protocol
    package.json           # { "dependencies": {} }
  mock-bins/
    nvram                  # Shell script: echo canned NVRAM values
    wl                     # Shell script: echo canned wireless info
    ip                     # Shell script: echo canned interface info
    iptables               # Shell script: noop
    service                # Shell script: noop
  mock-sysfs/
    class/thermal/thermal_zone0/temp    # File containing "45000"
    class/net/eth0/statistics/rx_bytes  # File containing "123456789"
    class/net/eth0/statistics/tx_bytes  # File containing "987654321"
    class/net/br0/statistics/rx_bytes   # File containing "55555555"
    class/net/br0/statistics/tx_bytes   # File containing "44444444"
  docker/
    Dockerfile             # Alpine aarch64 + QEMU user-mode
    compose.yaml           # Agent + mock API services
    entrypoint.sh          # Mounts mock sysfs, prepends mock-bins to PATH, runs agent
    config.toml            # Agent config pointing to mock API
  qemu/
    build-image.sh         # Downloads Alpine cloud image, provisions with cloud-init
    launch.sh              # QEMU system launch script
    user-data.yaml         # cloud-init: install agent, mock bins, config
  run-docker.sh            # One-command Docker test runner
  run-qemu.sh              # One-command QEMU test runner
```

---

## Task 1: Create directory structure and mock binaries

**Files:**
- Create: `tests/integration/mock-bins/nvram`
- Create: `tests/integration/mock-bins/wl`
- Create: `tests/integration/mock-bins/ip`
- Create: `tests/integration/mock-bins/iptables`
- Create: `tests/integration/mock-bins/service`
- Create: `tests/integration/mock-sysfs/class/thermal/thermal_zone0/temp`
- Create: `tests/integration/mock-sysfs/class/net/eth0/statistics/rx_bytes`
- Create: `tests/integration/mock-sysfs/class/net/eth0/statistics/tx_bytes`
- Create: `tests/integration/mock-sysfs/class/net/br0/statistics/rx_bytes`
- Create: `tests/integration/mock-sysfs/class/net/br0/statistics/tx_bytes`

**Step 1: Create mock binary scripts**

Each mock binary is a POSIX shell script that mimics the real binary's output for the specific commands the agent calls.

`nvram`:
```sh
#!/bin/sh
# Mock NVRAM for RT-AX92U
case "$1 $2" in
  "get firmver")       echo "3.0.0.4" ;;
  "get buildno")       echo "388" ;;
  "get extendno")      echo "7" ;;
  "get model")         echo "RT-AX92U" ;;
  "get serial_no")     echo "MOCK-SN-001" ;;
  "get lan_ipaddr")    echo "192.168.1.1" ;;
  "get lan_netmask")   echo "255.255.255.0" ;;
  "get wan0_ipaddr")   echo "203.0.113.42" ;;
  "get wan0_gateway")  echo "203.0.113.1" ;;
  "get wl0_ssid")      echo "NGFW-Test-2G" ;;
  "get wl1_ssid")      echo "NGFW-Test-5G" ;;
  *)                   echo "" ;;
esac
```

`wl` (wireless info):
```sh
#!/bin/sh
case "$1" in
  "status")  echo "Status: Connected" ;;
  "assoclist") echo "assoclist 00:11:22:33:44:55" ;;
  *)         echo "" ;;
esac
```

`ip` (interface listing):
```sh
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

`iptables` and `service`: simple noops that exit 0.

**Step 2: Create mock sysfs files**

Write static values into the mock sysfs tree:
- `thermal_zone0/temp` → `45000` (45.0C)
- `eth0/statistics/rx_bytes` → `123456789`
- `eth0/statistics/tx_bytes` → `987654321`
- `br0/statistics/rx_bytes` → `55555555`
- `br0/statistics/tx_bytes` → `44444444`

**Step 3: Make scripts executable**

```bash
chmod +x tests/integration/mock-bins/*
```

**Step 4: Commit**

```bash
git add tests/integration/mock-bins/ tests/integration/mock-sysfs/
git commit -m "test: add mock binaries and sysfs for RT-AX92U simulation"
```

---

## Task 2: Create mock API WebSocket server

**Files:**
- Create: `tests/integration/mock-api/server.ts`
- Create: `tests/integration/mock-api/package.json`

**Step 1: Write the mock API server**

Bun WebSocket server that speaks the NGFW RPC protocol. It:
1. Listens on port 8787 at `/agent/ws`
2. Accepts `?device_id=...&owner_id=...` query params
3. Receives AUTH message → validates device_id/api_key against hardcoded test values → responds AUTH_OK
4. Receives STATUS message → logs payload → stores in memory
5. Receives METRICS message → logs payload → stores latest
6. Responds to PING with PONG
7. Logs all messages to stdout with timestamps
8. Provides `GET /health` endpoint for healthcheck
9. Provides `GET /status` endpoint returning latest received metrics (for test assertions)

Test credentials (hardcoded):
- `device_id`: `test-device-001`
- `api_key`: `test-api-key-secret-001`
- `owner_id`: `test-owner-001`

**Step 2: Write package.json**

```json
{
  "name": "ngfw-mock-api",
  "private": true,
  "scripts": {
    "start": "bun run server.ts"
  },
  "dependencies": {}
}
```

**Step 3: Test the server**

```bash
cd tests/integration/mock-api && bun run start &
curl http://localhost:8787/health
kill %1
```

Expected: `{"status":"ok"}` response

**Step 4: Commit**

```bash
git add tests/integration/mock-api/
git commit -m "test: add mock API WebSocket server for agent integration testing"
```

---

## Task 3: Create agent test config and Docker entrypoint

**Files:**
- Create: `tests/integration/docker/config.toml`
- Create: `tests/integration/docker/entrypoint.sh`

**Step 1: Write agent config**

```toml
[connection]
device_id = "test-device-001"
api_key = "test-api-key-secret-001"
owner_id = "test-owner-001"
websocket_url = "ws://mock-api:8787/agent/ws"

[agent]
metrics_interval = 5
log_level = "debug"
```

**Step 2: Write entrypoint script**

```sh
#!/bin/sh
set -e

# Mount mock sysfs over /sys (tmpfs already mounted by compose)
if [ -d /mock-sysfs ]; then
  cp -r /mock-sysfs/* /sys/ 2>/dev/null || true
fi

# Prepend mock binaries to PATH
export PATH="/mock-bins:$PATH"

# Wait for mock API to be ready
echo "Waiting for mock API..."
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://mock-api:8787/health 2>/dev/null; then
    echo "Mock API is ready"
    break
  fi
  sleep 1
done

echo "Starting NGFW agent..."
exec /usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml
```

**Step 3: Commit**

```bash
git add tests/integration/docker/config.toml tests/integration/docker/entrypoint.sh
chmod +x tests/integration/docker/entrypoint.sh
git commit -m "test: add agent config and Docker entrypoint for test environment"
```

---

## Task 4: Create Dockerfile and compose.yaml

**Files:**
- Create: `tests/integration/docker/Dockerfile`
- Create: `tests/integration/docker/compose.yaml`

**Step 1: Write Dockerfile**

Multi-stage: cross-compile agent in builder, run in Alpine aarch64.

```dockerfile
# Stage 1: Cross-compile agent for aarch64
FROM ghcr.io/cross-rs/aarch64-unknown-linux-musl:main AS builder
WORKDIR /src
COPY . .
RUN cargo build -p ngfw-agent --release --target aarch64-unknown-linux-musl
RUN cp target/aarch64-unknown-linux-musl/release/ngfw-agent /ngfw-agent

# Stage 2: Runtime (Alpine aarch64 via QEMU user-mode)
FROM --platform=linux/arm64 alpine:3.21
RUN apk add --no-cache wget
COPY --from=builder /ngfw-agent /usr/local/bin/ngfw-agent
COPY tests/integration/mock-bins/ /mock-bins/
COPY tests/integration/mock-sysfs/ /mock-sysfs/
COPY tests/integration/docker/config.toml /etc/ngfw/config.toml
COPY tests/integration/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /mock-bins/* /entrypoint.sh /usr/local/bin/ngfw-agent

ENTRYPOINT ["/entrypoint.sh"]
```

**Step 2: Write compose.yaml**

```yaml
services:
  mock-api:
    image: oven/bun:1
    working_dir: /app
    volumes:
      - ../mock-api:/app:ro
    command: ["bun", "run", "server.ts"]
    ports:
      - "8787:8787"
    healthcheck:
      test: ["CMD", "bun", "-e", "fetch('http://localhost:8787/health').then(r => process.exit(r.ok ? 0 : 1))"]
      interval: 2s
      timeout: 5s
      retries: 10

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

**Step 3: Verify compose config**

```bash
docker compose -f tests/integration/docker/compose.yaml config
```

Expected: Valid YAML, no errors.

**Step 4: Commit**

```bash
git add tests/integration/docker/Dockerfile tests/integration/docker/compose.yaml
git commit -m "test: add Dockerfile and compose.yaml for RT-AX92U simulation"
```

---

## Task 5: Create Docker test runner

**Files:**
- Create: `tests/integration/run-docker.sh`

**Step 1: Write test runner script**

```sh
#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== NGFW Agent Integration Test (Docker) ==="

# Ensure QEMU user-mode is registered for aarch64
if ! docker run --rm --platform linux/arm64 alpine:3.21 uname -m 2>/dev/null | grep -q aarch64; then
  echo "Registering QEMU binfmt handlers..."
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
fi

# Build and start services
echo "Building agent container (cross-compiling for aarch64)..."
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" build --no-cache agent

echo "Starting mock API + agent..."
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" up -d

# Wait for agent to connect and send at least one STATUS message
echo "Waiting for agent to authenticate and send metrics..."
TIMEOUT=60
for i in $(seq 1 $TIMEOUT); do
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo '{}')
  if echo "$STATUS" | grep -q '"authenticated":true'; then
    echo "Agent authenticated successfully!"
    echo "Latest status: $STATUS"
    break
  fi
  if [ "$i" = "$TIMEOUT" ]; then
    echo "TIMEOUT: Agent did not authenticate within ${TIMEOUT}s"
    docker compose -f "$SCRIPT_DIR/docker/compose.yaml" logs
    docker compose -f "$SCRIPT_DIR/docker/compose.yaml" down
    exit 1
  fi
  sleep 1
done

# Show agent logs
echo ""
echo "=== Agent Logs ==="
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" logs agent | tail -30

# Cleanup
echo ""
echo "Stopping containers..."
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" down

echo "=== Integration test passed ==="
```

**Step 2: Make executable**

```bash
chmod +x tests/integration/run-docker.sh
```

**Step 3: Commit**

```bash
git add tests/integration/run-docker.sh
git commit -m "test: add Docker integration test runner"
```

---

## Task 6: Create QEMU VM image builder

**Files:**
- Create: `tests/integration/qemu/build-image.sh`
- Create: `tests/integration/qemu/user-data.yaml`

**Step 1: Write cloud-init user-data**

```yaml
#cloud-config
hostname: ngfw-test-router
manage_etc_hosts: true

users:
  - name: ngfw
    shell: /bin/ash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: true
    ssh_authorized_keys:
      - ssh-ed25519 AAAA_PLACEHOLDER_FOR_TEST_KEY

write_files:
  - path: /usr/local/bin/nvram
    permissions: "0755"
    content: |
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

  - path: /usr/local/bin/wl
    permissions: "0755"
    content: |
      #!/bin/sh
      case "$1" in
        "status")    echo "Status: Connected" ;;
        "assoclist") echo "assoclist 00:11:22:33:44:55" ;;
        *)           echo "" ;;
      esac

  - path: /etc/ngfw/config.toml
    permissions: "0644"
    content: |
      [connection]
      device_id = "test-device-001"
      api_key = "test-api-key-secret-001"
      owner_id = "test-owner-001"
      websocket_url = "ws://10.0.2.2:8787/agent/ws"

      [agent]
      metrics_interval = 5
      log_level = "debug"

runcmd:
  - mkdir -p /jffs/ngfw
  - |
    echo "Downloading agent binary from host..."
    wget -q -O /usr/local/bin/ngfw-agent http://10.0.2.2:9999/ngfw-agent
    chmod +x /usr/local/bin/ngfw-agent
  - |
    echo "Starting NGFW agent..."
    /usr/local/bin/ngfw-agent --config /etc/ngfw/config.toml &
```

**Step 2: Write image builder script**

```sh
#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_DIR="$SCRIPT_DIR/.images"
mkdir -p "$IMAGE_DIR"

ALPINE_VERSION="3.21"
ARCH="aarch64"
BASE_URL="https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VERSION}/releases/${ARCH}"
IMAGE_NAME="alpine-virt-${ALPINE_VERSION}.0-${ARCH}.qcow2"

echo "=== Building QEMU VM Image ==="

# Download Alpine cloud image if not cached
if [ ! -f "$IMAGE_DIR/$IMAGE_NAME" ]; then
  echo "Downloading Alpine ${ALPINE_VERSION} cloud image for ${ARCH}..."
  wget -O "$IMAGE_DIR/$IMAGE_NAME" "${BASE_URL}/alpine-virt-${ALPINE_VERSION}.0-${ARCH}.qcow2"
fi

# Create working copy
cp "$IMAGE_DIR/$IMAGE_NAME" "$IMAGE_DIR/ngfw-test.qcow2"

# Resize disk to 2GB
qemu-img resize "$IMAGE_DIR/ngfw-test.qcow2" 2G

# Generate cloud-init ISO (NoCloud datasource)
echo "Generating cloud-init seed ISO..."
SEED_DIR=$(mktemp -d)
cp "$SCRIPT_DIR/user-data.yaml" "$SEED_DIR/user-data"
cat > "$SEED_DIR/meta-data" << 'EOF'
instance-id: ngfw-test-001
local-hostname: ngfw-test-router
EOF

# Use mkisofs/genisoimage to create the seed ISO
if command -v mkisofs >/dev/null 2>&1; then
  mkisofs -output "$IMAGE_DIR/seed.iso" -volid cidata -joliet -rock "$SEED_DIR/"
elif command -v genisoimage >/dev/null 2>&1; then
  genisoimage -output "$IMAGE_DIR/seed.iso" -volid cidata -joliet -rock "$SEED_DIR/"
else
  echo "ERROR: mkisofs or genisoimage required. Install: sudo pacman -S cdrtools"
  exit 1
fi

rm -rf "$SEED_DIR"

echo "VM image ready: $IMAGE_DIR/ngfw-test.qcow2"
echo "Cloud-init seed: $IMAGE_DIR/seed.iso"
```

**Step 3: Make executable and commit**

```bash
chmod +x tests/integration/qemu/build-image.sh
git add tests/integration/qemu/
git commit -m "test: add QEMU VM image builder with cloud-init provisioning"
```

---

## Task 7: Create QEMU VM launcher and test runner

**Files:**
- Create: `tests/integration/qemu/launch.sh`
- Create: `tests/integration/run-qemu.sh`

**Step 1: Write QEMU launcher**

```sh
#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_DIR="$SCRIPT_DIR/.images"

# Check prerequisites
if ! command -v qemu-system-aarch64 >/dev/null 2>&1; then
  echo "ERROR: qemu-system-aarch64 not found. Install: sudo pacman -S qemu-system-aarch64"
  exit 1
fi

# Find UEFI firmware
UEFI_FW=""
for path in \
  /usr/share/edk2/aarch64/QEMU_EFI.fd \
  /usr/share/AAVMF/AAVMF_CODE.fd \
  /usr/share/qemu-efi-aarch64/QEMU_EFI.fd; do
  if [ -f "$path" ]; then
    UEFI_FW="$path"
    break
  fi
done

if [ -z "$UEFI_FW" ]; then
  echo "ERROR: UEFI firmware not found. Install: sudo pacman -S edk2-aarch64"
  exit 1
fi

echo "Launching QEMU aarch64 VM..."
echo "  UEFI: $UEFI_FW"
echo "  Image: $IMAGE_DIR/ngfw-test.qcow2"
echo "  SSH: localhost:2222"
echo "  Serial: this terminal"

exec qemu-system-aarch64 \
  -M virt \
  -cpu cortex-a53 \
  -smp 2 \
  -m 512 \
  -bios "$UEFI_FW" \
  -drive file="$IMAGE_DIR/ngfw-test.qcow2",format=qcow2,if=virtio \
  -drive file="$IMAGE_DIR/seed.iso",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8080-:80 \
  -device virtio-net-pci,netdev=net0 \
  -nographic
```

**Step 2: Write QEMU test runner**

```sh
#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== NGFW Agent Integration Test (QEMU VM) ==="

# Step 1: Cross-compile agent for aarch64-linux-musl
echo "Cross-compiling agent for aarch64..."
cd "$PROJECT_ROOT"
cross build -p ngfw-agent --release --target aarch64-unknown-linux-musl
AGENT_BIN="$PROJECT_ROOT/target/aarch64-unknown-linux-musl/release/ngfw-agent"

if [ ! -f "$AGENT_BIN" ]; then
  echo "ERROR: Agent binary not found at $AGENT_BIN"
  exit 1
fi

# Step 2: Start mock API server in background
echo "Starting mock API server..."
cd "$SCRIPT_DIR/mock-api"
bun run server.ts &
MOCK_PID=$!
sleep 2

# Step 3: Start HTTP server to serve agent binary to the VM
echo "Serving agent binary on port 9999..."
cd "$(dirname "$AGENT_BIN")"
bun -e "Bun.serve({port:9999,fetch(r){const f=Bun.file('ngfw-agent');return f.exists().then(e=>e?new Response(f):new Response('not found',{status:404}))}})" &
SERVE_PID=$!

# Step 4: Build VM image
echo "Building VM image..."
"$SCRIPT_DIR/qemu/build-image.sh"

# Step 5: Launch VM (in background, will cloud-init and start agent)
echo "Launching VM (agent will auto-start via cloud-init)..."
"$SCRIPT_DIR/qemu/launch.sh" &
QEMU_PID=$!

# Step 6: Wait for agent to authenticate
echo "Waiting for agent to authenticate (up to 120s for VM boot + cloud-init)..."
TIMEOUT=120
for i in $(seq 1 $TIMEOUT); do
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo '{}')
  if echo "$STATUS" | grep -q '"authenticated":true'; then
    echo "Agent authenticated successfully from QEMU VM!"
    echo "Latest status: $STATUS"
    break
  fi
  if [ "$i" = "$TIMEOUT" ]; then
    echo "TIMEOUT: Agent did not authenticate within ${TIMEOUT}s"
    kill $QEMU_PID $MOCK_PID $SERVE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Cleanup
echo "Stopping services..."
kill $QEMU_PID $MOCK_PID $SERVE_PID 2>/dev/null || true
wait 2>/dev/null || true

echo "=== QEMU integration test passed ==="
```

**Step 3: Make executable and commit**

```bash
chmod +x tests/integration/qemu/launch.sh tests/integration/run-qemu.sh
git add tests/integration/qemu/launch.sh tests/integration/run-qemu.sh
git commit -m "test: add QEMU VM launcher and integration test runner"
```

---

## Task 8: Add package.json scripts and .gitignore

**Files:**
- Modify: `package.json` (root)
- Modify: `.gitignore` (root)

**Step 1: Add test scripts to root package.json**

```json
"test:integration:docker": "tests/integration/run-docker.sh",
"test:integration:qemu": "tests/integration/run-qemu.sh"
```

**Step 2: Add gitignore entries**

```
# QEMU VM images
tests/integration/qemu/.images/
```

**Step 3: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: add integration test scripts and gitignore for VM images"
```

---

## Verification

### Docker approach
```bash
bun run test:integration:docker
```
Expected:
1. Mock API starts and passes healthcheck
2. Agent container builds (cross-compile aarch64-musl)
3. Agent connects to mock API via WebSocket
4. AUTH message sent → AUTH_OK received
5. STATUS message sent with real procfs metrics
6. METRICS messages sent periodically
7. `curl localhost:8787/status` shows `authenticated: true` + metrics payload
8. Containers stop cleanly

### QEMU approach
```bash
bun run test:integration:qemu
```
Expected:
1. Agent cross-compiled for aarch64-unknown-linux-musl
2. Mock API starts on port 8787
3. Agent binary served on port 9999
4. Alpine VM boots with cloud-init
5. VM downloads agent binary from host
6. Agent starts and connects via `ws://10.0.2.2:8787/agent/ws`
7. AUTH → AUTH_OK → STATUS → METRICS flow completes
8. Test passes, VM and services shut down

### Prerequisites
- Docker with BuildKit (for `--platform`)
- `docker run --privileged multiarch/qemu-user-static` (one-time binfmt registration)
- `qemu-system-aarch64` + `edk2-aarch64` (for QEMU approach)
- `cross` (`cargo install cross`) for aarch64 cross-compilation
- `mkisofs` or `genisoimage` (for cloud-init ISO)
