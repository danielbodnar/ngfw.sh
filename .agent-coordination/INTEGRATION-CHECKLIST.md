# DDNS API Integration Checklist

## Integration Coordinator Tasks

### 1. Update Main Router (`packages/schema/src/index.ts`)

Add import at the top:
```typescript
import { ddnsRouter } from "./endpoints/ddns/router";
```

Add route registration after line 96 (after routing router):
```typescript
// Register DDNS Sub router (protected by Clerk JWT auth)
openapi.route("/ddns", ddnsRouter);
```

### 2. Run Database Migration

**Local Development:**
```bash
cd /workspaces/code/github.com/danielbodnar/ngfw.sh
bun run db:migrate:local
```

**Production:**
```bash
cd /workspaces/code/github.com/danielbodnar/ngfw.sh
bun run db:migrate:remote
```

### 3. Verify OpenAPI Spec

After integration, check that endpoints appear at:
- `http://localhost:8787/` (local dev)
- `https://specs.ngfw.sh/` (production)

Look for "DDNS" tag with 4 endpoints:
- GET /ddns/providers
- GET /ddns/config/:deviceId
- PUT /ddns/config/:deviceId
- POST /ddns/update/:deviceId

## API Endpoint Reference

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/ddns/providers` | List supported DDNS providers |
| GET | `/ddns/config/:deviceId` | Get DDNS configuration for device |
| PUT | `/ddns/config/:deviceId` | Create/update DDNS configuration |
| POST | `/ddns/update/:deviceId` | Force immediate IP update |

All endpoints require Clerk JWT authentication (bearerAuth).

## Files Created

```
packages/schema/src/endpoints/ddns/
├── base.ts              # Schemas and provider data
├── configRead.ts        # GET /ddns/config/:deviceId
├── configUpdate.ts      # PUT /ddns/config/:deviceId
├── providerList.ts      # GET /ddns/providers
├── forceUpdate.ts       # POST /ddns/update/:deviceId
└── router.ts            # Route registration

packages/schema/migrations/
└── 0006_add_ddns_configs_table.sql

.agent-coordination/
├── status/
│   └── ddns-api.json
└── ddns-api-summary.md
```

## Testing Commands

```bash
# Run tests (after integration)
cd /workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema
bun run test

# Check linting
bun run lint

# Check formatting
bun run format:check

# Start dev server
bun run dev:schema
```

## Dependencies (Already Installed)

- `hono` - HTTP framework
- `chanfana` - OpenAPI integration
- `zod` - Schema validation
- `@cloudflare/workers-types` - TypeScript types

No new dependencies required.

## Notes for Frontend Agent (services-pages)

When implementing DDNS page, use these API endpoints:

```typescript
// Fetch providers list
GET /ddns/providers
→ Returns array of provider objects with capabilities

// Get current config
GET /ddns/config/:deviceId
→ Returns config or null if not configured

// Save/update config
PUT /ddns/config/:deviceId
Body: {
  enabled: boolean,
  provider: string,
  hostname: string,
  username?: string,
  password?: string
}

// Force update
POST /ddns/update/:deviceId
→ Queues immediate IP update with agent
```

All requests need Authorization header: `Bearer <clerk-jwt-token>`

## Success Criteria

- [ ] Migration applied to local D1 database
- [ ] Router integrated in `packages/schema/src/index.ts`
- [ ] OpenAPI spec shows DDNS endpoints
- [ ] Dev server starts without errors
- [ ] TypeScript compiles without new errors
- [ ] Linter passes without new warnings
- [ ] All 4 endpoints accessible via HTTP
- [ ] Authentication properly enforced
- [ ] Device ownership verification works
- [ ] KV writes succeed for force update
