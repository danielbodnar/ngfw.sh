#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== NGFW Agent Integration Test (QEMU VM) ==="

# Cleanup trap to kill background processes on exit
MOCK_PID="" SERVE_PID="" QEMU_PID=""
cleanup() {
  echo "Cleaning up..."
  [ -n "$QEMU_PID" ] && kill $QEMU_PID 2>/dev/null || true
  [ -n "$MOCK_PID" ] && kill $MOCK_PID 2>/dev/null || true
  [ -n "$SERVE_PID" ] && kill $SERVE_PID 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT

# Step 1: Cross-compile agent for aarch64-linux-musl
echo "Cross-compiling agent for aarch64..."
cd "$PROJECT_ROOT"
cross build -p ngfw-agent --release --target aarch64-unknown-linux-musl

# Resolve target directory (respects CARGO_TARGET_DIR)
TARGET_DIR="${CARGO_TARGET_DIR:-$PROJECT_ROOT/target}"
AGENT_BIN="$TARGET_DIR/aarch64-unknown-linux-musl/release/ngfw-agent"

if [ ! -f "$AGENT_BIN" ]; then
  echo "ERROR: Agent binary not found at $AGENT_BIN"
  exit 1
fi
echo "Agent binary: $AGENT_BIN ($(ls -lh "$AGENT_BIN" | awk '{print $5}'))"

# Step 2: Start mock API server in background
echo "Starting mock API server..."
cd "$SCRIPT_DIR/mock-api"
bun run server.ts &
MOCK_PID=$!
sleep 2

# Step 3: Start HTTP server to serve agent binary to the VM
echo "Serving agent binary on port 9999..."
cd "$(dirname "$AGENT_BIN")"
bun -e "Bun.serve({port:9999,fetch(r){const f=Bun.file('ngfw-agent');return f.exists().then(e=>e?new Response(f):new Response('not found',{status:404}))}})" &
SERVE_PID=$!

# Step 4: Build VM image
echo "Building VM image..."
"$SCRIPT_DIR/qemu/build-image.sh"

# Step 5: Launch VM (in background, will cloud-init and start agent)
echo "Launching VM (agent will auto-start via cloud-init)..."
"$SCRIPT_DIR/qemu/launch.sh" &
QEMU_PID=$!

# Step 6: Wait for agent to authenticate
echo "Waiting for agent to authenticate (up to 120s for VM boot + cloud-init)..."
TIMEOUT=120
for i in $(seq 1 $TIMEOUT); do
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo '{}')
  if echo "$STATUS" | grep -q '"authenticated":true'; then
    echo "Agent authenticated successfully from QEMU VM!"
    echo "Latest status: $STATUS"
    break
  fi
  if [ "$i" = "$TIMEOUT" ]; then
    echo "TIMEOUT: Agent did not authenticate within ${TIMEOUT}s"
    kill $QEMU_PID $MOCK_PID $SERVE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo "=== QEMU integration test passed ==="
