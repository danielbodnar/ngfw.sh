# Testing Architecture

Comprehensive testing strategy and infrastructure for the NGFW.sh platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Pyramid](#test-pyramid)
4. [Testing Stack](#testing-stack)
5. [Test Environments](#test-environments)
6. [Coverage Strategy](#coverage-strategy)
7. [Test Organization](#test-organization)

---

## Overview

NGFW.sh implements a multi-layered testing approach across three primary packages:

| Package | Framework | Target | Status |
|---------|-----------|--------|--------|
| **schema** (TypeScript API) | Vitest + Cloudflare Workers Pool | Cloudflare Workers runtime | ⚠️ Blocked (vitest v4 incompatibility) |
| **api** (Rust API) | Cargo test + integration tests | WASM compilation, RPC protocol | ✅ 120 tests passing |
| **portal-astro** (Frontend) | Not configured | Vue components, Astro pages | ⏳ Planned |

### Key Testing Objectives

- **Runtime Accuracy:** Test in actual deployment environments (Cloudflare Workers, ARM64 routers)
- **Protocol Compliance:** Validate WebSocket RPC, REST API contracts
- **Security Verification:** Test authentication, authorization, input validation
- **Hardware Simulation:** Emulate RT-AX92U router environment

---

## Testing Philosophy

### Unix Philosophy Applied to Tests

1. **Write tests that do one thing well** — Each test validates a single behavior
2. **Tests are documentation** — Test names and structure document system behavior
3. **Fast feedback loops** — Unit tests < 1s, integration tests < 30s, E2E < 2min
4. **Composable test utilities** — Build reusable test helpers and fixtures

### Testing Principles

- **Test behavior, not implementation** — Tests should survive refactoring
- **Fail fast and loudly** — Clear error messages, no silent failures
- **Deterministic tests** — No flaky tests, reproducible results
- **Test in production-like environments** — Use Cloudflare Workers pool, QEMU ARM64 VMs

---

## Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲              ~5% (Playwright, manual)
                 ╱────────╲
                ╱          ╲
               ╱Integration ╲          ~25% (API contracts, WebSocket RPC)
              ╱──────────────╲
             ╱                ╲
            ╱   Unit Tests     ╲      ~70% (Business logic, validation)
           ╱────────────────────╲
```

### Distribution by Package

#### Schema API (TypeScript)

- **Unit:** 60% — Zod validation, business logic
- **Integration:** 35% — D1 queries, KV operations, endpoint contracts
- **E2E:** 5% — Full request/response cycles

#### Rust API

- **Unit:** 70% — Model serialization, RPC message handling
- **Integration:** 25% — WebSocket protocol, Durable Object lifecycle
- **System:** 5% — RT-AX92U simulation (Docker/QEMU)

#### Portal (Frontend)

- **Unit:** 50% — Component rendering, composable logic
- **Integration:** 30% — API client, authentication flow
- **E2E:** 20% — User journeys via Playwright

---

## Testing Stack

### Core Testing Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Test runner for TypeScript | 4.0.18 |
| **@cloudflare/vitest-pool-workers** | Cloudflare Workers test environment | 0.12.9 |
| **Cargo test** | Rust unit test framework | Native |
| **Bun test** | Alternative TypeScript test runner | 1.2.23+ |
| **Playwright** | E2E browser automation | Planned |

### Test Utilities

| Utility | Package | Purpose |
|---------|---------|---------|
| `SELF.fetch()` | Cloudflare Workers | In-worker HTTP testing |
| `vi.mock()` | Vitest | Function mocking |
| `expect()` | Vitest | Assertions |
| `beforeEach/afterEach` | Vitest | Setup/teardown |
| `applyD1Migrations()` | Cloudflare test helpers | D1 schema setup |

### Rust Testing Tools

| Tool | Purpose |
|------|---------|
| `#[test]` | Unit test macro |
| `#[cfg(test)]` | Test-only code |
| `assert!()` / `assert_eq!()` | Basic assertions |
| `mockall` | Mocking framework (if needed) |

---

## Test Environments

### 1. Local Development

**Purpose:** Fast feedback during development

**Stack:**
- Vitest with Cloudflare Workers pool (Schema API)
- Cargo test with local build (Rust API)
- Bun test (frontend unit tests)

**Characteristics:**
- Hot reload enabled
- Mock external services (Clerk, Cloudflare bindings)
- In-memory D1 database
- Runs on developer workstation

### 2. RT-AX92U Simulation (Integration)

**Purpose:** Validate agent behavior in realistic router environment

**Two Approaches:**

#### Docker Approach (Fast, CI-friendly)

```bash
bun run test:integration:docker
```

**Components:**
- Mock ASUS binaries (nvram, wl, ip, iptables)
- Mock sysfs files (/sys/class/thermal, /proc/cpuinfo)
- Mock WebSocket API server (Bun)
- ARM64 cross-compiled agent binary

**Characteristics:**
- Build time: ~2 minutes
- Run time: ~30 seconds
- Requires: Docker with BuildKit, binfmt_misc

#### QEMU Approach (Full system emulation)

```bash
bun run test:integration:qemu
```

**Components:**
- Alpine Linux ARM64 cloud image
- cloud-init configuration
- QEMU aarch64 virtual machine
- EFI firmware (edk2-aarch64)

**Characteristics:**
- Build time: ~5 minutes
- Run time: ~2 minutes
- Requires: qemu-system-aarch64, edk2-aarch64, mkisofs

### 3. CI/CD Environment

**Purpose:** Automated testing on every commit/PR

**Platforms:** GitHub Actions

**Matrix:**
- Linux (ubuntu-latest)
- Rust targets: wasm32-unknown-unknown, aarch64-unknown-linux-gnu
- Bun latest stable

**Stages:**
1. Lint (oxlint, cargo clippy)
2. Unit tests (cargo test, vitest)
3. Integration tests (Docker simulation)
4. Build verification (all packages)

### 4. Staging Environment

**Purpose:** Pre-production validation

**Stack:**
- Real Cloudflare Workers
- Real D1 database (staging)
- Real Clerk authentication (test instance)
- Synthetic traffic generators

**Characteristics:**
- Deployed to `*.staging.ngfw.sh`
- Isolated from production data
- Real network latency and edge behavior

---

## Coverage Strategy

### Coverage Targets

| Package | Line Coverage | Branch Coverage | Notes |
|---------|--------------|-----------------|-------|
| Schema API | 80% | 75% | Focus on endpoints, validation |
| Rust API | 85% | 80% | Critical security paths 100% |
| Portal | 70% | 65% | UI components, business logic |

### Coverage Tracking

**Tools:**
- **TypeScript:** Vitest built-in coverage (c8)
- **Rust:** `cargo-tarpaulin` or `cargo-llvm-cov`
- **Aggregation:** Codecov or Coveralls

**Coverage Configuration (Vitest):**

```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/tests/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### Critical Path Coverage

**100% coverage required for:**
- Authentication and authorization logic
- JWT verification (Clerk)
- API key validation
- Input sanitization and validation
- Database migration scripts
- Security-critical endpoints (firewall, NAT, VPN)

---

## Test Organization

### Schema API Test Structure

```
packages/schema/
├── tests/
│   ├── vitest.config.mts           # Test runner configuration
│   ├── apply-migrations.ts         # D1 migration setup
│   ├── bindings.d.ts               # Type definitions for test bindings
│   ├── tsconfig.json               # Test-specific TypeScript config
│   └── integration/
│       ├── tasks.test.ts           # Task CRUD endpoint tests
│       ├── dummyEndpoint.test.ts   # Example test pattern
│       ├── billing.test.ts         # Billing endpoint tests (TODO)
│       ├── fleet.test.ts           # Fleet management tests (TODO)
│       ├── routing.test.ts         # Routing API tests (TODO)
│       ├── nat.test.ts             # NAT API tests (TODO)
│       ├── ips.test.ts             # IPS API tests (TODO)
│       └── ... (more endpoint tests)
└── src/
    └── endpoints/
        └── {category}/
            ├── {endpoint}.ts       # Implementation
            └── {endpoint}.test.ts  # Co-located unit tests (optional)
```

### Rust API Test Structure

```
packages/api/
├── src/
│   ├── handlers/
│   │   └── agent.rs               # Includes #[cfg(test)] modules
│   ├── models/
│   │   └── rpc.rs                 # Includes serialization tests
│   └── rpc/
│       └── agent_connection.rs    # Durable Object tests
└── tests/                         # Integration tests directory
    ├── common/
    │   ├── mod.rs                 # Shared test utilities
    │   └── fixtures.rs            # Test data fixtures
    └── integration/
        ├── websocket_protocol.rs  # WebSocket RPC tests
        └── auth_flow.rs           # Authentication tests
```

### Integration Test Structure

```
tests/integration/
├── run-docker.sh                  # Docker test runner
├── run-qemu.sh                    # QEMU test runner
├── docker/
│   ├── Dockerfile                 # Multi-stage ARM64 build
│   ├── compose.yaml               # Docker Compose config
│   ├── entrypoint.sh              # Container startup script
│   ├── config.toml                # Agent test configuration
│   └── mocks/
│       ├── mock-api-server.ts     # WebSocket RPC mock server
│       ├── mock-nvram.sh          # ASUS nvram simulator
│       ├── mock-wl.sh             # Wireless control simulator
│       └── ... (other mock binaries)
└── qemu/
    ├── alpine-cloud.yaml          # cloud-init configuration
    ├── create-image.sh            # VM image builder
    └── test-agent.sh              # VM test script
```

---

## Test Naming Conventions

### Test File Names

| Pattern | Example | Purpose |
|---------|---------|---------|
| `{feature}.test.ts` | `tasks.test.ts` | Integration/feature tests |
| `{component}.spec.ts` | `Button.spec.ts` | Component tests |
| `{module}_test.rs` | `rpc_test.rs` | Rust unit tests |

### Test Case Names

**TypeScript (Vitest):**

```typescript
describe("Task API Integration Tests", () => {
  describe("POST /tasks", () => {
    it("should create a new task successfully", async () => {
      // Test implementation
    });

    it("should return a 400 error for invalid input", async () => {
      // Test implementation
    });
  });
});
```

**Rust (Cargo test):**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_payload_serialization() {
        // Test implementation
    }

    #[test]
    fn test_auth_message_validation() {
        // Test implementation
    }
}
```

### Naming Guidelines

- Use descriptive names that document expected behavior
- Start with action verb: "should", "creates", "validates", "returns"
- Include context: input state, expected outcome
- Avoid technical jargon in test names

---

## Test Data Management

### Fixtures

**Location:** `tests/fixtures/` in each package

**Structure:**

```typescript
// tests/fixtures/tasks.ts
export const validTask = {
  name: "Test Task",
  slug: "test-task",
  description: "A task for testing",
  completed: false,
  due_date: "2025-01-01T00:00:00.000Z",
};

export const invalidTask = {
  description: "Missing required fields",
};
```

### Factory Functions

```typescript
// tests/factories/device.ts
export function createDevice(overrides = {}) {
  return {
    id: Math.random().toString(36).substring(7),
    name: "Test Router",
    model: "RT-AX92U",
    firmware_version: "v2.4.1",
    status: "online",
    last_seen: new Date().toISOString(),
    ...overrides,
  };
}
```

### Database Seeding

```typescript
// tests/helpers/seed.ts
export async function seedTestData(db: D1Database) {
  await db.exec(`
    INSERT INTO devices (id, name, model, user_id)
    VALUES ('test-device-1', 'Test Router', 'RT-AX92U', 'user_123');
  `);
}
```

---

## Test Isolation

### Database Isolation

**Strategy:** Each test gets a fresh D1 database

**Implementation:**

```typescript
// tests/vitest.config.mts
export default defineWorkersConfig({
  test: {
    setupFiles: ["./tests/apply-migrations.ts"],
    poolOptions: {
      workers: {
        singleWorker: true,  // Ensures test isolation
        miniflare: {
          // In-memory D1 database per test
        },
      },
    },
  },
});
```

### Mock Cleanup

```typescript
beforeEach(async () => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

afterEach(async () => {
  vi.restoreAllMocks();
});
```

---

## Continuous Testing

### Watch Mode

**TypeScript:**

```bash
cd packages/schema
bun run test:watch
```

**Rust:**

```bash
cd packages/api
cargo watch -x test
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
bun run lint
bun run test:unit
```

### Pull Request Checks

Every PR must pass:
- [ ] Lint checks (oxlint, cargo clippy)
- [ ] Unit tests (100% pass rate)
- [ ] Integration tests (100% pass rate)
- [ ] Coverage thresholds met
- [ ] No new security vulnerabilities

---

## Performance Testing

### Load Testing

**Tools:** k6, autocannon

**Scenarios:**
- 1,000 concurrent users
- 10,000 requests/second
- Device status updates (5s interval)
- WebSocket connection churn

### Benchmarking

**Rust:**

```bash
cargo bench
```

**TypeScript:**

```typescript
import { bench, describe } from 'vitest';

describe('JSON serialization', () => {
  bench('Zod parse', () => {
    TaskSchema.parse(validTask);
  });

  bench('Native JSON parse', () => {
    JSON.parse(JSON.stringify(validTask));
  });
});
```

---

## Security Testing

### Static Analysis

- **TypeScript:** oxlint with security rules
- **Rust:** cargo clippy with security lints
- **Dependencies:** cargo audit, bun audit

### Vulnerability Scanning

```bash
# Rust dependencies
cargo audit

# JavaScript dependencies
bun audit

# OWASP Top 10 checks
oxlint --security .
```

### Penetration Testing

- SQL injection attempts
- XSS payload validation
- CSRF token verification
- JWT manipulation tests
- API key brute force protection

---

## Troubleshooting Tests

### Common Issues

#### Issue: Vitest v4 + pool-workers incompatibility

**Status:** Blocking Schema API tests

**Workaround:** Downgrade to vitest v3 or wait for pool-workers v0.13

**Tracking:** https://github.com/cloudflare/workers-sdk/issues/XXXX

#### Issue: QEMU networking fails

**Symptom:** Agent cannot connect to host API server

**Fix:** Use host networking mode or usermode networking with port forwarding

```bash
qemu-system-aarch64 -netdev user,id=net0,hostfwd=tcp::8080-:8080
```

#### Issue: Docker BuildKit not enabled

**Symptom:** Multi-stage builds fail

**Fix:**

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

---

## Future Enhancements

### Planned Testing Features

- [ ] E2E tests with Playwright
- [ ] Visual regression testing (Percy, Chromatic)
- [ ] Mutation testing (Stryker)
- [ ] Contract testing (Pact)
- [ ] Chaos engineering (intentional failures)
- [ ] Real router hardware testing (RT-AX92U test rack)

---

*Last updated: 2026-02-09*
