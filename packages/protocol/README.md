# ngfw-protocol

Shared RPC protocol types for NGFW.sh agent-server communication.

This crate provides the canonical definitions for all message types exchanged over WebSocket between the router agent (native Rust) and the cloud API (Cloudflare Workers / WASM). Both `ngfw-api` and `ngfw-agent` depend on this crate.

## Modules

| Module | Purpose |
|--------|---------|
| `rpc` | RPC message envelope, message types, auth, config, metrics, alerts, commands |
| `agent` | Agent operating modes (`Observe`, `Shadow`, `Takeover`) and mode configuration |
| `fleet` | Device management, registration, templates, webhooks, audit logging |
| `system` | Hardware info, firmware, network interfaces, boot slots, backups |

All types are re-exported at the crate root:

```rust
use ngfw_protocol::{RpcMessage, MessageType, AgentMode, Device};
```

## Feature Flags

The crate compiles for both native and WASM targets via feature flags:

| Feature | Target | Enables |
|---------|--------|---------|
| `native` | Router agent (Linux) | UUID v4 via OS randomness |
| `js` | Cloudflare Workers (WASM) | UUID v4 via `crypto.getRandomValues()` |

```toml
# In ngfw-agent (native)
ngfw-protocol = { path = "../protocol", features = ["native"] }

# In ngfw-api (WASM)
ngfw-protocol = { path = "../protocol", features = ["js"] }
```

Without either feature, `RpcMessage::new()` is unavailable; use `RpcMessage::with_id()` to supply your own ID.

## Dependencies

- **serde** / **serde_json** — Serialization and deserialization of protocol types
- **uuid** — Device and message identifiers
- **utoipa** — OpenAPI 3.1 schema generation from Rust types (with `uuid` and `chrono` support)

## Message Flow

```
Agent (Router)                    Server (Cloud API)
    |                                    |
    |──── AUTH ─────────────────────────>|
    |<───────────────── AUTH_OK/FAIL ────|
    |                                    |
    |──── STATUS ──────────────────────>|
    |<───────────────── STATUS_OK ──────|
    |                                    |
    |<───────────────── CONFIG_PUSH ────|
    |──── CONFIG_ACK ──────────────────>|
    |                                    |
    |──── METRICS (every 5s) ─────────>|
    |──── LOG / ALERT ────────────────>|
    |                                    |
    |<───────────────── EXEC ──────────|
    |──── EXEC_RESULT ────────────────>|
    |                                    |
    |<───────────────── MODE_UPDATE ───|
    |──── MODE_ACK ───────────────────>|
    |                                    |
    |<───────────────── PING ──────────|
    |──── PONG ───────────────────────>|
```

## RPC Envelope

Every message uses the `RpcMessage` envelope:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "CONFIG_PUSH",
  "payload": { ... }
}
```

- `id` — UUID identifying the message
- `type` — `SCREAMING_SNAKE_CASE` message type discriminator
- `payload` — flexible `serde_json::Value` matching the message type

## Serialization Conventions

| Enum | Case | Example |
|------|------|---------|
| `MessageType` | SCREAMING_SNAKE_CASE | `STATUS_REQUEST` |
| `ConfigSection` | lowercase | `firewall` |
| `AgentMode` | lowercase | `observe` |
| `AlertType` | snake_case | `intrusion_attempt` |
| `CommandType` | snake_case | `refresh_status` |
| `LogLevel` | lowercase | `warn` |

Optional fields (`Option<T>`) are omitted from JSON when `None`. The `WebhookConfig.secret` field is **never** serialized (write-only) to prevent accidental exposure.

## Agent Modes

The agent supports three operating modes with per-section granularity:

| Mode | Behavior |
|------|----------|
| `observe` | Read-only monitoring (default) |
| `shadow` | Validate configs without applying |
| `takeover` | Full control with apply and rollback |

`ModeConfig` allows overriding the base mode per config section:

```rust
let cfg = ModeConfig {
    mode: AgentMode::Observe,
    section_overrides: HashMap::from([
        (ConfigSection::Firewall, AgentMode::Takeover),
    ]),
};

cfg.effective_mode(&ConfigSection::Firewall); // => Takeover
cfg.effective_mode(&ConfigSection::Dns);      // => Observe (fallback)
```

## Testing

```sh
cargo test -p ngfw-protocol
```

The crate includes 23+ tests covering serialization roundtrips, enum case conventions, optional field omission, default values, nested payloads, and security invariants (webhook secret suppression).

## License

MIT
