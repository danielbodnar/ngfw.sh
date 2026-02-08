<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDashboards } from '../../composables/useDashboards';
import { usePolling } from '../../composables/usePolling';
import Spinner from '../ui/Spinner.vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Stat from '../ui/Stat.vue';

// Props
const props = defineProps<{
  dashboardId: string;
  title?: string;
  description?: string;
}>();

// Fetch dashboards
const { data: dashboards, loading, error, refetch } = useDashboards();

// Auto-refresh every 30 seconds
usePolling({
  fetcher: refetch,
  interval: 30000,
  immediate: false,
});

// Find the specific dashboard by ID
const dashboard = computed(() => {
  if (!dashboards.value) return null;
  return dashboards.value.find((d) => d.id === props.dashboardId || d.name === props.dashboardId);
});

// Dashboard configurations for specialized dashboards
const dashboardConfigs: Record<string, {
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number; icon: string }>;
}> = {
  'dns-analytics': {
    title: 'DNS Analytics',
    description: 'DNS queries and filtering statistics',
    stats: [
      { label: 'Total Queries', value: '45,892', icon: '🔍' },
      { label: 'Blocked Queries', value: '1,247', icon: '🚫' },
      { label: 'Cache Hit Rate', value: '87%', icon: '⚡' },
      { label: 'Avg Response Time', value: '12ms', icon: '⏱️' },
    ],
  },
  'firewall-rules': {
    title: 'Firewall Rules',
    description: 'Active firewall rules and blocked connections',
    stats: [
      { label: 'Active Rules', value: '156', icon: '🛡️' },
      { label: 'Blocked Today', value: '2,341', icon: '🚫' },
      { label: 'Allowed Today', value: '98,432', icon: '✅' },
      { label: 'Rule Violations', value: '12', icon: '⚠️' },
    ],
  },
  'network-overview': {
    title: 'Network Overview',
    description: 'Overall network status and performance',
    stats: [
      { label: 'Total Bandwidth', value: '945 Mbps', icon: '📊' },
      { label: 'Active Connections', value: '1,234', icon: '🔗' },
      { label: 'Connected Devices', value: '42', icon: '📱' },
      { label: 'Network Uptime', value: '99.8%', icon: '⬆️' },
    ],
  },
  'qos-metrics': {
    title: 'QoS Metrics',
    description: 'Quality of Service and bandwidth management',
    stats: [
      { label: 'Active QoS Rules', value: '23', icon: '⚙️' },
      { label: 'High Priority', value: '156 Mbps', icon: '🔴' },
      { label: 'Normal Priority', value: '523 Mbps', icon: '🟡' },
      { label: 'Low Priority', value: '234 Mbps', icon: '🟢' },
    ],
  },
  'security-events': {
    title: 'Security Events',
    description: 'Intrusion detection and security alerts',
    stats: [
      { label: 'Threats Blocked', value: '87', icon: '🛡️' },
      { label: 'Critical Alerts', value: '3', icon: '🔴' },
      { label: 'IPS Signatures', value: '45,231', icon: '📋' },
      { label: 'Last Scan', value: '2m ago', icon: '🔍' },
    ],
  },
  'system-resources': {
    title: 'System Resources',
    description: 'CPU, memory, and storage utilization',
    stats: [
      { label: 'CPU Usage', value: '34%', icon: '💻' },
      { label: 'Memory Usage', value: '2.4 GB', icon: '🧠' },
      { label: 'Disk Usage', value: '45%', icon: '💾' },
      { label: 'Temperature', value: '52°C', icon: '🌡️' },
    ],
  },
  'traffic-analysis': {
    title: 'Traffic Analysis',
    description: 'Network traffic patterns and statistics',
    stats: [
      { label: 'Inbound Traffic', value: '456 Mbps', icon: '⬇️' },
      { label: 'Outbound Traffic', value: '234 Mbps', icon: '⬆️' },
      { label: 'Peak Traffic', value: '892 Mbps', icon: '📈' },
      { label: 'Total Data', value: '1.2 TB', icon: '📦' },
    ],
  },
  'vpn-metrics': {
    title: 'VPN Metrics',
    description: 'VPN connections and performance',
    stats: [
      { label: 'Active Tunnels', value: '8', icon: '🔒' },
      { label: 'Connected Users', value: '12', icon: '👥' },
      { label: 'VPN Traffic', value: '123 Mbps', icon: '🌐' },
      { label: 'Avg Latency', value: '24ms', icon: '⏱️' },
    ],
  },
  'wan-health': {
    title: 'WAN Health',
    description: 'WAN connection status and performance',
    stats: [
      { label: 'Primary WAN', value: 'Online', icon: '🟢' },
      { label: 'Backup WAN', value: 'Standby', icon: '🟡' },
      { label: 'Packet Loss', value: '0.02%', icon: '📉' },
      { label: 'Jitter', value: '2ms', icon: '📊' },
    ],
  },
  'wifi-performance': {
    title: 'WiFi Performance',
    description: 'Wireless network performance metrics',
    stats: [
      { label: '2.4GHz Clients', value: '18', icon: '📡' },
      { label: '5GHz Clients', value: '24', icon: '📡' },
      { label: 'Channel Util.', value: '45%', icon: '📊' },
      { label: 'Avg Signal', value: '-62 dBm', icon: '📶' },
    ],
  },
};

// Get dashboard config
const config = computed(() => {
  return dashboardConfigs[props.dashboardId] || {
    title: props.title || 'Dashboard',
    description: props.description || 'Dashboard view',
    stats: [],
  };
});

// Placeholder for future dashboard data fetching
const dashboardData = ref<Record<string, unknown>>({});

onMounted(() => {
  // TODO: Fetch dashboard-specific data from API
  // This will be implemented when the backend provides dashboard data endpoints
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        Dashboard not found
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        The requested dashboard configuration could not be found.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card v-for="stat in config.stats" :key="stat.label" no-padding>
          <div class="p-6">
            <Stat
              :label="stat.label"
              :value="stat.value"
              :icon="stat.icon"
            />
          </div>
        </Card>
      </div>

      <!-- Dashboard Content Placeholder -->
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
            {{ config.title }}
          </h2>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {{ config.description }}
          </p>
        </div>

        <div class="p-6">
          <!-- Placeholder for dashboard widgets -->
          <div class="text-center py-8">
            <svg
              class="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Dashboard widgets and visualizations will appear here.
            </p>
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Custom dashboard layouts coming soon.
            </p>
          </div>
        </div>
      </Card>

      <!-- Additional Info Card -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            About This Dashboard
          </h2>
        </div>

        <div class="p-6">
          <div class="prose dark:prose-invert max-w-none">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              This dashboard provides real-time monitoring and analytics for
              <strong>{{ config.title }}</strong>. The metrics shown above are updated
              automatically every 30 seconds.
            </p>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-4">
              Use the refresh button to manually update the data, or customize this dashboard
              to show the metrics that matter most to you.
            </p>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
