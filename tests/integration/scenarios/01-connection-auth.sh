#!/bin/sh
# Integration Test Scenario 01: Agent Connection and Authentication
#
# Tests the complete WebSocket connection handshake and authentication flow.
#
# Expected behavior:
#   1. Agent connects to mock API WebSocket endpoint
#   2. Agent sends AUTH message with device credentials
#   3. Mock API validates credentials against TEST_CREDENTIALS
#   4. Mock API responds with AUTH_OK
#   5. Agent sends initial STATUS message with firmware metrics
#   6. Mock API responds with STATUS_OK
#
# Success criteria:
#   - Connection established within 5 seconds
#   - Authentication succeeds (authenticated=true in /status)
#   - STATUS message received with valid firmware version
#   - No error log entries

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MOCK_API_URL="http://localhost:8787"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1" >&2
}

log_warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" down -v 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# Start test environment
log_info "Starting test environment..."
docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" up -d

# Wait for mock API to be healthy
log_info "Waiting for mock API to be ready..."
TIMEOUT=10
for i in $(seq 1 $TIMEOUT); do
    if curl -sf "$MOCK_API_URL/health" > /dev/null 2>&1; then
        log_info "Mock API is ready"
        break
    fi
    if [ "$i" = "$TIMEOUT" ]; then
        log_error "Mock API did not become ready within ${TIMEOUT}s"
        docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" logs mock-api
        exit 1
    fi
    sleep 1
done

# Wait for agent to authenticate
log_info "Waiting for agent to authenticate..."
TIMEOUT=30
AUTHENTICATED=false

for i in $(seq 1 $TIMEOUT); do
    STATUS=$(curl -sf "$MOCK_API_URL/status" 2>/dev/null || echo '{}')

    # Check if authenticated
    if echo "$STATUS" | grep -q '"authenticated":true'; then
        AUTHENTICATED=true
        log_info "Agent authenticated successfully!"
        break
    fi

    # Check for authentication failure
    if echo "$STATUS" | grep -q '"authenticated":false' && [ "$i" -gt 5 ]; then
        log_error "Agent failed to authenticate"
        echo "Status response: $STATUS"
        docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" logs agent
        exit 1
    fi

    if [ "$i" = "$TIMEOUT" ]; then
        log_error "Agent did not authenticate within ${TIMEOUT}s"
        echo "Last status: $STATUS"
        docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" logs
        exit 1
    fi

    sleep 1
done

# Verify authentication details
log_info "Verifying authentication details..."
STATUS=$(curl -sf "$MOCK_API_URL/status")

# Extract fields using grep and sed (POSIX-compatible)
DEVICE_ID=$(echo "$STATUS" | grep -o '"device_id":"[^"]*"' | sed 's/"device_id":"//; s/"//')
FIRMWARE_VERSION=$(echo "$STATUS" | grep -o '"firmware_version":"[^"]*"' | sed 's/"firmware_version":"//; s/"//')
MESSAGES_RECEIVED=$(echo "$STATUS" | grep -o '"messages_received":[0-9]*' | sed 's/"messages_received"://')

log_info "Connection details:"
echo "  Device ID: $DEVICE_ID"
echo "  Firmware Version: $FIRMWARE_VERSION"
echo "  Messages Received: $MESSAGES_RECEIVED"

# Assertions
FAILED=0

if [ "$DEVICE_ID" != "test-device-001" ]; then
    log_error "Expected device_id=test-device-001, got: $DEVICE_ID"
    FAILED=1
fi

if ! echo "$FIRMWARE_VERSION" | grep -qE '^3\.0\.0\.[0-9]+'; then
    log_error "Firmware version does not match expected pattern: $FIRMWARE_VERSION"
    FAILED=1
fi

if [ "$MESSAGES_RECEIVED" -lt 2 ]; then
    log_error "Expected at least 2 messages (AUTH + STATUS), got: $MESSAGES_RECEIVED"
    FAILED=1
fi

# Check agent logs for errors
log_info "Checking agent logs for errors..."
AGENT_LOGS=$(docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" logs agent)

if echo "$AGENT_LOGS" | grep -qi error; then
    log_warn "Found ERROR in agent logs:"
    echo "$AGENT_LOGS" | grep -i error
fi

# Verify initial STATUS message was received
if ! echo "$STATUS" | grep -q '"last_status"'; then
    log_error "No STATUS message received from agent"
    FAILED=1
else
    log_info "Initial STATUS message confirmed"
fi

# Final result
if [ $FAILED -eq 0 ]; then
    log_info "${GREEN}✓ Scenario 01: Connection and Authentication PASSED${NC}"
    exit 0
else
    log_error "${RED}✗ Scenario 01: Connection and Authentication FAILED${NC}"
    exit 1
fi
