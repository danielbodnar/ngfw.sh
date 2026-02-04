# NGFW.sh MVP Launch — Implementation Tracker

> **Goal:** User can sign up, register a device, deploy the agent, and see live metrics in the portal.

---

## Completed

- [x] **A1:** Fix WebSocket URL default (`/ws` -> `/agent/ws`) in agent config
- [x] **A2:** Implement DurableObjectWebSocket trait for AgentConnection

---

## Stream A: Rust API (packages/api)

- [ ] **A3:** Implement JWT signature verification with Clerk JWKS
  - Add `verify_jwt()` with JWKS fetch + CACHE KV (1h TTL)
  - Update `authenticate()` to use verification, dev fallback
  - File: `packages/api/src/middleware/auth.rs`

- [ ] **A4:** Fix AgentConnection auth to verify API key against KV
  - Look up `apikey:{api_key}` in DEVICES KV, verify device_id match
  - File: `packages/api/src/rpc/agent_connection.rs`

- [ ] **A5:** Add latest metrics retrieval endpoint
  - `GET /api/metrics/latest?device_id=xxx` reads from CACHE KV
  - Files: `packages/api/src/handlers/system.rs`, `packages/api/src/handlers/router.rs`

- [ ] **A6:** Fix CORS to allow portal origins
  - Allow: `app.ngfw.sh`, `ngfw.sh`, `localhost:5173`, `localhost:4321`
  - File: `packages/api/src/middleware/cors.rs`

- [ ] **A7:** Fix fleet handler plan limits to match billing tiers
  - Current: `free/home/homeplus` — D1 has: `Starter/Pro/Business/Business Plus`
  - File: `packages/api/src/handlers/fleet.rs`

- [ ] **A8:** Full WASM build verification (`worker-build --release`)

---

## Stream B: Schema API (packages/schema)

- [ ] **B1:** Create D1 migration for devices table
  - File: `packages/schema/migrations/0005_add_devices_table.sql`

- [ ] **B2:** Implement Clerk JWT middleware for Schema API
  - Use `@clerk/backend` `verifyToken()`
  - Files: `packages/schema/src/middleware/auth.ts`, `packages/schema/src/index.ts`

- [ ] **B3:** Add fleet device CRUD endpoints
  - `GET /fleet/devices`, `POST /fleet/devices`, `DELETE /fleet/devices/:id`, `GET /fleet/devices/:id/status`
  - D1 + KV dual-write (device:{id}, apikey:{key}, owner:{userId}:{id})
  - Files: `packages/schema/src/endpoints/fleet/`

- [ ] **B4:** Add device status proxy endpoint
  - Read from CONFIGS KV + DEVICES KV, merge device info + connection status
  - File: `packages/schema/src/endpoints/fleet/deviceStatus.ts`

- [ ] **B5:** Verify billing endpoints match tier definitions

- [ ] **B6:** Build and test Schema API (`bun run build:schema && bun run test:schema`)

---

## Stream C: Agent (packages/agent)

- [ ] **C1:** Wire real metrics into initial STATUS message
  - Replace hardcoded zeros in `connection.rs:141-156`

- [ ] **C2:** Read firmware version from NVRAM
  - Replace `"unknown"` with NVRAM read, fall back to CARGO_PKG_VERSION

- [ ] **C3:** Add connection state structured logging
  - Add `device_id` and `attempt` fields to tracing spans

- [ ] **C4:** Fix uptime reading in StatusPayload
  - Parse `/proc/uptime` first field

- [ ] **C5:** Agent build verification (`cargo build -p ngfw-agent --release && cargo clippy --workspace`)

---

## Stream D: Portal (packages/portal)

- [ ] **D1:** Create typed API client module (`packages/portal/src/api.ts`)
- [ ] **D2:** Add device management React hooks (`packages/portal/src/hooks/useDevices.ts`)
- [ ] **D3:** Replace dashboard mock data with real API calls
- [ ] **D4:** Build device registration flow (form + API key display + install instructions)
- [ ] **D5:** Build device list with online/offline status badges
- [ ] **D6:** Connect live metrics to dashboard (5s polling)
- [ ] **D7:** Add loading states and error handling

---

## Stream E: Deploy (depends on all above)

- [ ] **E1:** Set Clerk secrets on Cloudflare
- [ ] **E2:** Run D1 migrations on production
- [ ] **E3:** Deploy Schema API
- [ ] **E4:** Deploy Rust API
- [ ] **E5:** Deploy Portal
- [ ] **E6:** End-to-end smoke test

---

## Verification Checklist

- [ ] `cargo test --workspace` — all tests pass
- [ ] `cargo clippy --workspace` — zero warnings
- [ ] `bun run test:schema` — schema tests pass
- [ ] `bun run build` — all packages build
- [ ] E2E smoke test passes

---

## NOT in MVP (Deferred)

- Shadow/Takeover mode adapter implementations
- Config push/apply flow
- Self-upgrade mechanism
- Cross-compilation to aarch64
- 50+ AGENTS.md endpoints (firewall, VPN, QoS, DNS, IDS, etc.)
- CI/CD auto-deploy pipeline
- Rate limiting middleware
- WebSocket streaming endpoints
