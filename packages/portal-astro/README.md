# NGFW.sh Portal (Astro + Vue)

Cloud-managed next-generation firewall portal built with Astro 5 and Vue 3.

## Features

- **Astro 5** - Server-side rendering and static site generation
- **Vue 3** - Component-based UI with Composition API
- **Tailwind CSS 4** - Modern utility-first CSS framework with dark theme
- **Clerk** - Authentication and user management
- **Cloudflare Pages** - Edge deployment with Workers integration
- **TypeScript** - Type-safe development

## Prerequisites

- Bun 1.2.23+
- Node.js 20+ (for compatibility)

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set your Clerk publishable key in `.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

4. Start development server:

```bash
bun run dev
```

The portal will be available at `http://localhost:4321`

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, Header)
│   └── ui/              # Reusable UI components (Button, Card, etc.)
├── composables/         # Vue composables (useApi, useAuth, etc.)
├── layouts/             # Astro layouts (Base, Portal, Auth)
├── middleware/          # Astro middleware (auth)
├── pages/               # Astro pages (routes)
├── styles/              # Global styles
└── env.d.ts            # TypeScript environment declarations
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run deploy` - Deploy to Cloudflare Pages

## Authentication

Authentication is handled by Clerk. The middleware in `src/middleware/index.ts` protects routes and provides user context to all pages via `Astro.locals.user`.

Public routes (no auth required):
- `/`
- `/sign-in`
- `/sign-up`

All other routes require authentication.

## Deployment

Deploy to Cloudflare Pages:

```bash
bun run build
bun run deploy
```

Make sure to configure the following in Cloudflare dashboard:
- D1 database binding: `DB`
- KV namespaces: `DEVICES`, `CONFIGS`, `SESSIONS`, `CACHE`
- R2 buckets: `FIRMWARE`, `BACKUPS`, `REPORTS`
- Environment variables: `VITE_CLERK_PUBLISHABLE_KEY`

## Development Notes

- The portal uses server-side rendering (SSR) mode with Cloudflare adapter
- Dark theme is enabled by default with zinc color palette
- All pages use the PortalLayout which includes Sidebar and Header
- Vue components are integrated via the `@astrojs/vue` integration
- Middleware runs on every request to handle authentication

## TODO

- [ ] Integrate Clerk authentication (currently mocked)
- [ ] Create Vue component library
- [ ] Implement API composables
- [ ] Build network management pages
- [ ] Build security management pages
- [ ] Build services management pages
- [ ] Build monitoring pages
- [ ] Create onboarding flow
