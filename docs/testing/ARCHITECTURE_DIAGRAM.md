# Testing Architecture Diagram

Visual representation of the NGFW.sh testing infrastructure.

---

## Overall Testing Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NGFW.sh Testing Architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Test Layers                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ╱╲                                              │
│                             ╱  ╲                                             │
│                            ╱ E2E ╲             ~5% Coverage                 │
│                           ╱────────╲            (Playwright)                │
│                          ╱          ╲                                        │
│                         ╱Integration ╲        ~25% Coverage                 │
│                        ╱──────────────╲       (API contracts,               │
│                       ╱                ╲       WebSocket RPC)               │
│                      ╱   Unit Tests     ╲    ~70% Coverage                  │
│                     ╱────────────────────╲   (Business logic,               │
│                    ╱                      ╲   validation)                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Test Environments                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    Local     │  │   RT-AX92U   │  │     CI/CD    │  │   Staging    │   │
│  │  Development │  │  Simulation  │  │  Environment │  │  Environment │   │
│  │              │  │              │  │              │  │              │   │
│  │  • Hot       │  │  • Docker    │  │  • GitHub    │  │  • Real      │   │
│  │    Reload    │  │  • QEMU      │  │    Actions   │  │    Workers   │   │
│  │  • Mocks     │  │  • ARM64     │  │  • Matrix    │  │  • Real D1   │   │
│  │  • Fast      │  │  • Full      │  │  • Parallel  │  │  • Real      │   │
│  │              │  │    System    │  │              │  │    Clerk     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Test Execution Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PR/Push                                                                     │
│     │                                                                        │
│     ├─────> Lint (2m)                                                       │
│     │         ├─> oxlint (TypeScript)                                       │
│     │         └─> cargo clippy (Rust)                                       │
│     │                                                                        │
│     ├─────> Test Schema API (2m)                                            │
│     │         ├─> Vitest + Cloudflare Workers pool                          │
│     │         ├─> D1 migrations applied                                     │
│     │         └─> Coverage report (⚠️ blocked)                              │
│     │                                                                        │
│     ├─────> Test Rust API (4m)                                              │
│     │         ├─> cargo test (120 tests)                                    │
│     │         ├─> WASM target                                               │
│     │         ├─> ARM64 target                                              │
│     │         └─> Coverage report (75%)                                     │
│     │                                                                        │
│     ├─────> Integration Tests (3m)                                          │
│     │         ├─> Docker simulation                                         │
│     │         ├─> Agent startup                                             │
│     │         ├─> WebSocket connection                                      │
│     │         └─> Metrics reporting                                         │
│     │                                                                        │
│     ├─────> Build Verification (5m)                                         │
│     │         ├─> All packages                                              │
│     │         └─> Artifact validation                                       │
│     │                                                                        │
│     ├─────> Security Audit (2m)                                             │
│     │         ├─> cargo audit                                               │
│     │         ├─> bun audit                                                 │
│     │         └─> OWASP dependency check                                    │
│     │                                                                        │
│     └─────> Quality Gates                                                   │
│               ├─> Coverage threshold                                        │
│               ├─> No vulnerabilities                                        │
│               └─> All tests pass                                            │
│                     │                                                        │
│                     ├─> ✅ Pass → Merge Allowed                             │
│                     └─> ❌ Fail → Block Merge                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Package-Level Testing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         packages/schema (TypeScript)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  src/endpoints/               tests/                                         │
│  ├── billing/          ───>   ├── integration/                              │
│  ├── fleet/            ───>   │   ├── billing.test.ts                       │
│  ├── routing/          ───>   │   ├── fleet.test.ts                         │
│  ├── nat/              ───>   │   ├── routing.test.ts                       │
│  ├── ips/              ───>   │   ├── nat.test.ts                           │
│  └── ...               ───>   │   └── ...                                   │
│                                ├── vitest.config.mts                         │
│                                └── apply-migrations.ts                       │
│                                                                              │
│  Framework: Vitest + Cloudflare Workers Pool                                │
│  Coverage:  ⚠️ 0% (blocked by vitest v4)                                    │
│  Status:    ⚠️ Waiting for pool-workers v0.13                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           packages/api (Rust)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  src/                         tests/                                         │
│  ├── handlers/                ├── integration/                              │
│  │   └── agent.rs ───┐        │   ├── websocket_protocol.rs                │
│  ├── models/          │        │   └── auth_flow.rs                         │
│  │   └── rpc.rs ──────┼───>   └── common/                                  │
│  ├── middleware/      │            ├── mod.rs                               │
│  │   └── auth.rs ─────┘            └── fixtures.rs                          │
│  └── rpc/                                                                    │
│      └── agent_connection.rs                                                │
│                                                                              │
│  Framework: Cargo test                                                       │
│  Coverage:  ✅ 75% (120 tests passing)                                      │
│  Status:    ✅ Healthy, 0 clippy warnings                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      packages/portal-astro (Frontend)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  src/components/ui/                                                          │
│  ├── Button.vue                                                              │
│  ├── Button.spec.ts ───> (Planned)                                          │
│  ├── Card.vue                                                                │
│  ├── Card.spec.ts ─────> (Planned)                                          │
│  └── ...                                                                     │
│                                                                              │
│  Framework: Vitest + @vue/test-utils (planned)                              │
│  Coverage:  ⏳ 0% (not configured)                                           │
│  Status:    ⏳ Phase 4 (Week 7-8)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Test Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RT-AX92U Router Simulation                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                      Docker Approach                              │       │
│  ├──────────────────────────────────────────────────────────────────┤       │
│  │                                                                   │       │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐             │       │
│  │  │   Mock     │    │   Mock     │    │   NGFW     │             │       │
│  │  │  Binaries  │───>│   sysfs    │───>│   Agent    │             │       │
│  │  │            │    │            │    │            │             │       │
│  │  │ • nvram    │    │ • thermal  │    │ • ARM64    │             │       │
│  │  │ • wl       │    │ • cpuinfo  │    │ • WebSocket│             │       │
│  │  │ • ip       │    │ • net      │    │ • Metrics  │             │       │
│  │  │ • iptables │    │            │    │            │             │       │
│  │  └────────────┘    └────────────┘    └────────────┘             │       │
│  │         │                  │                  │                  │       │
│  │         └──────────────────┴──────────────────┘                  │       │
│  │                           │                                      │       │
│  │                           ▼                                      │       │
│  │                  ┌────────────┐                                  │       │
│  │                  │   Mock     │                                  │       │
│  │                  │    API     │                                  │       │
│  │                  │  Server    │                                  │       │
│  │                  │            │                                  │       │
│  │                  │  (Bun)     │                                  │       │
│  │                  └────────────┘                                  │       │
│  │                                                                   │       │
│  │  Build: ~2 minutes                                               │       │
│  │  Run:   ~30 seconds                                              │       │
│  │                                                                   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                       QEMU Approach                               │       │
│  ├──────────────────────────────────────────────────────────────────┤       │
│  │                                                                   │       │
│  │  ┌────────────────────────────────────────────────────┐          │       │
│  │  │         Alpine Linux ARM64 Cloud Image            │          │       │
│  │  ├────────────────────────────────────────────────────┤          │       │
│  │  │                                                    │          │       │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │          │       │
│  │  │  │   Mock   │  │   Mock   │  │   NGFW   │        │          │       │
│  │  │  │ Binaries │  │  sysfs   │  │  Agent   │        │          │       │
│  │  │  └──────────┘  └──────────┘  └──────────┘        │          │       │
│  │  │                                                    │          │       │
│  │  │  cloud-init ───> systemd ───> agent.service      │          │       │
│  │  │                                                    │          │       │
│  │  └────────────────────────────────────────────────────┘          │       │
│  │                           │                                      │       │
│  │                           │  usermode networking                 │       │
│  │                           │  (port 8080 forwarded)               │       │
│  │                           ▼                                      │       │
│  │                  ┌────────────┐                                  │       │
│  │                  │   Mock     │                                  │       │
│  │                  │    API     │                                  │       │
│  │                  │  Server    │                                  │       │
│  │                  │  (Host)    │                                  │       │
│  │                  └────────────┘                                  │       │
│  │                                                                   │       │
│  │  Build: ~5 minutes                                               │       │
│  │  Run:   ~2 minutes                                               │       │
│  │                                                                   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Coverage Tracking Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Coverage Tracking Flow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Test Execution                                                              │
│       │                                                                      │
│       ├─> Vitest (TypeScript)                                               │
│       │     ├─> c8 coverage                                                 │
│       │     ├─> HTML report                                                 │
│       │     └─> LCOV format                                                 │
│       │                                                                      │
│       ├─> Cargo test (Rust)                                                 │
│       │     ├─> tarpaulin coverage                                          │
│       │     ├─> HTML report                                                 │
│       │     └─> Cobertura XML                                               │
│       │                                                                      │
│       └─> Aggregation                                                       │
│             │                                                                │
│             ├─> Local HTML Reports                                          │
│             │     └─> coverage/index.html                                   │
│             │                                                                │
│             ├─> Codecov Upload                                              │
│             │     ├─> Real-time dashboard                                   │
│             │     ├─> Trend tracking                                        │
│             │     ├─> PR comments                                           │
│             │     └─> Badge generation                                      │
│             │                                                                │
│             └─> CI Artifacts                                                │
│                   ├─> JUnit XML                                             │
│                   ├─> Coverage JSON                                         │
│                   └─> Test logs                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Reporting and Notification Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Reporting & Notification Flow                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Test Results                                                                │
│       │                                                                      │
│       ├─> GitHub Actions                                                    │
│       │     ├─> Status checks (✓/✗)                                         │
│       │     ├─> PR comments                                                 │
│       │     ├─> Workflow summary                                            │
│       │     └─> Artifacts upload                                            │
│       │                                                                      │
│       ├─> Codecov Dashboard                                                 │
│       │     ├─> Coverage trends                                             │
│       │     ├─> File-level heatmap                                          │
│       │     ├─> PR comparison                                               │
│       │     └─> Badge generation                                            │
│       │                                                                      │
│       ├─> Slack Notifications                                               │
│       │     ├─> #engineering (failures)                                     │
│       │     ├─> #security (vulnerabilities)                                 │
│       │     └─> Real-time alerts                                            │
│       │                                                                      │
│       ├─> Email Reports                                                     │
│       │     ├─> Weekly summary (Mon 9AM)                                    │
│       │     ├─> Monthly report (1st Mon)                                    │
│       │     └─> Security alerts                                             │
│       │                                                                      │
│       └─> Custom Dashboard (Planned)                                        │
│             ├─> Grafana + InfluxDB                                          │
│             ├─> Real-time metrics                                           │
│             ├─> Historical trends                                           │
│             └─> Quality gates status                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quality Gates Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Quality Gates Check                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PR/Commit                                                                   │
│       │                                                                      │
│       ├─> Lint Check                                                        │
│       │     ├─> oxlint (0 errors) ────────> ✅ PASS                         │
│       │     └─> cargo clippy (0 warnings) ─> ✅ PASS                        │
│       │                                                                      │
│       ├─> Unit Tests                                                        │
│       │     ├─> Schema API (⚠️ blocked) ──> ⚠️ WARN                         │
│       │     └─> Rust API (120/120) ───────> ✅ PASS                         │
│       │                                                                      │
│       ├─> Integration Tests                                                 │
│       │     └─> Docker (all pass) ────────> ✅ PASS                         │
│       │                                                                      │
│       ├─> Coverage Check                                                    │
│       │     ├─> Overall (75%) ─────────────> ⚠️ WARN (target: 80%)         │
│       │     ├─> New code (82%) ────────────> ✅ PASS                        │
│       │     └─> Critical paths (60%) ──────> ❌ FAIL (target: 100%)        │
│       │                                                                      │
│       ├─> Security Audit                                                    │
│       │     ├─> Dependencies (0 critical) ─> ✅ PASS                        │
│       │     └─> OWASP check (0 high) ──────> ✅ PASS                        │
│       │                                                                      │
│       └─> Build Verification                                                │
│             └─> All packages build ────────> ✅ PASS                         │
│                                                                              │
│  Decision                                                                    │
│       │                                                                      │
│       ├─> All critical checks pass? ───────> YES ─> ✅ Allow Merge          │
│       │                                             │                        │
│       └─> Any critical check fails? ───────> YES ─> ❌ Block Merge          │
│                                                     │                        │
│                                             Notify:                          │
│                                             • PR author                      │
│                                             • Slack (#engineering)           │
│                                             • Email (if high severity)       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Test Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Test Data Management                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Test Setup                                                                  │
│       │                                                                      │
│       ├─> Fixtures                                                          │
│       │     ├─> tests/fixtures/tasks.ts                                     │
│       │     ├─> tests/fixtures/devices.ts                                   │
│       │     └─> tests/fixtures/users.ts                                     │
│       │                                                                      │
│       ├─> Factory Functions                                                 │
│       │     ├─> createDevice(overrides)                                     │
│       │     ├─> createTask(overrides)                                       │
│       │     └─> createUser(overrides)                                       │
│       │                                                                      │
│       ├─> Database Seeding                                                  │
│       │     ├─> apply-migrations.ts                                         │
│       │     ├─> D1 migrations applied                                       │
│       │     └─> Fresh DB per test                                           │
│       │                                                                      │
│       └─> Mock Data                                                         │
│             ├─> Mock NVRAM data                                             │
│             ├─> Mock sysfs files                                            │
│             └─> Mock API responses                                          │
│                                                                              │
│  Test Execution                                                              │
│       │                                                                      │
│       ├─> beforeEach: Setup                                                 │
│       │     ├─> Clear mocks                                                 │
│       │     ├─> Seed database                                               │
│       │     └─> Initialize state                                            │
│       │                                                                      │
│       ├─> Test runs with data                                               │
│       │                                                                      │
│       └─> afterEach: Cleanup                                                │
│             ├─> Restore mocks                                               │
│             ├─> Clear database                                              │
│             └─> Reset state                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-02-09*
