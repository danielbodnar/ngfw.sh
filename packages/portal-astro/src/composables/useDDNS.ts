/**
 * Vue composable for DDNS (Dynamic DNS) API.
 *
 * @module composables/useDDNS
 */

import { onMounted, ref } from "vue";
import type {
	DDNSConfig,
	DDNSConfigCreate,
	DDNSConfigUpdate,
} from "../lib/api/generated";
import { useApi } from "./useApi";

/**
 * Return value from useDDNS.
 */
export interface UseDDNSReturn {
	/** List of DDNS configurations */
	data: ReturnType<typeof ref<DDNSConfig[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch DDNS configs */
	refetch: () => Promise<void>;
	/** Create a new DDNS config */
	create: (data: DDNSConfigCreate) => Promise<DDNSConfig>;
	/** Update an existing DDNS config */
	update: (configId: string, data: DDNSConfigUpdate) => Promise<DDNSConfig>;
	/** Delete a DDNS config */
	remove: (configId: string) => Promise<void>;
	/** Force a DDNS update */
	forceUpdate: (configId: string) => Promise<void>;
}

/**
 * Manages DDNS configurations for a device.
 *
 * @param deviceId - Device ID to fetch DDNS configs for
 * @returns DDNS configs state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useDDNS } from '@/composables/useDDNS';
 *
 * const deviceId = ref('device-123');
 * const { data: configs, create, forceUpdate } = useDDNS(deviceId);
 *
 * async function setupDDNS() {
 *   const config = await create({
 *     device_id: deviceId.value,
 *     provider: 'cloudflare',
 *     hostname: 'home.example.com',
 *     username: 'user@example.com',
 *     password: 'api-key',
 *     update_interval: 300,
 *   });
 *   await forceUpdate(config.id);
 * }
 * </script>
 * ```
 */
export function useDDNS(
	deviceId: ReturnType<typeof ref<string>>,
): UseDDNSReturn {
	const api = useApi();
	const data = ref<DDNSConfig[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);

	async function refetch(): Promise<void> {
		if (!deviceId.value) return;

		loading.value = true;
		error.value = null;

		try {
			data.value = await api.listDDNSConfigs(deviceId.value);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to fetch DDNS configs";
		} finally {
			loading.value = false;
		}
	}

	async function create(configData: DDNSConfigCreate): Promise<DDNSConfig> {
		error.value = null;
		try {
			return await api.createDDNSConfig(configData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to create DDNS config";
			throw err;
		}
	}

	async function update(
		configId: string,
		configData: DDNSConfigUpdate,
	): Promise<DDNSConfig> {
		error.value = null;
		try {
			return await api.updateDDNSConfig(configId, configData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to update DDNS config";
			throw err;
		}
	}

	async function remove(configId: string): Promise<void> {
		error.value = null;
		try {
			await api.deleteDDNSConfig(configId);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to delete DDNS config";
			throw err;
		}
	}

	async function forceUpdate(configId: string): Promise<void> {
		error.value = null;
		try {
			await api.forceDDNSUpdate(configId);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to force DDNS update";
			throw err;
		}
	}

	onMounted(() => {
		void refetch();
	});

	return {
		data,
		loading,
		error,
		refetch,
		create,
		update,
		remove,
		forceUpdate,
	};
}
