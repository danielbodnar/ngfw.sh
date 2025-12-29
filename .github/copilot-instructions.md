# NGFW.sh Copilot Instructions

## Architecture Overview

NGFW.sh is a cloud-managed firewall platform with three main components:

```
portal/          → React SPA (Vite + Tailwind) - Management UI
packages/schema/ → Hono + Chanfana API (Cloudflare Workers + D1)
docs/            → Starlight (Astro) documentation site
```

All components deploy to Cloudflare Workers. The API uses WebSocket/HTTPS to communicate with on-premises router agents running nftables, dnsmasq, hostapd, and WireGuard.

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

WorkOS AuthKit integration with client ID `client_01KA05Y23RP9FKCAE0HS19D6RK`. Auth endpoints redirect to `https://api.workos.com/sso/authorize`.

## Commands Reference

| Location | Command | Purpose |
|----------|---------|---------|
| portal/ | `bun dev` | Start Vite dev server |
| portal/ | `bun run deploy` | Deploy to Cloudflare Workers |
| packages/schema/ | `bun dev` | Start API dev server |
| packages/schema/ | `bun test` | Run integration tests |
| packages/schema/ | `bun run schema` | Extract openapi.json |
| docs/ | `bun dev` | Start docs at localhost:4321 |

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
