# Firmware Layer Integration Testing Strategy

Comprehensive testing framework for validating firmware-to-API integration in the NGFW.sh platform.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Firmware Interface Analysis](#2-firmware-interface-analysis)
3. [Testing Strategy](#3-testing-strategy)
4. [Test Infrastructure](#4-test-infrastructure)
5. [Test Scenarios](#5-test-scenarios)
6. [Test Fixtures](#6-test-fixtures)
7. [Implementation Plan](#7-implementation-plan)
8. [CI/CD Integration](#8-cicd-integration)

---

## 1. Architecture Overview

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers Edge                       │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────────┐     │
│  │   Rust API       │         │    Schema API            │     │
│  │  (workers-rs)    │         │  (Hono + Chanfana)       │     │
│  │                  │         │                          │     │
│  │ AgentConnection  │◄────────┤  Device Management       │     │
│  │  (Durable Obj)   │         │  Config Endpoints        │     │
│  └──────────────────┘         └──────────────────────────┘     │
│         ▲                                                       │
│         │ WebSocket (RPC Protocol)                              │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                  Router Agent (Rust)                             │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │ Connection   │   │  Dispatcher  │   │  Collector   │       │
│  │   Manager    │──►│  (Commands)  │   │  (Metrics)   │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│         │                   │                   │               │
│         │                   ▼                   ▼               │
│  ┌──────▼───────────────────────────────────────────────────┐  │
│  │              Subsystem Adapters                          │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │  │
│  │  │ System  │ │  NVRAM  │ │  WiFi   │ │  Wireguard   │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────────┘  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │  │
│  │  │ Dnsmasq │ │Iptables │ │  (...)  │                   │  │
│  │  └─────────┘ └─────────┘ └─────────┘                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Firmware Layer (ASUS Merlin NG)                │  │
│  │  ┌──────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌─────────┐  │  │
│  │  │nvram │ │  wl  │ │ dnsmasq  │ │iptables│ │  /proc  │  │  │
│  │  └──────┘ └──────┘ └──────────┘ └────────┘ └─────────┘  │  │
│  │  ┌──────┐ ┌──────┐ ┌──────────┐                         │  │
│  │  │ /sys │ │  ip  │ │ service  │                         │  │
│  │  └──────┘ └──────┘ └──────────┘                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Firmware Integration Points

| Layer | Component | Interface | Test Surface |
|-------|-----------|-----------|--------------|
| **Agent** | Connection Manager | WebSocket RPC | Auth, reconnect, state management |
| **Agent** | Dispatcher | Command handlers | ConfigPush, Exec, Reboot, Upgrade |
| **Agent** | Collector | Metrics gathering | CPU, memory, interfaces, temperature |
| **Adapters** | SubsystemAdapter | Uniform trait | read, validate, diff, apply, rollback |
| **Firmware** | NVRAM | CLI (`nvram`) | Key-value persistence |
| **Firmware** | WiFi | CLI (`wl`) | Radio configuration |
| **Firmware** | Network | CLI (`ip`, `/sys/class/net`) | Interface stats |
| **Firmware** | System | `/proc`, `/sys` | CPU, memory, thermal |
| **Firmware** | Services | `service`, `systemctl` | Daemon control |

---

## 2. Firmware Interface Analysis

### Critical Adapter Interfaces

#### SubsystemAdapter Trait

All firmware adapters implement this trait:

```rust
#[async_trait::async_trait]
pub trait SubsystemAdapter: Send + Sync {
    fn section(&self) -> ConfigSection;

    async fn read_config(&self) -> Result<Value, Box<dyn Error + Send + Sync>>;
    async fn validate(&self, config: &Value) -> Result<Vec<ValidationIssue>, Box<dyn Error + Send + Sync>>;
    async fn diff(&self, proposed: &Value) -> Result<ConfigDiff, Box<dyn Error + Send + Sync>>;
    async fn apply(&self, config: &Value, version: u64) -> Result<(), Box<dyn Error + Send + Sync>>;
    async fn rollback(&self) -> Result<(), Box<dyn Error + Send + Sync>>;
    async fn collect_metrics(&self) -> Result<Value, Box<dyn Error + Send + Sync>>;
}
```

#### RPC Message Protocol

**Server → Agent:**
- `CONFIG_PUSH` — Push configuration section
- `CONFIG_FULL` — Push complete configuration
- `EXEC` — Execute command
- `REBOOT` — Reboot device
- `UPGRADE` — Start firmware upgrade
- `STATUS_REQUEST` — Request status update
- `PING` — Keepalive ping

**Agent → Server:**
- `AUTH` — Authentication request
- `STATUS` — Status update
- `METRICS` — Performance metrics (5s interval)
- `CONFIG_ACK` — Configuration applied
- `CONFIG_FAIL` — Configuration failed
- `EXEC_RESULT` — Command execution result
- `LOG` — Log message
- `ALERT` — Security alert
- `PONG` — Keepalive response

### Adapter-Specific Interfaces

#### NvramAdapter

**Purpose:** Key-value persistence for ASUS Merlin firmware settings

**CLI Interface:**
```bash
nvram get <key>              # Read single key
nvram set key=value          # Set single key
nvram commit                 # Persist to flash
nvram show                   # Dump all keys
```

**Test Coverage:**
- Sensitive key redaction (`wl0_wpa_psk`, `wgs*`, `vpn_*`, `http_passwd`)
- Bulk read/write operations
- Commit atomicity
- Error handling (invalid keys, read-only keys)

#### SystemAdapter

**Purpose:** Read-only metrics from `/proc` and `/sys`

**File Interfaces:**
- `/proc/stat` — CPU usage
- `/proc/meminfo` — Memory statistics
- `/proc/uptime` — System uptime
- `/sys/class/thermal/thermal_zone*/temp` — Temperature sensors
- `/sys/class/net/*/statistics/*` — Network interface counters

**Test Coverage:**
- Parse errors for malformed files
- Missing thermal zones (no hardware sensors)
- Interface enumeration (skip loopback)
- Zero-division safety (total CPU time)

#### WiFiAdapter

**Purpose:** WiFi radio and SSID configuration via `wl` CLI

**CLI Interface:**
```bash
wl -i <interface> status      # Radio status
wl -i <interface> assoclist   # Connected clients
wl -i <interface> country     # Regulatory domain
```

**Test Coverage:**
- Multi-radio support (2.4GHz, 5GHz, 6GHz)
- SSID creation/deletion
- Security mode changes (WPA2, WPA3)
- Client association tracking

---

## 3. Testing Strategy

### Test Pyramid

```
                 ┌──────────────┐
                 │  E2E Tests   │  ← 5% (Full integration with mock API)
                 └──────────────┘
              ┌────────────────────┐
              │ Integration Tests  │  ← 25% (Adapter + Mock Firmware)
              └────────────────────┘
          ┌──────────────────────────┐
          │     Unit Tests           │  ← 70% (Adapter logic, RPC handling)
          └──────────────────────────┘
```

### Testing Levels

#### L1: Unit Tests (70%)

**Scope:** Individual adapter methods, RPC message parsing, validation logic

**Tools:** Rust `#[cfg(test)]`, `tokio::test`, `mockall` crate

**Coverage:**
- NVRAM adapter: key parsing, sensitive key detection, validation
- System adapter: proc/sys file parsing, metric calculations
- WiFi adapter: configuration validation, SSID limits
- RPC protocol: message serialization, enum conversions

**Example:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nvram_sensitive_key_detection() {
        assert!(is_sensitive_key("wl0_wpa_psk"));
        assert!(is_sensitive_key("wgs1_priv"));
        assert!(!is_sensitive_key("wan_ifname"));
    }

    #[tokio::test]
    async fn system_cpu_parse_zero_total() {
        let adapter = SystemAdapter::new();
        // Test with mock /proc/stat containing zero total time
        // Should return 0.0% usage without panic
    }
}
```

#### L2: Integration Tests (25%)

**Scope:** Adapter + Mock Firmware interactions, RPC round-trips

**Tools:** Docker, QEMU, Mock binaries, Mock API server

**Coverage:**
- Agent connects to mock API and authenticates
- Agent sends STATUS message with real metrics from mock firmware
- Agent receives CONFIG_PUSH and applies changes via adapters
- Agent executes EXEC commands via mock binaries
- Metrics collection runs on 5s interval
- Rollback functionality on configuration failure

**Environments:**
1. **Docker** (fast, CI-friendly): Cross-compiled aarch64 agent + mock binaries
2. **QEMU** (full system emulation): Alpine Linux VM with cloud-init

#### L3: End-to-End Tests (5%)

**Scope:** Full stack validation (Portal → Schema API → Rust API → Agent → Firmware)

**Tools:** Playwright, real Cloudflare Workers (preview), mock firmware

**Coverage:**
- User registers device in portal
- Portal displays device online status
- User pushes WiFi configuration change
- Agent receives and applies configuration
- Portal shows updated configuration

---

## 4. Test Infrastructure

### Current Infrastructure

#### Mock API Server (`tests/integration/mock-api/server.ts`)

**Capabilities:**
- WebSocket server on port 8787
- Implements full RPC protocol
- Hardcoded test credentials: `device_id=test-device-001`, `api_key=test-api-key-secret-001`
- HTTP endpoints: `/health`, `/status`
- Tracks connection state per device
- Logs all messages with timestamps

**Limitations:**
- Single device support (hardcoded credentials)
- No config validation
- No persistent storage
- No command execution simulation

#### Mock Firmware Binaries (`tests/integration/mock-bins/`)

**Current Binaries:**
- `nvram` — Returns hardcoded RT-AX92U configuration
- `wl` — Returns minimal WiFi status
- `ip` — Returns interface list
- `iptables` — No-op
- `service` — No-op

**Limitations:**
- Static responses (no state)
- No error simulation
- Limited coverage of firmware commands

#### Mock Sysfs (`tests/integration/mock-sysfs/`)

**Structure:**
```
mock-sysfs/
├── proc/
│   ├── stat         # CPU stats
│   ├── meminfo      # Memory stats
│   └── uptime       # System uptime
└── sys/
    └── class/
        ├── net/
        │   ├── eth0/statistics/
        │   └── wlan0/statistics/
        └── thermal/
            └── thermal_zone0/temp
```

### Required Enhancements

#### Enhanced Mock API Server

**Features:**
1. **Multi-device support** — Dynamic credential generation
2. **Config validation** — Validate pushed configurations against schemas
3. **Command execution** — Simulate common admin commands
4. **State persistence** — Track configuration versions
5. **Error injection** — Simulate network failures, timeouts
6. **Metrics aggregation** — Collect and expose test metrics

**Implementation:**
```typescript
// Enhanced state management
interface DeviceState {
    device_id: string;
    authenticated: boolean;
    config_sections: Map<ConfigSection, ConfigVersion>;
    pending_commands: Map<string, PendingCommand>;
    metrics_history: MetricsSnapshot[];
}

// Config validation
async function validateConfig(section: ConfigSection, config: unknown): Promise<ValidationResult> {
    // Use Zod schemas from ngfw-protocol
    const schema = CONFIG_SCHEMAS[section];
    return schema.safeParse(config);
}

// Command execution simulation
async function simulateExec(command: string, args: string[]): Promise<ExecResult> {
    // Simulate common commands: reboot, upgrade, backup
    switch (command) {
        case 'reboot':
            return { exit_code: 0, stdout: '', duration_ms: 50 };
        case 'nvram':
            return simulateNvramCommand(args);
        default:
            return { exit_code: 127, stderr: 'command not found', duration_ms: 10 };
    }
}
```

#### Enhanced Mock Firmware

**Stateful NVRAM:**
```bash
#!/bin/sh
# Stateful mock NVRAM backed by /tmp/nvram.db

NVRAM_DB="/tmp/nvram.db"

case "$1" in
  get)
    key="$2"
    grep "^${key}=" "$NVRAM_DB" 2>/dev/null | cut -d= -f2-
    ;;
  set)
    echo "$2" >> "$NVRAM_DB"
    ;;
  commit)
    # Sort and deduplicate
    sort -u -t= -k1,1 "$NVRAM_DB" > "${NVRAM_DB}.tmp"
    mv "${NVRAM_DB}.tmp" "$NVRAM_DB"
    ;;
  show)
    cat "$NVRAM_DB"
    ;;
esac
```

**Dynamic `/proc` Files:**
```bash
#!/bin/sh
# Generate dynamic CPU stats with realistic variation

generate_cpu_stat() {
    # Previous values stored in /tmp/cpu_last
    local user=$((50000 + RANDOM % 5000))
    local system=$((10000 + RANDOM % 2000))
    local idle=$((200000 + RANDOM % 10000))

    echo "cpu $user 0 $system $idle 0 0 0 0 0 0"
}
```

**WiFi Client Simulation:**
```bash
#!/bin/sh
# Mock wl command with simulated client associations

case "$2" in
  assoclist)
    # Return 0-5 random MAC addresses
    count=$((RANDOM % 6))
    for i in $(seq 1 $count); do
        echo "00:11:22:33:44:$(printf '%02x' $((RANDOM % 256)))"
    done
    ;;
esac
```

---

## 5. Test Scenarios

### Scenario 1: Agent Connection and Authentication

**Objective:** Validate agent can connect, authenticate, and maintain WebSocket connection

**Steps:**
1. Start mock API server
2. Start agent with test credentials
3. Agent connects to WebSocket endpoint
4. Agent sends `AUTH` message with `device_id` and `api_key`
5. Mock API validates credentials
6. Mock API responds with `AUTH_OK`
7. Agent sends initial `STATUS` message
8. Mock API responds with `STATUS_OK`

**Expected Results:**
- WebSocket connection established within 5s
- Authentication succeeds
- Initial STATUS message contains valid metrics
- Agent maintains connection (PING/PONG every 30s)

**Assertions:**
```typescript
// Mock API assertions
expect(connectionState.authenticated).toBe(true);
expect(connectionState.device_id).toBe('test-device-001');
expect(connectionState.firmware_version).toMatch(/3\.0\.0\.\d+/);

// Agent log assertions
assertLogContains('WebSocket connected');
assertLogContains('Authentication successful');
assertLogContains('Sent STATUS message');
```

### Scenario 2: Metrics Collection

**Objective:** Validate agent collects and sends metrics every 5 seconds

**Steps:**
1. Agent connected and authenticated
2. Agent starts metrics collection loop
3. Agent collects system metrics via adapters
4. Agent sends `METRICS` message every 5s
5. Mock API receives and stores metrics

**Expected Results:**
- Metrics sent every 5s (±500ms tolerance)
- Metrics contain valid CPU, memory, interface stats
- Temperature data included (if thermal zones present)
- No metrics collection errors

**Assertions:**
```rust
// Adapter unit test
#[tokio::test]
async fn system_adapter_collects_valid_metrics() {
    let adapter = SystemAdapter::new();
    let metrics = adapter.collect_metrics().await.unwrap();

    assert!(metrics["cpu"]["usage_percent"].as_f64().unwrap() >= 0.0);
    assert!(metrics["cpu"]["usage_percent"].as_f64().unwrap() <= 100.0);
    assert!(metrics["memory"]["usage_percent"].as_f64().unwrap() >= 0.0);
    assert!(metrics["interfaces"].is_object());
}
```

### Scenario 3: Configuration Push (WiFi SSID Change)

**Objective:** Validate end-to-end configuration push and apply

**Steps:**
1. Agent connected and authenticated
2. Mock API sends `CONFIG_PUSH` with WiFi section update
3. Agent dispatcher routes to WiFiAdapter
4. WiFiAdapter validates proposed configuration
5. WiFiAdapter computes diff from current config
6. WiFiAdapter applies configuration via `nvram` and `service`
7. Agent sends `CONFIG_ACK` on success
8. Agent sends updated `STATUS` with new config

**Expected Results:**
- Configuration validated successfully
- Diff computed correctly (shows SSID change)
- NVRAM commands executed (set + commit)
- Service restarted (hostapd or equivalent)
- `CONFIG_ACK` sent within 5s
- No rollback triggered

**Assertions:**
```rust
#[tokio::test]
async fn wifi_adapter_applies_ssid_change() {
    let adapter = WifiAdapter::new();

    let new_config = json!({
        "radios": [{
            "interface": "wlan0",
            "ssid": "NewSSID",
            "security": "wpa3"
        }]
    });

    let result = adapter.apply(&new_config, 1).await;
    assert!(result.is_ok());

    // Verify NVRAM was updated
    let ssid = NvramAdapter::get("wl0_ssid").await.unwrap();
    assert_eq!(ssid, "NewSSID");
}
```

### Scenario 4: Command Execution (Reboot)

**Objective:** Validate remote command execution

**Steps:**
1. Agent connected and authenticated
2. Mock API sends `EXEC` message with reboot command
3. Agent dispatcher creates command execution task
4. Agent validates command (whitelisted)
5. Agent executes command with timeout
6. Agent sends `EXEC_RESULT` with exit code and output
7. Mock API logs result

**Expected Results:**
- Command whitelisted and executed
- Exit code captured correctly
- Stdout/stderr captured
- Execution duration logged
- Timeout enforced (30s default)

**Assertions:**
```typescript
// Mock API test
it('executes reboot command', async () => {
    sendMessage({ type: 'EXEC', payload: { command: 'reboot' } });

    const result = await waitForMessage('EXEC_RESULT', 5000);

    expect(result.payload.exit_code).toBe(0);
    expect(result.payload.duration_ms).toBeLessThan(1000);
});
```

### Scenario 5: Configuration Rollback

**Objective:** Validate automatic rollback on configuration failure

**Steps:**
1. Agent connected and authenticated
2. Mock API sends `CONFIG_PUSH` with invalid WiFi config
3. WiFiAdapter validates configuration
4. Validation fails (invalid security mode)
5. Agent sends `CONFIG_FAIL` with error details
6. Agent does NOT apply configuration
7. No rollback needed (apply never called)

**Alternative Flow (Apply Failure):**
1. Configuration validation passes
2. WiFiAdapter applies configuration
3. NVRAM set command fails (read-only key)
4. WiFiAdapter triggers rollback
5. Previous configuration restored
6. Agent sends `CONFIG_FAIL` with rollback details

**Expected Results:**
- Invalid config rejected before apply
- Error details include field and message
- No partial configuration applied
- Rollback restores previous state

**Assertions:**
```rust
#[tokio::test]
async fn wifi_adapter_validates_invalid_security() {
    let adapter = WifiAdapter::new();

    let invalid_config = json!({
        "radios": [{
            "security": "invalid-mode"
        }]
    });

    let issues = adapter.validate(&invalid_config).await.unwrap();
    assert!(!issues.is_empty());
    assert_eq!(issues[0].field, "radios[0].security");
}
```

### Scenario 6: Connection Resilience

**Objective:** Validate agent reconnects after network failure

**Steps:**
1. Agent connected and authenticated
2. Mock API forcibly closes WebSocket
3. Agent detects disconnection
4. Agent enters reconnect loop (exponential backoff)
5. Mock API accepts new connection
6. Agent re-authenticates
7. Agent resumes normal operation

**Expected Results:**
- Disconnection detected within 5s (via PING timeout)
- Reconnect attempts with backoff (1s, 2s, 4s, 8s, max 60s)
- Re-authentication succeeds
- Pending commands NOT lost (persisted locally)
- Metrics collection resumes

**Assertions:**
```rust
#[tokio::test]
async fn connection_manager_reconnects_after_failure() {
    // Simulate connection drop
    // Verify exponential backoff timing
    // Verify re-authentication
    // Verify state continuity
}
```

---

## 6. Test Fixtures

### Fixture 1: RT-AX92U Configuration

**Purpose:** Standard ASUS RT-AX92U router configuration for testing

**Files:**
- `fixtures/rt-ax92u/nvram.db` — NVRAM key-value dump
- `fixtures/rt-ax92u/proc/` — Mock `/proc` filesystem
- `fixtures/rt-ax92u/sys/` — Mock `/sys` filesystem

**NVRAM Keys:**
```
model=RT-AX92U
firmver=3.0.0.4
buildno=388
extendno=7
serial_no=TEST-SN-001

# Network
lan_ipaddr=192.168.1.1
lan_netmask=255.255.255.0
wan0_ipaddr=203.0.113.42
wan0_gateway=203.0.113.1
wan0_dns=1.1.1.1 1.0.0.1

# WiFi 2.4GHz
wl0_ssid=NGFW-Test-2G
wl0_wpa_psk=test-password-redacted
wl0_crypto=aes
wl0_auth_mode=psk2

# WiFi 5GHz
wl1_ssid=NGFW-Test-5G
wl1_wpa_psk=test-password-redacted
wl1_crypto=aes
wl1_auth_mode=psk2

# WiFi 6GHz (if supported)
wl2_ssid=NGFW-Test-6G
wl2_wpa_psk=test-password-redacted
wl2_crypto=aes
wl2_auth_mode=sae
```

### Fixture 2: Configuration Scenarios

**Purpose:** Pre-defined configuration changes for testing

**Scenarios:**

#### A. WiFi SSID Change
```json
{
  "section": "wifi",
  "version": 1,
  "config": {
    "radios": [
      {
        "interface": "wlan0",
        "ssid": "NewSSID-2G",
        "band": "2.4GHz",
        "security": "wpa3",
        "password": "new-secure-password"
      }
    ]
  }
}
```

#### B. DHCP Range Update
```json
{
  "section": "dhcp",
  "version": 1,
  "config": {
    "enabled": true,
    "range_start": "192.168.1.100",
    "range_end": "192.168.1.200",
    "lease_time": 86400,
    "dns": ["1.1.1.1", "1.0.0.1"]
  }
}
```

#### C. Firewall Rule Creation
```json
{
  "section": "firewall",
  "version": 1,
  "config": {
    "rules": [
      {
        "id": 1,
        "name": "Block BitTorrent",
        "enabled": true,
        "zone_from": "LAN",
        "zone_to": "WAN",
        "protocol": "tcp",
        "port": "6881-6889",
        "action": "reject"
      }
    ]
  }
}
```

### Fixture 3: Error Scenarios

**Purpose:** Test error handling and recovery

**Scenarios:**

#### A. Invalid WiFi Security Mode
```json
{
  "section": "wifi",
  "config": {
    "radios": [{
      "security": "wep"  // Deprecated, should be rejected
    }]
  }
}
```

#### B. DHCP Range Conflict
```json
{
  "section": "dhcp",
  "config": {
    "range_start": "192.168.1.200",
    "range_end": "192.168.1.100"  // End < Start
  }
}
```

#### C. Firewall Port Parse Error
```json
{
  "section": "firewall",
  "config": {
    "rules": [{
      "port": "invalid-port-format"
    }]
  }
}
```

---

## 7. Implementation Plan

### Phase 1: Unit Test Coverage (Week 1)

**Objective:** Achieve 80%+ code coverage on adapter logic

**Tasks:**
1. Write unit tests for NvramAdapter
   - `is_sensitive_key()` detection
   - `get()`, `set()`, `commit()` success paths
   - Error handling for invalid keys
   - `show_all()` parsing

2. Write unit tests for SystemAdapter
   - `/proc/stat` parsing with edge cases
   - `/proc/meminfo` parsing
   - Temperature zone enumeration
   - Interface statistics collection

3. Write unit tests for WiFiAdapter
   - Configuration validation
   - SSID limits (typically 4-8 per radio)
   - Security mode validation
   - Client list parsing

4. Write unit tests for RPC protocol
   - Message serialization/deserialization
   - Enum variant conversions
   - Error response formatting

**Deliverables:**
- 50+ unit tests in `packages/agent/src/adapters/*/tests.rs`
- Coverage report via `cargo tarpaulin`
- CI integration (run on every PR)

### Phase 2: Enhanced Mock Infrastructure (Week 2)

**Objective:** Build stateful, realistic mock firmware environment

**Tasks:**
1. Upgrade mock NVRAM to stateful implementation
   - Persistent storage in `/tmp/nvram.db`
   - Support for `get`, `set`, `commit`, `show`
   - Sensitive key redaction in logs

2. Create dynamic `/proc` and `/sys` generators
   - CPU stats with realistic variation
   - Memory usage simulation
   - Network counter increments
   - Temperature fluctuation

3. Enhance mock API server
   - Multi-device support
   - Config validation via Zod schemas
   - Command execution simulation
   - Error injection capabilities

4. Create test fixture library
   - RT-AX92U baseline configuration
   - 10+ configuration change scenarios
   - 5+ error scenarios

**Deliverables:**
- Updated `tests/integration/mock-bins/` with stateful binaries
- Updated `tests/integration/mock-api/server.ts` with validation
- `tests/integration/fixtures/` directory with JSON fixtures
- Documentation in `tests/integration/README.md`

### Phase 3: Integration Test Suite (Week 3)

**Objective:** Implement comprehensive integration tests

**Tasks:**
1. Docker-based integration tests
   - Scenario 1: Connection and authentication
   - Scenario 2: Metrics collection
   - Scenario 3: Configuration push
   - Scenario 4: Command execution
   - Scenario 5: Configuration rollback
   - Scenario 6: Connection resilience

2. QEMU-based integration tests
   - Full system boot with cloud-init
   - Agent auto-start on boot
   - System-level process isolation
   - Kernel-level interface simulation

3. Test orchestration scripts
   - `tests/integration/scenarios/01-auth.sh`
   - `tests/integration/scenarios/02-metrics.sh`
   - `tests/integration/scenarios/03-config-push.sh`
   - Parallel test execution
   - Cleanup on failure

**Deliverables:**
- 6 scenario test scripts in `tests/integration/scenarios/`
- Updated `run-docker.sh` and `run-qemu.sh` with scenario support
- Test results in TAP format for CI parsing
- Test execution time < 5 minutes (Docker), < 10 minutes (QEMU)

### Phase 4: End-to-End Tests (Week 4)

**Objective:** Validate full stack integration

**Tasks:**
1. Playwright E2E tests
   - User registers device in portal
   - Portal displays device status
   - User changes WiFi configuration
   - Portal shows updated configuration

2. Cloudflare Workers preview environment
   - Deploy Schema API and Rust API to preview
   - Connect mock agent to preview Workers
   - Validate real RPC communication

3. Performance benchmarks
   - WebSocket connection latency
   - Configuration push time (P50, P95, P99)
   - Metrics collection overhead
   - Memory usage under load

**Deliverables:**
- E2E test suite in `tests/e2e/` using Playwright
- Performance benchmark script in `tests/benchmarks/`
- CI integration for E2E tests (on main branch only)
- Performance regression detection

---

## 8. CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test-firmware.yml`

```yaml
name: Firmware Integration Tests

on:
  pull_request:
    paths:
      - 'packages/agent/**'
      - 'packages/api/**'
      - 'tests/integration/**'
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Cargo
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Run unit tests
        run: cargo test --workspace --all-features

      - name: Generate coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --workspace --out Xml --output-dir coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage/cobertura.xml

  integration-tests-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Run Docker integration tests
        run: bun run test:integration:docker
        timeout-minutes: 10

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integration-logs-docker
          path: tests/integration/docker/logs/

  integration-tests-qemu:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Install QEMU
        run: |
          sudo apt-get update
          sudo apt-get install -y qemu-system-aarch64 qemu-efi-aarch64 genisoimage

      - name: Run QEMU integration tests
        run: bun run test:integration:qemu
        timeout-minutes: 15

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integration-logs-qemu
          path: tests/integration/qemu/logs/

  e2e-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Install Playwright
        run: bunx playwright install --with-deps

      - name: Deploy to preview
        run: |
          # Deploy Schema API and Rust API to Cloudflare Workers preview
          bunx wrangler deploy --env preview --config packages/schema/wrangler.jsonc
          bunx wrangler deploy --env preview --config packages/api/wrangler.toml
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          PREVIEW_URL: ${{ env.PREVIEW_URL }}

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### Local Development Workflow

**Quick test loop:**
```bash
# 1. Run unit tests (fast feedback)
cargo test --workspace

# 2. Run single integration scenario
tests/integration/scenarios/01-auth.sh

# 3. Run full Docker suite
bun run test:integration:docker

# 4. Run QEMU suite (slower, more realistic)
bun run test:integration:qemu
```

**Coverage report:**
```bash
cargo tarpaulin --workspace --out Html --output-dir coverage
open coverage/index.html
```

---

## Appendix A: Test Coverage Matrix

| Component | Unit | Integration | E2E | Coverage Target |
|-----------|------|-------------|-----|-----------------|
| NvramAdapter | ✅ | ✅ | ⬜ | 90% |
| SystemAdapter | ✅ | ✅ | ⬜ | 85% |
| WiFiAdapter | ✅ | ✅ | ✅ | 85% |
| WireguardAdapter | ✅ | ✅ | ✅ | 80% |
| DnsmasqAdapter | ✅ | ✅ | ⬜ | 80% |
| IptablesAdapter | ✅ | ✅ | ⬜ | 75% |
| Connection Manager | ✅ | ✅ | ✅ | 90% |
| Dispatcher | ✅ | ✅ | ✅ | 90% |
| Collector | ✅ | ✅ | ✅ | 85% |
| RPC Protocol | ✅ | ✅ | ✅ | 95% |

---

## Appendix B: Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| WebSocket connection time | < 2s | Time from TCP connect to AUTH_OK |
| Authentication latency | < 500ms | Time from AUTH to AUTH_OK |
| Metrics collection interval | 5s ± 500ms | Wall clock between METRICS messages |
| Config push latency | < 5s | Time from CONFIG_PUSH to CONFIG_ACK |
| Rollback time | < 10s | Time to restore previous config |
| Memory usage (idle) | < 50MB RSS | Agent process memory footprint |
| CPU usage (idle) | < 5% | Agent process CPU usage |
| CPU usage (collecting) | < 15% | During metrics collection |

---

## Appendix C: Error Catalog

**Error Categories:**

1. **Network Errors**
   - `ECONNREFUSED` — Mock API not running
   - `ETIMEDOUT` — WebSocket handshake timeout
   - `ECONNRESET` — Connection dropped mid-flight

2. **Authentication Errors**
   - `AUTH_FAIL` — Invalid device_id or api_key
   - `TOKEN_EXPIRED` — JWT token expired (future)

3. **Configuration Errors**
   - `VALIDATION_FAILED` — Config does not match schema
   - `APPLY_FAILED` — Adapter apply() returned error
   - `ROLLBACK_FAILED` — Rollback could not restore state

4. **Firmware Errors**
   - `NVRAM_COMMIT_FAILED` — Flash write error
   - `SERVICE_RESTART_FAILED` — Daemon failed to restart
   - `COMMAND_NOT_FOUND` — Firmware binary missing

---

**Last Updated:** 2026-02-09

**Version:** 1.0

**Authors:** NGFW.sh Engineering Team
