# NGFW.sh Testing Documentation

Comprehensive testing documentation for the NGFW.sh cloud-managed next-generation firewall platform.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Testing Architecture](./TESTING_ARCHITECTURE.md) | High-level testing strategy and infrastructure |
| [Developer Guide](./DEVELOPER_GUIDE.md) | Practical guide for writing and running tests |
| [Coverage & Quality Metrics](./COVERAGE.md) | Coverage targets, status, and improvement plans |
| [Test Reporting](./REPORTING.md) | CI/CD reports, dashboards, and notifications |

---

## Overview

NGFW.sh implements a comprehensive, multi-layered testing strategy designed to ensure reliability, security, and maintainability across three primary packages:

- **packages/schema** — TypeScript REST API (Hono + Chanfana + Zod)
- **packages/api** — Rust WebSocket API (workers-rs + Durable Objects)
- **packages/portal-astro** — Frontend (Astro + Vue + Tailwind)

### Current Test Status

```
┌────────────────────────────────────────────┐
│ NGFW.sh Test Status                        │
├────────────────────────────────────────────┤
│ Total Tests:       145                     │
│ Passing:           145 (100%)              │
│ Failing:           0                       │
│ Flaky:             0                       │
│                                            │
│ Overall Coverage:  ~75%                    │
│ Target Coverage:   80%                     │
│                                            │
│ Status:            ✅ Healthy              │
└────────────────────────────────────────────┘
```

---

## Getting Started

### Quick Start

```bash
# Clone repository
git clone https://github.com/danielbodnar/ngfw.sh.git
cd ngfw.sh

# Install dependencies
bun run setup

# Run all tests
bun run test                      # Schema API (⚠️ currently blocked)
cd packages/api && cargo test     # Rust API (120 tests)
bun run test:integration:docker   # Integration tests

# View coverage
cd packages/schema && bun run test --coverage
cd packages/api && cargo tarpaulin --out Html
```

### Prerequisites

- **Bun** 1.2.23+ — JavaScript runtime and package manager
- **Rust** 1.75+ — With wasm32-unknown-unknown target
- **Docker** with BuildKit — For integration tests
- **QEMU** (optional) — For full system emulation
- **cross** (optional) — `cargo install cross`

### Installation

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install cross (for ARM64 cross-compilation)
cargo install cross --git https://github.com/cross-rs/cross

# Verify installation
bun --version    # 1.2.23+
rustc --version  # 1.75.0+
docker --version # 20.10.0+
```

---

## Testing by Package

### Schema API (TypeScript)

**Status:** ⚠️ Blocked by vitest v4 incompatibility

**Framework:** Vitest + @cloudflare/vitest-pool-workers

**Test Location:** `packages/schema/tests/`

**Run Tests:**

```bash
cd packages/schema

# Run all tests
bun run test

# Run specific test
bun run test tests/integration/tasks.test.ts

# Run with coverage
bun run test --coverage

# Watch mode
bun run test --watch
```

**Example Test:**

```typescript
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Device API", () => {
  it("should create device", async () => {
    const device = { name: "Test Router", model: "RT-AX92U" };
    const response = await SELF.fetch("http://local.test/api/fleet/devices", {
      method: "POST",
      body: JSON.stringify(device),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.result.api_key).toBeDefined();
  });
});
```

**Coverage:** [View Details](./COVERAGE.md#packageschema-typescript-api)

### Rust API

**Status:** ✅ 120 tests passing, 0 clippy warnings

**Framework:** Cargo test

**Test Location:** `packages/api/src/` (inline) + `packages/api/tests/` (integration)

**Run Tests:**

```bash
cd packages/api

# Run all tests
cargo test --workspace

# Run specific test
cargo test test_auth_message

# Run with output
cargo test -- --nocapture

# Run with coverage
cargo tarpaulin --out Html
```

**Example Test:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_payload_serialization() {
        let status = StatusPayload {
            uptime: 12345,
            cpu: 23,
            memory: 41,
            temperature: 52,
            load: vec![0.42, 0.38, 0.35],
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("12345"));
    }
}
```

