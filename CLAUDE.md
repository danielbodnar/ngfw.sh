# CLAUDE.md - NGFW.sh Project Instructions

This file provides guidance to Claude Code when working with the NGFW.sh repository.

## Project Overview

NGFW.sh is a cloud-managed next-generation firewall and router administration platform. It replaces embedded router web interfaces with an edge-hosted management console running on Cloudflare Workers.

## Architecture

```
ngfw.sh/
├── portal/              # React web dashboard (ngfw.sh)
│   ├── src/App.tsx      # Main application component
│   ├── wrangler.toml    # Cloudflare Workers deployment config
│   └── .dev.vars        # Local environment variables (not committed)
├── packages/
│   └── schema/          # API server with OpenAPI spec (specs.ngfw.sh)
│       ├── src/index.ts # Hono API entry point
│       ├── wrangler.jsonc # Cloudflare Workers config
│       └── .dev.vars    # Local secrets (not committed)
├── docs/                # Astro Starlight documentation (docs.ngfw.sh)
├── AGENTS.md            # API specification and schema reference
└── TODO.md              # Current project tasks and roadmap
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Web Portal | React 19, Vite 7, Tailwind CSS 4 |
| API Server | Hono, Chanfana (OpenAPI), Cloudflare Workers |
| Documentation | Astro 5, Starlight |
| Authentication | **Clerk.com** (migrated from WorkOS AuthKit) |
| Database | Cloudflare D1 (SQLite) |
| Key-Value Store | Cloudflare KV |
| Object Storage | Cloudflare R2 |

## Authentication (Clerk.com)

### Frontend (portal/)

Uses `@clerk/clerk-react` with these components:
- `ClerkProvider` - Wraps the app in main.tsx
- `SignedIn` / `SignedOut` - Conditional rendering based on auth state
- `SignIn` - Pre-built sign-in component with dark theme
- `UserButton` - User avatar with dropdown menu
- `useUser()` - Hook for accessing user data

### Backend (packages/schema/)

Uses `@clerk/backend` for JWT verification:
- Verify JWTs using Clerk's JWKS endpoint
- Extract user claims from verified tokens
- Protect API routes with auth middleware

### Environment Variables

**Portal (.dev.vars):**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**API (.dev.vars):**
```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Clerk Instance

| Property | Value |
|----------|-------|
| Instance | tough-unicorn-25 |
| JWKS Endpoint | `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json` |

## Development Workflow

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- Cloudflare account

### Common Commands

```bash
# Install dependencies
bun install

# Start portal dev server
cd portal && bun run dev

# Start API dev server
cd packages/schema && bun run dev

# Deploy portal to ngfw.sh
cd portal && bun run deploy

# Deploy API to specs.ngfw.sh
cd packages/schema && bun run deploy

# Add secrets for production
bunx wrangler@latest secret put CLERK_SECRET_KEY
```

### Git Workflow

```bash
git checkout main && git fetch --all && git rebase origin/main
git checkout -b feature/my-feature
# make changes
git add .
lumen draft | git commit -F -
git push
gh pr create --title "feat: my feature" --body "Description" --base main
```

## Important Files

### Portal (portal/)

- `src/main.tsx` - App entry with ClerkProvider
- `src/App.tsx` - Main component with auth flow, all pages
- `src/vite-env.d.ts` - TypeScript env type definitions
- `wrangler.toml` - Cloudflare Workers deployment config
- `.dev.vars` - Local Clerk publishable key

### API (packages/schema/)

- `src/index.ts` - Hono API with OpenAPI
- `wrangler.jsonc` - Workers config with D1, KV, R2 bindings
- `.dev.vars` - Local Clerk secrets

## Code Standards

- **TypeScript**: Strict mode, ES2024/ESNext features
- **Styling**: Tailwind CSS 4 with zinc color palette
- **Components**: Functional components with hooks
- **State**: React useState/useEffect (no Redux)
- **API**: RESTful endpoints with OpenAPI spec via Chanfana

## Current Status

See [TODO.md](./TODO.md) for current tasks and project roadmap.

### Active Work: Authentication Migration

- Frontend Clerk integration: **Complete**
- Backend JWT middleware: **Pending**
- Production deployment: **Pending**

### Future Work

- Migration from React SPA to Astro + Vue
- Enable additional Clerk features (MFA, Passkeys, Waitlist)
