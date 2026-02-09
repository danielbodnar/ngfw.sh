# Code Quality Report

**Generated:** 2026-02-09T19:41Z
**Branch:** main (commit a967f8c)
**Overall Assessment:** Needs Improvement

---

## Summary

| Tool | Files Scanned | Errors | Warnings | Status |
|------|--------------|--------|----------|--------|
| oxlint | 295 | 5 | 36 | FAIL |
| biome check | 276 | 41 | 625 | FAIL |
| cargo clippy | 3 crates | 55+ | 0 | FAIL (exit 101) |
| tsc (schema) | -- | 11 | 0 | FAIL |
| tsc (portal) | -- | 8 | 0 | FAIL |
| tsc (www) | -- | 5 | 0 | FAIL |
| tsc (portal-astro) | -- | 25 | 0 | FAIL |
| Nushell (runner.nu) | 1 | 0 | 0 | PASS |
| Nushell (demo-lifecycle.nu) | 1 | 1 | 0 | FAIL |

**Total Issues: 812+ across all tools**

---

## 1. oxlint Results (TypeScript/JavaScript)

**Command:** `bunx oxlint --config .oxlintrc.json --fix .`
**Result:** 5 errors, 36 warnings across 295 files (157 rules, 404ms)

### Errors (5) -- Must Fix

1. **`tests/integration/framework/index.ts` (5 errors)** -- `await` used in non-async functions
   - Lines 61, 73, 84, 96, 108: Static methods (`apiAgentTest`, `agentFirmwareTest`, `uiApiTest`, `storageTest`, `e2eTest`) use `await import(...)` but are not declared `async`.

### Warnings (36) -- Should Fix

**Category: Unused Variables (`no-unused-vars`) -- 31 warnings**

| File | Variable/Parameter | Line |
|------|--------------------|------|
| `packages/schema/src/endpoints/dashboards/dashboardRead.ts` | `c` (parameter) | 36 |
| `packages/agent/tests/integration/mock-api/server.ts` | `TEST_OWNER_ID` | 6 |
| `packages/agent/tests/integration/mock-api/server.ts` | `firmware_version` | 62 |
| `packages/portal-astro/tests/mocks/handlers.ts` | `body` | 57 |
| `packages/portal-astro/tests/mocks/handlers.ts` | `params` (7 instances) | 61, 85, 109, 195, 207, 234, 259, 290, 334 |
| `packages/portal-astro/tests/mocks/handlers.ts` | `deviceId` (9 instances) | 74, 100, 123, 134, 140, 149, 160, 181, 225, 248, 278, 303 |
| `tests/integration/framework/mocks/firmware-adapter.ts` | `args` (parameter) | 566 |
| `packages/portal-astro/tests/integration/api-client.test.ts` | `mockFetch` (import) | 12 |
| `packages/portal/e2e/auth.spec.ts` | `context` (parameter) | 50 |
| `packages/portal/e2e/device-list.spec.ts` | `page` (parameter) | 9 |
| `tests/integration/framework/isolation/index.ts` | `id`, `err` | 144, 195 |
| `tests/e2e/orchestrator.ts` | `duration`, `suites` (x2) | 408, 458, 468 |

**Category: Jest (`require-to-throw-message`) -- 2 warnings**

| File | Line | Issue |
|------|------|-------|
| `packages/portal/src/hooks/useDevices.test.ts` | 526 | `toThrow()` missing message argument |
| `packages/portal/src/hooks/useDevices.test.ts` | 577 | `toThrow()` missing message argument |

---

## 2. Biome Check Results (TypeScript/JavaScript/Vue/Astro)

**Command:** `bunx @biomejs/biome check --write <src dirs>`
**Result:** 41 errors, 625 warnings, 7 infos (555 suggested fixes skipped as unsafe)

### Key Error Categories

**`lint/correctness/noUnusedImports` (FIXABLE)** -- Multiple files in portal-astro:
- `Header.astro`: Unused imports `DeviceSelector`, `UserMenu`
- `DashboardGrid.vue`: Unused import `Card`
- `DashboardViewer.vue`: Unused imports `Card`, `Spinner`
- `LogViewer.vue`: Unused imports `computed`, `Badge`, `Card`, `Table`
- `LanConfig.vue`: Unused imports `Button`, `Card`, `Input`, `Toggle`

**`lint/correctness/noUnusedVariables` (FIXABLE)** -- Multiple files:
- `Sidebar.astro`: `navigation`, `isActive`
- `DashboardGrid.vue`: `props`, `navigateToDashboard`
- `LogViewer.vue`: `props`
- `LanConfig.vue`: `handleSave`

**`lint/style/useTemplate` (FIXABLE)** -- String concatenation instead of template literals:
- `Sidebar.astro:51`: `href + "/"` should be `` `${href}/` ``

