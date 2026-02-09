#!/bin/sh
# CI/CD integration test runner
# Optimized for automated pipelines with non-interactive output

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# CI environment detection
CI=${CI:-false}
if [ "$CI" = "true" ]; then
  export DEBIAN_FRONTEND=noninteractive
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
fi

echo "=========================================="
echo "  NGFW.sh CI Integration Tests"
echo "=========================================="
echo "CI Mode: $CI"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Ensure QEMU is registered
echo "Registering QEMU binfmt handlers..."
if ! docker run --rm --platform linux/arm64 alpine:3.21 uname -m 2>/dev/null | grep -q aarch64; then
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
fi

# Build and start services
echo ""
echo "Building agent container..."
docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" build --no-cache agent

echo ""
echo "Starting services..."
docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" up -d

# Wait for agent authentication
echo ""
echo "Waiting for agent authentication..."
TIMEOUT=120
START_TIME=$(date +%s)

for i in $(seq 1 $TIMEOUT); do
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo '{}')
  if echo "$STATUS" | grep -q '"authenticated":true'; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "✓ Agent authenticated in ${DURATION}s"
    break
  fi
  if [ "$i" = "$TIMEOUT" ]; then
    echo "✗ TIMEOUT: Agent did not authenticate within ${TIMEOUT}s"
    echo ""
    echo "=== Mock API Logs ==="
    docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" logs mock-api
    echo ""
    echo "=== Agent Logs ==="
    docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" logs agent
    docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" down
    exit 1
  fi
  sleep 1
done

# Verify metrics
echo ""
echo "Verifying metrics collection..."
sleep 6  # Wait for metrics interval
STATUS=$(curl -s http://localhost:8787/status 2>/dev/null)

if ! echo "$STATUS" | grep -q '"last_metrics"'; then
  echo "✗ METRICS not received"
  docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" logs agent
  docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" down
  exit 1
fi

echo "✓ Metrics collection verified"

# Extract test results
DEVICE_ID=$(echo "$STATUS" | grep -o '"device_id":"[^"]*"' | cut -d'"' -f4)
FIRMWARE=$(echo "$STATUS" | grep -o '"firmware_version":"[^"]*"' | cut -d'"' -f4)
MESSAGES=$(echo "$STATUS" | grep -o '"messages_received":[0-9]*' | grep -o '[0-9]*')
UPTIME=$(echo "$STATUS" | grep -o '"uptime":[0-9]*' | grep -o '[0-9]*')

# Output results
echo ""
echo "=========================================="
echo "  Test Results"
echo "=========================================="
echo "Device ID:        $DEVICE_ID"
echo "Firmware:         $FIRMWARE"
echo "Messages:         $MESSAGES"
echo "Uptime:           ${UPTIME}s"
echo "Authentication:   ✓ SUCCESS"
echo "Status Updates:   ✓ SUCCESS"
echo "Metrics:          ✓ SUCCESS"
echo "=========================================="

# Check for errors in logs
echo ""
echo "Checking logs for errors..."
AGENT_ERRORS=$(docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" logs agent 2>&1 | grep -i "error" | grep -v "ERRO" || true)
if [ -n "$AGENT_ERRORS" ]; then
  echo "✗ Errors found in agent logs:"
  echo "$AGENT_ERRORS"
  docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" down
  exit 1
fi
echo "✓ No errors found"

# Cleanup
echo ""
echo "Cleaning up..."
docker compose -f "$SCRIPT_DIR/docker/compose-ci.yaml" down

# Final status
echo ""
echo "=========================================="
echo "✅ All CI tests passed!"
echo "=========================================="
echo ""

# Output JSON summary for CI tools
if [ "$CI" = "true" ]; then
  cat <<EOF
{
  "status": "passed",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "duration": ${DURATION},
  "tests": {
    "authentication": "passed",
    "status_updates": "passed",
    "metrics_collection": "passed"
  },
  "device": {
    "id": "$DEVICE_ID",
    "firmware": "$FIRMWARE",
    "messages": $MESSAGES,
    "uptime": $UPTIME
  }
}
EOF
fi

exit 0
