/**
 * Vue composable for NAT API.
 *
 * @module composables/useNAT
 */

import { onMounted, ref } from "vue";
import type { NATRule, NATRuleCreate, NATRuleUpdate } from "../lib/api/types";
import { useApi } from "./useApi";

/**
 * Return value from useNAT.
 */
export interface UseNATReturn {
	/** List of NAT rules */
	data: ReturnType<typeof ref<NATRule[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch NAT rules */
	refetch: () => Promise<void>;
	/** Create a new NAT rule */
	create: (data: NATRuleCreate) => Promise<NATRule>;
	/** Update an existing NAT rule */
	update: (ruleId: string, data: NATRuleUpdate) => Promise<NATRule>;
	/** Delete a NAT rule */
	remove: (ruleId: string) => Promise<void>;
}

/**
 * Manages NAT rules for a device.
 *
 * @param deviceId - Device ID to fetch NAT rules for
 * @returns NAT rules state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useNAT } from '@/composables/useNAT';
 *
 * const deviceId = ref('device-123');
 * const { data: rules, create } = useNAT(deviceId);
 *
 * async function addPortForward() {
 *   await create({
 *     device_id: deviceId.value,
 *     name: 'Web Server',
 *     type: 'port_forward',
 *     external_ip: '203.0.113.42',
 *     external_port: 80,
 *     internal_ip: '192.168.1.10',
 *     internal_port: 8080,
 *     protocol: 'tcp',
 *   });
 * }
 * </script>
 * ```
 */
export function useNAT(deviceId: ReturnType<typeof ref<string>>): UseNATReturn {
	const api = useApi();
	const data = ref<NATRule[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);

	async function refetch(): Promise<void> {
		if (!deviceId.value) return;

		loading.value = true;
		error.value = null;

		try {
			data.value = await api.listNATRules(deviceId.value);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to fetch NAT rules";
		} finally {
			loading.value = false;
		}
	}

	async function create(ruleData: NATRuleCreate): Promise<NATRule> {
		error.value = null;
		try {
			return await api.createNATRule(ruleData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to create NAT rule";
			throw err;
		}
	}

	async function update(
		ruleId: string,
		ruleData: NATRuleUpdate,
	): Promise<NATRule> {
		error.value = null;
		try {
			return await api.updateNATRule(ruleId, ruleData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to update NAT rule";
			throw err;
		}
	}

	async function remove(ruleId: string): Promise<void> {
		error.value = null;
		try {
			await api.deleteNATRule(ruleId);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to delete NAT rule";
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