**Note:** 653 additional diagnostics were truncated (exceeded `--max-diagnostics` limit). The full 666 issues (41 errors + 625 warnings) are largely auto-fixable with `biome check --write --unsafe`.

---

## 3. Cargo Clippy Results (Rust)

**Command:** `cargo clippy --manifest-path Cargo.toml --all-targets -- -D warnings`
**Result:** FAIL (exit code 101) -- compilation errors in test files

### Workspace Members
- `ngfw-protocol` (packages/protocol) -- Compiled successfully
- `ngfw-api` (packages/api) -- Compiled successfully
- `ngfw-agent` (packages/agent) -- FAILED (test compilation errors)

### Error Breakdown by Test File

#### `packages/agent/tests/integration_metrics.rs` (21 errors)

| Category | Count | Details |
|----------|-------|---------|
| `clippy::collapsible_if` | 2 | Lines 92, 359 -- Nested `if let` can be collapsed with `&&` |
| `clippy::manual_range_contains` | 2 | Lines 107, 112 -- Use `(0..=3).contains(&val)` instead |
| `clippy::for_kv_map` | 1 | Line 229 -- Use `.values()` instead of iterating `(_name, rates)` |
| `clippy::absurd_extreme_comparisons` | 7 | Lines 230, 231, 253, 257, 261, 284, 288, 292 -- Comparing `u64 >= 0` is always true |
| `unused_comparisons` | 7 | Same lines as above -- Useless comparisons on unsigned types |

#### `packages/agent/tests/integration_adapters.rs` (4 errors)

| Category | Count | Details |
|----------|-------|---------|
| `unused_variables` | 3 | `issues` (104), `apply_result` (320), `rollback_result` (325) |
| `clippy::let_and_return` | 1 | Line 37-42 -- Unnecessary `let` binding before return |

#### `packages/agent/tests/integration_websocket.rs` (28 errors)

| Category | Count | Details |
|----------|-------|---------|
| `unused_variables` | 22 | Multiple `config`, `outbound_rx`, `inbound_tx`, `shutdown_rx`, `server_task` variables |
| `unused_mut` | 1 | Line 76 -- `mut outbound_rx` does not need to be mutable |
| `dead_code` | 5 | `MockApiServer` struct and its methods (`new`, `url`, `send_to_all`, `recv_message`) never used |

#### `packages/agent/tests/integration_dispatcher.rs` (4 errors)

| Category | Count | Details |
|----------|-------|---------|
| `unused_variables` | 2 | `inbound_tx` (567), `outbound_rx` (568) |
| `unused_mut` | 1 | Line 568 -- `mut outbound_rx` unnecessary |
| `clippy::len_zero` | 1 | Line 391 -- Use `!is_empty()` instead of `.len() > 0` |

#### `packages/agent/tests/integration_e2e.rs` (1 error)

| Category | Count | Details |
|----------|-------|---------|
| `clippy::collapsible_if` | 1 | Line 33 -- Nested `if let` blocks can be collapsed |

---

## 4. TypeScript Type Checking Results

### packages/schema (11 errors)

**Root cause:** `model.serializer` type incompatibility with chanfana's `MetaInput` type.

The D1 endpoint base classes (from chanfana) expect `serializer: (obj: object) => object`, but the schema defines more specific types like `(obj: Record<string, string | number | boolean>) => Record<...>`. This is a **contravariance issue** -- the parameter type `Record<string, ...>` is narrower than `object`.

**Affected endpoints (10 errors, same pattern):**
- `billing/planList.ts`, `billing/planRead.ts`
- `qos/ruleCreate.ts`, `qos/ruleDelete.ts`, `qos/ruleList.ts`, `qos/ruleUpdate.ts`
- `vpn-client/profileCreate.ts`, `vpn-client/profileDelete.ts`, `vpn-client/profileList.ts`, `vpn-client/profileUpdate.ts`

**Other error (1):**
- `reports/reportDelete.ts:54` -- Argument of type `{}` not assignable to `string | string[]`

### packages/portal (8 errors)

| File | Line | Error | Description |
|------|------|-------|-------------|
| `App.tsx` | 515 | TS18048 | `domain` possibly undefined |
| `App.tsx` | 1058 | TS2532 | Object possibly undefined |
| `App.tsx` | 1062 | TS2532 | Object possibly undefined |
| `App.tsx` | 2082 | TS18048 | `log.action` possibly undefined |
| `App.tsx` | 2084 | TS18048 | `log.proto` possibly undefined |
| `App.tsx` | 2274 | TS18048 | `q.query` possibly undefined |
| `App.tsx` | 3271 | TS2532 | Object possibly undefined |
| `api.test.ts` | 126 | TS2352 | Incomplete mock Response type cast |

### packages/www (5 errors)

**Root cause:** `PricingCard` component does not accept `className` prop.

