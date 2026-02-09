<script setup lang="ts">
import { computed, ref } from "vue";
import { usePolling } from "../../composables/usePolling";
import { useSelectedDevice } from "../../composables/useSelectedDevice";
import { useVPNServer } from "../../composables/useVPNServer";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Spinner from "../ui/Spinner.vue";

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch VPN server config and peers with auto-refresh
const {
	config,
	peers,
	loading,
	error,
	refetch,
	updateConfig,
	createPeer,
	deletePeer,
} = useVPNServer(deviceId);

// Auto-refresh every 30 seconds
usePolling({
	fetcher: refetch,
	interval: 30000,
	immediate: false,
});

// Format timestamp to relative time
const formatRelativeTime = (timestamp: number): string => {
	const now = Date.now() / 1000;
	const diff = now - timestamp;
	const seconds = Math.floor(diff);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "Just now";
};

// Format bytes to human-readable
const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

// Get protocol badge variant
const getProtocolVariant = (
	protocol: string,
): "success" | "primary" | "warning" => {
	if (protocol === "wireguard") return "success";
	if (protocol === "openvpn") return "primary";
	return "warning";
};

// Stats computed from config and peers
const stats = computed(() => {
	const peerList = peers.value || [];
	return {
		totalPeers: peerList.length,
		activePeers: peerList.filter((p) => p.enabled).length,
		connectedPeers: peerList.filter(
			(p) => p.last_handshake && Date.now() / 1000 - p.last_handshake < 180,
		).length,
	};
});
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex flex-col justify-center items-center h-64 space-y-4"
    >
      <Spinner size="lg" />
      <span class="text-sm text-[--color-text-secondary]"
        >Loading VPN server...</span
      >
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
    >
      <div class="flex items-start">
        <svg
          class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="ml-3 flex-1">
          <h3 class="text-red-800 dark:text-red-200 font-medium">
            Failed to load VPN server configuration
          </h3>
          <p class="text-red-700 dark:text-red-300 mt-1 text-sm">{{ error }}</p>
          <Button variant="danger" size="sm" class="mt-3" @click="refetch">
            Retry
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!config"
      class="text-center py-12"
    >
      <svg
        class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        VPN server not configured
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Enable the VPN server to allow remote access to your network.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Total Peers</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.totalPeers }}
                </p>
              </div>
              <div class="text-3xl">👥</div>
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Active Peers</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.activePeers }}
                </p>
              </div>
              <div class="text-3xl">✅</div>
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Connected</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.connectedPeers }}
                </p>
              </div>
              <div class="text-3xl">🔗</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- VPN Server Configuration -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Server Configuration
            </h2>
            <Badge :variant="config.enabled ? 'success' : 'danger'">
              {{ config.enabled ? 'Enabled' : 'Disabled' }}
            </Badge>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400">Protocol</p>
              <Badge :variant="getProtocolVariant(config.protocol)" class="mt-1">
                {{ config.protocol.toUpperCase() }}
              </Badge>
            </div>
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400">Port</p>
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                {{ config.port }}
              </p>
            </div>
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400">Subnet</p>
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                {{ config.subnet }}
              </p>
            </div>
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400">DNS Servers</p>
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                {{ config.dns_servers.join(', ') }}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <!-- Peers List -->
      <Card>
        <template #actions>
          <Button size="sm" @click="refetch">
            <svg
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            VPN Peers
          </h2>
        </div>

        <div v-if="!peers || peers.length === 0" class="p-12 text-center">
          <p class="text-slate-600 dark:text-slate-400">No peers configured</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead
              class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
            >
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Allowed IPs
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Last Handshake
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="peer in peers"
                :key="peer.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ peer.name }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ peer.allowed_ips.join(', ') }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="peer.enabled ? 'success' : 'danger'">
                    {{ peer.enabled ? 'Enabled' : 'Disabled' }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ peer.last_handshake ? formatRelativeTime(peer.last_handshake) : 'Never' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
