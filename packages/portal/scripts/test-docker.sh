#!/usr/bin/env bash
# Run integration tests in Docker environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🐳 Starting Docker test environment..."

cd "$PROJECT_ROOT"

# Build and start services
docker compose -f docker-compose.test.yml up --build -d mock-api portal

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
timeout 60 bash -c 'until curl -f http://localhost:5173 > /dev/null 2>&1; do sleep 1; done' || {
  echo "❌ Portal failed to start"
  docker compose -f docker-compose.test.yml logs portal
  exit 1
}

timeout 60 bash -c 'until curl -f http://localhost:8787/health > /dev/null 2>&1; do sleep 1; done' || {
  echo "❌ Mock API failed to start"
  docker compose -f docker-compose.test.yml logs mock-api
  exit 1
}

echo "✅ Services are ready"

# Run Playwright tests
echo "🎭 Running Playwright tests..."
docker compose -f docker-compose.test.yml run --rm playwright

# Capture exit code
TEST_EXIT_CODE=$?

# Show logs if tests failed
if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo "❌ Tests failed. Showing logs..."
  docker compose -f docker-compose.test.yml logs
fi

# Cleanup
echo "🧹 Cleaning up..."
docker compose -f docker-compose.test.yml down -v

exit $TEST_EXIT_CODE
