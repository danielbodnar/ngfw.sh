# GitHub Issues Migration Plan

**Created:** 2026-02-09
**Status:** READY FOR EXECUTION
**API Status:** Rate-limited (retry after cooldown)

---

## Migration Summary

### Items to Migrate

1. **Critical Findings from Multi-Agent Analysis** (17 agents completed)
2. **Plan Files** (3 files in `.agent-coordination/`)
3. **Status Tracking** (22 JSON files in `.agent-coordination/status/`)
4. **Pending Tasks** (1 task from TaskList)
5. **Historical Work** (FINAL-STATUS-REPORT.md items)

---

## Priority 1: Critical Security & Architecture Issues

### Issue 1: [CRITICAL] Rotate committed secret key in .env

**Labels:** `security`, `critical`, `technical-debt`
**Assignee:** TBD
**Milestone:** Security Hardening

**Description:**
```markdown
## Security Issue

**Priority:** CRITICAL
**Found by:** Architecture Review Agent
**Report:** `.agent-coordination/architecture-review.md`

### Issue
Committed Clerk secret key in `.env` file:
```
sk_test_vRvUA9DtHDdpRKy9Dwo2VdWATv78yCpkuSwXggAoCw
```

### Impact
- Security risk even for test keys
- Establishes dangerous pattern
- `.gitignore` does not exclude `.env` files

### Action Required
1. Rotate the Clerk test key immediately
2. Add `.env` to `.gitignore`
3. Remove from git history: `git filter-repo --path .env --invert-paths`
4. Use environment variables or secrets management

### References
- Architecture Review: TD-01 (Critical)
- Report: `.agent-coordination/architecture-review.md`
```

---

### Issue 2: [CRITICAL] Fix 5 oxlint runtime errors

**Labels:** `bug`, `critical`, `testing`

**Description:**
```markdown
## Runtime Errors

**Priority:** CRITICAL
**Found by:** oxlint Analyzer + Code Quality Analyzer
**Reports:**
- `.agent-coordination/oxlint-report.md`
- `.agent-coordination/code-quality-report.md`

### Issue
5 errors in `tests/integration/framework/index.ts`:
- Using `await` inside non-async static methods

### Impact
- Runtime errors in test framework
- Tests cannot execute properly
- Blocks integration testing

### Fix
Add `async` keyword to 5 static methods:
```typescript
// WRONG
static setupClerk() {
  await clerk.initialize();
}

// CORRECT
static async setupClerk() {
  await clerk.initialize();
}
```

### Files
- `packages/portal-astro/tests/integration/framework/index.ts`

### Effort
15 minutes
```

---

### Issue 3: [CRITICAL] Fix Nushell parser error in demo-lifecycle.nu

**Labels:** `bug`, `critical`, `scripts`

**Description:**
```markdown
## Parser Error

**Priority:** CRITICAL
**Found by:** Nushell Validator + Code Quality Analyzer
**Reports:**
- `.agent-coordination/nushell-validation-report.md`
- `.agent-coordination/code-quality-report.md`

### Issue
Backslash line continuation on line 320 causes parser error:
```nushell
^ssh ... "command \
  continuation"
```

Nushell rejects backslash as invalid escape sequence.

### Impact
- Script cannot execute
- Blocks demo deployment
- Syntax error

### Fix
Remove backslash continuation:
```nushell
^ssh ... "command
  continuation"
```

### Files
- `scripts/demo-lifecycle.nu:320`

### Effort
5 minutes
```

---

## Priority 2: High-Impact Architecture & Performance

### Issue 4: [HIGH] Resolve dual API architecture

**Labels:** `architecture`, `high-priority`, `technical-debt`

**Description:**
```markdown
## Architectural Issue

**Priority:** HIGH
**Found by:** Architecture Review Agent
**Report:** `.agent-coordination/architecture-review.md`

### Issue
Two separate API servers with overlapping responsibilities:
- **Rust API** (`packages/api`): WebSocket + REST endpoints
- **TypeScript Schema API** (`packages/schema`): Same REST endpoints + OpenAPI

Both access same D1 and KV storage → data consistency risk

### Impact
- Unclear ownership of endpoints
- Data consistency issues
- Maintenance burden
- Developer confusion

### Recommendation
Choose one strategy:
1. **Option A:** Schema API handles all REST, Rust API only WebSocket/Durable Objects
   - Effort: 2-3 days refactoring
2. **Option B:** Deprecate one API server entirely
   - Effort: 3-5 days if keeping Rust, 1-2 days if keeping TypeScript

### References
- Architecture Review: TD-04 (High Priority)
- Technical Debt Item
```

