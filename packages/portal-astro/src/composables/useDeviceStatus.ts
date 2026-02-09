/**
 * Vue composable for polling device status.
 *
 * @module composables/useDeviceStatus
 */

import { computed, type ref, watch } from "vue";
import type { DeviceStatus } from "../lib/api/types";
import { useApi } from "./useApi";
import { usePolling } from "./usePolling";

/**
 * Return value from useDeviceStatus.
 */
export interface UseDeviceStatusReturn {
	/** Current device status */
	data: ReturnType<typeof ref<DeviceStatus | null>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch status */
	refetch: () => Promise<void>;
}

/**
 * Polls a single device's status every 5 seconds.
 *
 * Polling automatically starts when deviceId is provided and stops when
 * deviceId becomes null or the component unmounts.
 *
 * @param deviceId - Device ID to poll, or null to disable polling
 * @returns Device status state and controls
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useDeviceStatus } from '@/composables/useDeviceStatus';
 *
 * const selectedDeviceId = ref<string | null>('device-123');
 * const { data: status, loading, error } = useDeviceStatus(selectedDeviceId);
 * </script>
 *
 * <template>
 *   <div v-if="loading">Loading...</div>
 *   <div v-else-if="error">{{ error }}</div>
 *   <div v-else-if="status">
 *     <p>Status: {{ status.device.status }}</p>
 *     <p>CPU: {{ status.metrics?.cpu }}%</p>
 *     <p>Memory: {{ status.metrics?.memory }}%</p>
 *   </div>
 * </template>
 * ```
 */
export function useDeviceStatus(
	deviceId: ReturnType<typeof ref<string | null>>,
): UseDeviceStatusReturn {
	const api = useApi();

	const enabled = computed(() => deviceId.value !== null);

	const { data, loading, error, refetch } = usePolling<DeviceStatus>({
		fetcher: async () => {
			if (!deviceId.value) {
				throw new Error("No device ID provided");
			}
			return api.getDeviceStatus(deviceId.value);
		},
		interval: 5000,
		enabled: enabled.value,
	});

	// Reset state when deviceId becomes null
	watch(deviceId, (newId) => {
		if (!newId) {
			data.value = null;
			error.value = null;
		}
	});

	return {
		data,
		loading,
		error,
		refetch,
	};
}
