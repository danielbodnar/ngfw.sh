/**
 * Test utilities for component and composable testing.
 *
 * Provides helpers for mounting components with proper context,
 * waiting for async operations, and common test assertions.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { setupServer } from "msw/node";
import { vi, beforeAll, afterEach, afterAll, expect } from "vitest";
import { type Component, ref } from "vue";
import { mockToken } from "../fixtures";
import { handlers } from "../mocks/handlers";

/**
 * MSW server instance for API mocking
 */
export const server = setupServer(...handlers);

/**
 * Start MSW server before tests
 */
export function setupMockServer() {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => server.resetHandlers());
	afterAll(() => server.close());
}

/**
 * Mount a Vue component with common test context.
 *
 * Provides mocks for auth, routing, and global state.
 */
export function mountWithContext<T extends Component>(
	component: T,
	options: Record<string, any> = {},
) {
	const deviceId = ref(options.deviceId || "device-1");

	// Mock useAuth composable
	const mockAuth = {
		user: ref(options.user || { id: "user-1", firstName: "Test" }),
		isLoaded: ref(true),
		isSignedIn: ref(true),
		getToken: vi.fn().mockResolvedValue(mockToken),
		signOut: vi.fn().mockResolvedValue(undefined),
	};

	// Mock useSelectedDevice composable
	const mockSelectedDevice = {
		deviceId,
		setDeviceId: vi.fn((id: string) => {
			deviceId.value = id;
		}),
	};

	const wrapper = mount(component, {
		global: {
			provide: {
				auth: mockAuth,
				selectedDevice: mockSelectedDevice,
			},
			stubs: {
				teleport: true,
				transition: false,
				...options.stubs,
			},
			mocks: {
				...options.mocks,
			},
		},
		...options,
	});

	return {
		wrapper,
		mockAuth,
		mockSelectedDevice,
	};
}

/**
 * Wait for all pending promises to resolve.
 *
 * Useful after triggering async operations in tests.
 */
export async function flushPromises(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Wait for Vue's nextTick and flush promises.
 */
export async function nextTickAndFlush(): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Wait for a condition to be true.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 5000,
): Promise<void> {
	const startTime = Date.now();

	while (!condition()) {
		if (Date.now() - startTime > timeout) {
			throw new Error("Timeout waiting for condition");
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

/**
 * Wait for a ref value to match expected value.
 */
export async function waitForRef<T>(
	refValue: { value: T },
	expected: T,
	timeout = 5000,
): Promise<void> {
	await waitFor(() => refValue.value === expected, timeout);
}

/**
 * Mock fetch with custom response.
 */
export function mockFetch(response: any, status = 200) {
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? "OK" : "Error",
		json: async () => response,
		text: async () => JSON.stringify(response),
	});
}

/**
 * Mock fetch to throw network error.
 */
export function mockFetchError(message = "Network error") {
	return vi.fn().mockRejectedValue(new Error(message));
}

/**
 * Create a mock API client.
 */
export function createMockApiClient() {
	return {
		listDevices: vi.fn(),
		registerDevice: vi.fn(),
		getDeviceStatus: vi.fn(),
		deleteDevice: vi.fn(),
		listRoutes: vi.fn(),
		createRoute: vi.fn(),
		updateRoute: vi.fn(),
		deleteRoute: vi.fn(),
		listNATRules: vi.fn(),
		createNATRule: vi.fn(),
		updateNATRule: vi.fn(),
		deleteNATRule: vi.fn(),
		getIPSConfig: vi.fn(),
		updateIPSConfig: vi.fn(),
		listIPSRules: vi.fn(),
		listIPSAlerts: vi.fn(),
		getVPNServerConfig: vi.fn(),
		updateVPNServerConfig: vi.fn(),
		listVPNServerPeers: vi.fn(),
		createVPNServerPeer: vi.fn(),
		deleteVPNServerPeer: vi.fn(),
		listVPNClientProfiles: vi.fn(),
		createVPNClientProfile: vi.fn(),
		updateVPNClientProfile: vi.fn(),
		deleteVPNClientProfile: vi.fn(),
		getVPNClientStatus: vi.fn(),
		connectVPNClient: vi.fn(),
		disconnectVPNClient: vi.fn(),
		listQoSRules: vi.fn(),
		createQoSRule: vi.fn(),
		updateQoSRule: vi.fn(),
		deleteQoSRule: vi.fn(),
		listDDNSConfigs: vi.fn(),
		createDDNSConfig: vi.fn(),
		updateDDNSConfig: vi.fn(),
		deleteDDNSConfig: vi.fn(),
		forceDDNSUpdate: vi.fn(),
		listReports: vi.fn(),
		createReport: vi.fn(),
		getReport: vi.fn(),
		deleteReport: vi.fn(),
		queryLogs: vi.fn(),
		listDashboards: vi.fn(),
		createDashboard: vi.fn(),
		updateDashboard: vi.fn(),
		deleteDashboard: vi.fn(),
	};
}

/**
 * Assert that an element has specific text content.
 */
export function expectText(
	wrapper: VueWrapper,
	selector: string,
	text: string,
) {
	const element = wrapper.find(selector);
	expect(element.exists()).toBe(true);
	expect(element.text()).toContain(text);
}

/**
 * Assert that an element is visible.
 */
export function expectVisible(wrapper: VueWrapper, selector: string) {
	const element = wrapper.find(selector);
	expect(element.exists()).toBe(true);
	expect(element.isVisible()).toBe(true);
}

/**
 * Assert that an element is not visible.
 */
export function expectNotVisible(wrapper: VueWrapper, selector: string) {
	const element = wrapper.find(selector);
	if (element.exists()) {
		expect(element.isVisible()).toBe(false);
	}
}

/**
 * Trigger click and wait for updates.
 */
export async function clickAndWait(wrapper: VueWrapper, selector: string) {
	await wrapper.find(selector).trigger("click");
	await flushPromises();
	await wrapper.vm.$nextTick();
}

/**
 * Fill input and wait for updates.
 */
export async function fillAndWait(
	wrapper: VueWrapper,
	selector: string,
	value: string | number,
) {
	await wrapper.find(selector).setValue(value);
	await flushPromises();
	await wrapper.vm.$nextTick();
}

/**
 * Submit form and wait for updates.
 */
export async function submitAndWait(wrapper: VueWrapper, selector = "form") {
	await wrapper.find(selector).trigger("submit");
	await flushPromises();
	await wrapper.vm.$nextTick();
}
