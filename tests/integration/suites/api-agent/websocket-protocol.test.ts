/**
 * Integration tests for API<->Agent WebSocket protocol
 * Tests the complete authentication and communication flow
 */

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import {
	createMockAgentClient,
	createMockApiServer,
	deviceFixture,
	metricsFixture,
	stateAssertions,
	TestUtils,
	wsAssertions,
} from "../../framework";
import type { MockAgentClient } from "../../framework/mocks/agent-client";
import type { MockApiServer } from "../../framework/mocks/api-server";

describe("API<->Agent WebSocket Protocol Integration", () => {
	let apiServer: MockApiServer;
	let agentClient: MockAgentClient;

	const testDevice = deviceFixture.build({
		id: "test-device-001",
		api_key: "test-api-key-secret-001",
		owner_id: "test-owner-001",
	});

	beforeAll(async () => {
		// Start mock API server
		apiServer = createMockApiServer({
			port: 8787,
			verbose: false,
			credentials: [
				{
					deviceId: testDevice.id,
					apiKey: testDevice.api_key,
					ownerId: testDevice.owner_id,
				},
			],
		});

		await apiServer.start();
		await TestUtils.sleep(500); // Give server time to start
	});

	afterAll(async () => {
		await apiServer.stop();
	});

	beforeEach(() => {
		apiServer.reset();
		apiServer.clearMessages();
	});

	describe("Authentication Flow", () => {
		it("should successfully authenticate with valid credentials", async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			expect(agentClient.isConnected()).toBe(true);

			await agentClient.authenticate();
			expect(agentClient.isAuthenticated()).toBe(true);

			// Verify AUTH message was received
			const messages = apiServer.getMessages();
			const authMessage = messages.find((m) => m.type === "AUTH");
			expect(authMessage).toBeDefined();

			if (authMessage) {
				wsAssertions.assertMessageType(authMessage, "AUTH");
				wsAssertions.assertMessagePayload(authMessage, {
					device_id: testDevice.id,
					api_key: testDevice.api_key,
				});
			}

			agentClient.disconnect();
		});

		it("should reject invalid credentials", async () => {
			agentClient = createMockAgentClient({
				deviceId: "invalid-device",
				apiKey: "invalid-key",
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			expect(agentClient.isConnected()).toBe(true);

			try {
				await agentClient.authenticate();
				expect.unreachable("Should have thrown authentication error");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
				expect((err as Error).message).toContain("Authentication failed");
			}

			agentClient.disconnect();
		});

		it("should handle connection before authentication", async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			expect(agentClient.isConnected()).toBe(true);
			expect(agentClient.isAuthenticated()).toBe(false);

			// Try to send status without authentication
			try {
				await agentClient.sendStatus({
					online: true,
					uptime: 1000,
					firmware_version: "388.1_0",
					wan_connected: true,
				});
				expect.unreachable("Should have thrown not authenticated error");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
				expect((err as Error).message).toContain("Not authenticated");
			}

			agentClient.disconnect();
		});
	});

	describe("Status Updates", () => {
		beforeEach(async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			await agentClient.authenticate();
		});

		it("should send and receive status updates", async () => {
			const status = {
				online: true,
				uptime: 86400,
				firmware_version: "388.1_0",
				wan_ip: "203.0.113.42",
				wan_connected: true,
			};

			await agentClient.sendStatus(status);

			// Wait for server to process
			await TestUtils.sleep(100);

			const state = apiServer.getState();
			expect(state.latestStatus).toBeDefined();
			expect(state.latestStatus).toMatchObject(status);
		});

		it("should track multiple status updates", async () => {
			const statuses = [
				{
					online: true,
					uptime: 1000,
					firmware_version: "388.1_0",
					wan_connected: true,
				},
				{
					online: true,
					uptime: 2000,
					firmware_version: "388.1_0",
					wan_connected: true,
				},
				{
					online: true,
					uptime: 3000,
					firmware_version: "388.1_0",
					wan_connected: true,
				},
			];

			for (const status of statuses) {
				await agentClient.sendStatus(status);
				await TestUtils.sleep(50);
			}

			const messages = apiServer.getMessagesByType("STATUS");
			expect(messages.length).toBe(3);

			// Verify last status is the most recent
			const state = apiServer.getState();
			expect(state.latestStatus).toMatchObject(statuses[2]);
		});
	});

	describe("Metrics Updates", () => {
		beforeEach(async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			await agentClient.authenticate();
		});

		it("should send and receive metrics updates", async () => {
			const metrics = metricsFixture.build({
				uptime: 86400,
				cpu: 45.2,
				memory: 67.8,
				temperature: 65,
				load: [0.5, 0.8, 1.0],
				connections: 42,
			});

			await agentClient.sendMetrics(metrics);

			// Wait for server to process
			await TestUtils.sleep(100);

			const state = apiServer.getState();
			expect(state.latestMetrics).toBeDefined();
			expect(state.latestMetrics).toMatchObject(metrics);
		});

		it("should validate metrics ranges", async () => {
			const metrics = metricsFixture.build({
				cpu: 45.2,
				memory: 67.8,
				temperature: 65,
			});

			await agentClient.sendMetrics(metrics);
			await TestUtils.sleep(100);

			const state = apiServer.getState();
			stateAssertions.assertMetricsInRange(state.latestMetrics as any, {
				cpu: [0, 100],
				memory: [0, 100],
				temperature: [0, 100],
			});
		});

		it("should handle periodic metrics updates", async () => {
			const metricsData = metricsFixture.buildList(5);

			for (const metrics of metricsData) {
				await agentClient.sendMetrics(metrics);
				await TestUtils.sleep(100);
			}

			const messages = apiServer.getMessagesByType("METRICS");
			expect(messages.length).toBeGreaterThanOrEqual(5);
		});
	});

	describe("Ping/Pong Keepalive", () => {
		beforeEach(async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			await agentClient.authenticate();
		});

		it("should respond to ping with pong", async () => {
			const latency = await agentClient.ping();

			expect(latency).toBeGreaterThan(0);
			expect(latency).toBeLessThan(1000); // Should be very fast locally
		});

		it("should handle multiple pings", async () => {
			const latencies: number[] = [];

			for (let i = 0; i < 5; i++) {
				const latency = await agentClient.ping();
				latencies.push(latency);
				await TestUtils.sleep(100);
			}

			expect(latencies.length).toBe(5);
			for (const latency of latencies) {
				expect(latency).toBeGreaterThan(0);
				expect(latency).toBeLessThan(1000);
			}
		});
	});

	describe("Message Ordering", () => {
		beforeEach(async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			await agentClient.authenticate();
		});

		it("should maintain message order", async () => {
			// Send multiple message types in sequence
			await agentClient.sendStatus({
				online: true,
				uptime: 1000,
				firmware_version: "388.1_0",
				wan_connected: true,
			});

			await agentClient.sendMetrics(metricsFixture.build());
			await agentClient.ping();

			await TestUtils.sleep(200);

			const messages = apiServer.getMessages();
			const types = messages.map((m) => m.type);

			// AUTH should be first (from beforeEach)
			expect(types[0]).toBe("AUTH");

			// Then our messages in order
			const afterAuth = types.slice(1);
			expect(afterAuth).toContain("STATUS");
			expect(afterAuth).toContain("METRICS");
			expect(afterAuth).toContain("PING");

			// Verify order is maintained
			const statusIndex = afterAuth.indexOf("STATUS");
			const metricsIndex = afterAuth.indexOf("METRICS");
			const pingIndex = afterAuth.indexOf("PING");

			expect(statusIndex).toBeLessThan(metricsIndex);
			expect(metricsIndex).toBeLessThan(pingIndex);
		});
	});

	describe("Error Handling", () => {
		it("should handle server disconnection gracefully", async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();
			await agentClient.authenticate();

			// Stop the server
			await apiServer.stop();
			await TestUtils.sleep(500);

			// Agent should no longer be connected
			expect(agentClient.isConnected()).toBe(false);
			expect(agentClient.isAuthenticated()).toBe(false);

			// Restart server for other tests
			await apiServer.start();
			await TestUtils.sleep(500);
		});

		it("should handle malformed messages", async () => {
			agentClient = createMockAgentClient({
				deviceId: testDevice.id,
				apiKey: testDevice.api_key,
				ownerId: testDevice.owner_id,
				wsUrl: "ws://localhost:8787/agent/ws",
				verbose: false,
			});

			await agentClient.connect();

			// Agent handles malformed messages internally
			// Server should log but not crash
			const state = apiServer.getState();
			expect(state).toBeDefined();
		});
	});
});