---

### Issue 5: [HIGH] Decompose 1255-line storage monolith

**Labels:** `refactoring`, `high-priority`, `technical-debt`

**Description:**
```markdown
## Technical Debt

**Priority:** HIGH
**Found by:** Architecture Review Agent
**Report:** `.agent-coordination/architecture-review.md`

### Issue
Single 1255-line file handles ALL storage operations:
- Location: `packages/api/src/storage/mod.rs`
- Domains: fleet, wan, lan, wifi, dhcp, routing, firewall, nat, ips, vpn, qos, ddns, dns, traffic, billing, user, reports, logs, onboarding, backup, firmware, system

### Impact
- Unmaintainable
- Most functions return hardcoded stub data
- No separation of concerns
- Testing difficulty

### Recommendation
Decompose into domain-specific storage modules:
```
packages/api/src/storage/
├── fleet.rs
├── network.rs
├── security.rs
├── services.rs
├── system.rs
└── mod.rs (coordination only)
```

### Effort
2-4 days

### References
- Architecture Review: TD-02 (Critical)
```

---

### Issue 6: [HIGH] Implement JWT caching for 93% auth improvement

**Labels:** `performance`, `high-priority`, `enhancement`

**Description:**
```markdown
## Performance Optimization

**Priority:** HIGH
**Found by:** Performance Engineer Agent
**Report:** `.agent-coordination/performance-analysis.md`

### Issue
JWT validation on every request without caching:
- Current: 150ms per request
- Target: 10ms per request
- **Improvement: 93% reduction**

JWKS fetched repeatedly from Clerk.

### Impact
- Poor auth performance
- Unnecessary external API calls
- Increased latency

### Solution
Implement JWT token caching in KV with 5-minute TTL:
```typescript
// Cache JWT validation results
const cacheKey = `jwt:${token.substring(0, 16)}`;
const cached = await env.KV.get(cacheKey);
if (cached) return JSON.parse(cached);

// Validate and cache
const validated = await clerk.validateJWT(token);
await env.KV.put(cacheKey, JSON.stringify(validated), { expirationTtl: 300 });
```

### Expected Impact
- Auth latency: 150ms → 10ms (93% reduction)
- Overall API P95: 800ms → 250ms

### Effort
4-6 hours

### Phase
Phase 1: Quick Wins (Week 1-2)
```

---

### Issue 7: [HIGH] Add database indexes for 80% query improvement

**Labels:** `performance`, `high-priority`, `database`

**Description:**
```markdown
## Performance Optimization

**Priority:** HIGH
**Found by:** Performance Engineer Agent
**Report:** `.agent-coordination/performance-analysis.md`

### Issue
Missing indexes on critical columns:
- `owner_id`
- `device_id`
- `timestamp`
- `level`
- `category`

### Impact
- Slow queries: 100-300ms
- Poor performance at scale
- Full table scans

### Solution
Add indexes to D1 schema:
```sql
CREATE INDEX idx_devices_owner_id ON devices(owner_id);
CREATE INDEX idx_logs_device_id_timestamp ON logs(device_id, timestamp DESC);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_metrics_device_id_timestamp ON metrics(device_id, timestamp DESC);
```

### Expected Impact
- Device list: 100ms → 20ms (80% reduction)
- Log queries: 300ms → 50ms (83% reduction)

### Effort
2-4 hours

### Phase
Phase 1: Quick Wins (Week 1-2)
```

---

### Issue 8: [HIGH] Fix 15 adapter integration test failures

**Labels:** `testing`, `high-priority`, `rust`

**Description:**
```markdown
## Test Failures

**Priority:** HIGH
**Found by:** Rust Test Runner Agent
**Report:** `.agent-coordination/rust-test-report.md`

### Issue
Adapter integration tests: 4/19 passing (21% success rate)
- 15 failures across dnsmasq, iptables, WiFi, WireGuard adapters

### Root Cause
Tests require system adapters or proper mocking.

### Impact
- Core network configuration functionality untested
- Cannot validate adapter implementations
- Production readiness unknown

### Solution
1. Review test environment setup
2. Improve mocking infrastructure
3. Add platform guards for Linux-specific tests
4. Document test requirements

### Effort
2-4 hours investigation + fixes

### Files
- `packages/agent/tests/integration_adapters.rs`

### References
- Rust Test Report: Critical Issue #1
```

---

### Issue 9: [HIGH] Implement missing portal-astro pages

**Labels:** `frontend`, `high-priority`, `enhancement`

