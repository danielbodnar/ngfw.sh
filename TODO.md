# NGFW.sh MVP Launch — Implementation Tracker

> **Goal:** User can sign up, register a device, deploy the agent, and see live metrics in the portal.

---

## Completed

- [x] **A1:** Fix WebSocket URL default (`/ws` -> `/agent/ws`) in agent config
- [x] **A2:** Implement DurableObjectWebSocket trait for AgentConnection
- [x] **A4:** Fix AgentConnection auth to verify API key against KV
- [x] **A5:** Add latest metrics retrieval endpoint
- [x] **A6:** Fix CORS to allow portal origins (both Rust API and Schema API)
- [x] **A7:** Fix fleet handler plan limits to match billing tiers
- [x] **B1:** Create D1 migration for devices table
- [x] **B2:** Implement Clerk JWT middleware for Schema API
- [x] **B3:** Add fleet device CRUD endpoints (with api_key security fix)
- [x] **B4:** Add device status proxy endpoint
- [x] **B5:** Verify billing endpoints match tier definitions
- [x] **C1:** Wire real metrics into initial STATUS message
- [x] **C2:** Read firmware version from NVRAM
- [x] **C3:** Add connection state structured logging
- [x] **C4:** Fix uptime reading in StatusPayload
- [x] **C5:** Agent build verification (120 tests pass, 0 clippy warnings)
- [x] **D1:** Create typed API client module (`packages/portal/src/api.ts`)
- [x] **D2:** Add device management React hooks (`packages/portal/src/hooks/useDevices.ts`)
- [x] **D3:** Replace dashboard mock data with real API calls
- [x] **D4:** Build device registration flow (form + API key display + install instructions)
- [x] **D5:** Build device list with online/offline status badges
- [x] **D6:** Connect live metrics to dashboard (5s polling)
- [x] **D7:** Add loading states and error handling
- [x] **Code review:** Fixed API path mismatch, api_key leak, CORS gap, response shape mismatches

---

## In Progress

- [ ] **A3:** Implement JWT signature verification with Clerk JWKS
  - Requires custom CryptoProvider for WASM (neither aws_lc_rs nor ring compile to wasm32)
  - Researching jsonwebtoken v10 CryptoProvider + RustCrypto / Web Crypto API approach
  - File: `packages/api/src/middleware/auth.rs`

---

## Remaining

- [ ] **A8:** Full WASM build verification (`worker-build --release`) — depends on A3
- [ ] **B6:** Build and test Schema API — blocked by vitest v4 + @cloudflare/vitest-pool-workers incompatibility

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

- [x] `cargo test --workspace` — 120 tests pass
- [x] `cargo clippy --workspace` — zero warnings
- [ ] `bun run test:schema` — blocked by vitest v4 pool-workers runner issue
- [x] `bun run build:portal` — builds clean (378 kB JS, 27.6 kB CSS)
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