| File | Line | Description |
|------|------|-------------|
| `App.tsx` | 558 | `className` not in `PricingCard` props |
| `App.tsx` | 647 | Same issue |
| `App.tsx` | 672 | Same issue |
| `App.tsx` | 730 | Same issue |
| `App.tsx` | 753 | Same issue |

### packages/portal-astro (25 errors)

**Vue module resolution (24 errors):**
All `.vue` component imports in `components/ui/index.ts` (lines 8-31) produce TS2307 errors because TypeScript cannot find type declarations for `.vue` files. This requires adding a `shims-vue.d.ts` declaration file or configuring `vue-tsc`.

**Type inference error (1):**
- `composables/usePolling.ts:150` -- Complex `Ref<T>` type mismatch in return value.

---

## 5. Nushell Script Validation

### tests/e2e/runner.nu -- PASS
- Parses successfully with `nu --commands "source ..."`
- Well-structured with proper type annotations
- Good use of `try/catch` error handling
- Appropriate use of nushell data pipelines

### scripts/demo-lifecycle.nu -- FAIL (1 syntax error)
- **Line 320:** Bash-style backslash line continuation (`\`) inside a string literal is not valid Nushell syntax
- The `docker run` command uses `\` to continue lines, which Nushell interprets as an escape character
- **Fix:** Use nushell string wrapping (parentheses or single-line) instead of backslash continuation

**Additional observations for demo-lifecycle.nu:**
- Uses `echo` (line 316) which is a nushell built-in but in this context piping to `ssh` may not work as expected -- consider `$config | ^ssh ...` instead
- Uses `exit 1` which is valid but `error make` would be more idiomatic
- The `&&` chaining inside SSH command strings (lines 286-289) is fine since those execute on the remote bash shell, not locally

---

## 6. Manual Review Observations

### Structural Concerns

1. **Monolithic components:** `packages/portal/src/App.tsx` (3271+ lines) and `packages/www/src/App.tsx` (753+ lines) are excessively large single-file components. These should be decomposed into smaller, focused components.

2. **Test mock duplication:** `packages/portal-astro/tests/mocks/handlers.ts` has extensive repeated patterns for deviceId extraction and params destructuring that could be centralized.

3. **Unused test infrastructure:** The `MockApiServer` struct in `integration_websocket.rs` is fully implemented but never used, suggesting incomplete test implementation.

### Security Notes

- `.env` file exists at project root -- verify it is not committed with actual secrets (it is in `.gitignore`)
- `packages/agent/tests/integration/mock-api/server.ts` contains hardcoded test API keys (`test-api-key-secret-001`) -- acceptable for test fixtures only

---

## 7. Recommended Priority Actions

### Critical (Must Fix)

1. **Add `async` keyword** to 5 static methods in `tests/integration/framework/index.ts` that use `await`
2. **Fix Nushell syntax error** in `scripts/demo-lifecycle.nu:320` -- replace bash backslash continuation
3. **Fix the 55+ Rust clippy warnings** in agent test files (mostly unused variables and trivially fixable patterns)

### High Priority

4. **Add `shims-vue.d.ts`** to `packages/portal-astro` to resolve 24 Vue module resolution errors
5. **Fix serializer type compatibility** in `packages/schema` endpoints -- widen the parameter type to `object` or use type assertions
6. **Add `className` prop** to `PricingCard` component in `packages/www` or remove invalid prop usage
7. **Run `biome check --write --unsafe`** to auto-fix 555 safe suggestions (unused imports, template literals, variable prefixing)

### Medium Priority

8. **Add null checks** for possibly-undefined properties in `packages/portal/src/App.tsx`
9. **Prefix unused Rust variables** with `_` in all agent test files
10. **Remove dead code** -- `MockApiServer` in `integration_websocket.rs`
11. **Decompose large components** -- `App.tsx` files in portal and www packages

### Low Priority

12. **Add error messages** to `toThrow()` assertions in `useDevices.test.ts`
13. **Replace `.len() > 0`** with `!is_empty()` in Rust test assertions
14. **Collapse nested `if let`** blocks using `&&` syntax in Rust tests

---

## 8. Tools Configuration Status

| Tool | Config File | Status |
|------|-------------|--------|
| oxlint | `.oxlintrc.json` | Configured (157 rules, 15 plugins) |
| biome | None | Not configured (using defaults) |
| dprint | None | Not configured |
| cargo clippy | Default | Using `-D warnings` |
| TypeScript | Per-package `tsconfig.json` | Configured |
| ESLint | None | Not configured (replaced by oxlint) |

**Recommendation:** Add a `biome.json` configuration file to the project root to customize biome rules and ignore patterns (especially for generated files, node_modules, and test fixtures). This will reduce noise and allow `--write` mode to work more effectively.
