# NGFW.sh Project Status

Unified project tracking for the NGFW.sh platform development.

---

## Table of Contents

1. [Current Sprint: MVP Launch](#1-current-sprint-mvp-launch)
2. [Portal Migration Roadmap](#2-portal-migration-roadmap)
3. [API Integration Status](#3-api-integration-status)
4. [Technical Debt Register](#4-technical-debt-register)
5. [Research & Decisions](#5-research--decisions)
6. [Agent Coordination Archive](#6-agent-coordination-archive)
7. [Session References](#7-session-references)
8. [Prioritized Backlog](#8-prioritized-backlog)

---

## 1. Current Sprint: MVP Launch

> **Goal:** User can sign up, register a device, deploy the agent, and see live metrics in the portal.

### Completed Tasks

#### Stream A: Rust API Foundation

- [x] **A1:** Fix WebSocket URL default (`/ws` → `/agent/ws`) in agent config
- [x] **A2:** Implement DurableObjectWebSocket trait for AgentConnection
- [x] **A4:** Fix AgentConnection auth to verify API key against KV
- [x] **A5:** Add latest metrics retrieval endpoint
- [x] **A6:** Fix CORS to allow portal origins (both Rust API and Schema API)
- [x] **A7:** Fix fleet handler plan limits to match billing tiers

#### Stream B: Schema API

- [x] **B1:** Create D1 migration for devices table
- [x] **B2:** Implement Clerk JWT middleware for Schema API
- [x] **B3:** Add fleet device CRUD endpoints (with api_key security fix)
- [x] **B4:** Add device status proxy endpoint
- [x] **B5:** Verify billing endpoints match tier definitions

#### Stream C: Router Agent

- [x] **C1:** Wire real metrics into initial STATUS message
- [x] **C2:** Read firmware version from NVRAM
- [x] **C3:** Add connection state structured logging
- [x] **C4:** Fix uptime reading in StatusPayload
- [x] **C5:** Agent build verification (120 tests pass, 0 clippy warnings)

#### Stream D: Portal Integration

- [x] **D1:** Create typed API client module (`packages/portal/src/api.ts`)
- [x] **D2:** Add device management React hooks (`packages/portal/src/hooks/useDevices.ts`)
- [x] **D3:** Replace dashboard mock data with real API calls
- [x] **D4:** Build device registration flow (form + API key display + install instructions)
- [x] **D5:** Build device list with online/offline status badges
- [x] **D6:** Connect live metrics to dashboard (5s polling)
- [x] **D7:** Add loading states and error handling
- [x] **Code review:** Fixed API path mismatch, api_key leak, CORS gap, response shape mismatches

#### Stream F: Integration Test Environment (RT-AX92U Simulation)

- [x] **F1:** Create mock binaries (nvram, wl, ip, iptables, service) and mock sysfs files
- [x] **F2:** Create mock API WebSocket server (Bun, speaks RPC protocol)
- [x] **F3:** Create agent test config and Docker entrypoint
- [x] **F4:** Create Dockerfile (multi-stage cross-compile) and compose.yaml
- [x] **F5:** Create Docker integration test runner (`run-docker.sh`)
- [x] **F6:** Create QEMU VM image builder (Alpine cloud image + cloud-init)
- [x] **F7:** Create QEMU VM launcher and test runner (`run-qemu.sh`)
- [x] **F8:** Add integration test scripts to root `package.json` and `.gitignore`

### In Progress

- [ ] **A3:** Implement JWT signature verification with Clerk JWKS
  - Requires custom CryptoProvider for WASM (neither aws_lc_rs nor ring compile to wasm32)
  - Researching jsonwebtoken v10 CryptoProvider + RustCrypto / Web Crypto API approach
  - File: `packages/api/src/middleware/auth.rs`

### Blocked

- [ ] **A8:** Full WASM build verification (`worker-build --release`) — depends on A3
- [ ] **B6:** Build and test Schema API — blocked by vitest v4 + @cloudflare/vitest-pool-workers incompatibility

### Stream E: Deployment (Ready to Execute)

- [ ] **E1:** Set Clerk secrets on Cloudflare
- [ ] **E2:** Run D1 migrations on production
- [ ] **E3:** Deploy Schema API
- [ ] **E4:** Deploy Rust API
- [ ] **E5:** Deploy Portal
- [ ] **E6:** End-to-end smoke test

### Verification Checklist

- [x] `cargo test --workspace` — 120 tests pass
- [x] `cargo clippy --workspace` — zero warnings
- [ ] `bun run test:schema` — blocked by vitest v4 pool-workers runner issue
- [x] `bun run build:portal` — builds clean (378 kB JS, 27.6 kB CSS)
- [ ] E2E smoke test passes

### Run Integration Tests

```bash
bun run test:integration:docker   # Docker approach (fast, CI-friendly)
bun run test:integration:qemu     # QEMU VM approach (full system emulation)
```

### Prerequisites

- Docker with BuildKit + `docker run --privileged multiarch/qemu-user-static` (binfmt)
- `qemu-system-aarch64` + `edk2-aarch64` (QEMU approach only)
- `cross` (`cargo install cross`) for aarch64 cross-compilation
- `mkisofs` or `genisoimage` (cloud-init ISO, QEMU approach only)

---

## 2. Portal Migration Roadmap

> **Migration:** React SPA (`packages/portal`) → Astro + Vue (`packages/portal-astro`)

### Current State

The Astro portal is **architecturally 95% complete**:
- 48 Vue components created
- 34 Astro pages created
- 16 composables created
- 50+ TypeScript types defined
- ApiClient with all methods implemented
- Clerk authentication working on beta.ngfw.sh

**Gap:** Pages display placeholder content instead of real API-driven data.

### Component Inventory

#### Vue Components (48 total)

| Category | Count | Components |
|----------|-------|------------|
| UI | 12 | Button, Card, Input, Select, Badge, Toggle, Table, Modal, Spinner, Stat, Gauge, MiniChart |
| Layout | 3 | Header, Sidebar, UserMenu |
| Network | 10 | DhcpConfig, DhcpLeases, LanConfig, RadioSettings, RoutingForm, RoutingTable, VlanTable, WanConfig, WanStatus, WiFiNetworkCard |
| Security | 5 | IPSAlertList, IPSConfig, IPSRuleList, NATRuleForm, NATRuleList |
| Services | 8 | DDNSConfig, QoSRuleForm, QoSRuleList, VPNClientForm, VPNClientList, VPNPeerForm, VPNPeerList, VPNServerConfig |
| Monitoring | 7 | DashboardGrid, DashboardViewer, LogFilter, LogViewer, ReportGenerator, ReportList |
| Onboarding | 6 | ConfigForm, OnboardingFlow, OnboardingWizard, OrderComplete, OrderSummary, RouterSelector |

#### Astro Pages (34 total)

| Section | Pages |
|---------|-------|
| Auth & Home | `/`, `/sign-in`, `/sign-up` |
| Dashboard | `/dashboard` |
| Network | `/network/wan`, `/network/lan`, `/network/wifi`, `/network/dhcp`, `/network/routing` |
| Security | `/security/firewall`, `/security/nat`, `/security/ips`, `/security/dns-filter`, `/security/traffic` |
| Services | `/services/vpn-server`, `/services/vpn-client`, `/services/qos`, `/services/ddns` |
| Monitoring | `/monitoring/reports`, `/monitoring/dashboards/*` (13 dashboard pages) |
| System | `/system/logs`, `/onboarding/*` |

#### Composables (16 total)

| Type | Composables |
|------|-------------|
| Core | useApi, useAuth, usePolling |
| Fleet | useDevices, useDeviceStatus, useRegisterDevice |
| Network | useRoutes |
| Security | useNAT, useIPS |
| Services | useVPNServer, useVPNClient, useQoS, useDDNS |
| Monitoring | useReports, useLogs, useDashboards |

### Migration Phases

#### Phase 1: Dashboard (Days 1-3)

**Goal:** Establish API integration pattern with highest-value page.

- [ ] Convert `dashboard.astro` to use `DashboardApp.vue`
- [ ] Implement loading/error/empty/success states
- [ ] Test auto-refresh (30s polling)
- [ ] Document pattern for remaining pages

#### Phase 2: Security Pages (Days 4-6)

**Goal:** Complete high-priority security configuration pages.

- [ ] `/security/nat.astro` — NAT rules management
- [ ] `/security/ips.astro` — IPS configuration
- [ ] `/security/firewall.astro` — Firewall rules (needs backend endpoint)

#### Phase 3: Network Pages (Days 7-10)

**Goal:** Complete network configuration pages.

**Backend endpoints required:**
- `GET/PUT /api/wan/config`
- `GET/PUT /api/lan/config`
- `GET/PUT /api/wifi/radios`
- `GET/PUT /api/dhcp/config`

**Frontend pages:**
- [ ] `/network/wan.astro`
- [ ] `/network/lan.astro`
- [ ] `/network/wifi.astro`
- [ ] `/network/dhcp.astro`
- [ ] `/network/routing.astro` (backend ready)

#### Phase 4: Services & Monitoring (Days 11-14)

**Goal:** Complete remaining pages.

- [ ] `/services/vpn-server.astro` (backend ready)
- [ ] `/services/vpn-client.astro` (backend ready)
- [ ] `/services/qos.astro` (backend ready)
- [ ] `/services/ddns.astro` (backend ready)
- [ ] `/monitoring/reports.astro` (backend ready)
- [ ] `/monitoring/dashboards/*.astro` (13 pages, backend ready)
- [ ] `/system/logs.astro` (backend ready)
- [ ] `/onboarding/index.astro` (backend ready)

### Success Criteria

- [ ] All 34 pages functional with real API data
- [ ] Full E2E user flow tested
- [ ] Deployed to production (`app.ngfw.sh`)
- [ ] Beta users can configure routers

---

## 3. API Integration Status

### Router Registration (packages/schema/src/index.ts)

| Router | Registered | Auth Middleware | Notes |
|--------|------------|-----------------|-------|
| billing | ✅ Yes | ✅ Yes | Production ready |
| fleet | ✅ Yes | ✅ Yes | Production ready |
| routing | ✅ Yes | ✅ Yes | Production ready |
| nat | ❌ No | ✅ Yes | Router exists, needs registration |
| ips | ❌ No | ✅ Yes | Router exists, needs registration |
| vpn-server | ❌ No | ✅ Yes | Router exists, needs registration |
| vpn-client | ❌ No | ✅ Yes | Router exists, needs registration |
| qos | ❌ No | ❌ **No** | **Security gap** |
| ddns | ❌ No | ❌ **No** | **Security gap** |
| reports | ❌ No | ❌ **No** | **Security gap** |
| logs | ❌ No | ❌ **No** | **Security gap** |
| onboarding | ❌ No | N/A | Router file missing |
| dashboards | ❌ No | N/A | Directory missing |

### Required Actions

1. **Critical:** Add `clerkAuth` middleware to qos, ddns, reports, logs routers
2. **High:** Register 9 existing routers in `index.ts`
3. **Medium:** Create onboarding router
4. **Medium:** Create dashboards router

### CORS Origins Configured

```typescript
origin: [
  "https://app.ngfw.sh",
  "https://ngfw.sh",
  "https://docs.ngfw.sh",
  "http://localhost:4321",
  "http://localhost:5173"
]
```

**Missing:** `http://localhost:4322` (Astro dev server alternate port)

---

## 4. Technical Debt Register

### Rust API (packages/api)

| Issue | Count | Severity | Notes |
|-------|-------|----------|-------|
| Clippy warnings | 121 | Medium | Dead code, RefCell, enum naming |
| RefCell held across await | 1 | High | `agent_connection.rs:116` |
| Enum variant naming | 1 | Low | `WifiBand` variants end with `Ghz` |

**Plan:** `.agent-coordination/magical-hugging-cook.md`

### Schema API (packages/schema)

| Issue | Severity | Notes |
|-------|----------|-------|
| Boolean precedence bug | High | `ddns/configUpdate.ts:119` |
| Timestamp inconsistency | Medium | Mix of milliseconds and seconds |
| IPS tag mismatch | Low | Uses "IPS" tag, should be "IDS" |
| Password in response | Medium | `ddns/configRead.ts` returns plaintext password |

**Plan:** `.agent-coordination/code-review-report.md`

### Portal Astro (packages/portal-astro)

| Issue | Severity | Notes |
|-------|----------|-------|
| Tailwind CSS beta | Low | Using `4.0.0-beta.6`, stable available |
| `_app` entrypoint missing | Medium | Referenced in astro.config.mjs |
| Math.random() IDs in SSR | Low | May cause hydration mismatches |

### Test Coverage

| Package | Coverage | Notes |
|---------|----------|-------|
| api | 120 tests | Agent integration tests via Docker/QEMU |
| schema | Blocked | vitest v4 pool-workers incompatibility |
| portal-astro | None | No test framework configured |

---

## 5. Research & Decisions

### Pricing Model (Approved Feb 2026)

See `RESEARCH.md` for detailed competitive analysis.

| Tier | Monthly | Annual | Target |
|------|---------|--------|--------|
| Starter | $25 | $240/yr | Replace router web UI |
| Pro | $49 | $468/yr | Power users, home lab |
| Business | $99 | $948/yr | IT consultants, MSPs |
| Business Plus | $199 | $1,908/yr | Multi-site small business |

**Model:** Feature-based pricing, not usage-based. No artificial caps on devices, users, VPN peers, or firewall rules.

### Supported Hardware (4 models)

| Model | Platform | Priority |
|-------|----------|----------|
| ASUS RT-AX92U | Merlin NG | Primary |
| GL.iNet Flint 2 (GL-MT6000) | OpenWrt | Secondary |
| Linksys WRT3200ACM | OpenWrt | Secondary |
| GL.iNet Flint 3 | OpenWrt (WiFi 7) | Future |

### Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Portal framework | Astro + Vue | SSR, file-based routing, islands |
| API framework (TS) | Hono + Chanfana | OpenAPI auto-generation, Cloudflare native |
| API framework (Rust) | workers-rs | WASM compilation, Durable Objects |
| Auth provider | Clerk.com | Full-featured, B2C billing, passkeys |
| Database | Cloudflare D1 | Edge-native SQLite, no cold starts |

---

## 6. Agent Coordination Archive

### Multi-Agent Experiment Summary

**Date:** 2026-02-06  
**Approach:** 17 parallel agents for Astro+Vue migration  
**Outcome:** Partial success — 7/8 backend routers created, infrastructure complete

### Agent Team Structure

#### Backend API Agents (8 agents)

| Agent | Deliverables | Status |
|-------|--------------|--------|
| routing-api | `/routing` endpoints | ✅ Complete |
| nat-api | `/nat` endpoints | ✅ Complete |
| ips-api | `/ips` endpoints | ✅ Complete |
| vpn-server-api | `/vpn/server` endpoints | ✅ Complete |
| vpn-client-api | `/vpn/client` endpoints | ✅ Complete |
| qos-api | `/qos` endpoints | ✅ Complete |
| ddns-api | `/ddns` endpoints | ✅ Complete |
| monitoring-api | `/reports`, `/logs` endpoints | ⚠️ Partial (onboarding, dashboards missing) |

#### Frontend Agents (8 agents)

| Agent | Deliverables | Status |
|-------|--------------|--------|
| astro-setup | Project config, layouts, middleware | ✅ Complete |
| vue-components | UI component library | ✅ Complete |
| vue-composables | API composables | ✅ Complete |
| network-pages | Network configuration pages | ⏳ Waiting |
| security-pages | Security configuration pages | ⏳ Waiting |
| services-pages | VPN, QoS, DDNS pages | ⚠️ Partial |
| monitoring-pages | Dashboards, reports, logs pages | ⏳ Waiting |
| onboarding-flow | Registration wizard | ✅ Complete |

#### Quality Control Agents (3 agents)

| Agent | Deliverables | Status |
|-------|--------------|--------|
| code-reviewer | Code review report | ✅ Complete |
| linter | Lint fixes (17 files) | ✅ Complete |
| integration-coordinator | Final integration | ⚠️ Blocked |

### Lessons Learned

1. **Status file creation was inconsistent** — Only 3/17 agents wrote status files
2. **Dependencies were already met** — Agents waiting for prerequisites that were already complete
3. **Integration required manual intervention** — Router registration not automated

### File Manifest

```
.agent-coordination/
├── MANIFEST.md                     # Agent team structure
├── INTEGRATION_STATUS.md           # Final status report
├── INTEGRATION-CHECKLIST.md        # DDNS integration example
├── integration-report.md           # Detailed integration analysis
├── code-review-report.md           # Code quality findings
├── lint-report.md                  # Linting fixes applied
├── network-pages-plan.md           # Network page specifications
├── security-pages-plan.md          # Security page specifications
├── monitoring-pages-plan.md        # Monitoring page specifications
├── vpn-client-api-summary.md       # VPN client API documentation
├── ddns-api-summary.md             # DDNS API documentation
├── magical-hugging-cook.md         # Rust Clippy fix plan
├── reflective-toasting-whistle.md  # Portal migration plan
├── async-frolicking-sonnet.md      # Integration test plan
├── zazzy-juggling-beacon.md        # Session notes
└── status/                         # Agent status JSON files (19 files)
```

---

## 7. Session References

### Recent Development Sessions

| Session ID | Date | Focus |
|------------|------|-------|
| `a08ac170-3e4b-4371-9f04-2f500d4e42a6` | Feb 2026 | Major integration work, multi-agent coordination |
| `78309c0b-bcaf-4321-bbf1-8225158059fe` | Feb 2026 | Recent planning, documentation review |
| `05c0ae19-d702-4a19-b761-47d16e1879dd` | Feb 2026 | Portal-Astro setup, component creation |
| `fb2e18d9-c7f6-45a0-93a9-290c3897db94` | Feb 2026 | Schema API endpoints |
| `7086088d-be7a-489d-9de3-65a796254adf` | Feb 2026 | Rust API development |

Sessions stored in `.claude/sessions/` with subagent logs and tool results.

### Key Planning Documents

| Document | Purpose |
|----------|---------|
| `reflective-toasting-whistle.md` | Complete portal migration plan (14 days) |
| `async-frolicking-sonnet.md` | RT-AX92U test environment setup |
| `magical-hugging-cook.md` | Rust API Clippy fix plan |

---

## 8. Prioritized Backlog

### P0: Critical (Security/Blocking)

1. **Add auth middleware to 4 routers**
   - Files: `qos/router.ts`, `ddns/router.ts`, `reports/router.ts`, `logs/router.ts`
   - Effort: 30 minutes
   - Impact: Security vulnerability if deployed without this

2. **Register 9 routers in index.ts**
   - File: `packages/schema/src/index.ts`
   - Effort: 15 minutes
   - Impact: 9 API endpoint groups unreachable

### P1: High (MVP Completion)

3. **Complete A3: JWKS in WASM**
   - File: `packages/api/src/middleware/auth.rs`
   - Effort: 2-4 hours (research ongoing)
   - Impact: Blocks production deployment

4. **Execute Stream E: Deployment**
   - Tasks: E1-E6 (secrets, migrations, deploy, smoke test)
   - Effort: 2-4 hours
   - Impact: Launch blocker

5. **Fix boolean precedence bug**
   - File: `packages/schema/src/endpoints/ddns/configUpdate.ts:119`
   - Effort: 5 minutes
   - Impact: DDNS config saves wrong values

### P2: Medium (Portal Migration)

6. **Portal Phase 1: Dashboard**
   - Files: `dashboard.astro`, new `DashboardApp.vue`
   - Effort: 1-2 days
   - Impact: Primary user-facing page

7. **Portal Phase 2: Security pages**
   - Files: 3 pages + 3 app components
   - Effort: 2-3 days
   - Impact: Core security configuration

8. **Create missing backend routers**
   - Files: `onboarding/router.ts`, `dashboards/router.ts`
   - Effort: 2-4 hours
   - Impact: Frontend pages without backend

### P3: Low (Technical Debt)

9. **Fix Rust Clippy warnings (121)**
   - Files: Multiple in `packages/api/src/`
   - Effort: 2-4 hours
   - Impact: Code quality

10. **Standardize timestamps**
    - Files: Multiple endpoint files
    - Effort: 1-2 hours
    - Impact: Consistency

11. **Update Tailwind to stable**
    - File: `packages/portal-astro/package.json`
    - Effort: 15 minutes
    - Impact: Minor

---

## Deferred (Not in MVP)

- Shadow/Takeover mode adapter implementations
- Config push/apply flow
- Self-upgrade mechanism
- 50+ AGENTS.md endpoints not yet implemented
- CI/CD auto-deploy pipeline
- Rate limiting middleware
- WebSocket streaming endpoints

---

*Last updated: 2026-02-07*
