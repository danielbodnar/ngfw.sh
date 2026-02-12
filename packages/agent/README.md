# ngfw-agent

On-device management daemon for asuswrt-merlin routers. Connects to the ngfw.sh cloud API via WebSocket, reports telemetry, receives configuration changes, and executes commands under a three-tier security model.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    main.rs                           │
│         CLI parsing, config loading, shutdown        │
└──────────────┬──────────────┬──────────────┬────────┘
               │              │              │
    ┌──────────▼───┐  ┌──────▼──────┐  ┌───▼──────────┐
    │  connection   │  │  dispatcher │  │  collector    │
    │  WebSocket +  │  │  Message    │  │  Metrics at   │
    │  auth + ping  │  │  routing +  │  │  5s interval  │
    │               │  │  mode check │  │               │
    └──────────────┘  └─────────────┘  └──────────────┘
          ▲ ▼               │                  │
     outbound_rx       inbound_rx          outbound_tx
     (to cloud)       (from cloud)        (metrics out)
```

Three async tasks communicate via tokio mpsc channels. A watch channel broadcasts `ModeConfig` changes and shutdown signals to all tasks.

## Agent Modes

| Mode | Behavior |
|------|----------|
| `observe` | Read-only monitoring (default). Config is acknowledged but never applied. |
| `shadow` | Dry-run validation. Config structure is checked, issues reported, nothing applied. |
| `takeover` | Full control. Config is validated, applied to the router, and backed up for rollback. |

Modes can be overridden per config section via `ModeConfig.section_overrides`:

```toml
# Base mode is observe, but firewall section operates in takeover
[mode]
default = "observe"
```

```json
{
  "mode": "observe",
  "section_overrides": { "firewall": "takeover" }
}
```

Mode state persists across restarts at `/jffs/ngfw/mode.json`.

## Modules

| Module | Purpose |
|--------|---------|
| `main.rs` | CLI args (`--config`, `--daemon`, `--check`), task spawning, signal handling |
| `config.rs` | TOML config deserialization with defaults |
| `connection.rs` | WebSocket client, auth handshake, keepalive pings, reconnect with backoff |
| `dispatcher.rs` | Routes inbound messages, enforces mode restrictions, executes handlers |
| `collector.rs` | Periodic metrics from `/proc` and `/sys` (CPU, memory, temp, interfaces) |
| `mode.rs` | Mode state machine, permission checks, JSON persistence |
| `rollback.rs` | Pre-apply config backup to `/jffs/ngfw/rollback/`, version tracking |
| `adapters/` | Subsystem trait + implementations (see below) |

## Adapters

Each router subsystem implements the `SubsystemAdapter` trait:

```rust
#[async_trait]
pub trait SubsystemAdapter: Send + Sync {
    fn section(&self) -> ConfigSection;
    async fn read_config(&self) -> Result<Value>;
    async fn validate(&self, config: &Value) -> Result<Vec<ValidationIssue>>;
    async fn diff(&self, proposed: &Value) -> Result<ConfigDiff>;
    async fn apply(&self, config: &Value, version: u64) -> Result<()>;
    async fn rollback(&self) -> Result<()>;
    async fn collect_metrics(&self) -> Result<Value>;
}
```

| Adapter | Section | Status |
|---------|---------|--------|
| `system.rs` | System | Implemented (read-only metrics from `/proc`, `/sys`) |
| `nvram.rs` | System | Implemented (NVRAM key-value read/write/commit) |
| `iptables.rs` | Firewall | Stub |
| `dnsmasq.rs` | DNS | Stub |
| `wifi.rs` | WiFi | Stub |
| `wireguard.rs` | VPN | Stub |

## Message Flow

```
Agent                                Cloud API
  │                                      │
  │── AUTH { device_id, api_key } ──────>│
  │<──────────────────── AUTH_OK ────────│
  │── STATUS { cpu, mem, ... } ────────>│
  │                                      │
  │── METRICS (every 5s) ─────────────>│
  │                                      │
  │<──────────── CONFIG_PUSH { section }─│
  │── CONFIG_ACK ──────────────────────>│
  │                                      │
  │<──────────── EXEC { command } ──────│
  │── EXEC_RESULT { stdout, exit } ───>│
  │                                      │
  │<──────────── PING ──────────────────│
  │── PONG ────────────────────────────>│
```

## Command Execution

The dispatcher maintains a hard-coded allowlist of safe commands. Commands are resolved by basename only (prevents path manipulation).

**Full access (takeover mode):** iptables, iptables-save, iptables-restore, ip, ifconfig, brctl, nvram, wl, service, dnsmasq, and more (41 total).

**Diagnostic only (shadow + takeover):** cat, ls, df, free, uptime, uname, ping, traceroute, nslookup, iptables-save, ip, ifconfig, nvram, wl.

## Configuration

Default path: `/jffs/ngfw/config.toml`

```toml
[agent]
device_id = "your-device-id"
api_key = "your-api-key"
websocket_url = "wss://api.ngfw.sh/ws"
log_level = "info"                  # debug | info | warn | error
metrics_interval_secs = 5

[mode]
default = "observe"                 # observe | shadow | takeover

[adapters]
iptables = true
dnsmasq = true
wifi = true
wireguard = false
system = true
```

## Build

The agent compiles as a native Rust binary. Build metadata (git hash, timestamp) is embedded at compile time via `build.rs`.

```sh
cargo build -p ngfw-agent --release
```

## Testing

```sh
# Unit tests
cargo test -p ngfw-agent

# Integration tests (adapters + dispatcher)
cargo test -p ngfw-agent --test integration_adapters
cargo test -p ngfw-agent --test integration_dispatcher
```

Tests cover config parsing, metric readers, mode enforcement, command allowlisting, adapter lifecycle, and full dispatcher message handling with mocks.

## Dependencies

| Crate | Purpose |
|-------|---------|
| `ngfw-protocol` | Shared RPC types (native feature for UUID v4) |
| `tokio` | Async runtime (full features) |
| `tokio-tungstenite` | WebSocket client with rustls |
| `serde` / `serde_json` | JSON serialization |
| `toml` | Config file parsing |
| `tracing` | Structured logging |
| `async-trait` | Async trait support for adapters |
| `nix` | Unix signals and PID files |

## License

MIT
