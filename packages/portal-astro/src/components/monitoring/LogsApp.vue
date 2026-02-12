<script setup lang="ts">
import { computed, ref } from "vue";
import { useLogs } from "../../composables/useLogs";
import { usePolling } from "../../composables/usePolling";
import type { LogQuery } from "../../lib/api/generated";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";
import Spinner from "../ui/Spinner.vue";

// Initial query parameters
const initialQuery: LogQuery = {
	limit: 100,
};

// Fetch logs with reactive filtering
const { data: logs, loading, error, refetch, setQuery } = useLogs(initialQuery);

// Auto-refresh every 10 seconds
usePolling({
	fetcher: refetch,
	interval: 10000,
	immediate: false,
});

// Filter state
const filters = ref({
	level: "all",
	category: "",
	search: "",
	deviceId: "",
});

// Apply filters
const applyFilters = () => {
	const query: LogQuery = {
		limit: 100,
	};

	if (filters.value.level !== "all") {
		query.level = filters.value.level as LogQuery["level"];
	}

	if (filters.value.category) {
		query.category = filters.value.category;
	}

	if (filters.value.deviceId) {
		query.device_id = filters.value.deviceId;
	}

	setQuery(query);
};

// Search/filter logs client-side for search term
const filteredLogs = computed(() => {
	if (!logs.value) return [];

	let filtered = logs.value;

	if (filters.value.search) {
		const search = filters.value.search.toLowerCase();
		filtered = filtered.filter(
			(log) =>
				log.message.toLowerCase().includes(search) ||
				log.source_ip?.toLowerCase().includes(search) ||
				log.destination_ip?.toLowerCase().includes(search),
		);
	}

	return filtered;
});

// Format timestamp to readable time
const formatTimestamp = (timestamp: number): string => {
	return new Date(timestamp * 1000).toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
};

// Get log level badge variant
const getLevelVariant = (
	level: string,
): "success" | "danger" | "warning" | "info" => {
	if (level === "critical" || level === "error") return "danger";
	if (level === "warning") return "warning";
	if (level === "info") return "info";
	return "success";
};

// Get log level icon
const getLevelIcon = (level: string): string => {
	const icons: Record<string, string> = {
		critical: "🔴",
		error: "❌",
		warning: "⚠️",
		info: "ℹ️",
		debug: "🐛",
	};
	return icons[level] || "📝";
};

// Export logs
const handleExport = () => {
	if (!filteredLogs.value || filteredLogs.value.length === 0) return;

	const csvContent = [
		[
			"Timestamp",
			"Level",
			"Category",
			"Message",
			"Source IP",
			"Destination IP",
			"Protocol",
			"Action",
		].join(","),
		...filteredLogs.value.map((log) =>
			[
				formatTimestamp(log.timestamp),
				log.level,
				log.category,
				`"${log.message.replace(/"/g, '""')}"`,
				log.source_ip || "",
				log.destination_ip || "",
				log.protocol || "",
				log.action || "",
			].join(","),
		),
	].join("\n");

	const blob = new Blob([csvContent], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `logs-${Date.now()}.csv`;
	link.click();
	URL.revokeObjectURL(url);
};

// Compute stats
const stats = computed(() => {
	const logList = logs.value || [];
	return {
		total: logList.length,
		critical: logList.filter((l) => l.level === "critical").length,
		error: logList.filter((l) => l.level === "error").length,
		warning: logList.filter((l) => l.level === "warning").length,
		info: logList.filter((l) => l.level === "info").length,
	};
});

// Unique categories from logs
const categories = computed(() => {
	if (!logs.value) return [];
	const uniqueCategories = new Set(logs.value.map((log) => log.category));
	return Array.from(uniqueCategories).sort();
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
        >Loading logs...</span
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
            Failed to load logs
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
      v-else-if="!logs || logs.length === 0"
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        No logs found
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        No log entries match your current filters.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card no-padding>
          <div class="p-4">
            <div class="text-xs text-slate-600 dark:text-slate-400 mb-1">
              Total Logs
            </div>
            <div class="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {{ stats.total }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-xs text-slate-600 dark:text-slate-400 mb-1">
              Critical
            </div>
            <div class="text-xl font-semibold text-red-600 dark:text-red-400">
              {{ stats.critical }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-xs text-slate-600 dark:text-slate-400 mb-1">
              Errors
            </div>
            <div class="text-xl font-semibold text-red-500 dark:text-red-400">
              {{ stats.error }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-xs text-slate-600 dark:text-slate-400 mb-1">
              Warnings
            </div>
            <div class="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
              {{ stats.warning }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-4">
            <div class="text-xs text-slate-600 dark:text-slate-400 mb-1">
              Info
            </div>
            <div class="text-xl font-semibold text-blue-600 dark:text-blue-400">
              {{ stats.info }}
            </div>
          </div>
        </Card>
      </div>

      <!-- Filters -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Filters
          </h2>
        </div>

        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Log Level
              </label>
              <Select v-model="filters.level" @change="applyFilters">
                <option value="all">All Levels</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </Select>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <Select v-model="filters.category" @change="applyFilters">
                <option value="">All Categories</option>
                <option v-for="cat in categories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </Select>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search
              </label>
              <Input
                v-model="filters.search"
                placeholder="Search logs..."
                type="text"
              />
            </div>

            <div class="flex items-end">
              <Button @click="handleExport" class="w-full">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <!-- Logs List -->
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
            Log Entries
          </h2>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Showing {{ filteredLogs.length }} of {{ stats.total }} logs
          </p>
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
                  Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Level
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Message
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Source
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Destination
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400"
                >
                  {{ formatTimestamp(log.timestamp) }}
                </td>
                <td class="px-6 py-3 whitespace-nowrap">
                  <Badge :variant="getLevelVariant(log.level)">
                    {{ getLevelIcon(log.level) }} {{ log.level }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ log.category }}
                </td>
                <td
                  class="px-6 py-3 text-sm text-slate-900 dark:text-slate-100 max-w-md truncate"
                >
                  {{ log.message }}
                </td>
                <td
                  class="px-6 py-3 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-400"
                >
                  {{ log.source_ip || '-' }}
                </td>
                <td
                  class="px-6 py-3 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-400"
                >
                  {{ log.destination_ip || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
