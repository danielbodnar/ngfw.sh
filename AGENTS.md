# NGFW.sh Agent Guide

Cloud-managed next-generation firewall and router administration platform running on Cloudflare's Edge.

## Quick Reference

| Stack Layer     | Technologies                                        |
|-----------------|-----------------------------------------------------|
| Frontend        | React 19, Astro 5 + Vue 3, Tailwind CSS 4, Vite 7  |
| Backend (TS)    | Hono 4, Chanfana 3, Zod 4, Cloudflare Workers      |
| Backend (Rust)  | workers-rs, Durable Objects, WebSocket RPC         |
| Router Agent    | Rust (tokio, async), cross-compiled for ARM64      |
| Auth            | Clerk.com                                          |
| Storage         | Cloudflare D1 (SQLite), KV, R2                     |
| Package Manager | Bun                                                |

## Build & Dev Commands

```bash
# Setup
bun run setup              # Install all package dependencies

# Development servers
bun run dev:portal         # Portal         -> localhost:5173
bun run dev:schema         # Schema API     -> localhost:8787
bun run dev:api            # Rust API       -> localhost:8788
bun run dev:www            # Marketing      -> localhost:4321
bun run dev:docs           # Documentation  -> localhost:4322

# Build
bun run build              # Build all TypeScript packages
bun run build:agent        # Cross-compile Rust agent for ARM64

# Quality
bun run lint               # Lint with oxlint
bun run lint:fix           # Auto-fix linting issues
bun run format             # Format with oxfmt
bun run format:check       # Check formatting
```

## Testing

```bash
# TypeScript tests (Vitest + Cloudflare Workers pool)
bun run test               # Run schema tests
bun run test:schema        # Same as above

# Run a single test file
cd packages/schema && npx vitest run tests/integration/tasks.test.ts --config tests/vitest.config.mts

# Run tests matching a pattern
cd packages/schema && npx vitest run -t "should create" --config tests/vitest.config.mts

# Rust tests
cd packages/api && cargo test              # All API tests
cd packages/agent && cargo test            # All agent tests
cargo test test_name                       # Single test by name

# Integration & E2E
bun run test:integration                   # Docker-based integration tests
bun run test:e2e                           # End-to-end tests
bun run test:e2e:smoke                     # Quick smoke tests
```

## Code Style

### TypeScript

**Formatting:**
- Single quotes, no semicolons
- 2-space indentation (tabs in JSON configs)
- Linting: `oxlint` (config in `.oxlintrc.json`)
- Formatting: `oxfmt`

**Imports - order by group:**
```typescript
// 1. Framework/platform imports
import { SELF } from "cloudflare:test";
import { contentJson, OpenAPIRoute } from "chanfana";
// 2. External libraries
import { z } from "zod";
// 3. Local modules (use type imports when only importing types)
import type { AppContext } from "../../types";
import { device } from "./base";
```

**TypeScript strictness:**
- `strict: true` enabled
- `noUncheckedIndexedAccess: true`
- Use `type` for type aliases, `interface` for object shapes
- Prefer explicit return types on exported functions

**Naming conventions:**
- PascalCase: Components, Types, Classes (`Dashboard`, `DeviceList`, `AppContext`)
- camelCase: functions, variables, properties (`formatBytes`, `userId`)
- SCREAMING_SNAKE_CASE: constants, env vars (`CLERK_SECRET_KEY`)
- Descriptive names over abbreviations

### API Endpoints (Chanfana pattern)

```typescript
export class DeviceList extends OpenAPIRoute {
  schema = {
    tags: ["Fleet"],
    summary: "List all devices",
    operationId: "fleet-device-list",
    security: [{ bearerAuth: [] }],
    responses: { "200": { description: "List of devices", ...contentJson(z.object({
      success: z.boolean(), result: z.array(deviceSchema),
    })) } },
  };

  async handle(c: AppContext) {
    const userId = c.get("userId");
    return { success: true, result: results };
  }
}
```

### Test Patterns (Vitest)

```typescript
import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Feature Name", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should do something specific", async () => {
    const response = await SELF.fetch("http://local.test/endpoint", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "value" }),
    });
    expect(response.status).toBe(201);
    const body = await response.json<{ success: boolean; result: any }>();
    expect(body.success).toBe(true);
  });
});
```

### React Patterns

- Functional components only (no class components)
- Use hooks: `useState`, `useMemo`, `useEffect`
- Utility function `cn()` for conditional classes: `cn('base', condition && 'class')`

### Rust

- Follow Rust API Guidelines and rustfmt
- Address all clippy warnings
- Use `anyhow::Result` for application errors with `.context()`
- Use `tracing` for logging (`info!`, `error!`)

## Error Handling

**TypeScript:**
- Return `{ success: false, errors: [...] }` for API errors
- Use Zod for validation; Chanfana handles validation errors automatically
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found

**Rust:**
- Use `anyhow::Result<T>` for fallible functions
- Add context: `.context("Failed to load config")?`

## Database (D1)

```bash
bun run db:migrate         # Apply migrations locally
bun run db:migrate:remote  # Apply migrations to production
```

Use prepared statements:
```typescript
const { results } = await db.prepare("SELECT * FROM devices WHERE owner_id = ?").bind(userId).all();
```

## Deployment

```bash
bun run deploy             # Deploy all packages
bun run deploy:schema      # Deploy schema API only
bun run deploy:portal      # Deploy portal only
```
