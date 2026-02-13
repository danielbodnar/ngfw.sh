/**
 * Vue composable for device registration.
 *
 * @module composables/useRegisterDevice
 */

import { ref } from "vue";
import type {
	DeviceRegistration,
	DeviceRegistrationResponse,
} from "../lib/api/generated";
import { useApi } from "./useApi";

/**
 * Return value from useRegisterDevice.
 */
export interface UseRegisterDeviceReturn {
	/** Register a new device */
	register: (data: DeviceRegistration) => Promise<DeviceRegistrationResponse>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if registration fails */
	error: ReturnType<typeof ref<string | null>>;
}

/**
 * Mutation-style composable for registering a new device.
 *
 * Call `register()` to initiate the request. The returned promise resolves
 * with the full registration response (including the one-time `api_key`).
 *
 * @returns Registration function and state
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRegisterDevice } from '@/composables/useRegisterDevice';
 *
 * const { register, loading, error } = useRegisterDevice();
 *
 * async function handleSubmit() {
 *   const result = await register({ name: 'Edge Router', model: 'RT-AX92U' });
 *   console.log('API Key:', result.api_key);
 *   console.log('WebSocket URL:', result.websocket_url);
 * }
 * </script>
 * ```
 */
export function useRegisterDevice(): UseRegisterDeviceReturn {
	const api = useApi();
	const loading = ref(false);
	const error = ref<string | null>(null);

	async function register(
		data: DeviceRegistration,
	): Promise<DeviceRegistrationResponse> {
		loading.value = true;
		error.value = null;

		try {
			return await api.registerDevice(data);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to register device";
			error.value = message;
			throw err;
		} finally {
			loading.value = false;
		}
	}

	return {
		register,
		loading,
		error,
	};
}
