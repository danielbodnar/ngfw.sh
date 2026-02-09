# E2E Test Orchestration Framework

Comprehensive end-to-end testing framework for NGFW.sh platform that coordinates testing across QEMU and Docker environments with intelligent sequencing, parallel execution, and detailed reporting.

## Quick Start

```bash
# Run all tests (both Docker and QEMU)
bun run tests/e2e/cli.ts

# Run smoke tests only
bun run tests/e2e/cli.ts --smoke

# Run Docker tests only
bun run tests/e2e/cli.ts --env docker

# Run specific test categories
bun run tests/e2e/cli.ts --tag agent --tag metrics

# Run with verbose output
bun run tests/e2e/cli.ts --verbose
```

## Using Nushell Runner

```bash
# Run all tests
./tests/e2e/runner.nu

# Run smoke tests
./tests/e2e/runner.nu --smoke

# List available test suites
./tests/e2e/runner.nu --list

# Display latest report
./tests/e2e/runner.nu --report

# Run shortcut commands
./tests/e2e/runner.nu smoke
./tests/e2e/runner.nu prereq
./tests/e2e/runner.nu perf
```

## Package.json Scripts

```bash
# Full test suite
bun run test:e2e

# Smoke tests only
bun run test:e2e:smoke

# Docker tests
bun run test:e2e:docker

# QEMU tests
bun run test:e2e:qemu

# Prerequisites check
bun run test:e2e:prereq
```

## Architecture

### Components

1. **Orchestrator** (`orchestrator.ts`)
   - Test suite management and registration
   - Dependency resolution and execution planning
   - Parallel execution with batching
   - Result aggregation and reporting
   - Fixture management

2. **Test Suites** (`suites.ts`)
   - 25+ comprehensive test suites
   - Categories: Infrastructure, Build, Connectivity, Auth, Metrics, Protocol, Performance
   - Tags for flexible filtering
   - Dependency declarations

3. **CLI Runner** (`cli.ts`)
   - Command-line interface with rich options
   - Environment filtering (docker/qemu/both)
   - Tag-based filtering
   - Parallel/sequential execution modes
   - Fail-fast mode

4. **Nushell Runner** (`runner.nu`)
   - Alternative Nushell-based interface
   - Structured data pipelines
   - Native table output
   - Report comparison tools
   - Watch mode

5. **Fixtures** (`fixtures/`)
   - Test credentials
   - Configuration templates
   - Test data

## Test Suites

### Infrastructure Tests
- `infra-docker-prerequisites` - Docker and BuildKit availability
- `infra-qemu-prerequisites` - QEMU and toolchain availability

### Build Tests
- `build-agent-docker` - Cross-compile agent for Docker
- `build-agent-qemu` - Cross-compile agent for QEMU

### Connectivity Tests
- `agent-connect-docker` - Agent WebSocket connection (Docker)
- `agent-connect-qemu` - Agent WebSocket connection (QEMU)

### Authentication Tests
- `auth-valid-credentials` - Valid credentials acceptance
- `auth-invalid-credentials` - Invalid credentials rejection

### Metrics Tests
- `metrics-collection-docker` - System metrics collection
- `metrics-format-validation` - Metrics schema validation

### WebSocket Protocol Tests
- `ws-ping-pong` - Ping/pong keep-alive
- `ws-reconnection` - Automatic reconnection
- `message-sequence-auth-status` - Message ordering

### Firmware Detection Tests
- `firmware-version-detection` - NVRAM firmware version reading

### Performance Tests
- `perf-startup-time` - Connection time < 10s
- `perf-metrics-interval` - Metrics reporting interval

### E2E Integration Tests
- `e2e-full-lifecycle-docker` - Complete agent lifecycle (Docker)
- `e2e-full-lifecycle-qemu` - Complete agent lifecycle (QEMU)
- `cross-platform-metrics-consistency` - Cross-environment validation

## Dependency Management

Tests automatically execute in phases based on dependencies:

```
Phase 1: Prerequisites
  └─ infra-docker-prerequisites
  └─ infra-qemu-prerequisites

Phase 2: Build
  └─ build-agent-docker (depends on infra-docker-prerequisites)
  └─ build-agent-qemu (depends on infra-qemu-prerequisites)

Phase 3: Connectivity
  └─ agent-connect-docker (depends on build-agent-docker)
  └─ agent-connect-qemu (depends on build-agent-qemu)

Phase 4: Feature Tests (parallel)
  └─ auth-valid-credentials
  └─ metrics-collection-docker
  └─ ws-ping-pong
  └─ firmware-version-detection

Phase 5: Integration
  └─ e2e-full-lifecycle-docker
  └─ e2e-full-lifecycle-qemu
```

## Parallel Execution

The orchestrator supports parallel execution with configurable batch sizes:

```typescript
const orchestrator = new E2EOrchestrator({
  parallel: true,
  maxParallel: 3,  // Run up to 3 tests concurrently
});
```

Tests within the same phase can run in parallel if they have no interdependencies.

## Retries and Timeouts

Each test suite can specify retries and timeout:

```typescript
{
  id: "agent-connect-docker",
  timeout: 120000,  // 2 minutes
  retries: 2,       // Retry up to 2 times on failure
  // ...
}
```

