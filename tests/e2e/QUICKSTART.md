# E2E Test Framework - Quick Start Guide

## Installation

1. **Install prerequisites:**
   ```bash
   # Install Bun (if not already installed)
   curl -fsSL https://bun.sh/install | bash

   # Install cross compiler
   cargo install cross

   # Setup Docker for multi-arch
   docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
   ```

2. **Install project dependencies:**
   ```bash
   bun install
   ```

## Run Your First Test

### Smoke Tests (Fastest - 2-4 minutes)

```bash
bun run test:e2e:smoke
```

This runs the essential smoke tests to validate basic functionality.

### Full Test Suite (10-15 minutes)

```bash
bun run test:e2e
```

This runs all tests across both Docker and QEMU environments.

### Docker Only (Faster - 5-8 minutes)

```bash
bun run test:e2e:docker
```

This runs tests only in Docker environment (recommended for development).

## Common Workflows

### Development Workflow

During development, run fast smoke tests frequently:

```bash
# Quick validation (2-4 minutes)
bun run test:e2e:smoke --env docker

# Watch for changes (if you're iterating on tests)
./tests/e2e/runner.nu watch
```

### Pre-Commit Workflow

Before committing, run full Docker suite:

```bash
# Full Docker tests (10 minutes)
bun run test:e2e:docker

# View results
./tests/e2e/runner.nu --report
```

### Pre-Release Workflow

Before releases, run everything:

```bash
# Run all tests including QEMU (25-30 minutes)
bun run test:e2e

# Run performance benchmarks
bun run test:e2e:perf
```

## Understanding Test Output

### Success

```
================================================================================
E2E Test Results Summary
================================================================================
Total:    25
Passed:   25 (100.0%)
Failed:   0
Skipped:  0
Duration: 245.34s
Status:   ✓ SUCCESS
================================================================================
```

### Failure

```
================================================================================
E2E Test Results Summary
================================================================================
Total:    25
Passed:   23 (92.0%)
Failed:   2
Skipped:  0
Duration: 256.78s
Status:   ✗ FAILURE
================================================================================

✗ Failed: auth-invalid-credentials after 3 attempts
✗ Failed: ws-reconnection after 2 attempts
```

## Filtering Tests

### By Environment

```bash
# Docker only
bun run test:e2e --env docker

# QEMU only
bun run test:e2e --env qemu

# Both (default)
bun run test:e2e --env both
```

### By Category

```bash
# Run only authentication tests
bun run test:e2e --tag auth

# Run agent and metrics tests
bun run test:e2e --tag agent --tag metrics

# Run everything except performance tests
bun run test:e2e --exclude-tag performance
```

### By Preset

```bash
# Smoke tests
bun run test:e2e:smoke

# Prerequisites check
bun run test:e2e:prereq

# Performance tests
bun run test:e2e:perf
```

## Viewing Results

### List Available Tests

```bash
bun run test:e2e:list
```

### View Latest Report (Nushell)

```bash
./tests/e2e/runner.nu --report
```

### Compare Two Reports (Nushell)

```bash
./tests/e2e/runner.nu compare \
  test-results/e2e/e2e-results-1234.json \
  test-results/e2e/e2e-results-5678.json
```

### View HTML Report

```bash
# Reports are in test-results/e2e/
open test-results/e2e/e2e-results-*.html
```

## Advanced Options

### Parallel vs Sequential

```bash
# Parallel (default, faster)
bun run test:e2e --parallel --max-parallel 3

# Sequential (slower, easier to debug)
bun run test:e2e --sequential
```

### Fail Fast

```bash
# Stop on first failure
bun run test:e2e --fail-fast
```

### Custom Timeout and Retries

```bash
# Increase timeout to 10 minutes, retry 3 times
bun run test:e2e --timeout 600000 --retries 3
```

### Verbose Output

```bash
# See detailed output
bun run test:e2e --verbose
```

## Troubleshooting

### Docker Issues

```bash
# Re-register QEMU binfmt
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# Check Docker can run ARM64
docker run --rm --platform linux/arm64 alpine:3.21 uname -m
```

### QEMU Issues

```bash
# Check QEMU is installed
qemu-system-aarch64 --version

# On Arch Linux
sudo pacman -S qemu-system-aarch64 edk2-aarch64 genisoimage

# On Ubuntu/Debian
sudo apt-get install qemu-system-arm qemu-efi-aarch64 genisoimage
```

### Cross Compiler Issues

```bash
# Reinstall cross
cargo install --force cross

# Verify it works
cross --version
```

### Tests Timing Out

```bash
# Increase timeout
bun run test:e2e --timeout 900000  # 15 minutes

# Or run sequentially
bun run test:e2e --sequential
```

## Directory Structure

```
test-results/e2e/           # Test results (gitignored)
├── e2e-results-*.json      # Machine-readable results
├── e2e-results-*.xml       # JUnit XML for CI/CD
└── e2e-results-*.html      # Human-readable HTML report

tests/e2e/
├── orchestrator.ts         # Core orchestration engine
├── suites.ts              # Test suite definitions
├── cli.ts                 # TypeScript CLI
├── runner.nu              # Nushell CLI
└── fixtures/              # Test data
    ├── test-credentials.json
    └── invalid-credentials.json
```

## Next Steps

1. **Read the full documentation**: `tests/e2e/README.md`
2. **Review test suites**: `tests/e2e/suites.ts`
3. **Add your own tests**: See "Adding New Tests" in README.md
4. **Integrate with CI/CD**: `.github/workflows/e2e-tests.yml`

## Getting Help

- Full documentation: `tests/e2e/README.md`
- Framework summary: `tests/e2e/FRAMEWORK_SUMMARY.md`
- List all tests: `bun run test:e2e:list`
- CLI help: `bun run test:e2e --help`

## Quick Reference

```bash
# Most common commands
bun run test:e2e:smoke              # Quick smoke tests
bun run test:e2e:docker             # Full Docker tests
bun run test:e2e                    # Full test suite
bun run test:e2e:list               # List all tests
./tests/e2e/runner.nu --report      # View latest report

# Filtering
bun run test:e2e --tag smoke        # By tag
bun run test:e2e --env docker       # By environment
bun run test:e2e --exclude-tag perf # Exclude category

# Options
bun run test:e2e --verbose          # Verbose output
bun run test:e2e --fail-fast        # Stop on first failure
bun run test:e2e --sequential       # No parallelization
```

Happy testing!
