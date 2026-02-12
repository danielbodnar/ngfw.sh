# NGFW.sh Development Guide

## Architecture

Cloud-managed next-generation firewall with edge-hosted management and on-premises router agents.

```
packages/portal-astro/ → Astro + Vue 3 portal (beta.ngfw.sh) - PRIMARY UI
packages/portal/       → React portal (app.ngfw.sh) - LEGACY
packages/www/          → Marketing site (ngfw.sh)
packages/api/          → Rust API (api.ngfw.sh) - REST + WebSocket + OpenAPI
packages/schema/       → TypeScript API (specs.ngfw.sh) - DEPRECATED
packages/agent/        → Rust router agent daemon
packages/protocol/     → Shared Rust types with utoipa OpenAPI generation
docs/                  → Starlight docs (docs.ngfw.sh)
scripts/               → Nushell automation
```

**Key architectural decisions:**
- All cloud services deploy to Cloudflare Workers (Rust WASM for API, TypeScript for frontends)
- Single Rust API serves REST endpoints, WebSocket RPC, and OpenAPI spec:
  - REST: `/v1/fleet/*`, `/v1/network/*`, etc.
  - WebSocket: `/agent/ws` via Durable Objects
  - OpenAPI: `/openapi.json` (generated via utoipa)
- Router agents connect via WebSocket to manage nftables, dnsmasq, hostapd, WireGuard

> **⚠️ Migration:** New UI work goes in `packages/portal-astro/` (Astro + Vue 3), not `packages/portal/` (React)

## Package Manager & Tools

**Always use Bun** — never npm, yarn, or Node directly. Tool versions managed via `mise` (.tool-versions).

```bash
bun run <script>   # Run package.json scripts
bunx <tool>        # One-off tool execution
```

## API Development (packages/schema/)

**Stack:** Hono + Chanfana (auto-generates OpenAPI 3.1) + D1 SQLite + Zod validation

**Key patterns:**

```typescript
// Schema definition with Zod
export const task = z.object({
  id: z.number().int(),
  name: z.string(),
});

// Router with Chanfana
export const tasksRouter = fromHono(new Hono());
tasksRouter.get("/", TaskList);
tasksRouter.post("/", TaskCreate);

// Error responses (standardized)
{ success: false, errors: [{ code: number, message: string }] }

// Testing with Cloudflare's SELF helper
import { SELF } from "cloudflare:test";
const response = await SELF.fetch(`http://local.test/tasks`);
```

**D1 Migrations:** Located in `packages/schema/migrations/`, applied with `bun run db:migrate:local` or `db:migrate:remote`.

## Portal Development

### Primary Portal (packages/portal-astro/)

**Stack:** Astro 5 + Vue 3 + Tailwind CSS 4 + Playwright

**Conventions:**
- Astro pages (`.astro`) for routing and static content
- Vue 3 components (`.vue`) for interactivity — use Composition API (`ref`, `computed`, `watch`)
- Utility `cn()` for conditional classes: `cn('base', condition && 'extra')`
- Icons from `lucide-vue-next`
- E2E tests with Playwright: `bun run --cwd packages/portal-astro test:e2e`

### Legacy Portal (packages/portal/)

React 19 with functional components. **Only touch for bug fixes** — new work goes to `portal-astro/`.

### Authentication (Clerk.com)

Instance: `tough-unicorn-25`  
Publishable key: `pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk`  
JWKS: `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json`  
Features: email/password, phone, MFA, passkeys

## Commands

Run from repository root:

| Command | Purpose |
|---------|---------|
| `bun run setup` | Install all workspace dependencies |
| **Development Servers** |
| `bun run dev:portal` | Portal UI @ localhost:5173 |
| `bun run dev:schema` | Schema API @ localhost:8787 |
| `bun run dev:api` | Rust API @ localhost:8788 |
| `bun run dev:www` | Marketing site |
| `bun run dev:docs` | Documentation site |
| **Testing** |
| `bun test` | Run schema integration tests |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run --cwd packages/schema test` | Schema-specific tests |
| `bun run --cwd packages/portal-astro test:e2e` | Portal E2E tests |
| `cargo test -p ngfw-agent` | Rust agent tests |
| `cargo test -p ngfw-agent test_name` | Run specific Rust test |
| **Quality** |
| `bun run lint` | oxlint (auto-fix with `--fix`) |
| `bun run format` | oxfmt |
| `bunx @biomejs/biome check --write .` | Biome format + lint |
| `cargo clippy --all-targets --all-features` | Rust linting |
| `cargo fmt` | Rust formatting |
| **Database** |
| `bun run db:migrate:local` | Apply D1 migrations locally |
| `bun run db:migrate:remote` | Apply D1 migrations to production |
| **Deployment** |
| `bun run deploy` | Deploy www, portal, schema, docs |
| `bun run deploy:all` | Deploy all (includes Rust API) |

