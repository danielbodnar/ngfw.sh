/**
 * Unit tests for device management React hooks.
 * Tests useDevices, useDeviceStatus, and useRegisterDevice.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Device, DeviceRegistrationResponse, DeviceStatus } from "../api";
import { mockGetToken } from "../test/mocks/clerk";
import { useDeviceStatus, useDevices, useRegisterDevice } from "./useDevices";

describe("useDevices", () => {
	const mockDevices: Device[] = [
		{
			id: "device-1",
			name: "Router 1",
			model: "RT-AX92U",
			serial: "ABC123",
			owner_id: "user-123",
			firmware_version: "1.0.0",
			status: "online",
			created_at: Date.now(),
			last_seen: Date.now(),
		},
		{
			id: "device-2",
			name: "Router 2",
			model: null,
			serial: null,
			owner_id: "user-123",
			firmware_version: null,
			status: "provisioning",
			created_at: Date.now(),
			last_seen: null,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn() as unknown as typeof fetch;
		mockGetToken.mockResolvedValue("test-token");
	});

	it("should fetch devices on mount", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => mockDevices,
		} as Response);

		const { result } = renderHook(() => useDevices());

		expect(result.current.loading).toBe(true);
		expect(result.current.devices).toEqual([]);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.devices).toEqual(mockDevices);
		expect(result.current.error).toBeNull();
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it("should handle empty device list", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [],
		} as Response);

		const { result } = renderHook(() => useDevices());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.devices).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("should handle fetch error", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
			json: async () => ({ error: "Database error" }),
		} as Response);

		const { result } = renderHook(() => useDevices());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.devices).toEqual([]);
		expect(result.current.error).toBe("Database error");
	});

	it("should handle network error", async () => {
		vi.mocked(globalThis.fetch).mockRejectedValue(new Error("Network error"));

		const { result } = renderHook(() => useDevices());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.devices).toEqual([]);
		expect(result.current.error).toBe("Network error");
	});

	it("should refetch devices when refetch is called", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => mockDevices,
		} as Response);

		const { result } = renderHook(() => useDevices());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(globalThis.fetch).toHaveBeenCalledTimes(1);

		result.current.refetch();

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it("should handle auth token unavailable", async () => {
		mockGetToken.mockResolvedValue(null);
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [],
		} as Response);

		const { result } = renderHook(() => useDevices());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
		const headers = callArgs?.[1]?.headers as
			| Record<string, string>
			| undefined;
		expect(headers?.["Authorization"]).toBeUndefined();
	});
});

describe("useDeviceStatus", () => {
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

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		globalThis.fetch = vi.fn() as unknown as typeof fetch;
		mockGetToken.mockResolvedValue("test-token");
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should not poll when deviceId is null", async () => {
		const { result } = renderHook(() => useDeviceStatus(null));

		expect(result.current.status).toBeNull();
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});

	it("should fetch status immediately when deviceId is provided", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => mockStatus,
		} as Response);

		const { result } = renderHook(() => useDeviceStatus("device-123"));

		expect(result.current.loading).toBe(true);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.status).toEqual(mockStatus);
		expect(result.current.error).toBeNull();
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it("should poll every 5 seconds", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => mockStatus,
		} as Response);

		const { result } = renderHook(() => useDeviceStatus("device-123"));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(globalThis.fetch).toHaveBeenCalledTimes(1);

		// Advance time by 5 seconds
		await act(async () => {
			vi.advanceTimersByTime(5000);
		});

		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
		});

		// Advance time by another 5 seconds
		await act(async () => {
			vi.advanceTimersByTime(5000);
		});

		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledTimes(3);
		});
	});

	it("should update status on each poll", async () => {
		const status1 = {
			...mockStatus,
			metrics: { ...mockStatus.metrics!, cpu: 23 },
		};
		const status2 = {
			...mockStatus,
			metrics: { ...mockStatus.metrics!, cpu: 45 },
		};

		vi.mocked(globalThis.fetch)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => status1,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => status2,
			} as Response);

		const { result } = renderHook(() => useDeviceStatus("device-123"));

		await waitFor(() => {
			expect(result.current.status?.metrics?.cpu).toBe(23);
		});

		await act(async () => {
			vi.advanceTimersByTime(5000);
		});

		await waitFor(() => {
			expect(result.current.status?.metrics?.cpu).toBe(45);
		});
	});

	it("should stop polling when deviceId becomes null", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => mockStatus,
		} as Response);

		const { result, rerender } = renderHook(
			({ deviceId }: { deviceId: string | null }) => useDeviceStatus(deviceId),
			{ initialProps: { deviceId: "device-123" as string | null } },
		);

		await waitFor(() => {
			expect(result.current.status).toEqual(mockStatus);
		});

		expect(globalThis.fetch).toHaveBeenCalledTimes(1);

		// Change deviceId to null
		act(() => {
			rerender({ deviceId: null });
		});

		expect(result.current.status).toBeNull();

		// Advance time - no more polling should happen
		await act(async () => {
			vi.advanceTimersByTime(10000);
		});
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it("should switch polling to new device when deviceId changes", async () => {
		const status1 = {
			...mockStatus,
			device: { ...mockDevice, id: "device-1" },
		};
		const status2 = {
			...mockStatus,
			device: { ...mockDevice, id: "device-2" },
		};

		vi.mocked(globalThis.fetch)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => status1,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => status2,
			} as Response);

		const { result, rerender } = renderHook(
			({ deviceId }: { deviceId: string | null }) => useDeviceStatus(deviceId),
			{ initialProps: { deviceId: "device-1" as string | null } },
		);

		await waitFor(() => {
			expect(result.current.status?.device.id).toBe("device-1");
		});

		act(() => {
			rerender({ deviceId: "device-2" });
		});

		await waitFor(() => {
			expect(result.current.status?.device.id).toBe("device-2");
		});
	});

	it("should handle errors without stopping polling", async () => {
		vi.mocked(globalThis.fetch)
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: async () => ({ error: "Server error" }),
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockStatus,
			} as Response);

		const { result } = renderHook(() => useDeviceStatus("device-123"));

		await waitFor(() => {
			expect(result.current.error).toBe("Server error");
		});

		await act(async () => {
			vi.advanceTimersByTime(5000);
		});

		await waitFor(() => {
			expect(result.current.status).toEqual(mockStatus);
			expect(result.current.error).toBeNull();
		});
	});

	it("should handle offline device", async () => {
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

		const { result } = renderHook(() => useDeviceStatus("device-123"));

		await waitFor(() => {
			expect(result.current.status?.connection?.online).toBe(false);
			expect(result.current.status?.metrics).toBeNull();
		});
	});

	it("should cleanup polling on unmount", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => mockStatus,
		} as Response);

		const { unmount } = renderHook(() => useDeviceStatus("device-123"));

		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		});

		unmount();

		await act(async () => {
			vi.advanceTimersByTime(10000);
		});
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});
});

describe("useRegisterDevice", () => {
	const mockDevice: Device = {
		id: "device-123",
		name: "New Device",
		model: "RT-AX92U",
		serial: null,
		owner_id: "user-123",
		firmware_version: null,
		status: "provisioning",
		created_at: Date.now(),
		last_seen: null,
	};

	const mockResponse: DeviceRegistrationResponse = {
		...mockDevice,
		api_key: "secret-api-key-123",
		websocket_url: "wss://api.ngfw.sh/agent/ws",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn() as unknown as typeof fetch;
		mockGetToken.mockResolvedValue("test-token");
	});

	it("should have initial state", () => {
		const { result } = renderHook(() => useRegisterDevice());

		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(typeof result.current.register).toBe("function");
	});

	it("should register device successfully", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: true,
			status: 201,
			json: async () => mockResponse,
		} as Response);

		const { result } = renderHook(() => useRegisterDevice());

		let response: DeviceRegistrationResponse | undefined;

		await act(async () => {
			response = await result.current.register({
				name: "New Device",
				model: "RT-AX92U",
			});
		});

		expect(response).toEqual(mockResponse);
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("should set loading state during registration", async () => {
		let resolvePromise: (value: Response) => void;
		const promise = new Promise<Response>((resolve) => {
			resolvePromise = resolve;
		});

		vi.mocked(globalThis.fetch).mockReturnValue(promise);

		const { result } = renderHook(() => useRegisterDevice());

		const registerPromise = result.current.register({ name: "New Device" });

		await waitFor(() => {
			expect(result.current.loading).toBe(true);
		});

		// Resolve the fetch promise
		act(() => {
			resolvePromise!({
				ok: true,
				status: 201,
				json: async () => mockResponse,
			} as Response);
		});

		await registerPromise;

		expect(result.current.loading).toBe(false);
	});

	it("should handle registration error", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({
			ok: false,
			status: 400,
			statusText: "Bad Request",
			json: async () => ({ error: "Device name is required" }),
		} as Response);

		const { result } = renderHook(() => useRegisterDevice());

		await act(async () => {
			await expect(result.current.register({ name: "" })).rejects.toThrow();
		});

		await waitFor(() => {
			expect(result.current.error).toBe("Device name is required");
			expect(result.current.loading).toBe(false);
		});
	});

	it("should register multiple devices sequentially", async () => {
		const response1 = { ...mockResponse, id: "device-1", name: "Device 1" };
		const response2 = { ...mockResponse, id: "device-2", name: "Device 2" };

		vi.mocked(globalThis.fetch)
			.mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: async () => response1,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: async () => response2,
			} as Response);

		const { result } = renderHook(() => useRegisterDevice());

		let device1: DeviceRegistrationResponse;
		let device2: DeviceRegistrationResponse;

		await act(async () => {
			device1 = await result.current.register({ name: "Device 1" });
		});
		expect(device1!.id).toBe("device-1");

		await act(async () => {
			device2 = await result.current.register({ name: "Device 2" });
		});
		expect(device2!.id).toBe("device-2");

		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it("should clear error on successful registration after failure", async () => {
		vi.mocked(globalThis.fetch)
			.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => ({ error: "Invalid name" }),
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: async () => mockResponse,
			} as Response);

		const { result } = renderHook(() => useRegisterDevice());

		await act(async () => {
			await expect(result.current.register({ name: "" })).rejects.toThrow();
		});

		await waitFor(() => {
			expect(result.current.error).toBe("Invalid name");
		});

		await act(async () => {
			await result.current.register({ name: "Valid Device" });
		});

		expect(result.current.error).toBeNull();
	});
});
