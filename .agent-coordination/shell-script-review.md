# Shell Script Review Report

**Date:** 2026-02-09
**Reviewer:** Claude (Task #12)
**Scope:** All `.sh` and `.nu` files in test directories

## Executive Summary

Reviewed **18 shell scripts** (17 Bash, 1 Nushell) across the test infrastructure. Overall quality is **good** with proper error handling and POSIX compliance. Found **15 issues** requiring attention, primarily related to:

- POSIX portability concerns in 3 scripts
- Error handling gaps in background process management
- Missing documentation in 8 scripts
- Bash-specific syntax in 2 scripts that should use `/bin/sh`
- One Nushell script with excellent patterns (reference implementation)

## Inventory

### Nushell Scripts (1)
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/e2e/runner.nu` ✅ EXCELLENT

### Bash/POSIX Shell Scripts (17)

#### Integration Tests - Root Level
1. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/run-qemu.sh`
2. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/run-docker.sh`
3. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/run-ci.sh`

#### Integration Tests - Docker
4. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/entrypoint.sh`
5. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-full-stack.sh`
6. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-firmware-adapter.sh`
7. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-performance.sh`
8. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-load.sh`
9. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/run-all-tests.sh`

#### Integration Tests - QEMU
10. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/qemu/launch.sh`
11. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/qemu/build-image.sh`

#### Integration Tests - Scenarios
12. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/scenarios/01-connection-auth.sh`
13. `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/scenarios/02-metrics-collection.sh`

#### Package Tests - Agent
14. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration/docker/entrypoint.sh`
15. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration/run-docker.sh`
16. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/run-tests.sh`

#### Package Tests - Portal
17. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/tests/run-integration-tests.sh`
18. `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/tests/run-qemu-tests.sh`

---

## Detailed Findings

### 🟢 EXCELLENT: Nushell E2E Runner

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/e2e/runner.nu`

**Strengths:**
- ✅ Excellent Nushell idioms and patterns
- ✅ Proper type annotations on all functions
- ✅ Comprehensive error handling with `try/catch`
- ✅ Well-documented with inline comments
- ✅ Clean data pipeline operations
- ✅ Proper use of `$env.PWD` and path operations
- ✅ Multiple exported commands for different use cases
- ✅ Table formatting for structured output

**Recommendations:**
- None - this is a reference implementation for Nushell scripts

---

### 🟡 ISSUE: run-qemu.sh - POSIX Compliance

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/run-qemu.sh`

**Issues:**

1. **Background Process Management (Lines 9-16)**
   ```sh
   MOCK_PID="" SERVE_PID="" QEMU_PID=""
   cleanup() {
     echo "Cleaning up..."
     [ -n "$QEMU_PID" ] && kill $QEMU_PID 2>/dev/null || true
     [ -n "$MOCK_PID" ] && kill $MOCK_PID 2>/dev/null || true
     [ -n "$SERVE_PID" ] && kill $SERVE_PID 2>/dev/null || true
     wait 2>/dev/null || true
   }
   ```
   **Problem:** Variables initialized as empty strings, then checked with `[ -n ]`. If PIDs are never set, this is safe, but it's cleaner to use `: ${VAR:=}` or just declare without value.

   **Recommendation:**
   ```sh
   MOCK_PID=""
   SERVE_PID=""
   QEMU_PID=""
   cleanup() {
     echo "Cleaning up..."
     [ -n "${QEMU_PID}" ] && kill "${QEMU_PID}" 2>/dev/null || true
     [ -n "${MOCK_PID}" ] && kill "${MOCK_PID}" 2>/dev/null || true
     [ -n "${SERVE_PID}" ] && kill "${SERVE_PID}" 2>/dev/null || true
     wait 2>/dev/null || true
   }
   ```

2. **Inline Bun Server (Line 44)**
   ```sh
   bun -e "Bun.serve({port:9999,fetch(r){const f=Bun.file('ngfw-agent');return f.exists().then(e=>e?new Response(f):new Response('not found',{status:404}))}})" &
   ```
   **Problem:** Complex inline JavaScript is hard to debug and maintain. Error handling is unclear.

   **Recommendation:** Extract to a separate file:
   ```sh
   # Create in tests/integration/qemu/serve-agent.js
   Bun.serve({
     port: 9999,
     async fetch(req) {
       const file = Bun.file('ngfw-agent');
       if (await file.exists()) {
         return new Response(file);
       }
       return new Response('not found', { status: 404 });
     }
   });
   ```
   Then call: `bun run "$SCRIPT_DIR/qemu/serve-agent.js" &`

3. **Missing Documentation**
   - No file header comment explaining purpose
   - No usage information

   **Recommendation:** Add shdoc-style header:
   ```sh
   #!/bin/sh
   # @file run-qemu.sh
   # @brief NGFW Agent QEMU integration test runner
   # @description
   #     Cross-compiles agent for aarch64, starts mock API and QEMU VM,
   #     then validates agent authentication.
   #
   # Prerequisites:
   #   - cross (Rust cross-compilation tool)
   #   - qemu-system-aarch64
   #   - bun runtime
   ```

**Priority:** Medium

---

### 🟡 ISSUE: run-docker.sh - Duplicate Script

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/run-docker.sh`

**Issues:**

1. **Script Duplication**
   - Nearly identical to `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration/run-docker.sh`
   - Only difference is compose file path

   **Recommendation:** Create a shared function or consolidate into one script with path detection.

2. **Missing Documentation**
   - No file header
   - No usage instructions

**Priority:** Low (functional, but creates maintenance burden)

---

### 🟢 GOOD: run-ci.sh

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/run-ci.sh`

**Strengths:**
- ✅ Excellent CI-specific optimizations
- ✅ Good error handling
- ✅ Proper environment detection
- ✅ JSON output for CI tools
- ✅ Comprehensive logging

**Minor Issues:**

1. **Line 104: Grep Pattern Could Be More Specific**
   ```sh
   AGENT_ERRORS=$(docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" logs agent 2>&1 | grep -i "error" | grep -v "ERRO" || true)
   ```
   **Problem:** Excludes "ERRO" but that might be a legitimate error prefix from structured logs.

   **Recommendation:**
   ```sh
   # Only exclude known false positives explicitly
   AGENT_ERRORS=$(docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" logs agent 2>&1 | \
     grep -iE "error|fatal|panic" | \
     grep -vE "ERRO.*expected_in_logs" || true)
   ```

**Priority:** Low

---

### 🟢 GOOD: entrypoint.sh (Both Versions)

**Files:**
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/entrypoint.sh`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/integration/docker/entrypoint.sh`

**Strengths:**
- ✅ Simple, focused, single purpose
- ✅ Proper error handling with `set -e`
- ✅ Wait loop with proper exit code checking

**Issues:**
- Identical files (duplication)

**Recommendation:** Use symlink or shared file.

**Priority:** Low

---

### 🟡 ISSUE: test-full-stack.sh - Fragile JSON Parsing

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-full-stack.sh`

**Issues:**

1. **JSON Parsing with grep/sed (Throughout)**
   ```sh
   FIRMWARE=$(echo "$STATUS" | grep -o '"firmware_version":"[^"]*"' | cut -d'"' -f4)
   MESSAGES=$(echo "$STATUS" | grep -o '"messages_received":[0-9]*' | grep -o '[0-9]*')
   ```
   **Problem:** Fragile. Breaks if JSON formatting changes or fields are nested differently.

   **Recommendation:** Use `jq` (already available in most test containers):
   ```sh
   FIRMWARE=$(echo "$STATUS" | jq -r '.firmware_version')
   MESSAGES=$(echo "$STATUS" | jq -r '.messages_received')
   ```

2. **Line 124: Using Bun for Pretty-Print**
   ```sh
   echo "$STATUS" | bun -e "console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()), null, 2))"
   ```
   **Problem:** This is correct, but mixing `bun` and shell makes script dependencies unclear.

   **Recommendation:** Document dependencies in header or use `jq`:
   ```sh
   echo "$STATUS" | jq '.'
   ```

**Priority:** Medium

---

### 🟡 ISSUE: test-firmware-adapter.sh - Same JSON Parsing Issues

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-firmware-adapter.sh`

**Issues:**
- Same grep-based JSON parsing (see test-full-stack.sh)
- Lines 20-26, 28-34, 39-44, 50-56, 61-67, 72-77: All use fragile grep patterns

**Recommendation:** Switch to `jq` or add it to test container if missing.

**Priority:** Medium

---

### 🟡 ISSUE: test-performance.sh - Nanosecond Arithmetic Issues

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-performance.sh`

**Issues:**

1. **Nanosecond Arithmetic (Lines 37-46)**
   ```sh
   START=$(date +%s%N)
   for i in $(seq 1 60); do
     if curl -s http://localhost:8787/status 2>/dev/null | grep -q '"authenticated":true'; then
       END=$(date +%s%N)
       LATENCY=$(( (END - START) / 1000000 ))
       echo "   Auth handshake: ${LATENCY}ms"
       break
     fi
     sleep 0.1
   done
   ```
   **Problem:** `date +%s%N` is not POSIX. Works on GNU/Linux but not on macOS/BSD.

   **Recommendation:** Check if available or fallback to seconds:
   ```sh
   if date +%s%N >/dev/null 2>&1; then
     START=$(date +%s%N)
     # ... nanosecond calculation
   else
     START=$(date +%s)
     # ... second-based calculation with lower precision
   fi
   ```

2. **Missing Error Handling**
   - No check if docker stats command fails
   - No validation if curl commands succeed before parsing

**Priority:** Medium

---

### 🟡 ISSUE: test-load.sh - Dynamic Compose File Generation

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/test-load.sh`

**Issues:**

1. **Inline Compose File Generation (Lines 40-91)**
   ```sh
   cat > "$LOAD_COMPOSE" <<EOF
   services:
     mock-api:
       ...
   EOF

   for i in $(seq 1 "$AGENTS"); do
     cat >> "$LOAD_COMPOSE" <<EOF
     agent-$i:
       ...
   EOF
   done
   ```
   **Problem:** Dynamically generating compose files is clever but hard to debug. No validation of generated YAML.

   **Recommendation:** Use docker-compose scale or create template with variable substitution:
   ```sh
   # Alternative: Use docker compose scale (if supported)
   docker compose -f "$SCRIPT_DIR/compose-load-template.yaml" up -d --scale agent=$AGENTS
   ```

2. **Resource Calculation (Lines 119, 150)**
   ```sh
   MEMORY=$(docker stats --no-stream --format "{{.Container}}\t{{.MemUsage}}" | grep agent | awk '{sum+=$2} END {print sum}')
   ```
   **Problem:** Assumes awk can parse memory units. Fails if format is "50MiB" vs "50MB".

   **Recommendation:** Parse and normalize units or document expected format.

**Priority:** Low (works, but brittle)

---

### 🟢 GOOD: run-all-tests.sh

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/docker/run-all-tests.sh`

**Strengths:**
- ✅ Clean test orchestration
- ✅ Proper result tracking
- ✅ Good error handling

**Minor Issue:**
- Could benefit from parallel test execution with background jobs

**Priority:** Low

---

### 🟢 GOOD: qemu/launch.sh

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/qemu/launch.sh`

**Strengths:**
- ✅ Proper prerequisite checking
- ✅ Multiple UEFI firmware path fallbacks
- ✅ Clear output messages

**No issues found.**

---

### 🟡 ISSUE: qemu/build-image.sh - Requires Root Access

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/qemu/build-image.sh`

**Issues:**

1. **Requires Sudo (Lines 31-46)**
   ```sh
   sudo modprobe nbd max_part=8 2>/dev/null || true
   sudo qemu-nbd --connect=/dev/nbd0 "$IMAGE_DIR/ngfw-test.qcow2"
   sudo mount -o rw /dev/nbd0p2 "$MOUNT_DIR"
   ```
   **Problem:** Script silently requires root privileges. No pre-check or clear error message.

   **Recommendation:**
   ```sh
   # Check for required privileges
   if [ "$(id -u)" -ne 0 ]; then
     echo "ERROR: This script requires root privileges (for NBD mount)"
     echo "Run with: sudo $0"
     exit 1
   fi
   ```

2. **NBD Cleanup Risk (Lines 45-46)**
   ```sh
   sudo umount "$MOUNT_DIR"
   rmdir "$MOUNT_DIR"
   sudo qemu-nbd --disconnect /dev/nbd0
   ```
   **Problem:** If script fails between lines 45-46, NBD device stays connected, blocking future runs.

   **Recommendation:** Add trap handler:
   ```sh
   cleanup() {
     if mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
       sudo umount "$MOUNT_DIR" 2>/dev/null || true
     fi
     [ -d "$MOUNT_DIR" ] && rmdir "$MOUNT_DIR" 2>/dev/null || true
     if [ -e /sys/block/nbd0 ]; then
       sudo qemu-nbd --disconnect /dev/nbd0 2>/dev/null || true
     fi
   }
   trap cleanup EXIT
   ```

**Priority:** High (can cause system resource leaks)

---

### 🟢 EXCELLENT: scenarios/01-connection-auth.sh

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/scenarios/01-connection-auth.sh`

**Strengths:**
- ✅ Comprehensive header documentation
- ✅ Colored output functions
- ✅ Proper cleanup with trap
- ✅ Clear success criteria
- ✅ Good assertion pattern
- ✅ Structured result tracking

**No issues found.** This is a reference implementation for scenario tests.

---

### 🟢 EXCELLENT: scenarios/02-metrics-collection.sh

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/integration/scenarios/02-metrics-collection.sh`

**Strengths:**
- ✅ Excellent temporal logic for interval checking
- ✅ Proper range validation for metrics
- ✅ Clear success criteria
- ✅ Good error reporting

**Minor Issue:**

1. **Integer Extraction (Lines 143, 156)**
   ```sh
   CPU_INT=$(echo "$CPU" | cut -d. -f1)
   MEMORY_INT=$(echo "$MEMORY" | cut -d. -f1)
   ```
   **Problem:** Fails if value is "100" (no decimal). Use `awk` or bash parameter expansion.

   **Recommendation:**
   ```sh
   CPU_INT=${CPU%.*}  # Remove decimal portion
   MEMORY_INT=${MEMORY%.*}
   ```

**Priority:** Low

---

### 🔴 ISSUE: packages/agent/tests/run-tests.sh - Bash-Specific Syntax

**File:** `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/agent/tests/run-tests.sh`

**Critical Issues:**

1. **Uses `#!/usr/bin/env bash` But Should Be Nushell**
   - File is in Bash but violates the Nushell-first policy
   - Uses Bash arrays and `${BASH_SOURCE[0]}`
   - Lines 9-10, 189-220: Bash-specific syntax

2. **Violates CLAUDE.md Rules**
   - Rule: "Always use NuShell (v0.107.0+) when generating shell scripts"
   - This script should be rewritten in Nushell

**Recommendation:** Rewrite as Nushell script:

```nushell
#!/usr/bin/env nu
# NGFW Agent Integration Test Runner

export def main [
  --verbose (-v)              # Enable verbose logging
  --coverage (-c)             # Generate coverage report
  --threads (-t): int = 1     # Number of test threads
  --timeout: int = 300        # Test timeout in seconds
  suite: string = "all"       # Test suite to run
] {
  # Setup environment
  setup-environment

  # Run tests based on suite
  match $suite {
    "all" => { run-all-tests }
    "websocket" => { run-test-suite "integration_websocket" "WebSocket Tests" }
    "dispatcher" => { run-test-suite "integration_dispatcher" "Dispatcher Tests" }
    "adapters" => { run-test-suite "integration_adapters" "Adapter Tests" }
    "metrics" => { run-test-suite "integration_metrics" "Metrics Tests" }
    "e2e" => { run-test-suite "integration_e2e" "E2E Tests" }
    _ => { error make {msg: $"Unknown suite: ($suite)"} }
  }
}

def setup-environment [] {
  # Make mock binaries executable
  let mock_bins = ($env.PWD | path join "tests" "integration" "mock-bins")
  if ($mock_bins | path exists) {
    chmod +x ($mock_bins | path join "*")
  }

  # Set environment variables
  $env.RUST_LOG = "info"
  $env.RUST_BACKTRACE = "1"
  $env.TEST_MODE = "1"
}

def run-test-suite [suite: string, description: string] {
  print $"Running ($description)..."

  try {
    cargo test --test $suite -- --test-threads=1 --nocapture
    print $"✓ ($description) passed"
  } catch {
    print $"✗ ($description) failed"
    exit 1
  }
}

def run-all-tests [] {
  let suites = [
    ["integration_websocket" "WebSocket Tests"]
    ["integration_dispatcher" "Dispatcher Tests"]
    ["integration_adapters" "Adapter Tests"]
    ["integration_metrics" "Metrics Tests"]
    ["integration_e2e" "E2E Tests"]
  ]

  mut failed = 0
  for suite in $suites {
    try {
      run-test-suite $suite.0 $suite.1
    } catch {
      $failed = $failed + 1
    }
  }

  if $failed > 0 {
    error make {msg: $"($failed) test suite(s) failed"}
  }
}
```

**Priority:** High (violates project standards)

---

### 🟡 ISSUE: packages/portal-astro/tests/*.sh - Bash When Should Be Nushell

**Files:**
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/tests/run-integration-tests.sh`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/tests/run-qemu-tests.sh`

**Issues:**

1. **Uses Bash Instead of Nushell**
   - Both use `#!/usr/bin/env bash` with Bash-specific features
   - Lines 7: `set -euo pipefail` (Bash-specific)
   - Lines 9: `${BASH_SOURCE[0]}` (Bash-specific)

2. **Could Consolidate**
   - Both scripts have similar structure
   - Could be one Nushell script with `--env` flag

**Recommendation:** Rewrite as unified Nushell script:

```nushell
#!/usr/bin/env nu
# Portal Astro Integration Test Runner

export def main [
  --env: string = "docker"  # Test environment (docker or qemu)
] {
  match $env {
    "docker" => { run-docker-tests }
    "qemu" => { run-qemu-tests }
    _ => { error make {msg: $"Unknown environment: ($env)"} }
  }
}

def run-docker-tests [] {
  print "Starting Docker integration tests..."

  # Start services
  docker compose -f ([$env.PWD "docker-compose.test.yml"] | path join) up -d api portal

  # Wait for health
  wait-for-service "api"
  wait-for-service "portal"

  # Run tests
  try {
    cd ($env.PWD | path join "..")
    bun test --run
    docker compose run --rm tests
  } catch {
    docker compose down -v
    error make {msg: "Tests failed"}
  }

  docker compose down -v
}

def run-qemu-tests [] {
  # Implementation similar to run-docker-tests
  # but with QEMU-specific setup
}

def wait-for-service [name: string, timeout: int = 60] {
  for i in 1..$timeout {
    let status = (docker compose ps $name | complete)
    if ($status.stdout | str contains "healthy") {
      return
    }
    sleep 1sec
  }
  error make {msg: $"Service ($name) not ready after ($timeout)s"}
}
```

**Priority:** Medium (functional but violates standards)

---

## Summary of Issues by Priority

### 🔴 High Priority (2 issues)
1. **qemu/build-image.sh** - NBD cleanup risk, requires root without checking
2. **packages/agent/tests/run-tests.sh** - Should be Nushell, not Bash

### 🟡 Medium Priority (6 issues)
1. **run-qemu.sh** - Inline Bun server, missing docs
2. **test-full-stack.sh** - Fragile JSON parsing with grep
3. **test-firmware-adapter.sh** - Same JSON parsing issues
4. **test-performance.sh** - Non-POSIX nanosecond time, missing error checks
5. **scenarios/02-metrics-collection.sh** - Integer extraction edge case
6. **packages/portal-astro/tests/*.sh** - Should be Nushell

### 🟢 Low Priority (7 issues)
1. **run-docker.sh** - Duplicate script
2. **run-ci.sh** - Grep pattern could be more specific
3. **entrypoint.sh** - Duplicate files
4. **test-load.sh** - Dynamic compose generation brittle
5. **run-all-tests.sh** - Could use parallel execution
6. Various scripts - Missing documentation headers

---

## Recommendations

### Immediate Actions

1. **Fix NBD Cleanup in qemu/build-image.sh**
   - Add trap handler for cleanup
   - Add sudo check at start
   - Test failure scenarios

2. **Rewrite Bash Scripts to Nushell**
   - `packages/agent/tests/run-tests.sh` → `.nu`
   - `packages/portal-astro/tests/run-integration-tests.sh` → `.nu`
   - `packages/portal-astro/tests/run-qemu-tests.sh` → `.nu`
   - Use `/workspaces/code/github.com/danielbodnar/ngfw.sh/tests/e2e/runner.nu` as reference

3. **Switch to jq for JSON Parsing**
   - Replace all `grep -o '"field":"[^"]*"'` with `jq -r '.field'`
   - Add jq to Docker test containers if missing

### Short-Term Improvements

1. **Add shdoc Headers**
   - All `.sh` files should have file headers
   - Document prerequisites, usage, behavior

2. **Consolidate Duplicate Scripts**
   - Merge duplicate entrypoint.sh files
   - Create shared functions for common patterns

3. **Add Parallel Test Execution**
   - Use background jobs in run-all-tests.sh
   - Wait for all and collect results

### Long-Term Strategy

1. **Migrate All Shell Scripts to Nushell**
   - Better data handling
   - More maintainable
   - Aligns with project standards

2. **Create Shared Test Library**
   - Common functions in Nushell module
   - Reduce duplication across test scripts

3. **Add Script Linting to CI**
   - ShellCheck for remaining .sh files
   - nu-lint for .nu files
   - Automated enforcement of standards

---

## Testing Validation

All findings are based on static analysis. Recommended validation:

1. Run each test script in isolation
2. Test failure scenarios (network issues, missing deps)
3. Verify cleanup handlers work correctly
4. Test on different platforms (Linux, macOS if applicable)

---

## Appendix: Quick Reference

### POSIX vs Bash Compatibility

| Feature | POSIX ✅ | Bash-only ❌ |
|---------|---------|-------------|
| `set -e` | ✅ | ✅ |
| `set -u` | ✅ | ✅ |
| `set -o pipefail` | ❌ | ✅ |
| `[[  ]]` | ❌ | ✅ |
| `${VAR:=default}` | ✅ | ✅ |
| `$BASH_SOURCE` | ❌ | ✅ |
| `date +%s%N` | ❌ (GNU ext) | ✅ (on Linux) |

### JSON Parsing Alternatives

```sh
# ❌ Fragile
FIELD=$(echo "$JSON" | grep -o '"field":"[^"]*"' | cut -d'"' -f4)

# ✅ Robust
FIELD=$(echo "$JSON" | jq -r '.field')

# ✅ Nushell
let field = ($json | from json | get field)
```

---

**End of Report**
