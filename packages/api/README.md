# NGFW.sh API Server (Rust)

> **Status: Compiles Successfully**
>
> Rust-based API server on Cloudflare Workers. Handles WebSocket RPC with router agents via Durable Objects.

**Live endpoint**: [api.ngfw.sh](https://api.ngfw.sh)

## Overview

High-performance API server built with `workers-rs` v0.7.4 that provides:

- **WebSocket RPC** — Real-time bidirectional communication with router agents
- **Durable Objects** — Persistent WebSocket connections with hibernation support
- **JWT Authentication** — Clerk token verification via JWKS endpoint
- **Storage Integration** — Cloudflare KV, D1, and R2 bindings

> **Note**: REST endpoints are served by the Schema API (`packages/schema` → specs.ngfw.sh). This API focuses on real-time WebSocket communication.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers Edge                      │
│                                                                  │
│  ┌──────────────┐    ┌─────────────────────────────────────┐    │
│  │   Router     │    │         AgentConnection DO          │    │
│  │   (lib.rs)   │───▶│  • WebSocket lifecycle              │    │
│  │              │    │  • Auth handshake                   │    │
│  │  /agent/ws   │    │  • Message routing                  │    │
│  │  /command    │    │  • State persistence                │    │
│  │  /status     │    │  • Hibernation API                  │    │
│  └──────────────┘    └─────────────────────────────────────┘    │
│         │                           │                            │
│         ▼                           ▼                            │
│  ┌──────────────┐    ┌──────────────┬──────────────────────┐    │
│  │  Middleware  │    │      KV      │    D1    │    R2    │    │
│  │  • Auth      │    │  DEVICES     │  ngfw-db │ FIRMWARE │    │
│  │  • CORS      │    │  CONFIGS     │          │ BACKUPS  │    │
│  │  • RateLimit │    │  SESSIONS    │          │ REPORTS  │    │
│  └──────────────┘    │  CACHE       │          │          │    │
│                      └──────────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ WebSocket (wss://api.ngfw.sh/agent/ws)
                                  ▼
                    ┌─────────────────────────────────┐
                    │       Router Agent (Home)       │
                    │  nftables · dnsmasq · hostapd   │
                    └─────────────────────────────────┘
```

### Durable Object: AgentConnection

Manages persistent WebSocket connections with router agents using workers-rs 0.7+ patterns:

- **Interior Mutability** — `RefCell` for state management (required by `fetch(&self)` signature)
- **Hibernation API** — Efficient WebSocket handling that survives hibernation
- **Persistent State** — Device authentication and metrics stored in DO storage

Key methods:
- `/websocket` — WebSocket upgrade endpoint
- `/command` — Send command to connected device
- `/status` — Query device status
- `/disconnect` — Force disconnect device

## Project Structure

```
packages/api/
├── src/
│   ├── lib.rs                 # Entry point, router setup
│   ├── handlers/
│   │   ├── mod.rs             # Handler exports
│   │   ├── router.rs          # HTTP router configuration
│   │   ├── agent.rs           # Agent WebSocket endpoints
│   │   ├── network.rs         # Network configuration
│   │   ├── security.rs        # Firewall, IDS/IPS
│   │   ├── services.rs        # VPN, QoS, DDNS
│   │   ├── system.rs          # System status, firmware
│   │   ├── fleet.rs           # Fleet management
│   │   └── user.rs            # User account
│   ├── middleware/
│   │   ├── mod.rs             # Middleware exports
│   │   ├── auth.rs            # Clerk JWT verification
│   │   ├── cors.rs            # CORS handling
│   │   └── rate_limit.rs      # Rate limiting
│   ├── models/
│   │   ├── mod.rs             # Model exports
│   │   ├── error.rs           # Error types
│   │   ├── rpc.rs             # RPC message types
│   │   ├── network.rs         # Network config models
│   │   ├── security.rs        # Security config models
│   │   ├── services.rs        # Service config models
│   │   ├── system.rs          # System status models
│   │   ├── fleet.rs           # Fleet management models
│   │   └── user.rs            # User models
│   ├── rpc/
│   │   ├── mod.rs             # RPC exports
│   │   └── agent_connection.rs # Durable Object implementation
│   └── storage/
│       └── mod.rs             # Storage utilities
├── wrangler.toml              # Cloudflare Workers config
├── Cargo.toml                 # Rust dependencies
└── README.md                  # This file
```

## WebSocket RPC Protocol

### Connection Handshake

```
1. Agent connects to wss://api.ngfw.sh/agent/ws?device_id=XXX&owner_id=YYY
2. Server creates/restores AgentConnection DO
3. Agent sends AUTH message with API key
4. Server validates against DEVICES KV
5. Server responds with AUTH_OK or AUTH_FAIL
6. Agent sends STATUS message with current state
7. Server acknowledges with STATUS_OK
```

### Message Format

```json
{
  "id": "<uuid>",
  "type": "<MessageType>",
  "payload": {}
}
```

### Message Types

| Server → Agent | Agent → Server | Description |
|----------------|----------------|-------------|
| `CONFIG_PUSH` | | Push config section |
| `CONFIG_FULL` | | Push complete config |
| `EXEC` | | Execute command |
| `REBOOT` | | Reboot device |
| `UPGRADE` | | Start firmware upgrade |
| `STATUS_REQUEST` | | Request status update |
| | `AUTH` | Authentication request |
| | `STATUS` | Status update |
| | `CONFIG_ACK` | Config applied |
| | `CONFIG_FAIL` | Config failed |
| | `EXEC_RESULT` | Command result |
| | `LOG` | Log message |
| | `ALERT` | Security alert |
| | `METRICS` | Performance metrics |

## Development

### Prerequisites

- Rust 1.85+ (edition 2024)
- `worker-build` CLI
- Wrangler CLI

### Commands

```bash
# Build (compiles to WASM)
bun run build:api

# Local development (with Miniflare)
bun run dev:api

# Deploy to production
bun run deploy:api

# Type check only
cargo check

# Run tests
cargo test
```

### Local Development

The dev server runs at `localhost:8788` with:
- Simulated KV namespaces
- Local D1 database
- Miniflare Durable Objects

### Secrets Configuration

Set the Clerk secret key for JWT verification:

```bash
bunx wrangler secret put CLERK_SECRET_KEY
```

## Configuration

### Wrangler Config (`wrangler.toml`)

| Setting | Value |
|---------|-------|
| Worker name | `ngfw-api` |
| Route | `api.ngfw.sh` |
| Compatibility date | `2026-02-03` |
| D1 database | `ngfw-db` |
| Durable Objects | `AgentConnection` |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLERK_PUBLISHABLE_KEY` | Clerk.com publishable key |
| `CLERK_SECRET_KEY` | Clerk.com secret key (secret) |
| `CLERK_JWKS_URL` | JWKS endpoint for JWT verification |
| `API_VERSION` | API version string (`v1`) |

### Bindings

| Type | Binding | Purpose |
|------|---------|---------|
| KV | `DEVICES` | Device registry & API keys |
| KV | `CONFIGS` | Device configurations |
| KV | `SESSIONS` | User sessions |
| KV | `CACHE` | Blocklist & metrics cache |
| D1 | `DB` | Users, subscriptions, audit |
| R2 | `FIRMWARE` | Firmware images |
| R2 | `BACKUPS` | Configuration backups |
| R2 | `REPORTS` | Generated reports |
| DO | `AGENT_CONNECTIONS` | WebSocket connection state |

## Dependencies

Key crates used:

| Crate | Version | Purpose |
|-------|---------|---------|
| `worker` | 0.7.4 | Cloudflare Workers SDK |
| `ngfw-protocol` | workspace | Shared protocol types |
| `serde` | 1.0 | Serialization |
| `jsonwebtoken` | 10.3 | JWT verification |
| `chrono` | 0.4 | Time handling (WASM-compatible) |
| `uuid` | 1.20 | UUID generation (JS feature) |
| `base64` | 0.22 | Encoding/decoding |

## Workers-rs 0.7+ Notes

This codebase uses `workers-rs` v0.7.4 which has breaking changes from earlier versions:

1. **`DurableObject::fetch(&self)`** — Takes `&self` not `&mut self`
2. **Interior Mutability** — Use `RefCell` for state that needs mutation
3. **WebSocket Handlers** — Generated by `#[durable_object]` macro via `DurableObject` trait methods
4. **Hibernation API** — Use `state.accept_web_socket()` for efficient handling

## Related Packages

| Package | Domain | Relationship |
|---------|--------|--------------|
| `packages/schema` | specs.ngfw.sh | REST API, OpenAPI docs |
| `packages/protocol` | - | Shared Rust/JS types |
| `packages/portal-astro` | app.ngfw.sh | Dashboard (API consumer) |

## Documentation

- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** — Full API specification (50+ endpoints)
- **[PROJECT.md](../../PROJECT.md)** — Task tracking and roadmap
- **[specs.ngfw.sh](https://specs.ngfw.sh)** — Interactive API documentation
