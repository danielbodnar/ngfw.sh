/**
 * Unit tests for the API client module.
 * Tests all API methods, error handling, and authentication.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiError,
	createApiClient,
	type Device,
	type DeviceRegistrationResponse,
	type DeviceStatus,
} from "./api";

describe("createApiClient", () => {
	const mockGetToken = vi.fn<() => Promise<string | null>>();
	const mockDevice: Device = {
		id: "device-123",
		name: "Test Device",
		model: "RT-AX92U",
		serial: "ABC123",
		owner_id: "user-123",
		firmware_version: "1.0.0",
		status: "online",
		created_at: Date.now(),
		last_seen: Date.now(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn() as unknown as typeof fetch;
	});

	describe("listDevices", () => {
		it("should fetch devices with authentication", async () => {
			mockGetToken.mockResolvedValue("test-token");
			const mockResponse: Device[] = [mockDevice];

			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockResponse,
			} as Response);

			const api = createApiClient(mockGetToken);
			const devices = await api.listDevices();

			expect(devices).toEqual(mockResponse);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.ngfw.sh/fleet/devices",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer test-token",
						"Content-Type": "application/json",
					}),
				}),
			);
		});

		it("should work without token", async () => {
			mockGetToken.mockResolvedValue(null);
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => [],
			} as Response);

			const api = createApiClient(mockGetToken);
			await api.listDevices();

			const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
			const headers = callArgs?.[1]?.headers as
				| Record<string, string>
				| undefined;
			expect(headers?.["Authorization"]).toBeUndefined();
		});

		it("should remove trailing slashes from base URL", async () => {
			mockGetToken.mockResolvedValue("test-token");

			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => [],
			} as Response);

			const api = createApiClient(mockGetToken);
			await api.listDevices();

			const url = vi.mocked(globalThis.fetch).mock.calls[0]?.[0];
			expect(url).toBe("https://api.ngfw.sh/fleet/devices");
		});

		it("should throw ApiError on 401 Unauthorized", async () => {
			mockGetToken.mockResolvedValue("invalid-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
				json: async () => ({ error: "Invalid token" }),
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.listDevices()).rejects.toThrow(ApiError);
			await expect(api.listDevices()).rejects.toThrow("Invalid token");
		});

		it("should throw ApiError on 500 Server Error", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: async () => ({ message: "Database error" }),
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.listDevices()).rejects.toThrow(ApiError);
			await expect(api.listDevices()).rejects.toThrow("Database error");
		});

		it("should fall back to statusText if error body is not JSON", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
				json: async () => {
					throw new Error("Invalid JSON");
				},
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.listDevices()).rejects.toThrow("Service Unavailable");
		});
	});

	describe("registerDevice", () => {
		it("should register device with name and model", async () => {
			mockGetToken.mockResolvedValue("test-token");
			const mockResponse: DeviceRegistrationResponse = {
				...mockDevice,
				api_key: "secret-api-key-123",
				websocket_url: "wss://api.ngfw.sh/agent/ws",
			};

			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => mockResponse,
			} as Response);

			const api = createApiClient(mockGetToken);
			const result = await api.registerDevice({
				name: "Test Device",
				model: "RT-AX92U",
			});

			expect(result).toEqual(mockResponse);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.ngfw.sh/fleet/devices",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ name: "Test Device", model: "RT-AX92U" }),
				}),
			);
		});

		it("should register device with only name", async () => {
			mockGetToken.mockResolvedValue("test-token");
			const mockResponse: DeviceRegistrationResponse = {
				...mockDevice,
				model: null,
				api_key: "secret-api-key-123",
				websocket_url: "wss://api.ngfw.sh/agent/ws",
			};

			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => mockResponse,
			} as Response);

			const api = createApiClient(mockGetToken);
			const result = await api.registerDevice({ name: "Test Device" });

			expect(result.model).toBeNull();
			expect(result.api_key).toBe("secret-api-key-123");
		});

		it("should throw ApiError on validation failure", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => ({ error: "Device name is required" }),
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.registerDevice({ name: "" })).rejects.toThrow(
				"Device name is required",
			);
		});
	});

	describe("getDeviceStatus", () => {
		it("should fetch device status with metrics", async () => {
			mockGetToken.mockResolvedValue("test-token");
			const mockStatus: DeviceStatus = {
				device: mockDevice,
				connection: {
					online: true,
					last_seen: Date.now(),
				},
				metrics: {
					uptime: 86400,
					cpu: 23,
					memory: 41,
					temperature: 52,
					load: [0.42, 0.38, 0.35],
					connections: 847,
				},
			};

			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockStatus,
			} as Response);

			const api = createApiClient(mockGetToken);
			const status = await api.getDeviceStatus("device-123");

			expect(status).toEqual(mockStatus);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.ngfw.sh/fleet/devices/device-123/status",
				expect.any(Object),
			);
		});

		it("should URL encode device ID", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					device: mockDevice,
					connection: null,
					metrics: null,
				}),
			} as Response);

			const api = createApiClient(mockGetToken);
			await api.getDeviceStatus("device/with/slashes");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.ngfw.sh/fleet/devices/device%2Fwith%2Fslashes/status",
				expect.any(Object),
			);
		});

		it("should handle offline device", async () => {
			mockGetToken.mockResolvedValue("test-token");
			const offlineStatus: DeviceStatus = {
				device: { ...mockDevice, status: "offline" },
				connection: {
					online: false,
					last_seen: Date.now() - 600000,
				},
				metrics: null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => offlineStatus,
			} as Response);

			const api = createApiClient(mockGetToken);
			const status = await api.getDeviceStatus("device-123");

			expect(status.connection?.online).toBe(false);
			expect(status.metrics).toBeNull();
		});

		it("should throw ApiError on 404 Not Found", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: "Device not found" }),
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.getDeviceStatus("nonexistent")).rejects.toThrow(
				"Device not found",
			);
		});
	});

	describe("deleteDevice", () => {
		it("should delete device and return void", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 204,
			} as Response);

			const api = createApiClient(mockGetToken);
			const result = await api.deleteDevice("device-123");

			expect(result).toBeUndefined();
			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.ngfw.sh/fleet/devices/device-123",
				expect.objectContaining({
					method: "DELETE",
				}),
			);
		});

		it("should URL encode device ID", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: true,
				status: 204,
			} as Response);

			const api = createApiClient(mockGetToken);
			await api.deleteDevice("device/123");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.ngfw.sh/fleet/devices/device%2F123",
				expect.objectContaining({ method: "DELETE" }),
			);
		});

		it("should throw ApiError on 404 Not Found", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: "Device not found" }),
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.deleteDevice("nonexistent")).rejects.toThrow(
				"Device not found",
			);
		});

		it("should throw ApiError on 403 Forbidden", async () => {
			mockGetToken.mockResolvedValue("test-token");
			vi.mocked(globalThis.fetch).mockResolvedValue({
				ok: false,
				status: 403,
				statusText: "Forbidden",
				json: async () => ({
					error: "Cannot delete device owned by another user",
				}),
			} as Response);

			const api = createApiClient(mockGetToken);

			await expect(api.deleteDevice("device-123")).rejects.toThrow(
				"Cannot delete device owned by another user",
			);
		});
	});

	describe("ApiError", () => {
		it("should create error with status and message", () => {
			const error = new ApiError(404, "Not Found");

			expect(error).toBeInstanceOf(Error);
			expect(error.status).toBe(404);
			expect(error.message).toBe("Not Found");
			expect(error.name).toBe("ApiError");
		});

		it("should be throwable and catchable", () => {
			expect(() => {
				throw new ApiError(500, "Server Error");
			}).toThrow(ApiError);
		});
	});
});
