#!/bin/sh
# Full stack integration test
# Tests all RPC message types and error handling

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Full Stack Integration Test ==="

# Ensure services are running
if ! docker compose -f "$SCRIPT_DIR/compose.yaml" ps | grep -q "Up"; then
  echo "Starting services..."
  docker compose -f "$SCRIPT_DIR/compose.yaml" up -d
  sleep 5
fi

# Wait for agent to authenticate
echo "Waiting for agent authentication..."
TIMEOUT=60
for i in $(seq 1 $TIMEOUT); do
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo '{}')
  if echo "$STATUS" | grep -q '"authenticated":true'; then
    echo "✓ Agent authenticated"
    break
  fi
  if [ "$i" = "$TIMEOUT" ]; then
    echo "✗ TIMEOUT: Agent did not authenticate"
    exit 1
  fi
  sleep 1
done

# Test 1: Verify STATUS message received
echo ""
echo "Test 1: STATUS message"
if echo "$STATUS" | grep -q '"uptime"'; then
  echo "✓ STATUS message contains uptime"
else
  echo "✗ STATUS message missing uptime"
  exit 1
fi

# Test 2: Wait for METRICS message
echo ""
echo "Test 2: METRICS messages"
sleep 6  # Wait for at least one metrics interval
STATUS=$(curl -s http://localhost:8787/status 2>/dev/null)
if echo "$STATUS" | grep -q '"last_metrics"'; then
  echo "✓ METRICS messages received"
else
  echo "✗ METRICS messages not received"
  exit 1
fi

# Test 3: Verify message counter
echo ""
echo "Test 3: Message counter"
MESSAGES=$(echo "$STATUS" | grep -o '"messages_received":[0-9]*' | grep -o '[0-9]*')
if [ "$MESSAGES" -ge 2 ]; then
  echo "✓ Multiple messages received (count: $MESSAGES)"
else
  echo "✗ Expected at least 2 messages, got $MESSAGES"
  exit 1
fi

# Test 4: Verify firmware version
echo ""
echo "Test 4: Firmware version"
if echo "$STATUS" | grep -q '"firmware_version"'; then
  FIRMWARE=$(echo "$STATUS" | grep -o '"firmware_version":"[^"]*"' | cut -d'"' -f4)
  echo "✓ Firmware version: $FIRMWARE"
else
  echo "✗ Firmware version not reported"
  exit 1
fi

# Test 5: Verify device ID
echo ""
echo "Test 5: Device ID"
if echo "$STATUS" | grep -q '"device_id":"test-device-001"'; then
  echo "✓ Device ID correct"
else
  echo "✗ Device ID mismatch"
  exit 1
fi

# Test 6: Check agent logs for errors
echo ""
echo "Test 6: Agent error check"
ERRORS=$(docker compose -f "$SCRIPT_DIR/compose.yaml" logs agent 2>&1 | grep -i "error" | grep -v "ERRO" || true)
if [ -z "$ERRORS" ]; then
  echo "✓ No errors in agent logs"
else
  echo "✗ Errors found in agent logs:"
  echo "$ERRORS"
  exit 1
fi

# Test 7: Check mock API logs
echo ""
echo "Test 7: Mock API message log"
MOCK_LOGS=$(docker compose -f "$SCRIPT_DIR/compose.yaml" logs mock-api 2>&1)
if echo "$MOCK_LOGS" | grep -q "AUTH_OK"; then
  echo "✓ Mock API logged AUTH_OK"
else
  echo "✗ Mock API did not log AUTH_OK"
  exit 1
fi

if echo "$MOCK_LOGS" | grep -q "STATUS_OK"; then
  echo "✓ Mock API logged STATUS_OK"
else
  echo "✗ Mock API did not log STATUS_OK"
  exit 1
fi

# Summary
echo ""
echo "=== All tests passed ==="
echo "Total messages received: $MESSAGES"
echo "Firmware version: $FIRMWARE"
echo ""
echo "Final status:"
echo "$STATUS" | bun -e "console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()), null, 2))"
