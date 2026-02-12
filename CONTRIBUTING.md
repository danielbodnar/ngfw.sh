# Contributing to NGFW.sh

Thank you for your interest in contributing to NGFW.sh! This guide covers the architecture, development workflow, and contribution guidelines.

## Architecture Overview

NGFW.sh follows a **Rust-first API architecture** with type-safe client generation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Flow                                       │
│                                                                              │
│   Rust API          OpenAPI 3.1         Zod Schemas        Astro/Vue UI     │
│   (workers-rs)  ──► (utoipa)        ──► (openapi-zod)  ──► (TypeScript)     │
│                                                                              │
│   packages/api      /openapi.json       packages/          packages/        │
│                                         portal-astro/      portal-astro/    │
│                                         src/lib/api/       src/             │
│                                         generated/                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Source of Truth**: Rust types define the API contract
2. **Type Safety End-to-End**: OpenAPI → Zod → TypeScript with zero manual type definitions
3. **Edge-First**: Everything runs on Cloudflare Workers (sub-50ms global latency)
4. **Real-Time**: WebSocket RPC for live router communication

## Service Architecture

| Service | Domain | Technology | Purpose |
|---------|--------|------------|---------|
| **API** | `api.ngfw.sh` | Rust (workers-rs) | REST + WebSocket + OpenAPI |
| Portal | `app.ngfw.sh` | Astro + Vue 3 | Dashboard UI |
| Portal (beta) | `beta.ngfw.sh` | Astro + Vue 3 | New features |
| Marketing | `ngfw.sh` | Astro | Landing page |
| Docs | `docs.ngfw.sh` | Starlight | Documentation |

### Deprecated Services

| Service | Domain | Status |
|---------|--------|--------|
| Schema API | `specs.ngfw.sh` | **Deprecated** - migrated to Rust API |

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) 1.2+ (package manager and runtime)
- [Rust](https://rustup.rs) 1.85+ (API and agent)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare deployment)

### Quick Start

```bash
# Clone and install
git clone https://github.com/danielbodnar/ngfw.sh.git
cd ngfw.sh
bun run setup

# Start development servers
bun run dev:portal    # Portal at localhost:5173
bun run dev:api       # Rust API at localhost:8788

# Run tests
bun run test          # TypeScript tests
cargo test            # Rust tests
```

## API Development Workflow

### 1. Define Types in Rust

All API types live in `packages/protocol/src/` with utoipa annotations:

```rust
// packages/protocol/src/fleet.rs
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub model: String,
    #[schema(example = "online")]
    pub status: DeviceStatus,
}
```

### 2. Implement Endpoints in Rust API

```rust
// packages/api/src/handlers/fleet.rs
pub async fn get_devices(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let devices = storage::list_devices(&ctx.env).await?;
    Response::from_json(&ApiResponse::success(devices))
}
```

### 3. Generate TypeScript Client

```bash
# After deploying API changes
bun run generate:api        # Local: localhost:8788
bun run generate:api:remote # Production: api.ngfw.sh
```

This generates Zod schemas and a typed client in `packages/portal-astro/src/lib/api/generated/`.

### 4. Use in Frontend

```typescript
// Fully typed, validated at runtime
const devices = await api.fleet.listDevices();
// devices: Device[] with full TypeScript inference
```

## Package Structure

```
packages/
├── api/              # Rust API (workers-rs) → api.ngfw.sh
│   ├── src/
│   │   ├── handlers/ # REST endpoint handlers
│   │   ├── rpc/      # WebSocket RPC handlers
│   │   └── openapi.rs # utoipa OpenAPI generation
│   └── wrangler.toml
│
├── protocol/         # Shared Rust types (ngfw-protocol)
│   └── src/
│       ├── fleet.rs  # Device management types
│       ├── network.rs # Network config types
│       └── rpc.rs    # WebSocket message types
│
├── agent/            # Router agent daemon (Rust/Tokio)
│   └── src/
│       ├── main.rs   # Entry point
│       └── connection/ # WebSocket client
│
├── portal-astro/     # Dashboard (Astro + Vue 3)
│   └── src/
│       ├── pages/    # Astro routes
│       ├── components/ # Vue components
│       └── lib/api/  # Generated API client
│
├── schema/           # [DEPRECATED] TypeScript API
└── portal/           # [LEGACY] React portal (bug fixes only)
```

## Code Style

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Run `cargo fmt` and `cargo clippy` before committing
- All public types must derive `ToSchema` for OpenAPI
- Use `anyhow::Result` with `.context()` for errors

### TypeScript

- ESLint + oxlint for linting
- Single quotes, no semicolons
- Prefer Zod schemas over manual type definitions
- Use generated API client, never raw `fetch()`

### Vue Components

- Composition API with `<script setup lang="ts">`
- Props defined with TypeScript interfaces
- Use `cn()` utility for conditional classes

## Testing

### Rust Tests

```bash
cargo test                    # All tests
cargo test -p ngfw-protocol   # Protocol crate only
cargo test -p ngfw-api        # API crate only
```

### TypeScript Tests

```bash
bun run test                  # Vitest with Workers pool
bun run test:e2e              # Playwright E2E tests
```

### Integration Tests

```bash
bun run test:integration      # Docker-based integration tests
```

## Pull Request Guidelines

1. **Branch naming**: `feat/description`, `fix/description`, `docs/description`
2. **Commit messages**: Follow [Conventional Commits](https://conventionalcommits.org)
3. **Tests**: Add tests for new functionality
4. **Types**: If adding API endpoints, regenerate TypeScript client
5. **Documentation**: Update relevant docs for user-facing changes

### PR Checklist

- [ ] `cargo fmt && cargo clippy` passes
- [ ] `bun run lint` passes
- [ ] Tests pass (`bun run test && cargo test`)
- [ ] OpenAPI spec updated if API changed
- [ ] TypeScript client regenerated if API changed

## Deployment

All deployments happen automatically on push to `main`:

```bash
git push origin main
# Triggers:
# - Rust API build + deploy to api.ngfw.sh
# - Portal build + deploy to app.ngfw.sh
# - Docs build + deploy to docs.ngfw.sh
```

### Manual Deployment

```bash
bun run deploy:api      # Deploy Rust API
bun run deploy:portal   # Deploy Astro portal
bun run deploy          # Deploy all packages
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/danielbodnar/ngfw.sh/issues)
- **Discussions**: [GitHub Discussions](https://github.com/danielbodnar/ngfw.sh/discussions)
- **Documentation**: [docs.ngfw.sh](https://docs.ngfw.sh)

## License

MIT License - see [LICENSE](LICENSE) for details.
