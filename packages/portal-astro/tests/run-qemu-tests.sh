#!/usr/bin/env bash
#
# Run integration tests in QEMU environment.
#
# This script starts a QEMU VM with the full NGFW stack and runs
# tests against a complete system including the agent.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

echo -e "${GREEN}Starting QEMU integration test environment...${NC}"

# Check if QEMU is installed
if ! command -v qemu-system-aarch64 &> /dev/null; then
  echo -e "${RED}Error: qemu-system-aarch64 not found${NC}"
  echo "Install QEMU: sudo apt-get install qemu-system-arm"
  exit 1
fi

# VM configuration
VM_IMAGE="${PROJECT_ROOT}/tests/qemu/ngfw-test.img"
VM_MEMORY="2G"
VM_CPUS="2"
VM_SSH_PORT="2222"

# Check if VM image exists
if [ ! -f "${VM_IMAGE}" ]; then
  echo -e "${RED}Error: VM image not found at ${VM_IMAGE}${NC}"
  echo "Run: make build-qemu-image"
  exit 1
fi

# Cleanup function
cleanup() {
  echo -e "${YELLOW}Cleaning up QEMU environment...${NC}"
  if [ -n "${QEMU_PID:-}" ]; then
    kill "${QEMU_PID}" 2>/dev/null || true
    wait "${QEMU_PID}" 2>/dev/null || true
  fi
}

# Register cleanup on exit
trap cleanup EXIT

# Start QEMU VM
echo -e "${GREEN}Starting QEMU VM...${NC}"
qemu-system-aarch64 \
  -machine virt \
  -cpu cortex-a72 \
  -smp "${VM_CPUS}" \
  -m "${VM_MEMORY}" \
  -drive if=virtio,format=qcow2,file="${VM_IMAGE}" \
  -netdev user,id=net0,hostfwd=tcp::${VM_SSH_PORT}-:22,hostfwd=tcp::8787-:8787,hostfwd=tcp::4321-:4321 \
  -device virtio-net-pci,netdev=net0 \
  -nographic \
  -daemonize \
  -pidfile /tmp/qemu-ngfw-test.pid

QEMU_PID=$(cat /tmp/qemu-ngfw-test.pid)

# Wait for VM to boot
echo -e "${GREEN}Waiting for VM to boot...${NC}"
timeout 120 sh -c 'until nc -z localhost '"${VM_SSH_PORT}"'; do sleep 1; done'

# Wait for services to start inside VM
echo -e "${GREEN}Waiting for NGFW services...${NC}"
sleep 10

# Run tests against QEMU environment
echo -e "${GREEN}Running integration tests against QEMU...${NC}"

export BASE_URL="http://localhost:4321"
export API_URL="http://localhost:8787"

cd "${PROJECT_ROOT}/packages/portal-astro"

# Run unit and integration tests
bun test --run

# Run E2E tests
bun test:e2e

# Check exit code
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}All QEMU tests passed!${NC}"
else
  echo -e "${RED}QEMU tests failed with exit code ${TEST_EXIT_CODE}${NC}"
  exit $TEST_EXIT_CODE
fi
