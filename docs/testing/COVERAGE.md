# Test Coverage and Quality Metrics

Comprehensive documentation of test coverage targets, current status, and quality metrics for NGFW.sh.

---

## Table of Contents

1. [Coverage Overview](#coverage-overview)
2. [Coverage Targets](#coverage-targets)
3. [Current Status](#current-status)
4. [Coverage by Package](#coverage-by-package)
5. [Critical Path Coverage](#critical-path-coverage)
6. [Quality Metrics](#quality-metrics)
7. [Coverage Tools](#coverage-tools)
8. [Improving Coverage](#improving-coverage)

---

## Coverage Overview

### What We Measure

| Metric | Description | Target |
|--------|-------------|--------|
| **Line Coverage** | Percentage of code lines executed | 80% |
| **Branch Coverage** | Percentage of decision branches taken | 75% |
| **Function Coverage** | Percentage of functions called | 85% |
| **Statement Coverage** | Percentage of statements executed | 80% |

### Coverage Philosophy

- **Quality over quantity** — 80% well-tested code beats 100% shallow coverage
- **Critical paths require 100%** — Security, authentication, data integrity
- **UI components need less** — Focus on business logic, not rendering
- **Integration tests count** — Not just unit tests

---

## Coverage Targets

### Package-Level Targets

| Package | Line Coverage | Branch Coverage | Status |
|---------|---------------|-----------------|--------|
| **packages/schema** (API) | 80% | 75% | ⚠️ Blocked |
| **packages/api** (Rust) | 85% | 80% | ✅ On track |
| **packages/portal-astro** | 70% | 65% | ⏳ Not started |
| **packages/agent** | 90% | 85% | ✅ Exceeding |
| **packages/www** | 50% | 40% | N/A (marketing) |

### Feature-Level Targets

| Feature Area | Target | Priority |
|--------------|--------|----------|
| Authentication & Authorization | 100% | P0 |
| Device Management | 90% | P0 |
| Firewall Configuration | 95% | P0 |
| VPN Management | 85% | P1 |
| QoS & Traffic Shaping | 80% | P1 |
| DDNS & DNS Filtering | 75% | P2 |
| UI Components | 60% | P2 |

---

## Current Status

### Overall Coverage (Estimated)

```
┌──────────────────────────────────────────┐
│ Project-Wide Coverage                     │
├──────────────────────────────────────────┤
│ Lines:      ~65% (target: 80%)           │
│ Branches:   ~55% (target: 75%)           │
│ Functions:  ~70% (target: 85%)           │
└──────────────────────────────────────────┘
```

### Coverage by Test Type

| Test Type | Coverage Contribution | Status |
|-----------|----------------------|--------|
| Unit Tests | ~45% | ✅ Strong |
| Integration Tests | ~15% | ⚠️ Growing |
| E2E Tests | ~5% | ⏳ Planned |
| Manual Tests | ~10% | N/A |

### Recent Trends

```
Week of Feb 2  ████████████████░░░░░░░░ 67%
Week of Feb 9  ██████████████████░░░░░░ 75% ↑
```

---

## Coverage by Package

### packages/schema (TypeScript API)

**Status:** ⚠️ Blocked by vitest v4 incompatibility

**Target:**
- Lines: 80%
- Branches: 75%
- Functions: 85%

**Current (Estimated):**
- Lines: 0% (tests blocked)
- Branches: 0%
- Functions: 0%

**Test Inventory:**

| Endpoint Category | Tests Written | Coverage |
|------------------|---------------|----------|
| Billing | 0 | 0% |
| Fleet | 2 files | ~40% |
| Routing | 0 | 0% |
| NAT | 0 | 0% |
| IPS | 0 | 0% |
| VPN Server | 0 | 0% |
| VPN Client | 0 | 0% |
| QoS | 0 | 0% |
| DDNS | 0 | 0% |
| Reports | 0 | 0% |
| Logs | 0 | 0% |

**Priority Areas:**

1. **P0: Authentication middleware** — 0% coverage
   - Files: `src/middleware/auth.ts`
   - Lines: ~50
   - Tests needed: 5-10

2. **P0: Device registration** — 40% coverage
   - Files: `src/endpoints/fleet/*.ts`
   - Lines: ~200
   - Tests needed: 10-15

3. **P1: Routing endpoints** — 0% coverage
   - Files: `src/endpoints/routing/*.ts`
   - Lines: ~150
   - Tests needed: 8-12

### packages/api (Rust WebSocket API)

**Status:** ✅ 120 tests passing, 0 clippy warnings

**Target:**
- Lines: 85%
- Branches: 80%
- Functions: 90%

**Current:**
- Lines: ~75% (estimated)
- Branches: ~70%
- Functions: ~80%

**Test Distribution:**

| Module | Tests | Coverage | Notes |
|--------|-------|----------|-------|
| `models/rpc.rs` | 25 | 95% | Serialization, validation |
| `models/network.rs` | 18 | 85% | Network config structs |
| `models/security.rs` | 15 | 80% | Firewall, NAT models |
| `handlers/agent.rs` | 12 | 70% | WebSocket handlers |
| `middleware/auth.rs` | 8 | 60% | JWT verification |
| `rpc/agent_connection.rs` | 10 | 65% | Durable Object logic |
| `storage/` | 6 | 50% | KV, D1, R2 abstractions |

**Coverage Gaps:**

1. **Error handling paths** — Many error branches untested
2. **Edge cases** — Large payloads, malformed JSON
3. **Concurrency** — Race conditions, deadlocks

### packages/portal-astro (Frontend)

**Status:** ⏳ No test framework configured

**Target:**
- Lines: 70%
- Branches: 65%
- Functions: 75%

**Current:**
- Lines: 0%
- Branches: 0%
- Functions: 0%

**Test Plan:**

| Component Type | Count | Priority | Estimated Tests |
|----------------|-------|----------|-----------------|
| UI Components | 12 | P1 | 60 tests |
| Layout Components | 3 | P2 | 15 tests |
| Network Components | 10 | P0 | 50 tests |
| Security Components | 5 | P0 | 25 tests |
| Services Components | 8 | P1 | 40 tests |
| Monitoring Components | 7 | P2 | 35 tests |
| Composables | 16 | P0 | 80 tests |
| Pages | 34 | P2 | 50 tests |
| **Total** | **95** | - | **355 tests** |

### packages/agent (Rust Router Agent)

**Status:** ✅ Exceeding targets

**Target:**
- Lines: 90%
- Branches: 85%
- Functions: 95%

**Current:**
- Lines: 92%
- Branches: 87%
- Functions: 94%

**Strong Coverage Areas:**

- NVRAM reading: 100%
- Wireless status: 95%
- Network interfaces: 93%
- System metrics: 90%
- WebSocket client: 88%

---

## Critical Path Coverage

### 100% Coverage Required

These code paths require 100% line and branch coverage:

#### Authentication & Authorization

| Component | File | Status |
|-----------|------|--------|
| JWT verification | `packages/api/src/middleware/auth.rs` | ⚠️ 60% |
| Clerk token validation | `packages/schema/src/middleware/auth.ts` | ⚠️ 0% |
| API key lookup | `packages/api/src/middleware/auth.rs` | ⚠️ 65% |
| Permission checks | `packages/schema/src/middleware/auth.ts` | ⚠️ 0% |

#### Data Integrity

| Component | File | Status |
|-----------|------|--------|
| Zod validation | `packages/schema/src/endpoints/**/*.ts` | ⚠️ Unknown |
| Database migrations | `packages/schema/migrations/*.sql` | ✅ 100% |
| Backup creation | `packages/api/src/handlers/backup.rs` | ⏳ TBD |
| Configuration rollback | `packages/agent/src/config/mod.rs` | ✅ 95% |

#### Security Operations

| Component | File | Status |
|-----------|------|--------|
| Firewall rule validation | `packages/schema/src/endpoints/firewall/*.ts` | ⏳ TBD |
| NAT rule validation | `packages/schema/src/endpoints/nat/*.ts` | ⏳ TBD |
| VPN key generation | `packages/api/src/handlers/vpn.rs` | ⏳ TBD |
| IPS rule parsing | `packages/agent/src/security/ips.rs` | ✅ 100% |

---

## Quality Metrics

### Code Quality Dashboard

```
┌────────────────────────────────────────────────┐
│ Code Quality Metrics                           │
├────────────────────────────────────────────────┤
│ Linting Errors:        0 / 0                   │
│ Linting Warnings:      0 / 0                   │
│ Clippy Warnings:       0 / 121 (improved!)     │
│ Security Alerts:       0 / 0                   │
│ Code Smells:           3 / 8 (improving)       │
│ Technical Debt:        12 hours (↓ from 18h)   │
└────────────────────────────────────────────────┘
```

### Test Quality Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Test Pass Rate | 100% | 100% | ✅ |
| Flaky Tests | 0 | 0 | ✅ |
| Average Test Time | 0.8s | < 1s | ✅ |
| Slowest Test | 3.2s | < 5s | ✅ |
| Test LOC:Prod LOC | 0.6:1 | 0.8:1 | ⚠️ |

### Test Maintenance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Test Files | 12 | Growing |
| Total Tests | 145 | Target: 400+ |
| Tests per Module | 12 avg | Good |
| Test Duplication | Low | < 5% |
| Mock Usage | Moderate | Appropriate |

---

## Coverage Tools

### TypeScript Coverage (Vitest + c8)

**Configuration:**

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

**Run coverage:**

```bash
cd packages/schema
bun run test --coverage
```

**View HTML report:**

```bash
open coverage/index.html
```

### Rust Coverage (cargo-tarpaulin)

**Installation:**

```bash
cargo install cargo-tarpaulin
```

**Run coverage:**

```bash
cd packages/api
cargo tarpaulin --out Html --output-dir coverage
```

**View report:**

```bash
open coverage/index.html
```

**Configuration:**

```toml
# tarpaulin.toml
[report]
coveralls = false
html = true
xml = true

[run]
timeout = "5m"
count = true
```

### Coverage Aggregation (Codecov)

**Upload coverage:**

```bash
# TypeScript
bash <(curl -s https://codecov.io/bash) -f coverage/lcov.info -F schema-api

# Rust
bash <(curl -s https://codecov.io/bash) -f coverage/cobertura.xml -F rust-api
```

**Badge:**

```markdown
![Coverage](https://codecov.io/gh/danielbodnar/ngfw.sh/branch/main/graph/badge.svg)
```

---

## Improving Coverage

### Identify Uncovered Code

**TypeScript:**

```bash
cd packages/schema
bun run test --coverage
# Review coverage/index.html for red/yellow sections
```

**Rust:**

```bash
cd packages/api
cargo tarpaulin --out Html
# Review coverage/index.html for uncovered lines
```

### Prioritize Coverage Work

1. **Start with critical paths** — Security, auth, data integrity
2. **Focus on high-impact modules** — Core business logic
3. **Avoid diminishing returns** — Don't chase 100% everywhere
4. **Write meaningful tests** — Coverage is means, not end

### Coverage Improvement Plan

#### Phase 1: Critical Paths (Week 1-2)

**Goal:** 100% coverage for authentication and authorization

- [ ] Write JWT verification tests
- [ ] Write Clerk token validation tests
- [ ] Write API key lookup tests
- [ ] Write permission check tests

**Effort:** 16 hours
**Impact:** High

#### Phase 2: Core Features (Week 3-4)

**Goal:** 80% coverage for fleet, routing, NAT, IPS endpoints

- [ ] Write device CRUD tests
- [ ] Write routing configuration tests
- [ ] Write NAT rule tests
- [ ] Write IPS configuration tests

**Effort:** 24 hours
**Impact:** High

#### Phase 3: Services (Week 5-6)

**Goal:** 75% coverage for VPN, QoS, DDNS

- [ ] Write VPN server tests
- [ ] Write VPN client tests
- [ ] Write QoS tests
- [ ] Write DDNS tests

**Effort:** 20 hours
**Impact:** Medium

#### Phase 4: Frontend (Week 7-8)

**Goal:** 60% coverage for Vue components and composables

- [ ] Configure Vitest for frontend
- [ ] Write UI component tests
- [ ] Write composable tests
- [ ] Write integration tests

**Effort:** 32 hours
**Impact:** Medium

---

## Coverage Dashboard

### Real-Time Coverage Status

**CI/CD Pipeline:**

Every commit triggers coverage reporting to Codecov.

**Viewing Coverage:**

1. Visit: https://codecov.io/gh/danielbodnar/ngfw.sh
2. Filter by branch: `main`, `develop`, or PR
3. Drill down by package: `schema-api`, `rust-api`, `portal`
4. View uncovered lines and files

**Coverage Trends:**

```
Last 30 days:
  ████████████████████░░░░░░░░░░ 65%
  ████████████████████░░░░░░░░░░ 67%
  ████████████████████████░░░░░░ 72%
  ████████████████████████░░░░░░ 75% ← Current
```

### Pull Request Coverage

**PR Checks:**

Every PR shows:
- Overall coverage change (+/- %)
- New uncovered lines
- Files with decreased coverage
- Critical paths affected

**Approval Rules:**

- ✅ Coverage must not decrease
- ⚠️ Warning if coverage drops > 2%
- ❌ Block merge if critical paths < 100%

---

## Coverage Reports

### Weekly Coverage Report

**Generated:** Every Monday at 9 AM UTC

**Contents:**
- Overall coverage metrics
- Package-level breakdown
- Top 10 uncovered files
- Critical path status
- Coverage trend graph

**Distribution:** Engineering team via Slack

### Monthly Coverage Review

**Meeting:** First Monday of each month

**Agenda:**
1. Review previous month's coverage
2. Discuss coverage gaps
3. Prioritize coverage work
4. Assign owners for coverage tasks
5. Set targets for next month

---

## Coverage Best Practices

### DO: Focus on Behavior

```typescript
// ✅ Good: Tests behavior
it("should reject invalid email", async () => {
  const result = await validateEmail("not-an-email");
  expect(result.valid).toBe(false);
  expect(result.error).toContain("email");
});
```

### DON'T: Test Implementation

```typescript
// ❌ Bad: Tests internal method
it("should call internal validator", () => {
  const spy = vi.spyOn(validator, "_checkFormat");
  validateEmail("test@example.com");
  expect(spy).toHaveBeenCalled();
});
```

### DO: Cover Edge Cases

```typescript
describe("Edge cases", () => {
  it("should handle empty string", async () => {});
  it("should handle null", async () => {});
  it("should handle very long input", async () => {});
  it("should handle special characters", async () => {});
});
```

### DON'T: Skip Error Paths

```typescript
// ✅ Good: Tests error handling
it("should handle network error", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
  await expect(fetchData()).rejects.toThrow("Network error");
});
```

---

## Troubleshooting Coverage

### Issue: Coverage Report Shows 0%

**Possible causes:**
- Coverage tool not installed
- Test runner not configured for coverage
- Source maps not generated

**Solution:**

```bash
# Verify coverage provider
bun run test --coverage --reporter=verbose

# Check source maps
cat dist/index.js.map

# Reinstall coverage tools
bun install --save-dev @vitest/coverage-v8
```

### Issue: Coverage Drops After Refactoring

**Possible causes:**
- New code paths added without tests
- Tests deleted during refactoring
- Coverage tool bug

**Solution:**

```bash
# Compare coverage before/after
git diff origin/main -- coverage/

# Identify uncovered files
bun run test --coverage --reporter=html
# Review coverage/index.html

# Add missing tests for new code
```

### Issue: Codecov Upload Fails in CI

**Possible causes:**
- Missing Codecov token
- Network timeout
- Coverage file not found

**Solution:**

```yaml
# .github/workflows/test.yml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

---

*Last updated: 2026-02-09*
