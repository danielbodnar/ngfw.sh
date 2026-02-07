<script setup lang="ts">
import { computed } from 'vue';
import { useDevices } from '../../composables/useDevices';
import { usePolling } from '../../composables/usePolling';
import Spinner from '../ui/Spinner.vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';
import Stat from '../ui/Stat.vue';

// Fetch devices with auto-refresh
const { data: devices, loading, error, refetch } = useDevices();

// Auto-refresh every 30 seconds
usePolling({
  fetcher: refetch,
  interval: 30000,
  immediate: false, // Don't fetch immediately since useDevices already does
});

// Compute aggregate stats from device list
const stats = computed(() => {
  const deviceList = devices.value || [];
  return {
    activeDevices: deviceList.filter((d) => d.status === 'online').length,
    totalDevices: deviceList.length,
    offlineDevices: deviceList.filter((d) => d.status === 'offline').length,
    provisioningDevices: deviceList.filter((d) => d.status === 'provisioning').length,
  };
});

// Format timestamp to relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// Get status badge variant
const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' => {
  if (status === 'online') return 'success';
  if (status === 'offline') return 'danger';
  return 'warning';
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
        >Loading dashboard...</span
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
            Failed to load dashboard
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
      v-else-if="!devices || devices.length === 0"
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        No devices registered
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Get started by registering your first router.
      </p>
      <Button variant="primary" class="mt-6" @click="$router?.push?.('/onboarding')">
        Register Device
      </Button>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card no-padding>
          <div class="p-6">
            <Stat
              label="Active Devices"
              :value="stats.activeDevices"
              icon="🟢"
            />
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <Stat
              label="Total Devices"
              :value="stats.totalDevices"
              icon="📦"
            />
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <Stat
              label="Offline Devices"
              :value="stats.offlineDevices"
              icon="🔴"
            />
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <Stat
              label="Provisioning"
              :value="stats.provisioningDevices"
              icon="⚙️"
            />
          </div>
        </Card>
      </div>

      <!-- Device List -->
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
            Your Devices
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
                  Model
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Firmware
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="device in devices"
                :key="device.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ device.name }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ device.model || 'Unknown' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ device.firmware_version }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getStatusVariant(device.status)">
                    {{ device.status }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ formatRelativeTime(device.last_seen) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
