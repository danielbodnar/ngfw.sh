# Code Review Report

**Reviewer:** code-reviewer agent
**Date:** 2026-02-06
**Scope:** All new files from backend API agents and frontend Astro+Vue agents

---

## Summary

Reviewed 60+ new files across `packages/schema/src/endpoints/` (8 endpoint groups) and `packages/portal-astro/` (Astro config, 6 Vue components). The code is generally well-structured and follows the established fleet/billing patterns. However, several high-severity issues were found that will cause runtime failures or break the OpenAPI spec.

---

## Critical Issues (Severity: HIGH)

### 1. index.ts -- Most new routers are NOT registered

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/index.ts`
**Lines:** 89-96

Only the `routingRouter` was added to `index.ts`. The following routers exist but are not imported or registered:

- `natRouter` from `./endpoints/nat/router`
- `ipsRouter` from `./endpoints/ips/router`
- `vpnServerRouter` from `./endpoints/vpn-server/router`
- `vpnClientRouter` from `./endpoints/vpn-client/router`
- `qosRouter` from `./endpoints/qos/router`
- `ddnsRouter` from `./endpoints/ddns/router`
- `reportsRouter` from `./endpoints/reports/router`
- `logsRouter` from `./endpoints/logs/router`

**Impact:** All these endpoints are unreachable. The API will return 404 for /nat, /ips, /vpn/server, /vpn/client, /qos, /ddns, /reports, and /logs.

**Fix:** Add imports and `openapi.route()` calls for all routers.

---

### 2. QoS and DDNS routers are missing auth middleware

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/qos/router.ts`
**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/ddns/router.ts`
**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/reports/router.ts`
**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/logs/router.ts`

These routers use `fromHono(new Hono())` without applying `clerkAuth` middleware, unlike the fleet, routing, NAT, IPS, VPN server, and VPN client routers which all correctly apply `app.use("*", clerkAuth)`.

**Impact:** These endpoints will be accessible without authentication, exposing QoS config, DDNS credentials (including passwords), reports, and logs to unauthenticated users.

**Fix:** Add `clerkAuth` middleware to all four routers, matching the pattern used by fleet/routing/nat/ips/vpn routers.

---

### 3. DDNS configUpdate has a boolean precedence bug

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/ddns/configUpdate.ts`
**Line:** 119

```typescript
updates.enabled ?? false ? 1 : 0,
```

Due to operator precedence, this evaluates as `updates.enabled ?? (false ? 1 : 0)`, which means it evaluates to `updates.enabled ?? 0`. When `updates.enabled` is `true`, it stores `true` (not `1`) in D1, and when it is `false`, it stores `false` (not `0`). This breaks D1 SQLite boolean storage conventions.

**Impact:** The `enabled` field will store the wrong value in the database when creating new DDNS configs.

**Fix:** Change to `(updates.enabled ?? false) ? 1 : 0`.

---

### 4. Routing timestamps use milliseconds, NAT/QoS/IPS use seconds -- inconsistent

**Files:**
- `routing/routeList.ts` lines 42-43: `Date.now() - 86400000` (milliseconds)
- `routing/routeCreate.ts` line 38: `Date.now()` (milliseconds)
- `nat/natRuleList.ts` line 53: `Math.floor(Date.now() / 1000)` (seconds)
- `qos/configUpdate.ts` line 80: `Math.floor(Date.now() / 1000)` (seconds)
- `ips/configUpdate.ts` line 59: `Date.now()` (milliseconds)
- `vpn-server/peerList.ts` line 38: `Date.now() - 86400000` (milliseconds)

The `created_at`/`updated_at` fields use two different time formats. The Zod schemas define these as `z.number().int()` without documenting the expected unit. The fleet base schema uses epoch seconds (`z.number().int()`) and the existing D1 queries in fleet endpoints use seconds.

**Impact:** Timestamps will be inconsistent across endpoints, causing display issues and sorting problems in the frontend.

**Fix:** Standardize on epoch seconds (`Math.floor(Date.now() / 1000)`) across all endpoints, matching the NAT/QoS convention and D1 integer storage.

---

### 5. IPS configUpdate stores `last_update` as milliseconds

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/ips/configUpdate.ts`
**Line:** 59

```typescript
last_update: Date.now(),
```

The `ipsConfig` schema defines `last_update` as `z.number().int()`, and `configRead.ts` returns `null` as the default. But `configUpdate` stores `Date.now()` (milliseconds), while `update_interval` is defined in seconds (min: 3600, max: 604800). Mixing milliseconds and seconds within the same config object will cause logic errors when comparing `last_update + update_interval` to determine if an update is due.

**Impact:** Any logic that checks whether an IPS update is overdue will be off by a factor of 1000.

**Fix:** Change to `Math.floor(Date.now() / 1000)`.

---

### 6. Routing base.ts -- `staticRouteUpdate` uses `.partial().omit()` which may break with Zod 4

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/routing/base.ts`
**Line:** 56

```typescript
export const staticRouteUpdate = staticRoute.partial().omit({ id: true, created_at: true, updated_at: true });
```

Based on the recent commit `9896f86 fix(schema): remove tasks template router breaking OpenAPI spec with Zod 4`, the project is using Zod 4. In Zod 4, chaining `.partial().omit()` can produce unexpected types. The `omit()` removes keys from the partial, but since all fields are already optional from `.partial()`, the omitted fields are also already optional -- meaning `.omit()` on a partial has no effect on required fields (they were already optional). This is technically correct behavior but could be confusing. More importantly, the fields being omitted (`id`, `created_at`, `updated_at`) should never be sent by the client, yet after `.partial()` they become optional rather than excluded.