## Rust Development

### Workspace Structure

Cargo workspace with three crates:
- `packages/protocol/` — Shared types with `utoipa` OpenAPI schemas
- `packages/agent/` — Router agent daemon (Tokio async runtime)
- `packages/api/` — Workers-rs WASM API

**Features in protocol:**
- `js` — enables uuid/v4 + uuid/js for WASM
- `native` — enables uuid/v4 for native builds

### Testing

```bash
cargo test --all-targets --all-features    # All tests
cargo test -p ngfw-agent                    # Specific package
cargo test -- --nocapture                   # Show stdout
cargo test test_function_name               # Single test
```

### Code Quality

```bash
cargo clippy --all-targets --all-features -- -D warnings  # Strict linting
cargo fmt                                                  # Format code
```

## REST API Conventions

Standard CRUD patterns:
- `GET /api/{resource}` — List with pagination
- `POST /api/{resource}` — Create
- `GET /api/{resource}/:id` — Read single
- `PUT /api/{resource}/:id` — Update
- `DELETE /api/{resource}/:id` — Delete

## Code Style & Conventions

**TypeScript:**
- Strict mode with `noUncheckedIndexedAccess: true`
- No unjustified `any` — use Zod at boundaries
- PascalCase: types/components, camelCase: functions/variables, kebab-case: files
- Imports: framework first, external libs, then local

**Rust:**
- Clippy with `-D warnings`, rustfmt
- Functional patterns preferred

**Nushell (scripts/):**
- No Bash-isms (`&&`, `||`) — use Nushell pipes and structured data
- Environment variables: `$env.VAR` not `$VAR`
- Prefer pipelines over loops

**General:**
- Functional programming over OOP
- Composition over inheritance
- Minimal abstractions — no premature optimization

## Development Workflows

### Before Committing

1. **Lint** changed files:
   - TypeScript/JS: `bunx oxlint --fix .` or `bunx @biomejs/biome check --write .`
   - Rust: `cargo clippy --all-targets --all-features -- -D warnings`
   - Nushell: `nu --ide-check script.nu`

2. **Type check** if TypeScript changed: `bun run tsc --noEmit`

3. **Run tests** for affected packages:
   - Schema: `bun run --cwd packages/schema test`
   - Portal: `bun run --cwd packages/portal-astro test:e2e`
   - Agent: `cargo test -p ngfw-agent`

4. **Format**: `bun run format` (oxfmt) or `cargo fmt`

### Code Review Checklist

**TypeScript/JavaScript:**
- [ ] Strict mode compliance, no unjustified `any`
- [ ] Zod validation at API boundaries
- [ ] Proper error handling with structured responses
- [ ] No security issues (XSS, injection, exposed secrets)

**Rust:**
- [ ] All Clippy warnings resolved
- [ ] Proper error propagation with `?`
- [ ] No `unwrap()` in production code paths
- [ ] Documentation for public APIs

**Architecture:**
- [ ] Functional patterns (composition over inheritance)
- [ ] Minimal abstractions
- [ ] Clear separation of concerns
- [ ] Proper async/await usage

### Conventional Commits

Format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

Breaking changes: Add `!` or include `BREAKING CHANGE:` in footer

Tool: `lumen draft | git commit -F -`

### Security Audits

```bash
bun audit          # JavaScript/TypeScript
cargo audit        # Rust (requires cargo-audit)
```