**Coverage:** [View Details](./COVERAGE.md#packagesapi-rust-websocket-api)

### Portal (Astro + Vue)

**Status:** ⏳ Not configured

**Framework:** Vitest (planned)

**Test Location:** `packages/portal-astro/src/components/**/*.spec.ts` (planned)

**Future Implementation:**

```bash
cd packages/portal-astro

# Run component tests (planned)
bun run test

# Run E2E tests (planned)
bun run test:e2e
```

**Example Test (Planned):**

```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Button from './Button.vue';

describe('Button', () => {
  it('renders correctly', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Click me' },
    });
    expect(wrapper.text()).toContain('Click me');
  });
});
```

**Coverage:** [View Details](./COVERAGE.md#packagesportal-astro-frontend)

### Integration Tests

**Status:** ✅ Both Docker and QEMU approaches working

**Location:** `tests/integration/`

**Run Tests:**

```bash
# Docker approach (fast, CI-friendly)
bun run test:integration:docker

# QEMU approach (full system emulation)
bun run test:integration:qemu
```

**What's Tested:**
- RT-AX92U router simulation
- Agent startup and initialization
- WebSocket connection to API
- Metrics reporting
- Configuration application

**Coverage:** [View Details](./TESTING_ARCHITECTURE.md#2-rt-ax92u-simulation-integration)

---

## Test Organization

### Directory Structure

```
ngfw.sh/
├── packages/
│   ├── schema/
│   │   ├── src/
│   │   │   └── endpoints/     # Implementation
│   │   └── tests/             # Tests
│   │       ├── vitest.config.mts
│   │       ├── apply-migrations.ts
│   │       └── integration/
│   │           ├── tasks.test.ts
│   │           └── dummyEndpoint.test.ts
│   ├── api/
│   │   ├── src/
│   │   │   ├── handlers/      # Includes #[cfg(test)] modules
│   │   │   ├── models/        # Includes tests
│   │   │   └── rpc/           # Includes tests
│   │   └── tests/             # Integration tests
│   └── portal-astro/
│       └── src/
│           └── components/
│               └── ui/
│                   ├── Button.vue
│                   └── Button.spec.ts  # (Planned)
├── tests/
│   └── integration/
│       ├── docker/            # Docker-based tests
│       │   ├── Dockerfile
│       │   ├── compose.yaml
│       │   └── mocks/
│       └── qemu/              # QEMU-based tests
│           ├── alpine-cloud.yaml
│           └── create-image.sh
└── docs/
    └── testing/               # This documentation
        ├── README.md
        ├── TESTING_ARCHITECTURE.md
        ├── DEVELOPER_GUIDE.md
        ├── COVERAGE.md
        └── REPORTING.md
```

---

## Key Concepts

### Test Types

| Type | Scope | Speed | When to Use |
|------|-------|-------|-------------|
| **Unit** | Single function/module | < 1s | Business logic, validation, serialization |
| **Integration** | Multiple modules/services | < 30s | API endpoints, database queries, RPC protocol |
| **E2E** | Full user flow | < 2min | Critical user journeys, regression testing |
| **System** | Complete system | < 5min | Hardware simulation, deployment verification |

### Testing Principles

1. **Arrange-Act-Assert (AAA)** — Structure tests in three clear phases
2. **Test Behavior, Not Implementation** — Focus on public APIs
3. **One Assertion Per Test** — Keep tests focused
4. **Deterministic Results** — No flaky tests
5. **Fast Feedback** — Optimize for speed

### Coverage Philosophy

- **80% line coverage** — Realistic target for most code
- **100% critical paths** — Security, auth, data integrity
- **Quality over quantity** — Meaningful tests, not vanity metrics
- **Integration tests count** — Not just unit tests

---

## CI/CD Integration

### GitHub Actions Workflow

**Trigger:** Every push and pull request

**Jobs:**
1. **Lint** — oxlint, cargo clippy, cargo fmt
2. **Test Schema** — Vitest with Cloudflare Workers pool
3. **Test Rust** — cargo test with WASM and ARM64 targets
4. **Integration Tests** — Docker simulation
5. **Build Verification** — Full build of all packages
6. **Security Audit** — cargo audit, bun audit, OWASP

**Status Checks:**

```
✓ Lint (2m 34s)
✓ Test Rust API (4m 12s)
⚠ Test Schema API (1m 45s) — Blocked
✓ Integration Tests (3m 28s)
✓ Build Verification (5m 16s)
✓ Security Audit (2m 08s)
```

**Quality Gates:**

- All tests must pass (except known blockers)
- Coverage must not decrease
- No security vulnerabilities
- Lint checks must pass

**Configuration:** [`.github/workflows/test.yml`](../../.github/workflows/test.yml)

---

## Coverage Dashboard

### Current Coverage Status

| Package | Line | Branch | Function | Status |
|---------|------|--------|----------|--------|
| **schema** | 0% | 0% | 0% | ⚠️ Blocked |
| **api** | 75% | 70% | 80% | ✅ On track |
| **agent** | 92% | 87% | 94% | ✅ Exceeding |
| **portal** | 0% | 0% | 0% | ⏳ Planned |
| **Overall** | ~75% | ~65% | ~70% | ⚠️ Below target |

### Coverage Tracking

- **Codecov:** https://codecov.io/gh/danielbodnar/ngfw.sh
- **Local HTML Reports:** `packages/{package}/coverage/index.html`
- **CI Artifacts:** Uploaded to GitHub Actions

### Coverage Improvement Plan

[View Detailed Plan →](./COVERAGE.md#improving-coverage)

---

## Test Reporting

### Report Types

- **CI/CD Test Results** — GitHub Actions (every commit)
- **Coverage Reports** — Codecov (every commit)
- **Weekly Test Summary** — Email (every Monday)
- **Monthly Quality Report** — PDF (first of month)
- **Security Audit** — HTML (weekly)

### Dashboards

- **Codecov:** Real-time coverage tracking
- **GitHub Actions:** Test results and artifacts
- **Custom Dashboard:** Grafana + InfluxDB (planned)

### Notifications

- **Slack:** Test failures, coverage drops
- **Email:** Weekly summaries, security alerts
- **GitHub:** PR comments, status checks

[View Reporting Details →](./REPORTING.md)

---

## Common Tasks

### Run All Tests

```bash
# From repository root
bun run test                      # Schema API tests
cd packages/api && cargo test     # Rust API tests
bun run test:integration:docker   # Integration tests
```

### Run Tests with Coverage

```bash
# Schema API
cd packages/schema
bun run test --coverage
open coverage/index.html

# Rust API
cd packages/api
cargo tarpaulin --out Html
open coverage/index.html
```

### Run Specific Test

```bash
# Schema API
cd packages/schema
bun run test tests/integration/tasks.test.ts

# Rust API
cd packages/api
cargo test test_auth_message -- --nocapture
```

### Debug Failing Test

```bash
# Enable verbose output
bun run test --reporter=verbose

# Run only failing test
bun run test --grep "specific test name"

# Use debugger
node --inspect-brk $(which vitest) run
```

### Fix Linting Issues

```bash
# TypeScript
bun run lint:fix

# Rust
cd packages/api
cargo clippy --fix --allow-dirty
cargo fmt
```

### Update Test Snapshots

```bash
# Update all snapshots
bun run test -u

# Update specific snapshot
bun run test tests/integration/tasks.test.ts -u
```

---

## Best Practices

### DO ✅

- Write descriptive test names
- Test one behavior per test
- Use proper assertions (`toBe`, `toHaveLength`, etc.)
- Clean up after tests (mocks, database)
- Test edge cases and error paths
- Keep tests fast (< 1s for unit tests)

### DON'T ❌

- Test implementation details
- Write tests that depend on each other
- Use hardcoded delays (`setTimeout`)
- Skip error handling tests
- Ignore flaky tests
- Chase 100% coverage everywhere

[View Detailed Best Practices →](./DEVELOPER_GUIDE.md#best-practices)

---

## Troubleshooting

### Issue: Vitest v4 + pool-workers incompatibility

**Status:** Blocking Schema API tests

**Workaround:** Downgrade to vitest v3 or wait for pool-workers v0.13

**Tracking:** https://github.com/cloudflare/workers-sdk/issues/XXXX

### Issue: QEMU networking fails

**Symptom:** Agent cannot connect to host API server

**Fix:** Use host networking mode or usermode networking

```bash
qemu-system-aarch64 -netdev user,id=net0,hostfwd=tcp::8080-:8080
```

### Issue: Docker BuildKit not enabled

**Symptom:** Multi-stage builds fail

**Fix:**

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

[View More Troubleshooting →](./DEVELOPER_GUIDE.md#troubleshooting)

---

## Contributing

### Adding New Tests

1. **Identify what to test** — Focus on behavior, not implementation
2. **Choose test type** — Unit, integration, or E2E
3. **Write test** — Follow AAA pattern (Arrange-Act-Assert)
4. **Verify coverage** — Check coverage report
5. **Update documentation** — Add to relevant test file

### Test Naming Convention

```typescript
// Good ✅
describe("Device API", () => {
  it("should create device with valid data", () => {});
  it("should return 400 for invalid data", () => {});
  it("should return 404 when device not found", () => {});
});

// Bad ❌
describe("Device", () => {
  it("test1", () => {});
  it("test device creation", () => {});
});
```

### Test File Organization

- **Co-located:** Place `.test.ts` files next to implementation
- **Test directory:** Use `tests/` for integration tests
- **Consistent naming:** Use `.test.ts` or `.spec.ts` consistently

---

## Resources

### Internal Documentation

- [Testing Architecture](./TESTING_ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Coverage & Quality Metrics](./COVERAGE.md)
- [Test Reporting](./REPORTING.md)

### External Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Vue Test Utils](https://test-utils.vuejs.org/)

### Tools

- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Cargo Test](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [cargo-tarpaulin](https://github.com/xd009642/tarpaulin) (Rust coverage)
- [Codecov](https://codecov.io/)

---

## Roadmap

### Current Sprint (Feb 2026)

- [x] Integration test environment (Docker + QEMU)
- [x] Rust API tests (120 tests passing)
- [ ] Resolve vitest v4 incompatibility
- [ ] Schema API tests (blocked)

### Next Sprint (Mar 2026)

- [ ] Portal test framework setup
- [ ] Vue component tests
- [ ] Composable tests
- [ ] E2E tests with Playwright

### Q2 2026

- [ ] 80% overall coverage
- [ ] 100% critical path coverage
- [ ] E2E test suite
- [ ] Performance benchmarking

---

## Support

### Get Help

- **Slack:** #engineering channel
- **GitHub:** Open an issue
- **Email:** engineering@ngfw.sh

### Reporting Bugs

Include:
- Test output and error messages
- Steps to reproduce
- Environment details (OS, versions)
- Relevant configuration files

---

## License

This testing documentation is part of the NGFW.sh project.

---

*Last updated: 2026-02-09*
