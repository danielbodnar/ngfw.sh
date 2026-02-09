#!/usr/bin/env bash
#
# Run integration tests in Docker environment.
#
# This script spins up the full stack (API + Portal) in Docker containers
# and runs both integration and E2E tests against them.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${GREEN}Starting integration test environment...${NC}"

# Cleanup function
cleanup() {
  echo -e "${YELLOW}Cleaning up test environment...${NC}"
  docker-compose -f "${SCRIPT_DIR}/docker-compose.test.yml" down -v
}

# Register cleanup on exit
trap cleanup EXIT

# Build and start services
echo -e "${GREEN}Starting Docker services...${NC}"
docker-compose -f "${SCRIPT_DIR}/docker-compose.test.yml" up -d api portal

# Wait for services to be healthy
echo -e "${GREEN}Waiting for services to be ready...${NC}"
timeout 60 sh -c 'until docker-compose -f '"${SCRIPT_DIR}/docker-compose.test.yml"' ps api | grep -q "healthy"; do sleep 1; done'
timeout 60 sh -c 'until docker-compose -f '"${SCRIPT_DIR}/docker-compose.test.yml"' ps portal | grep -q "healthy"; do sleep 1; done'

echo -e "${GREEN}Services are ready. Running tests...${NC}"

# Run unit and integration tests
echo -e "${GREEN}Running unit and integration tests...${NC}"
cd "${PROJECT_ROOT}"
bun test --run

# Run E2E tests in Docker
echo -e "${GREEN}Running E2E tests...${NC}"
docker-compose -f "${SCRIPT_DIR}/docker-compose.test.yml" run --rm tests

# Check exit code
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
else
  echo -e "${RED}Tests failed with exit code ${TEST_EXIT_CODE}${NC}"
  exit $TEST_EXIT_CODE
fi
