# NGFW.sh Copilot Instructions

## Architecture Overview

NGFW.sh is a cloud-managed firewall platform with five deployable components:

```
packages/portal/ → React SPA (Vite + Tailwind) - Management UI (app.ngfw.sh)
packages/www/    → React marketing site (ngfw.sh)
packages/schema/ → Hono + Chanfana API (Cloudflare Workers + D1) (specs.ngfw.sh)
packages/api/    → Rust workers-rs API (WebSocket, Durable Objects) (api.ngfw.sh)
docs/            → Starlight (Astro) documentation site (docs.ngfw.sh)
```

All components deploy to Cloudflare Workers. The Rust API handles WebSocket connections from on-premises router agents running nftables, dnsmasq, hostapd, and WireGuard.

## Package Manager & Runtime

- **Use Bun exclusively** - All packages use `bun` for dependency management and scripts
- Root monorepo structure with independent package.json in each workspace

## API Development (packages/schema/)

### Stack: Hono + Chanfana + D1

Chanfana auto-generates OpenAPI 3.1 specs from code. Key patterns:

```typescript
// Define schema with Zod (see packages/schema/src/endpoints/tasks/base.ts)
export const task = z.object({
  id: z.number().int(),
  name: z.string(),
  // ...
});

// Router pattern (see packages/schema/src/endpoints/tasks/router.ts)
export const tasksRouter = fromHono(new Hono());
tasksRouter.get("/", TaskList);
tasksRouter.post("/", TaskCreate);
```

### Error Handling Convention

All API errors use structured `ApiException` responses:
```typescript
{ success: false, errors: [{ code: number, message: string }] }
```

### Database Migrations

D1 migrations live in `packages/schema/migrations/`. Apply with:
```bash
bunx wrangler d1 migrations apply DB --remote
```

### Testing

Integration tests use Vitest with Cloudflare's `SELF` fetch helper:
```typescript
import { SELF } from "cloudflare:test";
const response = await SELF.fetch(`http://local.test/tasks`);
```

Run tests: `bun test` in packages/schema/

## Portal Development (portal/)

### React Conventions

- **Functional components only** with hooks (`useState`, `useMemo`, `useEffect`)
- Utility function `cn()` for conditional Tailwind classes: `cn('base', condition && 'class')`
- Icons from `lucide-react`
- All mock data defined inline in [App.tsx](portal/src/App.tsx) - replace with API calls

### Component Patterns

Type definitions inline for simple props, separate interface for complex:
```typescript
interface NavItem { id: View; label: string; icon: React.ReactNode; }
```

### Authentication

Clerk.com integration with instance `tough-unicorn-25`. Publishable key: `pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk`. JWKS endpoint: `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json`. Supports email/password, phone authentication, MFA, and passkeys.

## Commands Reference

Run from the repository root:

| Command | Purpose |
|---------|---------|
| `bun run setup` | Install all dependencies |
| `bun run dev:portal` | Portal dev server (Vite) |
| `bun run dev:schema` | Schema API dev server (Wrangler) |
| `bun run dev:api` | Rust API dev server (Wrangler) |
| `bun run dev:www` | Marketing site dev server |
| `bun run dev:docs` | Docs dev server (Astro) |
| `bun run test` | Run schema integration tests |
| `bun run lint` | oxlint |
| `bun run format` | oxfmt |
| `bun run deploy` | Deploy www, portal, schema, docs |
| `bun run deploy:all` | Deploy all including Rust API |
| `bun run db:migrate:local` | Apply D1 migrations locally |
| `bun run db:migrate:remote` | Apply D1 migrations to production |

## API Contract Reference

The complete API specification is in [AGENTS.md](../AGENTS.md) at the root. Key endpoint patterns:

- `GET /api/{resource}` - List with pagination
- `POST /api/{resource}` - Create
- `GET /api/{resource}/:id` - Read single
- `PUT /api/{resource}/:id` - Update
- `DELETE /api/{resource}/:id` - Delete

## Code Style

- **Formatting**: oxfmt (Rust-based formatter)
- **Linting**: oxlint
- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`
- **Imports**: React first, external libs, then local
- **Naming**: PascalCase for components/types, camelCase for functions/variables
