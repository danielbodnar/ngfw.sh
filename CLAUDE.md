# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NGFW.sh is a cloud-managed next-generation firewall platform. All cloud services run on Cloudflare Workers. On-premises router agents (Rust) connect via WebSocket through Durable Objects for real-time management.

## Commands

All commands run from the repository root unless noted.

```bash
# Setup
bun run setup                          # Install deps for all packages

# Development servers (run individually)
bun run dev:portal                     # Portal UI (localhost:5173)
bun run dev:schema                     # Schema API (localhost:8787)
bun run dev:api                        # Rust API (localhost:8788)
bun run dev:www                        # Marketing site (localhost:4321)
bun run dev:docs                       # Documentation (localhost:4322)
bun run dev:sandbox                    # Sandbox container (localhost:8800)

# Build
bun run build                          # Build www, portal, schema, docs
bun run build:all                      # Build all including Rust API
bun run build:api                      # Rust API only (worker-build --release)
bun run build:agent                    # Router agent (cross-compile aarch64)

# Test
bun run test                           # Schema tests (Vitest + Cloudflare pool)
bun run test:schema                    # Same as above
bun run --cwd packages/portal-astro test        # Portal unit tests
bun run --cwd packages/portal-astro test:e2e    # Portal Playwright E2E
cargo test -p ngfw-protocol            # Protocol crate tests
cargo test -p ngfw-agent               # Agent tests
cargo test -p ngfw-agent test_name     # Single Rust test

# Run a single schema test file
cd packages/schema && npx vitest run tests/integration/tasks.test.ts --config tests/vitest.config.mts

# Run schema tests matching a pattern
cd packages/schema && npx vitest run -t "should create" --config tests/vitest.config.mts

# Lint & Format
bun run lint                           # oxlint (config: .oxlintrc.json)
bun run lint:fix                       # oxlint --fix
bun run format                         # oxfmt --write
bun run format:check                   # oxfmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt

# Database (D1 migrations)
bun run db:migrate:local               # Apply migrations locally
bun run db:migrate:remote              # Apply migrations to production

# Deploy
bun run deploy                         # Deploy www, portal, schema, docs
bun run deploy:all                     # Deploy all including Rust API

# Secrets (must be set before first deploy)
bunx wrangler secret put CLERK_SECRET_KEY --config packages/schema/wrangler.jsonc
bunx wrangler secret put CLERK_SECRET_KEY --config packages/api/wrangler.toml
```

## Architecture

### Two API Servers (Shared Bindings)

Both APIs share the same D1 database, KV namespaces, and R2 buckets:

| Type | Binding | Purpose |
|------|---------|---------|
| D1 | `DB` | Users, devices, configs, subscriptions (`ngfw-db`) |
| KV | `DEVICES` | Device registry and API keys |
| KV | `CONFIGS` | Device configurations |
| KV | `SESSIONS` | User sessions |
| KV | `CACHE` | Blocklist and threat feed cache |
| R2 | `FIRMWARE` | Firmware images |
| R2 | `BACKUPS` | Configuration backups |
| R2 | `REPORTS` | Generated reports |

- **Rust API** (`packages/api/`, `api.ngfw.sh`) — workers-rs compiled to WASM. Serves REST endpoints, WebSocket RPC via `AgentConnection` Durable Object, OpenAPI 3.1 spec at `/openapi.json`, JWT verification against Clerk JWKS. Uses `RefCell` for interior mutability in Durable Objects.
- **Schema API** (`packages/schema/`, `specs.ngfw.sh`) — **DEPRECATED**. TypeScript Hono + Chanfana. All endpoints migrated to Rust API.

### Portal Migration

`packages/portal-astro/` (Astro 5 + Vue 3 + Tailwind 4) is the active portal. `packages/portal/` is the legacy React portal — only touch for bug fixes.

### Rust Workspace

Three crates in `Cargo.toml` workspace:

- **`packages/protocol/`** (`ngfw-protocol`) — Shared RPC types with `utoipa` OpenAPI 3.1 schema generation. Feature flags: `js` for WASM targets, `native` for the agent binary. All types derive `Serialize, Deserialize, ToSchema`.
- **`packages/agent/`** (`ngfw-agent`) — Router daemon using Tokio. Connects via WebSocket (`tokio-tungstenite`), manages nftables/dnsmasq/hostapd/WireGuard. Cross-compiled to `aarch64-unknown-linux-gnu`.
- **`packages/api/`** (`ngfw-api`) — Workers-rs WASM API. `crate-type = ["cdylib"]`. Release profile: `opt-level = "z"`, LTO, `panic = "abort"`, stripped.

