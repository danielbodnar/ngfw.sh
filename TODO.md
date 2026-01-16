# NGFW.sh - Project TODO

## Authentication Migration: WorkOS to Clerk.com

### Completed Tasks

- [x] **Discovery Phase**
  - [x] Analyzed current codebase architecture (React/Vite portal, Hono API)
  - [x] Identified existing WorkOS AuthKit integration
  - [x] Researched Clerk.com React and Backend SDK integration patterns

- [x] **Package Installation**
  - [x] Installed `@clerk/clerk-react@5.59.3` in portal
  - [x] Installed `@clerk/backend@2.29.2` in packages/schema

- [x] **Environment Configuration**
  - [x] Created `portal/.dev.vars` with `VITE_CLERK_PUBLISHABLE_KEY`
  - [x] Created `portal/.dev.vars.example` as template
  - [x] Created `packages/schema/.dev.vars` with Clerk secrets
  - [x] Created `packages/schema/.dev.vars.example` as template
  - [x] Updated `portal/wrangler.toml` with observability settings
  - [x] Updated `packages/schema/wrangler.jsonc` with observability settings

- [x] **Frontend Integration**
  - [x] Created `portal/src/vite-env.d.ts` for TypeScript env types
  - [x] Updated `portal/src/main.tsx` with ClerkProvider
  - [x] Updated `portal/src/App.tsx`:
    - [x] Added Clerk component imports (SignedIn, SignedOut, SignIn, UserButton, etc.)
    - [x] Replaced manual auth state with Clerk's SignedIn/SignedOut components
    - [x] Updated ProfilePage to use `useUser()` hook for real user data
    - [x] Added AuthPage wrapper with NGFW.sh branding
    - [x] Configured dark theme for Clerk components

### Pending Tasks

- [ ] **Backend Integration**
  - [ ] Create Clerk JWT verification middleware in packages/schema
  - [ ] Add middleware to protected API routes
  - [ ] Test JWT verification with Clerk's JWKS endpoint

- [ ] **Deployment**
  - [ ] Add CLERK_SECRET_KEY to Cloudflare Worker secrets:
    ```bash
    cd packages/schema
    bunx wrangler@latest secret put CLERK_SECRET_KEY
    ```
  - [ ] Deploy portal: `cd portal && bun run deploy`
  - [ ] Deploy API: `cd packages/schema && bun run deploy`
  - [ ] Verify deployment with worker logs

- [ ] **Testing**
  - [ ] Test sign-in flow with email/password
  - [ ] Test sign-up flow with email/password
  - [ ] Test sign-out flow
  - [ ] Verify ProfilePage displays real Clerk user data
  - [ ] Test JWT verification on protected API endpoints

### Future Tasks (Post-MVP)

- [ ] **Migration to Astro + Vue**
  - [ ] Convert React SPA to Astro multi-page application
  - [ ] Replace React components with Vue 3 components
  - [ ] Implement Clerk with Astro's official integration

- [ ] **Enhanced Auth Features**
  - [ ] Enable Clerk Waitlist feature
  - [ ] Enable MFA/2FA settings
  - [ ] Enable Passkeys support
  - [ ] Implement User API Keys management
  - [ ] Configure B2C Billing integration

---

## Clerk Configuration Reference

### Clerk Instance Details

| Parameter | Value |
|-----------|-------|
| Instance Name | tough-unicorn-25 |
| Publishable Key | `pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk` |
| JWKS Endpoint | `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json` |
| Dashboard | https://dashboard.clerk.com |

### Enabled Features

- Email + Password authentication
- Phone number authentication
- Waitlist mode
- Multi-factor authentication (MFA)
- Clerk Sessions
- B2C Billing
- Passkeys
- User API Keys

### Environment Variables

**Portal (portal/.dev.vars):**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**API (packages/schema/.dev.vars):**
```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Files Modified

| File | Changes |
|------|---------|
| `portal/package.json` | Added @clerk/clerk-react |
| `packages/schema/package.json` | Added @clerk/backend |
| `portal/src/main.tsx` | ClerkProvider wrapper |
| `portal/src/App.tsx` | SignedIn/SignedOut, ProfilePage updates |
| `portal/src/vite-env.d.ts` | TypeScript env types |
| `portal/wrangler.toml` | Observability settings |
| `packages/schema/wrangler.jsonc` | Observability settings, Clerk comment |
| `portal/.dev.vars` | Clerk publishable key |
| `packages/schema/.dev.vars` | Clerk secret + publishable keys |

---

## Development Commands

```bash
# Install dependencies
bun install

# Start portal dev server
cd portal && bun run dev

# Start API dev server
cd packages/schema && bun run dev

# Deploy portal
cd portal && bun run deploy

# Deploy API
cd packages/schema && bun run deploy

# Add Clerk secret to production
cd packages/schema && bunx wrangler@latest secret put CLERK_SECRET_KEY
```
