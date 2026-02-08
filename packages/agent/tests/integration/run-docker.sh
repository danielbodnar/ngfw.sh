#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== NGFW Agent Integration Test (Docker) ==="

# Ensure QEMU user-mode is registered for aarch64
if ! docker run --rm --platform linux/arm64 alpine:3.21 uname -m 2>/dev/null | grep -q aarch64; then
  echo "Registering QEMU binfmt handlers..."
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
fi

# Build and start services
echo "Building agent container (cross-compiling for aarch64)..."
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" build --no-cache agent

echo "Starting mock API + agent..."
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" up -d

# Wait for agent to connect and send at least one STATUS message
echo "Waiting for agent to authenticate and send metrics..."
TIMEOUT=60
for i in $(seq 1 $TIMEOUT); do
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo "{}")
  if echo "$STATUS" | grep -q '"authenticated":true'; then
    echo "Agent authenticated successfully!"
    echo "Latest status: $STATUS"
    break
  fi
  if [ "$i" = "$TIMEOUT" ]; then
    echo "TIMEOUT: Agent did not authenticate within ${TIMEOUT}s"
    docker compose -f "$SCRIPT_DIR/docker/compose.yaml" logs
    docker compose -f "$SCRIPT_DIR/docker/compose.yaml" down
    exit 1
  fi
  sleep 1
done

# Show agent logs
echo ""
echo "=== Agent Logs ==="
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" logs agent | tail -30

# Cleanup
echo ""
echo "Stopping containers..."
docker compose -f "$SCRIPT_DIR/docker/compose.yaml" down

echo "=== Integration test passed ==="
