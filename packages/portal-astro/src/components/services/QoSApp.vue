<script setup lang="ts">
import { computed, ref } from "vue";
import { usePolling } from "../../composables/usePolling";
import { useQoS } from "../../composables/useQoS";
import { useSelectedDevice } from "../../composables/useSelectedDevice";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Spinner from "../ui/Spinner.vue";

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch QoS rules with auto-refresh
const { data: rules, loading, error, refetch } = useQoS(deviceId);

// Auto-refresh every 30 seconds
usePolling({
	fetcher: refetch,
	interval: 30000,
	immediate: false,
});

// Get priority badge variant
const getPriorityVariant = (
	priority: string,
): "danger" | "warning" | "primary" | "success" => {
	if (priority === "critical") return "danger";
	if (priority === "high") return "warning";
	if (priority === "medium") return "primary";
	return "success";
};

// Format bandwidth
const formatBandwidth = (bytes: number): string => {
	if (bytes === 0) return "Unlimited";
	const mbps = bytes / 1000000;
	return `${mbps.toFixed(1)} Mbps`;
};

// Stats computed from rules
const stats = computed(() => {
	const ruleList = rules.value || [];
	return {
		totalRules: ruleList.length,
		enabledRules: ruleList.filter((r) => r.enabled).length,
		criticalRules: ruleList.filter((r) => r.priority === "critical").length,
		highRules: ruleList.filter((r) => r.priority === "high").length,
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
        >Loading QoS rules...</span
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
            Failed to load QoS rules
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
      v-else-if="!rules || rules.length === 0"
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
        No QoS rules configured
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Create rules to prioritize and shape network traffic.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Total Rules</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.totalRules }}
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
                  {{ stats.enabledRules }}
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
                <p class="text-sm text-slate-600 dark:text-slate-400">Critical Priority</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.criticalRules }}
                </p>
              </div>
              <div class="text-3xl">🔴</div>
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400">High Priority</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {{ stats.highRules }}
                </p>
              </div>
              <div class="text-3xl">🟠</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Rules List -->
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
            QoS Rules
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
                  Priority
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Protocol
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Ports
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Bandwidth
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="rule in rules"
                :key="rule.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ rule.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getPriorityVariant(rule.priority)">
                    {{ rule.priority.toUpperCase() }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ rule.protocol || 'Any' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  <span v-if="rule.source_port">Src: {{ rule.source_port }}</span>
                  <span v-if="rule.destination_port" class="ml-2">Dst: {{ rule.destination_port }}</span>
                  <span v-if="!rule.source_port && !rule.destination_port">Any</span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  <div v-if="rule.min_bandwidth || rule.max_bandwidth">
                    <span v-if="rule.min_bandwidth">Min: {{ formatBandwidth(rule.min_bandwidth) }}</span>
                    <span v-if="rule.max_bandwidth" class="ml-2">Max: {{ formatBandwidth(rule.max_bandwidth) }}</span>
                  </div>
                  <span v-else>Unlimited</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="rule.enabled ? 'success' : 'danger'">
                    {{ rule.enabled ? 'Enabled' : 'Disabled' }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
