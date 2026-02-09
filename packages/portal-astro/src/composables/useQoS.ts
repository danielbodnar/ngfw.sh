/**
 * Vue composable for QoS (Quality of Service) API.
 *
 * @module composables/useQoS
 */

import { onMounted, ref } from "vue";
import type { QoSRule, QoSRuleCreate, QoSRuleUpdate } from "../lib/api/types";
import { useApi } from "./useApi";

/**
 * Return value from useQoS.
 */
export interface UseQoSReturn {
	/** List of QoS rules */
	data: ReturnType<typeof ref<QoSRule[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch QoS rules */
	refetch: () => Promise<void>;
	/** Create a new QoS rule */
	create: (data: QoSRuleCreate) => Promise<QoSRule>;
	/** Update an existing QoS rule */
	update: (ruleId: string, data: QoSRuleUpdate) => Promise<QoSRule>;
	/** Delete a QoS rule */
	remove: (ruleId: string) => Promise<void>;
}

/**
 * Manages QoS rules for a device.
 *
 * @param deviceId - Device ID to fetch QoS rules for
 * @returns QoS rules state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useQoS } from '@/composables/useQoS';
 *
 * const deviceId = ref('device-123');
 * const { data: rules, create } = useQoS(deviceId);
 *
 * async function prioritizeVideoConf() {
 *   await create({
 *     device_id: deviceId.value,
 *     name: 'Video Conference Priority',
 *     destination_port: 8801,
 *     protocol: 'udp',
 *     priority: 'critical',
 *     min_bandwidth: 5000000, // 5 Mbps
 *   });
 * }
 * </script>
 * ```
 */
export function useQoS(deviceId: ReturnType<typeof ref<string>>): UseQoSReturn {
	const api = useApi();
	const data = ref<QoSRule[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);

	async function refetch(): Promise<void> {
		if (!deviceId.value) return;

		loading.value = true;
		error.value = null;

		try {
			data.value = await api.listQoSRules(deviceId.value);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to fetch QoS rules";
		} finally {
			loading.value = false;
		}
	}

	async function create(ruleData: QoSRuleCreate): Promise<QoSRule> {
		error.value = null;
		try {
			return await api.createQoSRule(ruleData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to create QoS rule";
			throw err;
		}
	}

	async function update(
		ruleId: string,
		ruleData: QoSRuleUpdate,
	): Promise<QoSRule> {
		error.value = null;
		try {
			return await api.updateQoSRule(ruleId, ruleData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to update QoS rule";
			throw err;
		}
	}

	async function remove(ruleId: string): Promise<void> {
		error.value = null;
		try {
			await api.deleteQoSRule(ruleId);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to delete QoS rule";
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
	};
}
