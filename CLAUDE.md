# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NGFW.sh is a cloud-managed next-generation firewall and router administration platform. It replaces embedded router web interfaces with an edge-hosted management console running entirely on Cloudflare Workers. On-premises router agents connect via WebSocket to the Rust API for real-time configuration and monitoring.

## Architecture

```
Browser ──→ packages/portal (React SPA)  ──→ app.ngfw.sh / dash.ngfw.sh
         ──→ packages/www    (Marketing)  ──→ ngfw.sh / www.ngfw.sh
         ──→ docs/           (Starlight)  ──→ docs.ngfw.sh

Portal   ──→ packages/schema (Hono API)  ──→ specs.ngfw.sh   (OpenAPI, CRUD, D1)
Router   ──→ packages/api    (Rust API)   ──→ api.ngfw.sh     (WebSocket, Durable Objects)

Storage: D1 (ngfw-db), KV (DEVICES, CONFIGS, SESSIONS, CACHE), R2 (FIRMWARE, BACKUPS, REPORTS)
```

### Two API Servers

The project has two separate API servers that share the same D1/KV/R2 bindings:

- **`packages/schema`** — TypeScript Hono + Chanfana. Serves the OpenAPI spec at `specs.ngfw.sh`. Handles CRUD operations, user-facing REST endpoints, and D1 queries. Uses Zod for validation.
- **`packages/api`** — Rust (workers-rs). Serves `api.ngfw.sh`. Handles WebSocket connections from router agents via Durable Objects (`AgentConnection`), JWT verification, and real-time RPC. Compiles to WASM.

### Portal (Single Page Application)

`packages/portal` is a React 19 monolithic SPA. All pages and mock data live in `src/App.tsx` (~1600 lines). Authentication is handled by Clerk.com (`@clerk/clerk-react`). There is no routing library — navigation is state-driven via a `View` type.

## Technology Stack

| Component | Technology | Route |
|-----------|------------|-------|
| Portal | React 19, Vite 7, Tailwind CSS 4 | `app.ngfw.sh` |
| Marketing | React 19, Vite 7, Tailwind CSS 4 | `ngfw.sh` |
| Schema API | Hono 4, Chanfana 3 (OpenAPI), Zod 4 | `specs.ngfw.sh` |
| Rust API | workers-rs 0.7, Durable Objects, WebSocket | `api.ngfw.sh` |
| Docs | Astro 5, Starlight | `docs.ngfw.sh` |
| Auth | Clerk.com (instance: `tough-unicorn-25`) |
| Database | Cloudflare D1 (SQLite) |
| KV | Cloudflare KV (4 namespaces) |
| Storage | Cloudflare R2 (3 buckets) |

## Commands

All commands run from the repository root unless noted otherwise.

### Setup & Development

```bash
bun run setup                    # Install deps for all packages
bun run dev:portal               # Portal dev server (Vite)
bun run dev:schema               # Schema API dev server (Wrangler)
bun run dev:api                  # Rust API dev server (Wrangler)
bun run dev:www                  # Marketing site dev server
bun run dev:docs                 # Documentation dev server (Astro)
```

### Build

```bash
bun run build                    # Build www, portal, schema, docs
bun run build:all                # Build all including Rust API
bun run build:api                # Build Rust API (worker-build --release)
```

### Test

```bash
bun run test                     # Run schema tests (Vitest + Cloudflare pool)
bun run test:schema              # Same as above

# From packages/schema/:
bun run test                     # Dry-run deploy + vitest with tests/vitest.config.mts
```

Tests use `@cloudflare/vitest-pool-workers` and import `SELF` from `cloudflare:test` for integration testing against the Workers runtime.

### Lint & Format

```bash
bun run lint                     # oxlint (config: .oxlintrc.json)
bun run lint:fix                 # oxlint --fix
bun run format                   # oxfmt --write
bun run format:check             # oxfmt --check
```

### Database

```bash
bun run db:migrate:local         # Apply D1 migrations locally
bun run db:migrate:remote        # Apply D1 migrations to production
```

