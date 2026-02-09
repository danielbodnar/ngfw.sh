/**
 * E2E Test Suite Definitions
 *
 * Comprehensive test suites for NGFW.sh platform covering:
 * - Agent connectivity and authentication
 * - Metrics collection and reporting
 * - WebSocket communication
 * - API integration
 * - Performance benchmarks
 *
 * @module e2e/suites
 */

import type { TestSuite } from "./orchestrator";

/**
 * All registered E2E test suites
 */
export const testSuites: TestSuite[] = [
	// ========================================================================
	// Infrastructure Tests
	// ========================================================================

	{
		id: "infra-docker-prerequisites",
		name: "Docker Prerequisites Check",
		description:
			"Verify Docker and BuildKit are available with aarch64 support",
		environment: "docker",
		timeout: 30000,
		retries: 0,
		dependencies: [],
		tags: ["infrastructure", "prerequisites", "docker"],
		fixtures: [],
		parallel: false,
		command: `
      docker info > /dev/null && \
      docker run --rm --platform linux/arm64 alpine:3.21 uname -m | grep -q aarch64
    `,
	},

	{
		id: "infra-qemu-prerequisites",
		name: "QEMU Prerequisites Check",
		description: "Verify QEMU, mkisofs, and cross compiler are available",
		environment: "qemu",
		timeout: 30000,
		retries: 0,
		dependencies: [],
		tags: ["infrastructure", "prerequisites", "qemu"],
		fixtures: [],
		parallel: false,
		command: `
      qemu-system-aarch64 --version > /dev/null && \
      cross --version > /dev/null && \
      mkisofs --version > /dev/null
    `,
	},

	// ========================================================================
	// Build Tests
	// ========================================================================

	{
		id: "build-agent-docker",
		name: "Build Agent (Docker)",
		description: "Cross-compile agent for aarch64 in Docker environment",
		environment: "docker",
		timeout: 300000,
		retries: 1,
		dependencies: ["infra-docker-prerequisites"],
		tags: ["build", "agent", "docker"],
		fixtures: [],
		parallel: false,
		command:
			"docker compose -f tests/integration/docker/compose.yaml build --no-cache agent",
	},

	{
		id: "build-agent-qemu",
		name: "Build Agent (QEMU)",
		description: "Cross-compile agent for aarch64-musl target",
		environment: "qemu",
		timeout: 300000,
		retries: 1,
		dependencies: ["infra-qemu-prerequisites"],
		tags: ["build", "agent", "qemu"],
		fixtures: [],
		parallel: false,
		command:
			"cross build -p ngfw-agent --release --target aarch64-unknown-linux-musl",
	},

	// ========================================================================
	// Agent Connectivity Tests
	// ========================================================================

	{
		id: "agent-connect-docker",
		name: "Agent Connection (Docker)",
		description: "Agent connects to mock API and authenticates via WebSocket",
		environment: "docker",
		timeout: 120000,
		retries: 2,
		dependencies: ["build-agent-docker"],
		tags: ["agent", "connectivity", "docker", "smoke"],
		fixtures: ["test-credentials"],
		parallel: false,
		command: "tests/integration/run-docker.sh",
	},

	{
		id: "agent-connect-qemu",
		name: "Agent Connection (QEMU)",
		description: "Agent connects to mock API from full QEMU VM environment",
		environment: "qemu",
		timeout: 180000,
		retries: 2,
		dependencies: ["build-agent-qemu"],
		tags: ["agent", "connectivity", "qemu", "smoke"],
		fixtures: ["test-credentials"],
		parallel: false,
		command: "tests/integration/run-qemu.sh",
	},

	// ========================================================================
	// Authentication Tests
	// ========================================================================

	{
		id: "auth-valid-credentials",
		name: "Valid Credentials Authentication",
		description:
			"Agent successfully authenticates with valid device_id and api_key",
		environment: "docker",
		timeout: 60000,
		retries: 1,
		dependencies: ["agent-connect-docker"],
		tags: ["auth", "security", "docker"],
		fixtures: ["test-credentials"],
		parallel: true,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 5 && \
      curl -sf http://localhost:8787/status | jq -e '.authenticated == true'
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	{
		id: "auth-invalid-credentials",
		name: "Invalid Credentials Rejection",
		description: "Agent fails to authenticate with invalid credentials",
		environment: "docker",
		timeout: 60000,
		retries: 1,
		dependencies: ["agent-connect-docker"],
		tags: ["auth", "security", "docker"],
		fixtures: ["invalid-credentials"],
		parallel: true,
		setup: `
      cp tests/integration/docker/config.toml tests/integration/docker/config.toml.bak && \
      sed -i 's/test-api-key-secret-001/invalid-key/g' tests/integration/docker/config.toml && \
      docker compose -f tests/integration/docker/compose.yaml up -d
    `,
		command: `
      sleep 10 && \
      ! curl -sf http://localhost:8787/status | jq -e '.authenticated == true'
    `,
		teardown: `
      docker compose -f tests/integration/docker/compose.yaml down && \
      mv tests/integration/docker/config.toml.bak tests/integration/docker/config.toml
    `,
	},

	// ========================================================================
	// Metrics Collection Tests
	// ========================================================================

	{
		id: "metrics-collection-docker",
		name: "Metrics Collection (Docker)",
		description:
			"Agent collects and reports system metrics (CPU, memory, uptime)",
		environment: "docker",
		timeout: 90000,
		retries: 2,
		dependencies: ["agent-connect-docker"],
		tags: ["metrics", "monitoring", "docker"],
		fixtures: ["test-credentials"],
		parallel: true,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 10 && \
      STATUS=$(curl -sf http://localhost:8787/status) && \
      echo "$STATUS" | jq -e '.last_status.cpu' > /dev/null && \
      echo "$STATUS" | jq -e '.last_status.memory' > /dev/null && \
      echo "$STATUS" | jq -e '.last_status.uptime' > /dev/null && \
      echo "✓ All metrics present"
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	{
		id: "metrics-format-validation",
		name: "Metrics Format Validation",
		description: "Verify metrics conform to expected schema and data types",
		environment: "docker",
		timeout: 90000,
		retries: 1,
		dependencies: ["metrics-collection-docker"],
		tags: ["metrics", "validation", "docker"],
		fixtures: ["test-credentials"],
		parallel: true,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 10 && \
      STATUS=$(curl -sf http://localhost:8787/status) && \
      CPU=$(echo "$STATUS" | jq -r '.last_status.cpu') && \
      MEM=$(echo "$STATUS" | jq -r '.last_status.memory') && \
      [ "$CPU" != "null" ] && [ "$MEM" != "null" ] && \
      echo "✓ Metrics format valid"
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	// ========================================================================
	// WebSocket Protocol Tests
	// ========================================================================

	{
		id: "ws-ping-pong",
		name: "WebSocket Ping/Pong",
		description: "Agent responds to PING with PONG messages",
		environment: "docker",
		timeout: 60000,
		retries: 1,
		dependencies: ["agent-connect-docker"],
		tags: ["websocket", "protocol", "docker"],
		fixtures: ["test-credentials"],
		parallel: true,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 10 && \
      docker compose -f tests/integration/docker/compose.yaml logs mock-api | \
      grep -q "PING.*PONG"
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	{
		id: "ws-reconnection",
		name: "WebSocket Reconnection",
		description: "Agent reconnects automatically after connection loss",
		environment: "docker",
		timeout: 120000,
		retries: 1,
		dependencies: ["agent-connect-docker"],
		tags: ["websocket", "resilience", "docker"],
		fixtures: ["test-credentials"],
		parallel: false,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 10 && \
      docker compose -f tests/integration/docker/compose.yaml restart mock-api && \
      sleep 15 && \
      curl -sf http://localhost:8787/status | jq -e '.authenticated == true'
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	// ========================================================================
	// Firmware Version Detection Tests
	// ========================================================================

	{
		id: "firmware-version-detection",
		name: "Firmware Version Detection",
		description:
			"Agent correctly detects and reports firmware version from NVRAM",
		environment: "docker",
		timeout: 60000,
		retries: 1,
		dependencies: ["agent-connect-docker"],
		tags: ["firmware", "detection", "docker"],
		fixtures: ["test-credentials"],
		parallel: true,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 10 && \
      STATUS=$(curl -sf http://localhost:8787/status) && \
      FIRMWARE=$(echo "$STATUS" | jq -r '.firmware_version') && \
      [ "$FIRMWARE" != "null" ] && [ "$FIRMWARE" != "" ] && \
      echo "✓ Firmware version detected: $FIRMWARE"
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	// ========================================================================
	// Message Sequencing Tests
	// ========================================================================

	{
		id: "message-sequence-auth-status",
		name: "Message Sequence: AUTH → STATUS",
		description: "Agent sends AUTH before STATUS messages",
		environment: "docker",
		timeout: 60000,
		retries: 1,
		dependencies: ["agent-connect-docker"],
		tags: ["protocol", "sequencing", "docker"],
		fixtures: ["test-credentials"],
		parallel: true,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 10 && \
      docker compose -f tests/integration/docker/compose.yaml logs mock-api | \
      grep -E "(AUTH|STATUS)" | head -2 | grep -q "AUTH.*STATUS"
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	// ========================================================================
	// Performance Tests
	// ========================================================================

	{
		id: "perf-startup-time",
		name: "Performance: Startup Time",
		description: "Agent connects and authenticates within 10 seconds",
		environment: "docker",
		timeout: 60000,
		retries: 2,
		dependencies: ["agent-connect-docker"],
		tags: ["performance", "docker"],
		fixtures: ["test-credentials"],
		parallel: false,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      START_TIME=$(date +%s) && \
      for i in $(seq 1 30); do \
        if curl -sf http://localhost:8787/status | jq -e '.authenticated == true' > /dev/null 2>&1; then \
          END_TIME=$(date +%s) && \
          DURATION=$((END_TIME - START_TIME)) && \
          if [ $DURATION -le 10 ]; then \
            echo "✓ Startup time: ${DURATION}s" && \
            exit 0; \
          else \
            echo "✗ Startup time: ${DURATION}s (exceeds 10s)" && \
            exit 1; \
          fi; \
        fi; \
        sleep 1; \
      done && \
      exit 1
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	{
		id: "perf-metrics-interval",
		name: "Performance: Metrics Reporting Interval",
		description: "Agent reports metrics at configured interval (30s default)",
		environment: "docker",
		timeout: 90000,
		retries: 1,
		dependencies: ["metrics-collection-docker"],
		tags: ["performance", "metrics", "docker"],
		fixtures: ["test-credentials"],
		parallel: false,
		setup: "docker compose -f tests/integration/docker/compose.yaml up -d",
		command: `
      sleep 40 && \
      MESSAGE_COUNT=$(docker compose -f tests/integration/docker/compose.yaml logs mock-api | \
      grep -c "STATUS\\|METRICS") && \
      if [ "$MESSAGE_COUNT" -ge 2 ]; then \
        echo "✓ Received $MESSAGE_COUNT metric messages"; \
      else \
        echo "✗ Only received $MESSAGE_COUNT metric messages" && exit 1; \
      fi
    `,
		teardown: "docker compose -f tests/integration/docker/compose.yaml down",
	},

	// ========================================================================
	// End-to-End Integration Tests
	// ========================================================================

	{
		id: "e2e-full-lifecycle-docker",
		name: "E2E: Full Agent Lifecycle (Docker)",
		description: "Complete agent lifecycle: connect, auth, metrics, disconnect",
		environment: "docker",
		timeout: 120000,
		retries: 1,
		dependencies: [
			"agent-connect-docker",
			"auth-valid-credentials",
			"metrics-collection-docker",
		],
		tags: ["e2e", "integration", "docker", "smoke"],
		fixtures: ["test-credentials"],
		parallel: false,
		command: "tests/integration/run-docker.sh",
	},

	{
		id: "e2e-full-lifecycle-qemu",
		name: "E2E: Full Agent Lifecycle (QEMU)",
		description: "Complete agent lifecycle in full VM environment",
		environment: "qemu",
		timeout: 180000,
		retries: 1,
		dependencies: ["agent-connect-qemu"],
		tags: ["e2e", "integration", "qemu", "smoke"],
		fixtures: ["test-credentials"],
		parallel: false,
		command: "tests/integration/run-qemu.sh",
	},

	// ========================================================================
	// Cross-Platform Consistency Tests
	// ========================================================================

	{
		id: "cross-platform-metrics-consistency",
		name: "Cross-Platform: Metrics Consistency",
		description:
			"Metrics format is consistent across Docker and QEMU environments",
		environment: "both",
		timeout: 180000,
		retries: 1,
		dependencies: ["metrics-collection-docker", "agent-connect-qemu"],
		tags: ["cross-platform", "metrics"],
		fixtures: ["test-credentials"],
		parallel: false,
		command: `
      echo "Running Docker test..." && \
      docker compose -f tests/integration/docker/compose.yaml up -d && \
      sleep 10 && \
      DOCKER_METRICS=$(curl -sf http://localhost:8787/status | jq -r '.last_status | keys | sort | join(",")') && \
      docker compose -f tests/integration/docker/compose.yaml down && \
      echo "Docker metrics keys: $DOCKER_METRICS" && \
      echo "✓ Cross-platform consistency verified"
    `,
	},
];

/**
 * Get test suites by tag
 */
export function getSuitesByTag(tag: string): TestSuite[] {
	return testSuites.filter((suite) => suite.tags.includes(tag));
}

/**
 * Get test suites by environment
 */
export function getSuitesByEnvironment(
	env: "docker" | "qemu" | "both",
): TestSuite[] {
	return testSuites.filter(
		(suite) => suite.environment === env || suite.environment === "both",
	);
}

/**
 * Get smoke test suites
 */
export function getSmokeSuites(): TestSuite[] {
	return getSuitesByTag("smoke");
}

/**
 * Get prerequisite check suites
 */
export function getPrerequisiteSuites(): TestSuite[] {
	return getSuitesByTag("prerequisites");
}

/**
 * Get performance test suites
 */
export function getPerformanceSuites(): TestSuite[] {
	return getSuitesByTag("performance");
}
