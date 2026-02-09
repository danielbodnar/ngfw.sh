#!/bin/sh
# Load testing script
# Simulates multiple concurrent agent connections

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse arguments
AGENTS=10
DURATION=60

while [ $# -gt 0 ]; do
  case "$1" in
    --agents)
      AGENTS="$2"
      shift 2
      ;;
    --duration)
      DURATION="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--agents N] [--duration SECONDS]"
      exit 1
      ;;
  esac
done

echo "=== Load Test ==="
echo "Agents:   $AGENTS"
echo "Duration: ${DURATION}s"
echo ""

# Start mock API only
echo "Starting mock API..."
docker compose -f "$SCRIPT_DIR/compose.yaml" up -d mock-api
sleep 3

# Create temporary compose file for load test
LOAD_COMPOSE="$SCRIPT_DIR/compose-load.yaml"
cat > "$LOAD_COMPOSE" <<EOF
services:
  mock-api:
    image: oven/bun:1
    working_dir: /app
    volumes:
      - ../mock-api:/app:ro
    command: bun run server.ts
    ports:
      - "8787:8787"
    networks:
      - ngfw-test

networks:
  ngfw-test:
    driver: bridge
EOF

# Add agent services
for i in $(seq 1 "$AGENTS"); do
  DEVICE_ID="test-device-$(printf "%03d" "$i")"
  API_KEY="test-api-key-secret-$(printf "%03d" "$i")"

  # Add device to mock API credentials
  # (In production, these would be pre-configured)

  cat >> "$LOAD_COMPOSE" <<EOF

  agent-$i:
    build:
      context: ../../..
      dockerfile: tests/integration/docker/Dockerfile
    depends_on:
      - mock-api
    environment:
      - RUST_LOG=warn
      - AGENT_DEVICE_ID=$DEVICE_ID
      - AGENT_API_KEY=$API_KEY
    tmpfs:
      - /sys:exec
    volumes:
      - /proc:/proc:ro
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "1"
    networks:
      - ngfw-test
EOF
done

# Build agent image once
echo "Building agent image..."
docker compose -f "$LOAD_COMPOSE" build agent-1 > /dev/null 2>&1

# Start all agents
echo "Starting $AGENTS agents..."
docker compose -f "$LOAD_COMPOSE" up -d

# Monitor for duration
echo "Running load test for ${DURATION}s..."
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ "$ELAPSED" -ge "$DURATION" ]; then
    break
  fi

  # Get stats
  STATUS=$(curl -s http://localhost:8787/status 2>/dev/null || echo '[]')
  CONNECTED=$(echo "$STATUS" | grep -o '"authenticated":true' | wc -l)

  # Get resource usage
  MEMORY=$(docker stats --no-stream --format "{{.Container}}\t{{.MemUsage}}" | grep agent | awk '{sum+=$2} END {print sum}')
  CPU=$(docker stats --no-stream --format "{{.Container}}\t{{.CPUPerc}}" | grep agent | awk '{sum+=$2} END {print sum}')

  printf "\rElapsed: %ds | Connected: %d/%d | Memory: %sMB | CPU: %s%%" \
    "$ELAPSED" "$CONNECTED" "$AGENTS" "$MEMORY" "$CPU"

  sleep 2
done

echo ""
echo ""
echo "=========================================="
echo "  Load Test Results"
echo "=========================================="

# Final stats
STATUS=$(curl -s http://localhost:8787/status 2>/dev/null)
if [ "$STATUS" = "[]" ]; then
  echo "✗ No agents connected"
  CONNECTED=0
else
  CONNECTED=$(echo "$STATUS" | grep -o '"authenticated":true' | wc -l)
fi

echo "Total agents:        $AGENTS"
echo "Connected agents:    $CONNECTED"
echo "Success rate:        $(( CONNECTED * 100 / AGENTS ))%"
echo "Duration:            ${DURATION}s"

# Resource usage
echo ""
echo "Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(NAME|agent)" | head -20

# Cleanup
echo ""
echo "Cleaning up..."
docker compose -f "$LOAD_COMPOSE" down
rm -f "$LOAD_COMPOSE"

echo "=========================================="

if [ "$CONNECTED" -ge "$AGENTS" ]; then
  echo "✅ Load test passed!"
  exit 0
else
  echo "❌ Load test failed!"
  exit 1
fi
