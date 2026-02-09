#!/usr/bin/env bash
# E2E Test Runner for NGFW.sh API
#
# This script runs the E2E test suite with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
WS_URL="${WS_URL:-ws://localhost:8787}"
TEST_USER_ID="${TEST_USER_ID:-test_user_123}"
TEST_DEVICE_ID="${TEST_DEVICE_ID:-test_device_456}"
TEST_API_KEY="${TEST_API_KEY:-test_key_789}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-}"

echo -e "${GREEN}=== NGFW.sh API E2E Test Runner ===${NC}\n"

# Check if Clerk secret is set
if [ -z "$CLERK_SECRET_KEY" ]; then
    echo -e "${YELLOW}Warning: CLERK_SECRET_KEY not set. Using default test value.${NC}"
    CLERK_SECRET_KEY="test_clerk_secret"
fi

# Display configuration
echo "Configuration:"
echo "  API Base URL: $API_BASE_URL"
echo "  WebSocket URL: $WS_URL"
echo "  Test User ID: $TEST_USER_ID"
echo "  Test Device ID: $TEST_DEVICE_ID"
echo ""

# Check if API server is running
echo "Checking API server availability..."
if curl -s -f "$API_BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API server is running${NC}"
else
    echo -e "${RED}✗ API server is not responding at $API_BASE_URL${NC}"
    echo "  Please start the test environment first:"
    echo "    bun run test:integration:docker"
    echo "  or"
    echo "    bun run test:integration:qemu"
    exit 1
fi
echo ""

# Export environment variables for tests
export API_BASE_URL
export WS_URL
export CLERK_SECRET_KEY
export TEST_USER_ID
export TEST_DEVICE_ID
export TEST_API_KEY

# Parse command line arguments
TEST_FILTER="${1:-}"
TEST_THREADS="${TEST_THREADS:-1}"

if [ -n "$TEST_FILTER" ]; then
    echo "Running filtered tests: $TEST_FILTER"
    echo ""
    cargo test --test "$TEST_FILTER" -- --test-threads="$TEST_THREADS" --nocapture
else
    echo "Running all E2E tests..."
    echo ""

    # Run tests sequentially to avoid conflicts
    echo -e "${YELLOW}=== System Tests ===${NC}"
    cargo test --test system_tests -- --test-threads="$TEST_THREADS" --nocapture

    echo ""
    echo -e "${YELLOW}=== Network Tests ===${NC}"
    cargo test --test network_tests -- --test-threads="$TEST_THREADS" --nocapture

    echo ""
    echo -e "${YELLOW}=== Fleet Tests ===${NC}"
    cargo test --test fleet_tests -- --test-threads="$TEST_THREADS" --nocapture

    # Add more test suites here as they are created
    # echo ""
    # echo -e "${YELLOW}=== Security Tests ===${NC}"
    # cargo test --test security_tests -- --test-threads="$TEST_THREADS" --nocapture
fi

echo ""
echo -e "${GREEN}=== All tests completed ===${NC}"
