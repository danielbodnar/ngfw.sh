<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVPNClient } from '../../composables/useVPNClient';
import { useSelectedDevice } from '../../composables/useSelectedDevice';
import { usePolling } from '../../composables/usePolling';
import Spinner from '../ui/Spinner.vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch VPN client profiles with auto-refresh
const { profiles, loading, error, refetch, connect, disconnect } = useVPNClient(deviceId);

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
  return 'Just now';
};

// Format bytes to human-readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// Get protocol badge variant
const getProtocolVariant = (protocol: string): 'success' | 'primary' | 'warning' => {
  if (protocol === 'wireguard') return 'success';
  if (protocol === 'openvpn') return 'primary';
  return 'warning';
};

// Stats computed from profiles
const stats = computed(() => {
  const profileList = profiles.value || [];
  return {
    totalProfiles: profileList.length,
    enabledProfiles: profileList.filter((p) => p.enabled).length,
    autoConnectProfiles: profileList.filter((p) => p.auto_connect).length,
  };
});

// Handle connect action
const handleConnect = async (profileId: string) => {
  try {
    await connect(profileId);
    await refetch();
  } catch (err) {
    console.error('Failed to connect:', err);
  }
};

// Handle disconnect action
const handleDisconnect = async (profileId: string) => {
  try {
    await disconnect(profileId);
    await refetch();
  } catch (err) {
    console.error('Failed to disconnect:', err);
  }
};
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
        >Loading VPN client profiles...</span
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
            Failed to load VPN client profiles
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
      v-else-if="!profiles || profiles.length === 0"
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
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        No VPN client profiles
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Create a profile to connect to external VPN servers.
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
                <p class="text-sm text-slate-600 dark:text-slate-400">Total Profiles</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.totalProfiles }}
                </p>
              </div>
              <div class="text-3xl">📋</div>
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Enabled</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.enabledProfiles }}
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
                <p class="text-sm text-slate-600 dark:text-slate-400">Auto-Connect</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.autoConnectProfiles }}
                </p>
              </div>
              <div class="text-3xl">🔄</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Profiles List -->
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
            VPN Client Profiles
          </h2>
        </div>

        <div class="overflow-x-auto">
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
                  Protocol
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Server
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="profile in profiles"
                :key="profile.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ profile.name }}
                  <span v-if="profile.auto_connect" class="ml-2 text-xs text-slate-500">(auto)</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getProtocolVariant(profile.protocol)">
                    {{ profile.protocol.toUpperCase() }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ profile.server }}:{{ profile.port }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="profile.enabled ? 'success' : 'danger'">
                    {{ profile.enabled ? 'Enabled' : 'Disabled' }}
                  </Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <Button
                    v-if="profile.enabled"
                    size="sm"
                    variant="primary"
                    @click="handleConnect(profile.id)"
                  >
                    Connect
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
