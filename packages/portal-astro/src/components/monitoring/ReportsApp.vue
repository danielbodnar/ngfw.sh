<script setup lang="ts">
import { computed, ref } from "vue";
import { usePolling } from "../../composables/usePolling";
import { useReports } from "../../composables/useReports";
import { useSelectedDevice } from "../../composables/useSelectedDevice";
import type { ReportCreate } from "../../lib/api/generated";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Modal from "../ui/Modal.vue";
import Select from "../ui/Select.vue";
import Spinner from "../ui/Spinner.vue";

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch reports with auto-refresh
const {
	data: reports,
	loading,
	error,
	refetch,
	create,
	remove,
} = useReports(deviceId);

// Auto-refresh every 30 seconds
usePolling({
	fetcher: refetch,
	interval: 30000,
	immediate: false,
});

// Report generator modal state
const showGenerator = ref(false);
const generating = ref(false);
const generatorError = ref<string | null>(null);

// Report generator form
const reportForm = ref<Partial<ReportCreate>>({
	type: "traffic",
	format: "pdf",
});

// Time period presets
const timePeriods = [
	{ label: "Last 24 Hours", value: "24h" },
	{ label: "Last 7 Days", value: "7d" },
	{ label: "Last 30 Days", value: "30d" },
	{ label: "Last 90 Days", value: "90d" },
];

const selectedPeriod = ref("7d");

// Calculate time range based on selected period
const calculateTimeRange = (period: string) => {
	const now = Math.floor(Date.now() / 1000);
	const periods: Record<string, number> = {
		"24h": 24 * 60 * 60,
		"7d": 7 * 24 * 60 * 60,
		"30d": 30 * 24 * 60 * 60,
		"90d": 90 * 24 * 60 * 60,
	};

	const duration = periods[period] || periods["7d"];
	return {
		period_start: now - duration,
		period_end: now,
	};
};

// Format timestamp to readable date
const formatDate = (timestamp: number): string => {
	return new Date(timestamp * 1000).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Format file size
const formatFileSize = (bytes: number): string => {
	const sizes = ["B", "KB", "MB", "GB"];
	if (bytes === 0) return "0 B";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
};

// Get status badge variant
const getStatusVariant = (
	status: string,
): "success" | "danger" | "warning" | "info" => {
	if (status === "completed") return "success";
	if (status === "failed") return "danger";
	if (status === "generating") return "warning";
	return "info";
};

// Get report type display name
const getReportTypeName = (type: string): string => {
	const types: Record<string, string> = {
		traffic: "Traffic Analysis",
		security: "Security Report",
		performance: "Performance Report",
		summary: "Summary Report",
	};
	return types[type] || type;
};

// Generate report
const handleGenerateReport = async () => {
	if (!deviceId.value) return;

	generating.value = true;
	generatorError.value = null;

	try {
		const timeRange = calculateTimeRange(selectedPeriod.value);

		await create({
			device_id: deviceId.value,
			type: reportForm.value.type as ReportCreate["type"],
			format: reportForm.value.format as ReportCreate["format"],
			...timeRange,
		});

		showGenerator.value = false;
		await refetch();
	} catch (err) {
		generatorError.value =
			err instanceof Error ? err.message : "Failed to generate report";
	} finally {
		generating.value = false;
	}
};

// Download report
const handleDownload = (reportUrl: string, reportId: string) => {
	const link = document.createElement("a");
	link.href = reportUrl;
	link.download = `report-${reportId}`;
	link.click();
};

// Delete report
const handleDelete = async (reportId: string) => {
	if (!confirm("Are you sure you want to delete this report?")) return;

	try {
		await remove(reportId);
		await refetch();
	} catch (err) {
		console.error("Failed to delete report:", err);
	}
};

// Compute stats
const stats = computed(() => {
	const reportList = reports.value || [];
	return {
		total: reportList.length,
		completed: reportList.filter((r) => r.status === "completed").length,
		generating: reportList.filter((r) => r.status === "generating").length,
		failed: reportList.filter((r) => r.status === "failed").length,
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
        >Loading reports...</span
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
            Failed to load reports
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
      v-else-if="!reports || reports.length === 0"
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
        No reports generated
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Generate your first report to get started.
      </p>
      <Button variant="primary" class="mt-6" @click="showGenerator = true">
        Generate Report
      </Button>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card no-padding>
          <div class="p-6">
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Total Reports
            </div>
            <div class="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {{ stats.total }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Completed
            </div>
            <div class="text-2xl font-semibold text-green-600 dark:text-green-400">
              {{ stats.completed }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Generating
            </div>
            <div class="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
              {{ stats.generating }}
            </div>
          </div>
        </Card>

        <Card no-padding>
          <div class="p-6">
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Failed
            </div>
            <div class="text-2xl font-semibold text-red-600 dark:text-red-400">
              {{ stats.failed }}
            </div>
          </div>
        </Card>
      </div>

      <!-- Reports List -->
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
          <Button variant="primary" size="sm" @click="showGenerator = true">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Generate Report
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Reports
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
                  Type
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Format
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Period
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Created
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="report in reports"
                :key="report.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ getReportTypeName(report.type) }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 uppercase"
                >
                  {{ report.format }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ formatDate(report.period_start) }} - {{ formatDate(report.period_end) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getStatusVariant(report.status)">
                    {{ report.status }}
                  </Badge>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ formatDate(report.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                  <Button
                    v-if="report.status === 'completed' && report.url"
                    size="sm"
                    @click="handleDownload(report.url, report.id)"
                  >
                    <svg
                      class="w-4 h-4"
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
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    @click="handleDelete(report.id)"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Report Generator Modal -->
    <Modal :show="showGenerator" @close="showGenerator = false">
      <template #title>Generate Report</template>

      <div class="space-y-4">
        <div v-if="generatorError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p class="text-red-700 dark:text-red-300 text-sm">{{ generatorError }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Report Type
          </label>
          <Select v-model="reportForm.type">
            <option value="traffic">Traffic Analysis</option>
            <option value="security">Security Report</option>
            <option value="performance">Performance Report</option>
            <option value="summary">Summary Report</option>
          </Select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Format
          </label>
          <Select v-model="reportForm.format">
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </Select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Time Period
          </label>
          <Select v-model="selectedPeriod">
            <option v-for="period in timePeriods" :key="period.value" :value="period.value">
              {{ period.label }}
            </option>
          </Select>
        </div>
      </div>

      <template #footer>
        <Button @click="showGenerator = false" :disabled="generating">
          Cancel
        </Button>
        <Button variant="primary" @click="handleGenerateReport" :disabled="generating">
          <Spinner v-if="generating" size="sm" class="mr-2" />
          {{ generating ? 'Generating...' : 'Generate' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
