#!/bin/sh
# Run all integration tests in sequence
# Used for comprehensive testing before deployment

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  NGFW.sh Integration Test Suite"
echo "=========================================="
echo ""

# Start services
echo "Starting Docker services..."
docker compose -f "$SCRIPT_DIR/compose.yaml" up -d
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
  TEST_NAME="$1"
  TEST_SCRIPT="$2"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo "=========================================="
  echo "Running: $TEST_NAME"
  echo "=========================================="

  if "$TEST_SCRIPT"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "✓ PASSED: $TEST_NAME"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "✗ FAILED: $TEST_NAME"
  fi
  echo ""
}

# Run test suites
run_test "Firmware Adapter Tests" "$SCRIPT_DIR/test-firmware-adapter.sh"
run_test "Full Stack Tests" "$SCRIPT_DIR/test-full-stack.sh"

# Cleanup
echo "=========================================="
echo "Stopping Docker services..."
docker compose -f "$SCRIPT_DIR/compose.yaml" down

# Report results
echo ""
echo "=========================================="
echo "  Test Results"
echo "=========================================="
echo "Total tests:  $TOTAL_TESTS"
echo "Passed:       $PASSED_TESTS"
echo "Failed:       $FAILED_TESTS"
echo "=========================================="

if [ "$FAILED_TESTS" -gt 0 ]; then
  echo ""
  echo "❌ Some tests failed!"
  exit 1
else
  echo ""
  echo "✅ All tests passed!"
  exit 0
fi
