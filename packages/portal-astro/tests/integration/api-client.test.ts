/**
 * Integration tests for API client.
 *
 * Tests the full flow from API client methods through network requests
 * to response handling and error scenarios.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../../src/lib/api/client";
import { ApiError } from "../../src/lib/api/errors";
import { devices, mockToken, natRules } from "../fixtures";
import { setupMockServer } from "../utils/test-utils";

setupMockServer();

describe("API Client Integration", () => {
	let getToken: () => Promise<string | null>;
	let api: ReturnType<typeof createApiClient>;

	beforeEach(() => {
		getToken = vi.fn().mockResolvedValue(mockToken);
		api = createApiClient(getToken);
	});

	describe("Authentication", () => {
		it("includes Bearer token in requests", async () => {
			const fetchSpy = vi.spyOn(global, "fetch");

			await api.listDevices();

			expect(fetchSpy).toHaveBeenCalledWith(
				expect.stringContaining("/fleet/devices"),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${mockToken}`,
					}),
				}),
			);
		});

		it("calls getToken before each request", async () => {
			await api.listDevices();
			await api.listDevices();

			expect(getToken).toHaveBeenCalledTimes(2);
		});

		it("makes requests without token if not available", async () => {
			getToken = vi.fn().mockResolvedValue(null);
			api = createApiClient(getToken);

			const fetchSpy = vi.spyOn(global, "fetch");
			await api.listDevices();

			const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
				string,
				string
			>;
			expect(headers["Authorization"]).toBeUndefined();
		});
	});

	describe("Device Management", () => {
		it("lists devices successfully", async () => {
			const result = await api.listDevices();

			expect(result).toEqual(devices);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Home Router");
		});

		it("registers new device", async () => {
			const deviceData = {
				name: "New Router",
				model: "RT-AX88U",
			};

			const result = await api.registerDevice(deviceData);

			expect(result).toHaveProperty("id");
			expect(result).toHaveProperty("api_key");
			expect(result).toHaveProperty("websocket_url");
		});

		it("gets device status with metrics", async () => {
			const result = await api.getDeviceStatus("device-1");

			expect(result).toHaveProperty("device");
			expect(result).toHaveProperty("connection");
			expect(result).toHaveProperty("metrics");
			expect(result.metrics).toHaveProperty("cpu");
			expect(result.metrics).toHaveProperty("memory");
		});

		it("deletes device", async () => {
			await expect(api.deleteDevice("device-1")).resolves.toBeUndefined();
		});
	});

	describe("NAT Rules", () => {
		it("lists NAT rules for device", async () => {
			const result = await api.listNATRules("device-1");

			expect(result).toEqual(natRules);
			expect(result).toHaveLength(2);
		});

		it("creates NAT rule", async () => {
			const ruleData = {
				device_id: "device-1",
				name: "HTTP Server",
				type: "port_forward" as const,
				external_ip: "203.0.113.1",
				external_port: 80,
				internal_ip: "192.168.1.100",
				internal_port: 80,
				protocol: "tcp" as const,
			};

			const result = await api.createNATRule(ruleData);

			expect(result).toMatchObject(ruleData);
			expect(result).toHaveProperty("id");
		});

		it("updates NAT rule", async () => {
			const updates = {
				enabled: false,
				description: "Updated description",
			};

			const result = await api.updateNATRule("nat-1", updates);

			expect(result).toMatchObject(updates);
		});

		it("deletes NAT rule", async () => {
			await expect(api.deleteNATRule("nat-1")).resolves.toBeUndefined();
		});
	});

	describe("VPN Management", () => {
		it("gets VPN server config", async () => {
			const result = await api.getVPNServerConfig("device-1");

			expect(result).toHaveProperty("protocol");
			expect(result).toHaveProperty("port");
			expect(result).toHaveProperty("subnet");
			expect(result.protocol).toBe("wireguard");
		});

		it("updates VPN server config", async () => {
			const updates = {
				enabled: false,
				port: 51821,
			};

			const result = await api.updateVPNServerConfig("device-1", updates);

			expect(result).toMatchObject(updates);
		});

		it("lists VPN peers", async () => {
			const result = await api.listVPNServerPeers("device-1");

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("public_key");
			expect(result[0]).toHaveProperty("allowed_ips");
		});

		it("creates VPN peer", async () => {
			const peerData = {
				name: "Tablet",
				public_key: "cD4Z6x2qXJKxMJ9qxR0bvqNxGz9Lb8Gy4D3Jx6K9nQN=",
				allowed_ips: ["10.8.0.4/32"],
			};

			const result = await api.createVPNServerPeer("device-1", peerData);

			expect(result).toMatchObject(peerData);
		});

		it("connects VPN client", async () => {
			await expect(api.connectVPNClient("client-1")).resolves.toBeUndefined();
		});

		it("gets VPN client status", async () => {
			const result = await api.getVPNClientStatus("client-1");

			expect(result).toHaveProperty("connected");
			expect(result).toHaveProperty("bytes_sent");
			expect(result).toHaveProperty("bytes_received");
		});
	});

	describe("IPS Management", () => {
		it("gets IPS config", async () => {
			const result = await api.getIPSConfig("device-1");

			expect(result).toHaveProperty("enabled");
			expect(result).toHaveProperty("mode");
			expect(result).toHaveProperty("sensitivity");
		});

		it("updates IPS config", async () => {
			const updates = {
				mode: "detect" as const,
				sensitivity: "high" as const,
			};

			const result = await api.updateIPSConfig("device-1", updates);

			expect(result).toMatchObject(updates);
		});

		it("lists IPS rules", async () => {
			const result = await api.listIPSRules("device-1");

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("signature_id");
			expect(result[0]).toHaveProperty("severity");
		});

		it("lists IPS alerts", async () => {
			const result = await api.listIPSAlerts("device-1");

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("source_ip");
			expect(result[0]).toHaveProperty("blocked");
		});
	});

	describe("Logs and Reports", () => {
		it("queries logs with filters", async () => {
			const query = {
				device_id: "device-1",
				level: "warning" as const,
				limit: 50,
			};

			const result = await api.queryLogs(query);

			expect(Array.isArray(result)).toBe(true);
			expect(result[0]).toHaveProperty("timestamp");
			expect(result[0]).toHaveProperty("message");
		});

		it("creates report", async () => {
			const reportData = {
				device_id: "device-1",
				type: "security" as const,
				format: "pdf" as const,
				period_start: Date.now() - 86400000 * 7,
				period_end: Date.now(),
			};

			const result = await api.createReport(reportData);

			expect(result).toMatchObject(reportData);
			expect(result).toHaveProperty("status");
		});

		it("lists reports", async () => {
			const result = await api.listReports("device-1");

			expect(Array.isArray(result)).toBe(true);
			expect(result[0]).toHaveProperty("type");
			expect(result[0]).toHaveProperty("format");
		});
	});

	describe("Error Handling", () => {
		it("throws ApiError on 404", async () => {
			const error404Api = createApiClient(() => Promise.resolve(mockToken));

			// Mock 404 response
			vi.spyOn(global, "fetch").mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: "Device not found" }),
			} as Response);

			await expect(error404Api.getDeviceStatus("invalid-id")).rejects.toThrow(
				ApiError,
			);
			await expect(error404Api.getDeviceStatus("invalid-id")).rejects.toThrow(
				"Device not found",
			);
		});

		it("throws ApiError on 401 unauthorized", async () => {
			vi.spyOn(global, "fetch").mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
				json: async () => ({ error: "Invalid token" }),
			} as Response);

			await expect(api.listDevices()).rejects.toThrow(ApiError);
		});

		it("throws ApiError on 500 server error", async () => {
			vi.spyOn(global, "fetch").mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: async () => ({ error: "Server error" }),
			} as Response);

			await expect(api.listDevices()).rejects.toThrow(ApiError);
		});

		it("handles network errors", async () => {
			vi.spyOn(global, "fetch").mockRejectedValueOnce(
				new Error("Network error"),
			);

			await expect(api.listDevices()).rejects.toThrow("Network error");
		});

		it("uses statusText if error response is not JSON", async () => {
			vi.spyOn(global, "fetch").mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
				json: async () => {
					throw new Error("Not JSON");
				},
			} as Response);

			await expect(api.listDevices()).rejects.toThrow("Service Unavailable");
		});
	});

	describe("Response Handling", () => {
		it("handles 204 No Content responses", async () => {
			const result = await api.deleteDevice("device-1");
			expect(result).toBeUndefined();
		});

		it("parses JSON responses", async () => {
			const result = await api.listDevices();
			expect(typeof result).toBe("object");
			expect(Array.isArray(result)).toBe(true);
		});

		it("encodes URL parameters", async () => {
			const fetchSpy = vi.spyOn(global, "fetch");

			await api.listNATRules("device with spaces");

			expect(fetchSpy).toHaveBeenCalledWith(
				expect.stringContaining("device%20with%20spaces"),
				expect.any(Object),
			);
		});
	});

	describe("Request Headers", () => {
		it("sets Content-Type to application/json", async () => {
			const fetchSpy = vi.spyOn(global, "fetch");

			await api.listDevices();

			expect(fetchSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "application/json",
					}),
				}),
			);
		});

		it("includes body in POST requests", async () => {
			const fetchSpy = vi.spyOn(global, "fetch");
			const deviceData = { name: "New Router", model: "RT-AX88U" };

			await api.registerDevice(deviceData);

			expect(fetchSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(deviceData),
				}),
			);
		});

		it("includes body in PUT requests", async () => {
			const fetchSpy = vi.spyOn(global, "fetch");
			const updates = { enabled: false };

			await api.updateNATRule("nat-1", updates);

			expect(fetchSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify(updates),
				}),
			);
		});
	});
});
