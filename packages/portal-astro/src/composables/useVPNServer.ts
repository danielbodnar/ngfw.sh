/**
 * Vue composable for VPN Server API.
 *
 * @module composables/useVPNServer
 */

import { onMounted, ref } from "vue";
import type { VPNServerConfig, VPNServerPeer } from "../lib/api/generated";
import { useApi } from "./useApi";

/**
 * Return value from useVPNServer.
 */
export interface UseVPNServerReturn {
	/** VPN server configuration */
	config: ReturnType<typeof ref<VPNServerConfig | null>>;
	/** VPN server peers */
	peers: ReturnType<typeof ref<VPNServerPeer[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch all VPN server data */
	refetch: () => Promise<void>;
	/** Update VPN server configuration */
	updateConfig: (updates: Partial<VPNServerConfig>) => Promise<VPNServerConfig>;
	/** Create a new peer */
	createPeer: (peer: Partial<VPNServerPeer>) => Promise<VPNServerPeer>;
	/** Delete a peer */
	deletePeer: (peerId: string) => Promise<void>;
}

/**
 * Manages VPN server configuration and peers for a device.
 *
 * @param deviceId - Device ID to fetch VPN server data for
 * @returns VPN server state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useVPNServer } from '@/composables/useVPNServer';
 *
 * const deviceId = ref('device-123');
 * const { config, peers, updateConfig, createPeer } = useVPNServer(deviceId);
 *
 * async function enableVPN() {
 *   await updateConfig({ enabled: true, port: 51820 });
 * }
 * </script>
 * ```
 */
export function useVPNServer(
	deviceId: ReturnType<typeof ref<string>>,
): UseVPNServerReturn {
	const api = useApi();
	const config = ref<VPNServerConfig | null>(null);
	const peers = ref<VPNServerPeer[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);

	async function refetch(): Promise<void> {
		if (!deviceId.value) return;

		loading.value = true;
		error.value = null;

		try {
			const [configData, peersData] = await Promise.all([
				api.getVPNServerConfig(deviceId.value),
				api.listVPNServerPeers(deviceId.value),
			]);

			config.value = configData;
			peers.value = peersData;
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to fetch VPN server data";
		} finally {
			loading.value = false;
		}
	}

	async function updateConfig(
		updates: Partial<VPNServerConfig>,
	): Promise<VPNServerConfig> {
		if (!deviceId.value) {
			throw new Error("No device ID provided");
		}

		error.value = null;
		try {
			const updated = await api.updateVPNServerConfig(deviceId.value, updates);
			config.value = updated;
			return updated;
		} catch (err) {
			error.value =
				err instanceof Error
					? err.message
					: "Failed to update VPN server config";
			throw err;
		}
	}

	async function createPeer(
		peer: Partial<VPNServerPeer>,
	): Promise<VPNServerPeer> {
		if (!deviceId.value) {
			throw new Error("No device ID provided");
		}

		error.value = null;
		try {
			return await api.createVPNServerPeer(deviceId.value, peer);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to create peer";
			throw err;
		}
	}

	async function deletePeer(peerId: string): Promise<void> {
		error.value = null;
		try {
			await api.deleteVPNServerPeer(peerId);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to delete peer";
			throw err;
		}
	}

	onMounted(() => {
		void refetch();
	});

	return {
		config,
		peers,
		loading,
		error,
		refetch,
		updateConfig,
		createPeer,
		deletePeer,
	};
}
