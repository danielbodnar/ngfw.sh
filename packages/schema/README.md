# NGFW.sh API Schema

OpenAPI 3.1 API server for NGFW.sh, built with [Hono](https://hono.dev) and [Chanfana](https://chanfana.com).

**Live API docs**: [specs.ngfw.sh](https://specs.ngfw.sh)

## Features

- OpenAPI 3.1 auto-generation from code
- Request/response validation with Zod
- Swagger UI and ReDoc documentation
- Cloudflare D1 database integration
- Integration tests with Vitest

## Development

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

## Deployment

### Prerequisites

1. Create D1 database:
   ```bash
   wrangler d1 create ngfw-db
   ```
   Update `database_id` in `wrangler.jsonc`.

2. Create KV namespaces:
   ```bash
   wrangler kv:namespace create DEVICES
   wrangler kv:namespace create CONFIGS
   wrangler kv:namespace create SESSIONS
   wrangler kv:namespace create CACHE
   ```
   Update the KV IDs in `wrangler.jsonc`.

3. Create R2 buckets:
   ```bash
   wrangler r2 bucket create ngfw-firmware
   wrangler r2 bucket create ngfw-backups
   wrangler r2 bucket create ngfw-reports
   ```

### Deploy

```bash
# Apply migrations to remote database
bun run predeploy

# Deploy to Cloudflare Workers
bun run deploy
```

This deploys to `specs.ngfw.sh`.

## Project Structure

```
packages/schema/
├── src/
│   ├── endpoints/       # API endpoint handlers
│   │   └── tasks/       # Example CRUD endpoints
│   ├── index.ts         # Main router and OpenAPI config
│   └── types.ts         # Shared TypeScript types
├── migrations/          # D1 database migrations
├── tests/               # Integration tests
├── openapi.yaml         # Static OpenAPI spec (reference)
└── wrangler.jsonc       # Cloudflare Workers config
```

## API Endpoints

The API serves interactive documentation at:

| Path | Description |
|------|-------------|
| `/` | Swagger UI |
| `/redoc` | ReDoc documentation |
| `/openapi.json` | OpenAPI schema |

### Example Endpoints (from template)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List all tasks |
| POST | `/tasks` | Create a task |
| GET | `/tasks/:id` | Get a task |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |

## Creating New Endpoints

### Basic Endpoint

```typescript
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export class MyEndpoint extends OpenAPIRoute {
  schema = {
    tags: ['MyTag'],
    summary: 'My endpoint',
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({
              result: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c) {
    const { id } = c.req.param();
    return c.json({ result: id });
  }
}
```

### Register in Router

```typescript
// src/index.ts
openapi.get('/my-endpoint/:id', MyEndpoint);
```

## Configuration

### Wrangler Config (`wrangler.jsonc`)

- Worker name: `ngfw-specs`
- Custom domain: `specs.ngfw.sh`
- D1 database: `ngfw-db`
- KV namespaces: DEVICES, CONFIGS, SESSIONS, CACHE
- R2 buckets: FIRMWARE, BACKUPS, REPORTS

### Environment Variables

Set in `wrangler.jsonc` or Cloudflare dashboard:

| Variable | Description |
|----------|-------------|
| `WORKOS_CLIENT_ID` | WorkOS AuthKit client ID |
| `WORKOS_API_KEY` | WorkOS API key (secret) |

## Testing

```bash
# Run all tests
bun run test

# Run specific test file
bun run test tests/integration/tasks.test.ts

# Watch mode
bunx vitest --config tests/vitest.config.mts
```