**Description:**
```markdown
## Blocking E2E Tests

**Priority:** HIGH
**Found by:** Portal-Astro Specialist Agent
**Report:** `.agent-coordination/portal-astro-test-report.md`

### Issue
30 E2E tests ready but blocked by missing UI pages:
- `/src/pages/sign-in.astro`
- `/src/pages/sign-up.astro`
- `/src/pages/onboarding.astro`
- `/src/pages/security/nat.astro`
- Missing UI components: modals, toasts, user menu

### Impact
- E2E test suite cannot run
- User flows untested
- Production readiness blocked

### Current Status
- Integration tests: 33/35 passing (94%)
- Test infrastructure: Production-ready
- Waiting on: UI implementation

### Effort
~24 hours for missing pages

### References
- Portal-Astro Test Report
- 4 comprehensive reports in `.agent-coordination/`
```

---

## Priority 3: Medium-Impact Issues

### Issue 10: [MEDIUM] Fix Vitest version incompatibility

**Labels:** `dependencies`, `medium-priority`, `testing`

**Description:**
```markdown
## Version Incompatibility

**Priority:** MEDIUM
**Found by:** Vitest Runner Agent
**Report:** `.agent-coordination/vitest-report.md`

### Issue
Using Vitest 1.6.0 but @cloudflare/vitest-pool-workers expects 2.0.x-2.1.x

Error: `@vitest/utils/helpers` export `isNegativeNaN` not found

### Impact
- Test suite cannot execute
- 140+ tests blocked
- No test coverage data

### Solution
Update Vitest to 2.0.x:
```bash
bun remove vitest
bun add vitest@^2.0.0 --dev
```

### Effort
30 minutes + regression testing

### References
- Vitest Report: Critical Issue
```

---

### Issue 11: [MEDIUM] Apply 555 biome auto-fixes

**Labels:** `code-quality`, `medium-priority`, `auto-fix`

**Description:**
```markdown
## Code Quality Improvements

**Priority:** MEDIUM
**Found by:** Code Quality Analyzer
**Report:** `.agent-coordination/code-quality-report.md`

### Issue
Biome found 41 errors + 625 warnings, 555 are auto-fixable:
- Unused imports in Vue components
- Unused variables
- String concatenation → template literals

### Impact
- Code quality
- Maintainability
- Linting CI failures

### Solution
Run auto-fix:
```bash
bunx @biomejs/biome check --write .
```

### Effort
5 minutes runtime + code review

### References
- Code Quality Report
```

---

### Issue 12: [MEDIUM] Fix React hook test failures (9 tests)

**Labels:** `testing`, `medium-priority`, `react`

**Description:**
```markdown
## Test Failures

**Priority:** MEDIUM
**Found by:** Portal Test Specialist Agent
**Report:** `.agent-coordination/portal-test-report.md`

### Issue
9 React hook tests failing due to setInterval + fake timers:
- Creates infinite loops in tests
- Overall: 31/40 tests passing (77.5%)

### Current Status
- ✅ ALL 19 API TESTS PASS (100%)
- ⚠️ Hook tests: 12/21 passing (57%)

### Solutions (3 options)
1. **Simplest:** Remove fake timers entirely
2. **Better:** Use real timers with shorter intervals
3. **Best:** Fix fake timer advancement logic

### Effort
1-2 hours

### References
- Portal Test Report
- Tests: `packages/portal/src/hooks/useDevices.test.ts`
```

---

### Issue 13: [MEDIUM] Fix mode update logic test failures

**Labels:** `testing`, `medium-priority`, `rust`

**Description:**
```markdown
## Test Failures

**Priority:** MEDIUM
**Found by:** Rust Test Runner Agent
**Report:** `.agent-coordination/rust-test-report.md`

### Issue
Mode update tests: 12/13 passing (92%)
- `test_dispatcher_mode_update` - Boolean assertion failure
- `test_e2e_mode_transition` - Related E2E failure

### Root Cause
Mode transition logic not setting success flag correctly.

### Impact
- Agent mode switching functionality uncertain
- Shadow/Takeover mode transitions may be broken

### Solution
Debug mode update handler or ModeAck response creation in dispatcher.

### Effort
1-2 hours (highest ROI for test fixes)

### Files
- `packages/agent/src/dispatcher.rs`
- `packages/agent/tests/integration_dispatcher.rs`

### References
- Rust Test Report: Medium Priority Issue #2
```

---

### Issue 14: [MEDIUM] Fix WebSocket connection test failures

**Labels:** `testing`, `medium-priority`, `websocket`