The correct order should be `.omit()` first, then `.partial()`:

```typescript
export const staticRouteUpdate = staticRoute.omit({ id: true, created_at: true, updated_at: true }).partial();
```

**Impact:** Currently the omitted fields can still be sent by the client (they are just optional, not excluded).

**Fix:** Reverse the chain to `.omit({ ... }).partial()`.

---

## Medium Issues (Severity: MEDIUM)

### 7. ReportList passes LIMIT/OFFSET as strings to D1

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/reports/reportList.ts`
**Lines:** 57

```typescript
params.push(String(limit), String(offset));
```

The `limit` and `offset` are converted to strings and pushed into a `string[]` params array, but D1's `bind()` should receive numbers for LIMIT/OFFSET SQL clauses. While D1 may coerce strings to numbers, this is fragile and inconsistent with how other endpoints handle numeric parameters.

### 8. IPS tag mismatch

**File:** All IPS endpoint files use `tags: ["IPS"]`
**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/index.ts` line 75

The OpenAPI tags in `index.ts` define `"IDS"` ("Intrusion detection and prevention") but the IPS endpoints use `"IPS"`. This means the IPS endpoints will create an undocumented tag and will not appear under the documented "IDS" tag in the OpenAPI UI.

### 9. VPN Server config update accepts `private_key` but response omits it

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/vpn-server/base.ts`
**Line:** 43

`vpnServerConfigUpdate` is `vpnServerConfig.partial()` which includes `private_key`. The update endpoint accepts it, processes it (line 42: `body.body.public_key`), but the response uses `vpnServerConfigPublic` which omits `private_key`. This is actually correct security behavior, but the mock implementation on line 42 uses `public_key` from the request body when the user might only send `private_key`, silently ignoring it.

### 10. Frontend package.json uses beta versions of Tailwind CSS 4

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/package.json`

The `@tailwindcss/vite` and `tailwindcss` packages are pinned to `^4.0.0-beta.6`. Tailwind CSS 4 has been stable since early 2025. These should be updated to the stable release.

### 11. DDNS configRead returns password in plaintext

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/ddns/configRead.ts`
**Line:** 57-58

The query selects all fields including `password`. The DDNS `ddnsConfig` schema includes `password: z.string().nullable()`. This means the raw password is returned to the frontend in API responses, which is a security concern.

---

## Low Issues (Severity: LOW)

### 12. Routing routeList unused `userId` variable

**Files:** Multiple endpoint handlers fetch `userId` via `c.get("userId")` but never use it (routing/routeList, routing/routeDelete, etc.). These should either use it for authorization or remove the line.

### 13. Vue components use `Math.random()` for ID generation

**Files:** Input.vue, Select.vue, Toggle.vue

Using `Math.random().toString(36).slice(2, 9)` for generating DOM element IDs is acceptable for client-side only, but these IDs should be deterministic in SSR contexts (Astro renders server-side). This could cause hydration mismatches.

### 14. Astro config references `_app` entrypoint that does not exist

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/astro.config.mjs`
**Line:** 18

```javascript
vue({ appEntrypoint: '/src/pages/_app' })
```

There is no `_app.ts` or `_app.vue` file in `packages/portal-astro/src/pages/`. This will cause an error during Astro build.

---

## Files That Need Fixes

| File | Issue # | Severity |
|------|---------|----------|
| `packages/schema/src/index.ts` | 1 | HIGH |
| `packages/schema/src/endpoints/qos/router.ts` | 2 | HIGH |
| `packages/schema/src/endpoints/ddns/router.ts` | 2 | HIGH |
| `packages/schema/src/endpoints/reports/router.ts` | 2 | HIGH |
| `packages/schema/src/endpoints/logs/router.ts` | 2 | HIGH |
| `packages/schema/src/endpoints/ddns/configUpdate.ts` | 3 | HIGH |
| `packages/schema/src/endpoints/routing/base.ts` | 6 | HIGH |
| `packages/schema/src/endpoints/ips/configUpdate.ts` | 5 | HIGH |
| `packages/schema/src/endpoints/reports/reportList.ts` | 7 | MEDIUM |
| All IPS endpoint files | 8 | MEDIUM |
| `packages/portal-astro/package.json` | 10 | MEDIUM |
| `packages/schema/src/endpoints/ddns/configRead.ts` | 11 | MEDIUM |
| `packages/portal-astro/astro.config.mjs` | 14 | LOW |

---

## Positive Observations

- Zod schemas are well-structured with proper descriptions, reasonable constraints, and sensible defaults.
- The NAT, IPS, DDNS, and report endpoints demonstrate solid domain knowledge with realistic mock data.
- The VPN client endpoints use Chanfana's D1 endpoint base classes correctly (D1ListEndpoint, D1CreateEndpoint, etc.), keeping the code DRY.
- Vue components follow Composition API with `<script setup lang="ts">`, proper type definitions, and v-model support.
- Auth middleware pattern is clean and well-documented.
- The IPS category system with KV-backed user customization is a thoughtful design.
- All routers follow a consistent pattern and use proper Chanfana `fromHono()` wrappers.