### Rust API Structure (packages/api/src/)

```
lib.rs                       # Entry point (#[event(fetch)] macro)
handlers/
  mod.rs, agent.rs, fleet.rs, network.rs, router.rs,
  security.rs, services.rs, system.rs, user.rs
middleware/
  mod.rs, auth.rs, cors.rs, rate_limit.rs
models/
  mod.rs, error.rs, fleet.rs, network.rs, rpc.rs,
  security.rs, services.rs, system.rs, user.rs
rpc/
  mod.rs, agent_connection.rs  # Durable Object for WebSocket
storage/
  mod.rs                       # KV, D1, R2 abstractions
```

### Schema API Structure (packages/schema/src/)

```
index.ts                     # Hono app, CORS, Chanfana OpenAPI registry
types.ts                     # AppContext type (Hono context with Env bindings)
endpoints/
  billing/                   # Plan and subscription management
  fleet/                     # Device CRUD and status
  wan/, lan/, wifi/, dhcp/   # Network configuration
  routing/                   # Static routes
  nat/                       # NAT rules and UPnP
  ips/                       # IDS/IPS configuration
  vpn-server/, vpn-client/   # VPN management
  qos/                       # QoS traffic shaping
  ddns/                      # Dynamic DNS
  reports/, logs/            # Reporting and log queries
  onboarding/                # Device registration flow
  dashboards/                # Dashboard data
```

D1 migrations in `packages/schema/migrations/` (numbered `0001_` through `0008_`). The `predeploy` script auto-applies remote migrations before deploy.

### RPC Protocol

WebSocket messages use `RpcMessage` envelope: `{ id, type, payload }`. `MessageType` is `SCREAMING_SNAKE_CASE`, `ConfigSection` is lowercase. Agent modes: `observe` (read-only), `shadow` (validate without applying), `takeover` (full control). `ModeConfig` supports per-section overrides.

### Schema API Patterns

```typescript
// Endpoint pattern: extend Chanfana base class (OpenAPIRoute)
// Zod 4 for validation, D1 for storage
// Error format: { success: false, errors: [{ code, message }] }
// AppContext type defined in src/types.ts provides Hono context with Env bindings
```

### Test Patterns

Schema tests use `@cloudflare/vitest-pool-workers` and import `SELF` from `cloudflare:test` for integration testing against the Workers runtime:

```typescript
import { SELF } from "cloudflare:test";
const response = await SELF.fetch("http://local.test/endpoint");
```

### Authentication

Clerk.com handles auth (instance: `tough-unicorn-25`). Portal uses `@clerk/astro`, Schema API uses `@clerk/backend` with `verifyToken`, Rust API uses `jsonwebtoken` crate with RS256 + JWKS from KV cache. Router agents authenticate with device-specific API keys stored in KV.

Portal needs `VITE_CLERK_PUBLISHABLE_KEY` in `.dev.vars`. Both API packages need `CLERK_SECRET_KEY` as a Wrangler secret (not in config files).

### Other Packages

- `packages/www/` — Marketing site deployed to `ngfw.sh` (static assets via Workers)
- `packages/sandbox/` — Cloudflare Container with Durable Object (`Sandbox` class), uses `nodejs_compat`
- `packages/awrtconf/` — ASUS router config deobfuscation CLI (Rust)
- `docs/` — Astro Starlight documentation site (`docs.ngfw.sh`)

## Code Conventions

- **TypeScript:** Strict mode, Zod at boundaries, functional patterns, PascalCase types, camelCase functions, kebab-case files
- **Rust:** Clippy with `-D warnings`, `rustfmt`, no `unwrap()` in production paths, `?` for error propagation
- **Commits:** Conventional commits via `lumen draft | git commit -F -`
- **Linting:** oxlint with plugins (unicorn, typescript, oxc, import, jsdoc, jest, vitest, jsx-a11y, promise, node, vue)

## Key Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Complete API specification, RPC protocol, config schemas |
| `ARCHITECTURE.md` | Full technical architecture reference |
| `PROJECT.md` | Task tracking, roadmap, development status |
| `.oxlintrc.json` | Root oxlint configuration |
| `packages/api/src/rpc/agent_connection.rs` | Durable Object for WebSocket agent connections |
| `packages/schema/migrations/` | D1 SQL migrations |
