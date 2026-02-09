/**
 * Vue composable for IPS (Intrusion Prevention System) API.
 *
 * @module composables/useIPS
 */

import { onMounted, ref } from "vue";
import type { IPSAlert, IPSConfig, IPSRule } from "../lib/api/types";
import { useApi } from "./useApi";

/**
 * Return value from useIPS.
 */
export interface UseIPSReturn {
	/** IPS configuration */
	config: ReturnType<typeof ref<IPSConfig | null>>;
	/** IPS rules */
	rules: ReturnType<typeof ref<IPSRule[]>>;
	/** IPS alerts */
	alerts: ReturnType<typeof ref<IPSAlert[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch all IPS data */
	refetch: () => Promise<void>;
	/** Update IPS configuration */
	updateConfig: (updates: Partial<IPSConfig>) => Promise<IPSConfig>;
}

/**
 * Manages IPS configuration, rules, and alerts for a device.
 *
 * @param deviceId - Device ID to fetch IPS data for
 * @returns IPS state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useIPS } from '@/composables/useIPS';
 *
 * const deviceId = ref('device-123');
 * const { config, rules, alerts, updateConfig } = useIPS(deviceId);
 *
 * async function enableIPS() {
 *   await updateConfig({ enabled: true, mode: 'prevent' });
 * }
 * </script>
 * ```
 */
export function useIPS(deviceId: ReturnType<typeof ref<string>>): UseIPSReturn {
	const api = useApi();
	const config = ref<IPSConfig | null>(null);
	const rules = ref<IPSRule[]>([]);
	const alerts = ref<IPSAlert[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);

	async function refetch(): Promise<void> {
		if (!deviceId.value) return;

		loading.value = true;
		error.value = null;

		try {
			const [configData, rulesData, alertsData] = await Promise.all([
				api.getIPSConfig(deviceId.value),
				api.listIPSRules(deviceId.value),
				api.listIPSAlerts(deviceId.value),
			]);

			config.value = configData;
			rules.value = rulesData;
			alerts.value = alertsData;
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to fetch IPS data";
		} finally {
			loading.value = false;
		}
	}

	async function updateConfig(updates: Partial<IPSConfig>): Promise<IPSConfig> {
		if (!deviceId.value) {
			throw new Error("No device ID provided");
		}

		error.value = null;
		try {
			const updated = await api.updateIPSConfig(deviceId.value, updates);
			config.value = updated;
			return updated;
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to update IPS config";
			throw err;
		}
	}

	onMounted(() => {
		void refetch();
	});

	return {
		config,
		rules,
		alerts,
		loading,
		error,
		refetch,
		updateConfig,
	};
}
