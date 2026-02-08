<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDDNS } from '../../composables/useDDNS';
import { useSelectedDevice } from '../../composables/useSelectedDevice';
import { usePolling } from '../../composables/usePolling';
import Spinner from '../ui/Spinner.vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch DDNS configs with auto-refresh
const { data: configs, loading, error, refetch, forceUpdate } = useDDNS(deviceId);

// Auto-refresh every 60 seconds
usePolling({
  fetcher: refetch,
  interval: 60000,
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

// Format interval to human-readable
const formatInterval = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
};

// Stats computed from configs
const stats = computed(() => {
  const configList = configs.value || [];
  return {
    totalConfigs: configList.length,
    enabledConfigs: configList.filter((c) => c.enabled).length,
    recentUpdates: configList.filter((c) => c.last_update && (Date.now() / 1000 - c.last_update < 3600)).length,
  };
});

// Handle force update
const handleForceUpdate = async (configId: string) => {
  try {
    await forceUpdate(configId);
    await refetch();
  } catch (err) {
    console.error('Failed to force update:', err);
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
        >Loading DDNS configurations...</span
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
            Failed to load DDNS configurations
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
      v-else-if="!configs || configs.length === 0"
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
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        No DDNS configurations
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Configure Dynamic DNS to keep your hostname updated with your current IP address.
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
                <p class="text-sm text-slate-600 dark:text-slate-400">Total Configs</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.totalConfigs }}
                </p>
              </div>
              <div class="text-3xl">🌐</div>
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Enabled</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.enabledConfigs }}
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
                <p class="text-sm text-slate-600 dark:text-slate-400">Recently Updated</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.recentUpdates }}
                </p>
              </div>
              <div class="text-3xl">🔄</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Configs List -->
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
            DDNS Configurations
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
                  Hostname
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Provider
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Current IP
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Last Update
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Interval
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
                v-for="config in configs"
                :key="config.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ config.hostname }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ config.provider }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ config.last_ip || 'Unknown' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ config.last_update ? formatRelativeTime(config.last_update) : 'Never' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ formatInterval(config.update_interval) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="config.enabled ? 'success' : 'danger'">
                    {{ config.enabled ? 'Enabled' : 'Disabled' }}
                  </Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <Button
                    v-if="config.enabled"
                    size="sm"
                    variant="primary"
                    @click="handleForceUpdate(config.id)"
                  >
                    Force Update
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