## Fixtures

Test fixtures are JSON files loaded automatically based on suite declarations:

```typescript
{
  id: "auth-valid-credentials",
  fixtures: ["test-credentials"],  // Loads fixtures/test-credentials.json
  // ...
}
```

## Reports

The framework generates multiple report formats:

### JSON Report
```json
{
  "summary": {
    "total": 25,
    "passed": 24,
    "failed": 1,
    "duration": 245000,
    "success": false
  },
  "results": [...]
}
```

### JUnit XML Report
```xml
<testsuites name="E2E Tests" tests="25" failures="1">
  <testsuite name="E2E Test Suite">
    <testcase name="agent-connect-docker" .../>
  </testsuite>
</testsuites>
```

### HTML Report
Interactive HTML report with summary statistics and detailed test results.

## CLI Options

```
Options:
  --env <docker|qemu|both>     Test environment (default: both)
  --tag <tag>                  Filter by tag (can be used multiple times)
  --exclude-tag <tag>          Exclude by tag
  --parallel                   Run tests in parallel (default: true)
  --sequential                 Run tests sequentially
  --max-parallel <n>           Max parallel tests (default: 3)
  --fail-fast                  Stop on first failure
  --retries <n>                Number of retries (default: 1)
  --timeout <ms>               Test timeout in milliseconds
  --verbose                    Verbose output
  --smoke                      Run only smoke tests
  --prereq                     Run only prerequisite checks
  --performance                Run only performance tests
  --list                       List all available test suites
  --help                       Show help message
```

## Examples

### Run smoke tests on Docker only
```bash
bun run tests/e2e/cli.ts --env docker --smoke
```

### Run agent and metrics tests with verbose output
```bash
bun run tests/e2e/cli.ts --tag agent --tag metrics --verbose
```

### Run tests sequentially with fail-fast
```bash
bun run tests/e2e/cli.ts --sequential --fail-fast
```

### Exclude performance tests
```bash
bun run tests/e2e/cli.ts --exclude-tag performance
```

### Run with custom timeout and retries
```bash
bun run tests/e2e/cli.ts --timeout 300000 --retries 3
```

## Prerequisites

### Docker Environment
- Docker with BuildKit enabled
- QEMU user-mode (for aarch64 emulation)
  ```bash
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
  ```

### QEMU Environment
- `qemu-system-aarch64`
- `edk2-aarch64` (UEFI firmware)
- `mkisofs` or `genisoimage` (cloud-init ISO creation)

### Both Environments
- `cross` (Rust cross-compiler)
  ```bash
  cargo install cross
  ```
- Bun (JavaScript runtime)

## Integration with CI/CD

The framework is designed for CI/CD integration:

```yaml
# .github/workflows/e2e-tests.yml
- name: Run E2E Tests
  run: bun run test:e2e --env docker --fail-fast

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: e2e-test-results
    path: test-results/e2e/
```

## Troubleshooting

### Docker binfmt issues
```bash
# Re-register QEMU binfmt handlers
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### QEMU VM not booting
- Check UEFI firmware is installed: `pacman -S edk2-aarch64`
- Verify VM has enough memory: increase `-m` parameter in `launch.sh`

### Agent not connecting
- Check mock API is running: `curl http://localhost:8787/health`
- Verify agent config has correct WebSocket URL
- Check Docker/QEMU logs for connection errors

### Tests timing out
- Increase timeout: `--timeout 600000` (10 minutes)
- Run sequentially: `--sequential`
- Check system resources

## File Structure

```
tests/e2e/
├── README.md                  # This file
├── orchestrator.ts            # Core orchestration engine
├── suites.ts                  # Test suite definitions
├── cli.ts                     # TypeScript CLI runner
├── runner.nu                  # Nushell CLI runner
└── fixtures/
    ├── test-credentials.json  # Valid test credentials
    └── invalid-credentials.json  # Invalid test credentials
```

## Adding New Tests

To add a new test suite:

1. Define the suite in `suites.ts`:
```typescript
{
  id: "my-new-test",
  name: "My New Test",
  description: "Test description",
  environment: "docker",
  timeout: 60000,
  retries: 1,
  dependencies: ["prerequisite-test"],
  tags: ["category", "smoke"],
  fixtures: ["my-fixture"],
  parallel: true,
  command: "my-test-script.sh",
  setup: "optional-setup-script.sh",
  teardown: "optional-teardown-script.sh"
}
```

2. Create fixtures if needed in `fixtures/my-fixture.json`

3. Run your test:
```bash
bun run tests/e2e/cli.ts --tag my-test
```

## Best Practices

1. **Use tags liberally** - Makes filtering and organization easier
2. **Declare dependencies** - Ensures correct execution order
3. **Keep tests focused** - One test, one concern
4. **Use fixtures** - Don't hardcode test data
5. **Set appropriate timeouts** - QEMU tests need more time than Docker
6. **Enable retries for flaky tests** - Network/timing issues happen
7. **Use smoke tag** - For quick validation tests
8. **Clean up in teardown** - Always cleanup resources

## License

Part of the NGFW.sh project.
