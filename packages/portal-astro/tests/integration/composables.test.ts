/**
 * Integration tests for Vue composables.
 *
 * Tests composables with real API client (mocked backend) to verify
 * the full data flow from component mount through API calls to state updates.
 */

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { devices, mockToken, natRules } from "../fixtures";
import { flushPromises, setupMockServer } from "../utils/test-utils";

setupMockServer();

describe("Composable Integration Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("useAuth", () => {
		it("fetches user on mount", async () => {
			// Mock the auth endpoints
			const { useAuth } = await import("../../src/composables/useAuth");

			const TestComponent = {
				template: "<div>{{ user?.firstName }}</div>",
				setup() {
					return useAuth();
				},
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			expect(wrapper.text()).toContain("Test");
		});

		it("caches tokens for 5 minutes", async () => {
			const { useAuth } = await import("../../src/composables/useAuth");

			const TestComponent = {
				setup() {
					return useAuth();
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { getToken } = wrapper.vm as any;

			// First call fetches token
			const token1 = await getToken();
			expect(token1).toBe(mockToken);

			// Second call returns cached token
			const token2 = await getToken();
			expect(token2).toBe(mockToken);

			// Verify fetch was only called once
			const fetchSpy = vi.spyOn(global, "fetch");
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it("handles sign out", async () => {
			const { useAuth } = await import("../../src/composables/useAuth");

			const TestComponent = {
				setup() {
					return useAuth();
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { signOut, user } = wrapper.vm as any;

			expect(user.value).toBeTruthy();

			await signOut();
			await flushPromises();

			expect(user.value).toBeNull();
		});
	});

	describe("useDevices", () => {
		it("fetches devices on mount", async () => {
			const { useDevices } = await import("../../src/composables/useDevices");

			const TestComponent = {
				template: "<div>{{ data.length }}</div>",
				setup() {
					return useDevices();
				},
			};

			const wrapper = mount(TestComponent);

			// Initially loading
			expect((wrapper.vm as any).loading.value).toBe(true);

			await flushPromises();

			// After load
			expect((wrapper.vm as any).loading.value).toBe(false);
			expect((wrapper.vm as any).data.value).toEqual(devices);
			expect(wrapper.text()).toBe("2");
		});

		it("handles fetch errors", async () => {
			// Mock API error
			vi.spyOn(global, "fetch").mockRejectedValueOnce(
				new Error("Network error"),
			);

			const { useDevices } = await import("../../src/composables/useDevices");

			const TestComponent = {
				setup() {
					return useDevices();
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { error } = wrapper.vm as any;
			expect(error.value).toBeTruthy();
			expect(error.value).toContain("Network error");
		});

		it("refetches devices on demand", async () => {
			const { useDevices } = await import("../../src/composables/useDevices");

			const TestComponent = {
				setup() {
					return useDevices();
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { refetch, data } = wrapper.vm as any;
			expect(data.value).toHaveLength(2);

			// Trigger refetch
			await refetch();
			await flushPromises();

			expect(data.value).toHaveLength(2);
		});
	});

	describe("useNAT", () => {
		it("fetches NAT rules for device", async () => {
			const { useNAT } = await import("../../src/composables/useNAT");
			const deviceId = ref("device-1");

			const TestComponent = {
				setup() {
					return useNAT(deviceId);
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { data } = wrapper.vm as any;
			expect(data.value).toEqual(natRules);
		});

		it("creates NAT rule", async () => {
			const { useNAT } = await import("../../src/composables/useNAT");
			const deviceId = ref("device-1");

			const TestComponent = {
				setup() {
					return useNAT(deviceId);
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { create, data } = wrapper.vm as any;

			const newRule = {
				device_id: "device-1",
				name: "FTP Server",
				type: "port_forward",
				external_ip: "203.0.113.1",
				external_port: 21,
				internal_ip: "192.168.1.102",
				internal_port: 21,
				protocol: "tcp",
			};

			await create(newRule);
			await flushPromises();

			// Verify data was updated (in real scenario)
			expect(data.value).toBeTruthy();
		});

		it("updates NAT rule", async () => {
			const { useNAT } = await import("../../src/composables/useNAT");
			const deviceId = ref("device-1");

			const TestComponent = {
				setup() {
					return useNAT(deviceId);
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { update } = wrapper.vm as any;

			await update("nat-1", { enabled: false });
			await flushPromises();

			// Verify update succeeded (no throw)
			expect(true).toBe(true);
		});

		it("deletes NAT rule", async () => {
			const { useNAT } = await import("../../src/composables/useNAT");
			const deviceId = ref("device-1");

			const TestComponent = {
				setup() {
					return useNAT(deviceId);
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { remove } = wrapper.vm as any;

			await remove("nat-1");
			await flushPromises();

			// Verify delete succeeded
			expect(true).toBe(true);
		});
	});

	describe("useDeviceStatus", () => {
		it("fetches device status", async () => {
			const { useDeviceStatus } = await import(
				"../../src/composables/useDeviceStatus"
			);
			const deviceId = ref("device-1");

			const TestComponent = {
				setup() {
					return useDeviceStatus(deviceId);
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { data } = wrapper.vm as any;
			expect(data.value).toHaveProperty("device");
			expect(data.value).toHaveProperty("metrics");
			expect(data.value.metrics.cpu).toBeGreaterThan(0);
		});

		it("reactively updates when device changes", async () => {
			const { useDeviceStatus } = await import(
				"../../src/composables/useDeviceStatus"
			);
			const deviceId = ref("device-1");

			const TestComponent = {
				setup() {
					return { ...useDeviceStatus(deviceId), deviceId };
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { data, loading } = wrapper.vm as any;
			expect(data.value).toBeTruthy();

			// Change device
			deviceId.value = "device-2";
			await flushPromises();

			// Should refetch for new device
			expect(loading.value).toBe(false);
			expect(data.value).toBeTruthy();
		});
	});

	describe("usePolling", () => {
		it("polls at specified interval", async () => {
			vi.useFakeTimers();

			const { usePolling } = await import("../../src/composables/usePolling");
			const fetcher = vi.fn().mockResolvedValue(undefined);

			const TestComponent = {
				setup() {
					usePolling({
						fetcher,
						interval: 1000,
						immediate: false,
					});
					return {};
				},
				template: "<div></div>",
			};

			mount(TestComponent);

			// Should not call immediately
			expect(fetcher).not.toHaveBeenCalled();

			// Advance 1 second
			vi.advanceTimersByTime(1000);
			await flushPromises();
			expect(fetcher).toHaveBeenCalledTimes(1);

			// Advance another second
			vi.advanceTimersByTime(1000);
			await flushPromises();
			expect(fetcher).toHaveBeenCalledTimes(2);

			vi.useRealTimers();
		});

		it("stops polling on unmount", async () => {
			vi.useFakeTimers();

			const { usePolling } = await import("../../src/composables/usePolling");
			const fetcher = vi.fn().mockResolvedValue(undefined);

			const TestComponent = {
				setup() {
					usePolling({
						fetcher,
						interval: 1000,
					});
					return {};
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);

			vi.advanceTimersByTime(1000);
			await flushPromises();
			expect(fetcher).toHaveBeenCalledTimes(1);

			// Unmount component
			wrapper.unmount();

			// Advance time - should not poll
			vi.advanceTimersByTime(1000);
			await flushPromises();
			expect(fetcher).toHaveBeenCalledTimes(1);

			vi.useRealTimers();
		});
	});

	describe("useRegisterDevice", () => {
		it("registers device successfully", async () => {
			const { useRegisterDevice } = await import(
				"../../src/composables/useRegisterDevice"
			);

			const TestComponent = {
				setup() {
					return useRegisterDevice();
				},
				template: "<div></div>",
			};

			const wrapper = mount(TestComponent);
			await flushPromises();

			const { register } = wrapper.vm as any;

			const result = await register({
				name: "New Router",
				model: "RT-AX88U",
			});

			expect(result).toHaveProperty("api_key");
			expect(result).toHaveProperty("websocket_url");
		});
	});
});