Migrations live in `packages/schema/migrations/`. The `predeploy` script in `packages/schema` auto-applies remote migrations before deploy.

### Deploy

```bash
bun run deploy                   # Deploy www, portal, schema, docs
bun run deploy:all               # Deploy all including Rust API
bun run deploy:api               # Deploy Rust API to api.ngfw.sh

# Secrets (must be set before first deploy):
bunx wrangler secret put CLERK_SECRET_KEY --config packages/schema/wrangler.jsonc
bunx wrangler secret put CLERK_SECRET_KEY --config packages/api/wrangler.toml
```

### Rust API (packages/api/)

```bash
cd packages/api
cargo build --target wasm32-unknown-unknown    # Build WASM
cargo clippy                                    # Lint
cargo fmt                                       # Format
cargo install -q worker-build && worker-build --release  # Full worker build
```

### Git

```bash
lumen draft | git commit -F -    # Conventional commit via lumen
```

## Authentication (Clerk.com)

| Property | Value |
|----------|-------|
| Instance | `tough-unicorn-25` |
| JWKS Endpoint | `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json` |
| Features | Email/Password, Phone, MFA, Passkeys, Waitlist, B2C Billing, Sessions, API Keys |

**Frontend** (`packages/portal`): `@clerk/clerk-react` — `ClerkProvider` in `main.tsx`, `SignedIn`/`SignedOut`/`UserButton`/`useUser()` in `App.tsx`.

**Schema API** (`packages/schema`): `@clerk/backend` installed. JWT middleware not yet implemented.

**Rust API** (`packages/api`): `jsonwebtoken` crate. JWT verification via JWKS. Auth middleware in `src/middleware/auth.rs`.

### Environment Variables

Portal needs `VITE_CLERK_PUBLISHABLE_KEY` in `.dev.vars`. Both API packages need `CLERK_SECRET_KEY` as a Wrangler secret (not in config files).

## Cloudflare Bindings (shared by schema and api)

| Type | Binding | Resource |
|------|---------|----------|
| D1 | `DB` | `ngfw-db` |
| KV | `DEVICES` | Device registry and API keys |
| KV | `CONFIGS` | Device configurations |
| KV | `SESSIONS` | User sessions |
| KV | `CACHE` | Blocklist and threat feed cache |
| R2 | `FIRMWARE` | Firmware images |
| R2 | `BACKUPS` | Configuration backups |
| R2 | `REPORTS` | Generated reports |

## Rust API Structure (packages/api/src/)

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

The Rust API uses `RefCell` for interior mutability in Durable Objects. WebSocket connections from router agents flow through the `AgentConnection` Durable Object. The release profile is size-optimized with LTO and panic=abort.

## Schema API Structure (packages/schema/src/)

```
index.ts                     # Hono app, CORS, Chanfana OpenAPI registry
types.ts                     # AppContext type
endpoints/
  dummyEndpoint.ts           # Example endpoint
  tasks/
    router.ts, base.ts       # Task CRUD routing and Zod schemas
    taskCreate.ts, taskRead.ts, taskUpdate.ts, taskList.ts, taskDelete.ts
```

Chanfana auto-generates OpenAPI 3.1 specs. Endpoints extend Chanfana base classes. Error responses use `ApiException`.

## Key Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Complete API specification (50+ endpoints, RPC protocol, config schemas) |
| `TODO.md` | Current tasks and auth migration status |
| `.oxlintrc.json` | Root oxlint configuration |
| `packages/portal/src/App.tsx` | Entire portal UI (monolithic, ~1600 lines) |
| `packages/portal/src/main.tsx` | React entry with ClerkProvider |
| `packages/api/src/rpc/agent_connection.rs` | Durable Object for WebSocket agent connections |
| `packages/schema/migrations/` | D1 SQL migrations |

## Current Status

- Frontend Clerk integration: **Complete**
- Backend JWT middleware (schema): **Pending**
- Backend JWT middleware (Rust api): **Scaffolded**
- Production deployment: **Pending**
- Future: Migration from React SPA to Astro + Vue
