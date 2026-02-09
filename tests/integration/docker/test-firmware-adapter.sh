#!/bin/sh
# Firmware adapter integration test
# Tests mock binary interactions and sysfs reads

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Firmware Adapter Integration Test ==="

# Start agent container if not running
if ! docker compose -f "$SCRIPT_DIR/compose.yaml" ps agent | grep -q "Up"; then
  echo "Starting agent container..."
  docker compose -f "$SCRIPT_DIR/compose.yaml" up -d agent
  sleep 3
fi

# Test 1: NVRAM reads
echo ""
echo "Test 1: NVRAM operations"
NVRAM_MODEL=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent /mock-bins/nvram get model)
if echo "$NVRAM_MODEL" | grep -q "RT-AX92U"; then
  echo "✓ NVRAM model read: $NVRAM_MODEL"
else
  echo "✗ NVRAM model read failed: $NVRAM_MODEL"
  exit 1
fi

NVRAM_FW=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent /mock-bins/nvram get firmver)
if echo "$NVRAM_FW" | grep -q "388"; then
  echo "✓ NVRAM firmware version: $NVRAM_FW"
else
  echo "✗ NVRAM firmware read failed: $NVRAM_FW"
  exit 1
fi

# Test 2: WiFi commands
echo ""
echo "Test 2: WiFi status (wl)"
WL_STATUS=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent /mock-bins/wl status 2>&1)
if echo "$WL_STATUS" | grep -q "Mode: AP"; then
  echo "✓ WiFi status retrieved"
else
  echo "✗ WiFi status failed: $WL_STATUS"
  exit 1
fi

# Test 3: Network interface stats
echo ""
echo "Test 3: Network interfaces (ip)"
IP_ADDR=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent /mock-bins/ip addr show eth0 2>&1)
if echo "$IP_ADDR" | grep -q "inet"; then
  echo "✓ Network interface info retrieved"
else
  echo "✗ Network interface read failed: $IP_ADDR"
  exit 1
fi

# Test 4: Firewall rules
echo ""
echo "Test 4: Firewall rules (iptables)"
IPTABLES=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent /mock-bins/iptables -L -n 2>&1)
if echo "$IPTABLES" | grep -q "Chain INPUT"; then
  echo "✓ Firewall rules retrieved"
else
  echo "✗ Firewall rules read failed: $IPTABLES"
  exit 1
fi

# Test 5: Service control
echo ""
echo "Test 5: Service control"
SERVICE_STATUS=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent /mock-bins/service dnsmasq status 2>&1)
if echo "$SERVICE_STATUS" | grep -q "running"; then
  echo "✓ Service status retrieved"
else
  echo "✗ Service status failed: $SERVICE_STATUS"
  exit 1
fi

# Test 6: Sysfs temperature
echo ""
echo "Test 6: Sysfs temperature read"
TEMP=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent cat /mock-sysfs/class/thermal/thermal_zone0/temp)
if [ "$TEMP" = "52000" ]; then
  echo "✓ Temperature read: $(echo "$TEMP / 1000" | bc -l)°C"
else
  echo "✗ Temperature read failed: $TEMP"
  exit 1
fi

# Test 7: Sysfs network stats (eth0 RX)
echo ""
echo "Test 7: Sysfs network stats"
RX_BYTES=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent cat /mock-sysfs/class/net/eth0/statistics/rx_bytes)
TX_BYTES=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent cat /mock-sysfs/class/net/eth0/statistics/tx_bytes)
echo "✓ eth0 RX: $RX_BYTES bytes"
echo "✓ eth0 TX: $TX_BYTES bytes"

# Test 8: Sysfs network stats (br0)
BR_RX=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent cat /mock-sysfs/class/net/br0/statistics/rx_bytes)
BR_TX=$(docker compose -f "$SCRIPT_DIR/compose.yaml" exec -T agent cat /mock-sysfs/class/net/br0/statistics/tx_bytes)
echo "✓ br0 RX: $BR_RX bytes"
echo "✓ br0 TX: $BR_TX bytes"

# Summary
echo ""
echo "=== All firmware adapter tests passed ==="
echo ""
echo "Mock binaries verified:"
echo "  - nvram (NVRAM reads)"
echo "  - wl (WiFi status)"
echo "  - ip (Network interfaces)"
echo "  - iptables (Firewall rules)"
echo "  - service (Service control)"
echo ""
echo "Mock sysfs verified:"
echo "  - Thermal sensors"
echo "  - Network statistics"
