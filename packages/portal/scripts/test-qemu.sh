#!/usr/bin/env bash
# Run integration tests in QEMU environment with full system emulation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INTEGRATION_ROOT="$(cd "$PROJECT_ROOT/../../tests/integration" && pwd)"

echo "🖥️  Starting QEMU test environment..."

# Check prerequisites
if ! command -v qemu-system-aarch64 &> /dev/null; then
  echo "❌ qemu-system-aarch64 not found. Please install QEMU."
  exit 1
fi

# Use existing QEMU setup from tests/integration
cd "$INTEGRATION_ROOT"

# Build agent if needed
if [ ! -f "../packages/agent/target/aarch64-unknown-linux-musl/release/ngfw-agent" ]; then
  echo "📦 Building agent..."
  cd ../packages/agent
  cross build --release --target aarch64-unknown-linux-musl
  cd "$INTEGRATION_ROOT"
fi

# Start QEMU VM with agent
echo "🚀 Starting QEMU VM..."
./run-qemu.sh &
QEMU_PID=$!

# Wait for VM to boot
sleep 30

# Start portal dev server
cd "$PROJECT_ROOT"
echo "🌐 Starting portal dev server..."
bun run dev &
PORTAL_PID=$!

# Wait for portal to be ready
timeout 60 bash -c 'until curl -f http://localhost:5173 > /dev/null 2>&1; do sleep 1; done' || {
  echo "❌ Portal failed to start"
  kill $PORTAL_PID $QEMU_PID 2>/dev/null || true
  exit 1
}

echo "✅ Portal is ready"

# Run Playwright tests against QEMU environment
echo "🎭 Running Playwright tests..."
PLAYWRIGHT_BASE_URL=http://localhost:5173 bunx playwright test

TEST_EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up..."
kill $PORTAL_PID $QEMU_PID 2>/dev/null || true

exit $TEST_EXIT_CODE
