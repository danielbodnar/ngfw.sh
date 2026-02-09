<script setup lang="ts">
import { computed, ref } from "vue";
import { useIPS } from "../../composables/useIPS";
import { usePolling } from "../../composables/usePolling";
import { useSelectedDevice } from "../../composables/useSelectedDevice";
import { useToast } from "../../composables/useToast";
import type { IPSAlert, IPSConfig } from "../../lib/api/types";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Spinner from "../ui/Spinner.vue";

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch IPS data with auto-refresh
const { config, rules, alerts, loading, error, refetch, updateConfig } =
	useIPS(deviceId);

// Auto-refresh every 30 seconds
usePolling({
	fetcher: refetch,
	interval: 30000,
	immediate: false,
});

// Toast notifications
const { success, error: showError } = useToast();

// Config editing state
const editingConfig = ref(false);
const configForm = ref<Partial<IPSConfig>>({
	enabled: false,
	mode: "detect",
	sensitivity: "medium",
});

// Initialize config form when data loads
function loadConfigForm(): void {
	if (config.value) {
		configForm.value = {
			enabled: config.value.enabled,
			mode: config.value.mode,
			sensitivity: config.value.sensitivity,
		};
	}
}

// Start editing config
function handleEditConfig(): void {
	loadConfigForm();
	editingConfig.value = true;
}

// Save config changes
async function handleSaveConfig(): Promise<void> {
	try {
		await updateConfig(configForm.value);
		success("IPS configuration updated successfully");
		editingConfig.value = false;
		await refetch();
	} catch (err) {
		showError(
			err instanceof Error ? err.message : "Failed to update IPS configuration",
		);
	}
}

// Cancel config editing
function handleCancelConfig(): void {
	editingConfig.value = false;
	loadConfigForm();
}

// Format timestamp to readable date
const formatTimestamp = (timestamp: number): string => {
	return new Date(timestamp).toLocaleString();
};

// Format relative time
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
	return "Just now";
};

// Get severity badge variant
const getSeverityVariant = (
	severity: string,
): "info" | "success" | "warning" | "danger" => {
	if (severity === "critical") return "danger";
	if (severity === "high") return "warning";
	if (severity === "medium") return "info";
	return "success";
};

// Get mode display name
const getModeDisplay = (mode: string): string => {
	if (mode === "detect") return "Detection Only";
	if (mode === "prevent") return "Prevention Mode";
	return mode;
};

// Get sensitivity display name
const getSensitivityDisplay = (sensitivity: string): string => {
	if (sensitivity === "low") return "Low";
	if (sensitivity === "medium") return "Medium";
	if (sensitivity === "high") return "High";
	return sensitivity;
};

// Compute stats
const stats = computed(() => {
	const alertList = alerts.value || [];
	const ruleList = rules.value || [];

	return {
		totalAlerts: alertList.length,
		blockedAlerts: alertList.filter((a) => a.blocked).length,
		criticalAlerts: alertList.filter((a) => a.severity === "critical").length,
		activeRules: ruleList.filter((r) => r.enabled).length,
		totalRules: ruleList.length,
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
        >Loading IPS data...</span
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
            Failed to load IPS data
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
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        IPS not configured
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Enable IPS to start monitoring and preventing intrusions.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card no-padding>
          <div class="p-4">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {{ stats.totalAlerts }}
            </div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Total Alerts
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-2xl font-bold text-red-600 dark:text-red-400">
              {{ stats.criticalAlerts }}
            </div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Critical
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {{ stats.blockedAlerts }}
            </div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Blocked
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ stats.activeRules }}
            </div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Active Rules
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ stats.totalRules }}
            </div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Total Rules
            </div>
          </div>
        </Card>
      </div>

      <!-- IPS Configuration -->
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
          <Button v-if="!editingConfig" variant="primary" size="sm" @click="handleEditConfig">
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Configuration
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            IPS Configuration
          </h2>
        </div>

        <div v-if="!editingConfig" class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">Status</div>
              <Badge :variant="config.enabled ? 'success' : 'secondary'" class="text-base">
                {{ config.enabled ? 'Enabled' : 'Disabled' }}
              </Badge>
            </div>

            <div>
              <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">Mode</div>
              <Badge variant="info" class="text-base">
                {{ getModeDisplay(config.mode) }}
              </Badge>
            </div>

            <div>
              <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">Sensitivity</div>
              <Badge variant="warning" class="text-base">
                {{ getSensitivityDisplay(config.sensitivity) }}
              </Badge>
            </div>
          </div>
        </div>

        <div v-else class="p-6 space-y-4">
          <div class="flex items-center">
            <input
              v-model="configForm.enabled"
              type="checkbox"
              id="ips-enabled"
              class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label for="ips-enabled" class="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Enable IPS
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mode
            </label>
            <select
              v-model="configForm.mode"
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="detect">Detection Only</option>
              <option value="prevent">Prevention Mode</option>
            </select>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Detection mode logs threats without blocking. Prevention mode actively blocks threats.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sensitivity
            </label>
            <select
              v-model="configForm.sensitivity"
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Higher sensitivity detects more threats but may increase false positives.
            </p>
          </div>

          <div class="flex gap-2 pt-2">
            <Button variant="primary" @click="handleSaveConfig">
              Save Changes
            </Button>
            <Button variant="secondary" @click="handleCancelConfig">
              Cancel
            </Button>
          </div>
        </div>
      </Card>

      <!-- Recent Alerts -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Alerts
          </h2>
        </div>

        <div v-if="!alerts || alerts.length === 0" class="p-6 text-center text-slate-600 dark:text-slate-400">
          No alerts detected
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
                  Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Severity
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Source IP
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Destination IP
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Protocol
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
                v-for="alert in alerts"
                :key="alert.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                  :title="formatTimestamp(alert.timestamp)"
                >
                  {{ formatRelativeTime(alert.timestamp) }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100"
                >
                  {{ alert.category }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getSeverityVariant(alert.severity)">
                    {{ alert.severity.toUpperCase() }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 dark:text-slate-400"
                >
                  {{ alert.source_ip }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 dark:text-slate-400"
                >
                  {{ alert.destination_ip }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ alert.protocol.toUpperCase() }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="alert.blocked ? 'danger' : 'warning'">
                    {{ alert.blocked ? 'Blocked' : 'Logged' }}
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
