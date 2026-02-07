# NGFW.sh Schema API

> OpenAPI 3.1 REST API server for NGFW.sh, built with [Hono](https://hono.dev) and [Chanfana](https://chanfana.com).

**Live API docs**: [specs.ngfw.sh](https://specs.ngfw.sh)

## Overview

TypeScript API server on Cloudflare Workers that provides:

- **OpenAPI 3.1** — Auto-generated documentation from code
- **Chanfana D1 CRUD** — Type-safe database operations with Zod validation
- **Clerk JWT Auth** — Middleware for user authentication
- **Interactive Docs** — Swagger UI and ReDoc at root

> **Note**: This API handles REST endpoints and OpenAPI docs. Real-time WebSocket communication is handled by the Rust API (`packages/api` → api.ngfw.sh).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers Edge                      │
│                                                                  │
│  ┌─────────────────┐    ┌───────────────────────────────────┐   │
│  │   Hono Router   │───▶│     Chanfana OpenAPI Registry     │   │
│  │                 │    │                                   │   │
│  │  /billing/*     │    │  • Auto OpenAPI spec generation   │   │
│  │  /fleet/*       │    │  • Request/response validation    │   │
│  │  /vpn/*         │    │  • D1ListEndpoint / D1ReadEndpt   │   │
│  │  /ips/*         │    │  • Error handling                 │   │
│  │  /qos/*         │    └───────────────────────────────────┘   │
│  │  /ddns/*        │                    │                       │
│  │  /reports/*     │                    ▼                       │
│  │  /onboarding/*  │    ┌───────────────────────────────────┐   │
│  │  ...            │    │         Storage Bindings          │   │
│  └─────────────────┘    │  D1 │ KV │ R2                     │   │
│          │              └───────────────────────────────────┘   │
│          ▼                                                      │
│  ┌─────────────────┐                                            │
│  │   Clerk Auth    │    Verifies JWT from Authorization header  │
│  │   Middleware    │    Sets userId in Hono context             │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
packages/schema/
├── src/
│   ├── index.ts              # Hono app, OpenAPI registry, route mounting
│   ├── types.ts              # TypeScript types (AppBindings, HandleArgs)
│   ├── middleware/
│   │   └── auth.ts           # Clerk JWT verification middleware
│   └── endpoints/
│       ├── billing/          # Plans, subscriptions
│       │   ├── base.ts       # PlanModel (Zod schema + D1 config)
│       │   ├── router.ts     # Sub-router mounting
│       │   ├── planList.ts   # GET /billing/plans
│       │   └── planRead.ts   # GET /billing/plans/:id
│       ├── fleet/            # Device registration, management
│       │   ├── base.ts       # DeviceModel
│       │   ├── router.ts
│       │   ├── deviceList.ts
│       │   ├── deviceRegister.ts
│       │   ├── deviceStatus.ts
│       │   └── deviceDelete.ts
│       ├── routing/          # Static routes
│       ├── nat/              # NAT rules, UPnP
│       ├── ips/              # IDS/IPS config, alerts
│       ├── vpn-server/       # WireGuard server, peers
│       ├── vpn-client/       # Client profiles, connect/disconnect
│       ├── qos/              # Traffic shaping rules
│       ├── ddns/             # Dynamic DNS config
│       ├── reports/          # Report generation
│       ├── logs/             # System/security logs
│       ├── dashboards/       # Dashboard widgets
│       └── onboarding/       # Router selection, setup
├── migrations/               # D1 SQL migrations
│   ├── 0001_add_tasks_table.sql
│   ├── 0002_add_plans_and_subscriptions.sql
│   ├── 0003_remove_artificial_limits.sql
│   ├── 0004_remove_has_reports.sql
│   ├── 0005_add_devices_table.sql
│   └── 0006_add_ddns_configs_table.sql
├── tests/                    # Integration tests
│   └── vitest.config.mts
├── wrangler.jsonc            # Cloudflare Workers config
└── README.md                 # This file
```

## Endpoint Pattern

### Chanfana D1 Endpoint

```typescript
// endpoints/billing/base.ts
import { D1Model } from "chanfana";
import { z } from "zod";

export const PlanModel: D1Model = {
  tableName: "plans",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    price_monthly: z.number(),
    price_annual: z.number(),
    features: z.record(z.boolean()),
    created_at: z.string(),
  }),
  primaryKey: "id",
};
```

```typescript
// endpoints/billing/planList.ts
import { D1ListEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { PlanModel } from "./base";

export class PlanList extends D1ListEndpoint<HandleArgs> {
  _meta = {
    model: PlanModel,
  };

  searchFields = ["name", "description"];
  defaultOrderBy = "sort_order ASC";
}
```

### Custom Endpoint

```typescript
// endpoints/fleet/deviceRegister.ts
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

export class DeviceRegister extends OpenAPIRoute {
  schema = {
    tags: ["Fleet"],
    summary: "Register a new router device",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
              model: z.string(),
              mac_address: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "Device registered",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
              api_key: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c) {
    const data = await this.getValidatedData();
    // ... implementation
  }
}
```

### Router with Auth Middleware

```typescript
// endpoints/fleet/router.ts
import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env }>();
app.use("*", clerkAuth);

export const fleetRouter = fromHono(app)
  .get("/devices", DeviceList)
  .post("/devices", DeviceRegister)
  .get("/devices/:id/status", DeviceStatus)
  .delete("/devices/:id", DeviceDelete);
```

## API Documentation URLs

| Path | Description |
|------|-------------|
| `/` | Swagger UI (interactive) |
| `/redoc` | ReDoc documentation |
| `/openapi.json` | OpenAPI 3.1 schema |

## Implemented Endpoints

| Tag | Endpoints | Status |
|-----|-----------|--------|
| Billing | `/billing/plans`, `/billing/plans/:id` | Implemented |
| Fleet | `/fleet/devices`, `/fleet/devices/:id/*` | Implemented |
| Routing | `/routing/routes`, `/routing/routes/:id` | Implemented |
| NAT | `/nat/rules`, `/nat/upnp` | Implemented |
| IPS | `/ips/config`, `/ips/categories`, `/ips/rules`, `/ips/alerts` | Implemented |
| VPN Server | `/vpn/server/config`, `/vpn/server/peers` | Implemented |
| VPN Client | `/vpn/client/profiles`, `/vpn/client/profiles/:id/connect` | Implemented |
| QoS | `/qos/config`, `/qos/rules` | Implemented |
| DDNS | `/ddns/config`, `/ddns/providers`, `/ddns/update` | Implemented |
| Reports | `/reports`, `/reports/:id`, `/reports/generate` | Implemented |
| Logs | `/logs/system`, `/logs/security` | Implemented |
| Onboarding | `/onboarding/routers`, `/onboarding/status`, `/onboarding/order` | Implemented |
| Dashboards | `/dashboards`, `/dashboards/:id` | Implemented |

> See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the full 50+ endpoint specification.

## Development

### Prerequisites

- Bun 1.2+
- Wrangler CLI

### Commands

```bash
# Install dependencies
bun install

# Apply database migrations (local)
bun run seedLocalDb

# Start dev server at localhost:8787
bun run dev

# Run tests
bun run test

# Generate OpenAPI schema
bun run schema
```

### Local Development

Dev server at `http://localhost:8787` with:
- Miniflare for local Workers simulation
- Local D1 database (SQLite)
- Hot reload on file changes

### Database Migrations

```bash
# Create new migration
touch migrations/NNNN_description.sql

# Apply to local
bunx wrangler d1 execute ngfw-db --local --file=migrations/NNNN_description.sql

# Apply to production
bunx wrangler d1 execute ngfw-db --file=migrations/NNNN_description.sql
```

## Deployment

### Prerequisites

1. Create D1 database:
   ```bash
   wrangler d1 create ngfw-db
   ```

2. Create KV namespaces:
   ```bash
   wrangler kv:namespace create DEVICES
   wrangler kv:namespace create CONFIGS
   wrangler kv:namespace create SESSIONS
   wrangler kv:namespace create CACHE
   ```

3. Create R2 buckets:
   ```bash
   wrangler r2 bucket create ngfw-firmware
   wrangler r2 bucket create ngfw-backups
   wrangler r2 bucket create ngfw-reports
   ```

4. Set Clerk secret:
   ```bash
   bunx wrangler secret put CLERK_SECRET_KEY
   ```

### Deploy

```bash
# Apply migrations to remote database
bun run predeploy

# Deploy to Cloudflare Workers
bun run deploy
```

Deploys to `specs.ngfw.sh`.

## Configuration

### Wrangler Config (`wrangler.jsonc`)

| Setting | Value |
|---------|-------|
| Worker name | `ngfw-specs` |
| Route | `specs.ngfw.sh` |
| Compatibility date | `2026-02-03` |

### Bindings

| Type | Binding | Purpose |
|------|---------|---------|
| D1 | `DB` | Primary database |
| KV | `DEVICES` | Device registry |
| KV | `CONFIGS` | Device configurations |
| KV | `SESSIONS` | User sessions |
| KV | `CACHE` | Blocklist cache |
| R2 | `FIRMWARE` | Firmware images |
| R2 | `BACKUPS` | Configuration backups |
| R2 | `REPORTS` | Generated reports |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLERK_SECRET_KEY` | Clerk.com secret key (secret) |

## Testing

```bash
# Run all tests
bun run test

# Run specific test file
bun run test tests/integration/billing.test.ts

# Watch mode
bunx vitest --config tests/vitest.config.mts
```

## Authentication

### Clerk JWT Middleware

The `clerkAuth` middleware:
1. Extracts Bearer token from `Authorization` header
2. Verifies JWT against Clerk using `@clerk/backend`
3. Sets `userId` on Hono context (`c.get("userId")`)
4. Returns 401 if invalid

```typescript
// Usage in protected routes
app.use("*", clerkAuth);
```

### Public vs Protected Routes

| Route | Auth Required |
|-------|---------------|
| `/` (docs) | No |
| `/openapi.json` | No |
| `/billing/plans` | No |
| `/fleet/*` | Yes |
| `/vpn/*` | Yes |
| All other endpoints | Yes |

## Related Packages

| Package | Domain | Relationship |
|---------|--------|--------------|
| `packages/api` | api.ngfw.sh | WebSocket RPC, Durable Objects |
| `packages/portal-astro` | app.ngfw.sh | Dashboard (API consumer) |

## Documentation

- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** — Full API specification
- **[PROJECT.md](../../PROJECT.md)** — Task tracking and roadmap
- **[api.ngfw.sh](https://api.ngfw.sh)** — WebSocket RPC endpoint