**Description:**
```markdown
## Test Failures

**Priority:** MEDIUM
**Found by:** Rust Test Runner Agent
**Report:** `.agent-coordination/rust-test-report.md`

### Issue
WebSocket tests: 3/6 passing (50%)
- `test_connection_auth_handshake_failure` - Timeout
- `test_message_routing_inbound_to_dispatcher` - Routing failure
- `test_reconnection_with_backoff` - Retry logic failure

### Root Cause
Test timeouts too low (2 seconds), async coordination issues.

### Solution
1. Increase timeouts to 5-10 seconds
2. Review async coordination in tests
3. Add more logging for debugging

### Effort
0.5-2 hours

### Files
- `packages/agent/tests/integration_websocket.rs`

### References
- Rust Test Report: Medium Priority Issue #3
```

---

## Priority 4: Low-Impact Improvements

### Issue 15: [LOW] Prefix 39 unused Rust test variables

**Labels:** `code-quality`, `low-priority`, `rust`

**Description:**
```markdown
## Clippy Warnings

**Priority:** LOW
**Found by:** Rust Clippy Analyzer
**Report:** `.agent-coordination/clippy-analysis-report.md`

### Issue
39 unused variables in test code (61% of violations):
- Variables: `_issues`, `_config`, `_outbound_rx`, `_shutdown_rx`
- All in test files (not production code)

### Impact
- Style/clarity only
- No functional impact

### Solution
Prefix with underscore:
```rust
let _config = build_config();  // Indicates intentionally unused
```

### Effort
15 minutes

### References
- Clippy Analysis Report
```

---

### Issue 16: [LOW] Fix 8 absurd type comparisons (u64 >= 0)

**Labels:** `code-quality`, `low-priority`, `rust`

**Description:**
```markdown
## Clippy Warnings

**Priority:** LOW
**Found by:** Rust Clippy Analyzer
**Report:** `.agent-coordination/clippy-analysis-report.md`

### Issue
8 absurd comparisons of unsigned integers against zero:
```rust
if value >= 0 { ... }  // Always true for u64
```

### Impact
- Dead code paths
- Correctness opportunity

### Solution
Remove redundant comparisons or change logic:
```rust
// If checking for zero:
if value == 0 { ... }

// If checking for positive:
if value > 0 { ... }
```

### Effort
15 minutes

### References
- Clippy Analysis Report
```

---

## Historical Work Items (From FINAL-STATUS-REPORT.md)

### Phase 3 Implementation Plans

These were previously planned but not yet executed. Convert to issues:

#### Issue 17: Implement Monitoring Pages

**Labels:** `feature`, `frontend`, `monitoring`

**Description:** See `.agent-coordination/monitoring-pages-plan.md`

**Components:**
- DashboardGrid.vue
- DashboardViewer.vue
- ReportList.vue
- ReportGenerator.vue
- LogViewer.vue
- LogFilter.vue

**Dashboards:**
- Network Overview
- Security Events
- DNS Analytics
- WiFi Performance
- WAN Health
- VPN Metrics
- System Resources
- Traffic Analysis
- Firewall Rules
- QoS Metrics

**Effort:** 2-3 days

---

#### Issue 18: Implement Network Pages

**Labels:** `feature`, `frontend`, `networking`

**Description:** See `.agent-coordination/network-pages-plan.md`

**Pages:**
- WAN Configuration
- LAN Management
- WiFi Settings
- DHCP Server
- Routing Tables
- DNS Settings

**Effort:** 2-3 days

---

#### Issue 19: Implement Security Pages

**Labels:** `feature`, `frontend`, `security`

**Description:** See `.agent-coordination/security-pages-plan.md`

**Pages:**
- Firewall Rules
- NAT Configuration
- IPS Settings
- VPN Server
- VPN Client

**Effort:** 2-3 days

---

## Status Tracking Migration

Convert 22 status JSON files to GitHub Projects or Labels:

### API Status Files
1. `qos-api.json`
2. `vpn-server-api.json`
3. `vpn-client-api.json`
4. `routing-api.json`
5. `nat-api.json`
6. `ips-api.json`
7. `ddns-api.json`
8. `monitoring-api.json`

### Frontend Status Files
9. `monitoring-pages.json`
10. `network-pages.json`
11. `security-pages.json`
12. `services-pages.json`
13. `vue-components.json`
14. `vue-composables.json`
15. `astro-setup.json`

### Infrastructure Status Files
16. `integration-coordinator.json`
17. `onboarding-flow.json`
18. `code-reviewer.json`
19. `linter.json`

**Recommendation:** Create a GitHub Project board with columns:
- Not Started
- In Progress
- Waiting on Dependencies
- Completed

---

## Execution Commands

When GitHub API rate limit resets, run:

```bash
#!/usr/bin/env bash
# Execute GitHub Issues Migration

# Critical Issues (Priority 1)
gh issue create --title "[CRITICAL] Rotate committed secret key in .env file" \
  --body-file .agent-coordination/issues/01-secret-key.md \
  --label "security,critical,technical-debt"

gh issue create --title "[CRITICAL] Fix 5 oxlint runtime errors" \
  --body-file .agent-coordination/issues/02-oxlint-errors.md \
  --label "bug,critical,testing"

gh issue create --title "[CRITICAL] Fix Nushell parser error in demo-lifecycle.nu" \
  --body-file .agent-coordination/issues/03-nushell-parser.md \
  --label "bug,critical,scripts"

# High Priority Issues (Priority 2)
gh issue create --title "[HIGH] Resolve dual API architecture" \
  --body-file .agent-coordination/issues/04-dual-api.md \
  --label "architecture,high-priority,technical-debt"

gh issue create --title "[HIGH] Decompose 1255-line storage monolith" \
  --body-file .agent-coordination/issues/05-storage-monolith.md \
  --label "refactoring,high-priority,technical-debt"

gh issue create --title "[HIGH] Implement JWT caching for 93% auth improvement" \
  --body-file .agent-coordination/issues/06-jwt-caching.md \
  --label "performance,high-priority,enhancement"

gh issue create --title "[HIGH] Add database indexes for 80% query improvement" \
  --body-file .agent-coordination/issues/07-database-indexes.md \
  --label "performance,high-priority,database"

gh issue create --title "[HIGH] Fix 15 adapter integration test failures" \
  --body-file .agent-coordination/issues/08-adapter-tests.md \
  --label "testing,high-priority,rust"

gh issue create --title "[HIGH] Implement missing portal-astro pages" \
  --body-file .agent-coordination/issues/09-portal-astro-pages.md \
  --label "frontend,high-priority,enhancement"

# Medium Priority Issues (Priority 3)
gh issue create --title "[MEDIUM] Fix Vitest version incompatibility" \
  --body-file .agent-coordination/issues/10-vitest-version.md \
  --label "dependencies,medium-priority,testing"

gh issue create --title "[MEDIUM] Apply 555 biome auto-fixes" \
  --body-file .agent-coordination/issues/11-biome-fixes.md \
  --label "code-quality,medium-priority,auto-fix"

gh issue create --title "[MEDIUM] Fix React hook test failures (9 tests)" \
  --body-file .agent-coordination/issues/12-react-hook-tests.md \
  --label "testing,medium-priority,react"

gh issue create --title "[MEDIUM] Fix mode update logic test failures" \
  --body-file .agent-coordination/issues/13-mode-update-tests.md \
  --label "testing,medium-priority,rust"

gh issue create --title "[MEDIUM] Fix WebSocket connection test failures" \
  --body-file .agent-coordination/issues/14-websocket-tests.md \
  --label "testing,medium-priority,websocket"

# Low Priority Issues (Priority 4)
gh issue create --title "[LOW] Prefix 39 unused Rust test variables" \
  --body-file .agent-coordination/issues/15-unused-variables.md \
  --label "code-quality,low-priority,rust"

gh issue create --title "[LOW] Fix 8 absurd type comparisons (u64 >= 0)" \
  --body-file .agent-coordination/issues/16-type-comparisons.md \
  --label "code-quality,low-priority,rust"

# Feature Implementation
gh issue create --title "Implement Monitoring Pages" \
  --body-file .agent-coordination/issues/17-monitoring-pages.md \
  --label "feature,frontend,monitoring"

gh issue create --title "Implement Network Pages" \
  --body-file .agent-coordination/issues/18-network-pages.md \
  --label "feature,frontend,networking"

gh issue create --title "Implement Security Pages" \
  --body-file .agent-coordination/issues/19-security-pages.md \
  --label "feature,frontend,security"

echo "✅ GitHub issues created successfully!"
echo "📊 Next: Create GitHub Project board for status tracking"
```

---

## Summary

**Total Issues to Create:** 19

**Breakdown:**
- Priority 1 (Critical): 3 issues
- Priority 2 (High): 6 issues
- Priority 3 (Medium): 5 issues
- Priority 4 (Low): 2 issues
- Features: 3 issues

**Estimated Total Effort:**
- Critical fixes: 4-8 hours
- High priority: 1-2 weeks
- Medium priority: 1 week
- Low priority: 1-2 hours
- Features: 1-2 weeks

**Next Steps:**
1. Wait for GitHub API rate limit reset
2. Execute migration script
3. Create GitHub Project board
4. Assign issues to milestones
5. Begin work on critical issues
