#!/bin/sh
# Integration Test Scenario 02: Metrics Collection
#
# Tests that the agent collects and sends metrics at regular intervals (every 5 seconds).
#
# Expected behavior:
#   1. Agent is connected and authenticated
#   2. Agent collects system metrics via SystemAdapter
#   3. Agent sends METRICS message every 5 seconds
#   4. Mock API receives and stores metrics
#   5. Metrics contain valid CPU, memory, interface stats
#
# Success criteria:
#   - At least 3 METRICS messages received within 20 seconds
#   - Metrics interval is ~5 seconds (±1s tolerance)
#   - CPU usage is between 0-100%
#   - Memory usage is between 0-100%
#   - Interface counters are present

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOCK_API_URL="http://localhost:8787"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1" >&2
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

# Wait for mock API
log_info "Waiting for mock API..."
for i in $(seq 1 10); do
    if curl -sf "$MOCK_API_URL/health" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Wait for agent authentication
log_info "Waiting for agent to authenticate..."
for i in $(seq 1 30); do
    STATUS=$(curl -sf "$MOCK_API_URL/status" 2>/dev/null || echo '{}')
    if echo "$STATUS" | grep -q '"authenticated":true'; then
        log_info "Agent authenticated"
        break
    fi
    if [ "$i" -eq 30 ]; then
        log_error "Agent did not authenticate"
        exit 1
    fi
    sleep 1
done

# Monitor for METRICS messages
log_info "Monitoring METRICS messages for 20 seconds..."

METRICS_COUNT=0
LAST_TIMESTAMP=0
INTERVALS=""

START_TIME=$(date +%s)
while [ $(($(date +%s) - START_TIME)) -lt 20 ]; do
    STATUS=$(curl -sf "$MOCK_API_URL/status" 2>/dev/null || echo '{}')

    # Extract last_metrics.timestamp if present
    CURRENT_TIMESTAMP=$(echo "$STATUS" | grep -o '"timestamp":[0-9]*' | head -1 | sed 's/"timestamp"://')

    if [ -n "$CURRENT_TIMESTAMP" ] && [ "$CURRENT_TIMESTAMP" != "$LAST_TIMESTAMP" ]; then
        METRICS_COUNT=$((METRICS_COUNT + 1))

        # Calculate interval
        if [ "$LAST_TIMESTAMP" -ne 0 ]; then
            INTERVAL=$((CURRENT_TIMESTAMP - LAST_TIMESTAMP))
            INTERVALS="$INTERVALS $INTERVAL"
            log_info "METRICS message #$METRICS_COUNT received (interval: ${INTERVAL}s)"
        else
            log_info "First METRICS message received"
        fi

        LAST_TIMESTAMP=$CURRENT_TIMESTAMP
    fi

    sleep 1
done

log_info "Metrics collection monitoring complete"
echo "  Total METRICS messages: $METRICS_COUNT"
echo "  Intervals: $INTERVALS"

# Assertions
FAILED=0

if [ "$METRICS_COUNT" -lt 3 ]; then
    log_error "Expected at least 3 METRICS messages, got: $METRICS_COUNT"
    FAILED=1
fi

# Verify intervals are approximately 5 seconds (allow 3-7s range)
if [ -n "$INTERVALS" ]; then
    for interval in $INTERVALS; do
        if [ "$interval" -lt 3 ] || [ "$interval" -gt 7 ]; then
            log_error "METRICS interval out of range (3-7s): ${interval}s"
            FAILED=1
        fi
    done
fi

# Verify metrics content
log_info "Verifying metrics content..."
STATUS=$(curl -sf "$MOCK_API_URL/status")

# Check for required fields in last_metrics
CPU=$(echo "$STATUS" | grep -o '"cpu":[0-9.]*' | sed 's/"cpu"://')
MEMORY=$(echo "$STATUS" | grep -o '"memory":[0-9.]*' | sed 's/"memory"://')

if [ -z "$CPU" ]; then
    log_error "CPU metric missing from METRICS payload"
    FAILED=1
else
    log_info "CPU usage: ${CPU}%"
    # Validate CPU is in range 0-100
    CPU_INT=$(echo "$CPU" | cut -d. -f1)
    if [ "$CPU_INT" -lt 0 ] || [ "$CPU_INT" -gt 100 ]; then
        log_error "CPU usage out of valid range (0-100): $CPU"
        FAILED=1
    fi
fi

if [ -z "$MEMORY" ]; then
    log_error "Memory metric missing from METRICS payload"
    FAILED=1
else
    log_info "Memory usage: ${MEMORY}%"
    # Validate memory is in range 0-100
    MEMORY_INT=$(echo "$MEMORY" | cut -d. -f1)
    if [ "$MEMORY_INT" -lt 0 ] || [ "$MEMORY_INT" -gt 100 ]; then
        log_error "Memory usage out of valid range (0-100): $MEMORY"
        FAILED=1
    fi
fi

# Check for interfaces map
if ! echo "$STATUS" | grep -q '"interfaces"'; then
    log_error "Interfaces data missing from METRICS payload"
    FAILED=1
else
    log_info "Interface metrics present"
fi

# Final result
if [ $FAILED -eq 0 ]; then
    log_info "${GREEN}✓ Scenario 02: Metrics Collection PASSED${NC}"
    exit 0
else
    log_error "${RED}✗ Scenario 02: Metrics Collection FAILED${NC}"
    docker compose -f "$SCRIPT_DIR/../docker/compose.yaml" logs agent | tail -50
    exit 1
fi
