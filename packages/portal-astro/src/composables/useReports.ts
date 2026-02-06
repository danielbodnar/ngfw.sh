/**
 * Vue composable for Reports API.
 *
 * @module composables/useReports
 */

import { ref, onMounted } from 'vue';
import { useApi } from './useApi';
import type { Report, ReportCreate } from '../lib/api/types';

/**
 * Return value from useReports.
 */
export interface UseReportsReturn {
  /** List of reports */
  data: ReturnType<typeof ref<Report[]>>;
  /** Loading state */
  loading: ReturnType<typeof ref<boolean>>;
  /** Error message if fetch fails */
  error: ReturnType<typeof ref<string | null>>;
  /** Manually refetch reports */
  refetch: () => Promise<void>;
  /** Create a new report */
  create: (data: ReportCreate) => Promise<Report>;
  /** Get a single report */
  get: (reportId: string) => Promise<Report>;
  /** Delete a report */
  remove: (reportId: string) => Promise<void>;
}

/**
 * Manages reports for a device.
 *
 * @param deviceId - Device ID to fetch reports for
 * @returns Reports state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useReports } from '@/composables/useReports';
 *
 * const deviceId = ref('device-123');
 * const { data: reports, create } = useReports(deviceId);
 *
 * async function generateTrafficReport() {
 *   const now = Date.now() / 1000;
 *   const weekAgo = now - 7 * 24 * 60 * 60;
 *
 *   await create({
 *     device_id: deviceId.value,
 *     type: 'traffic',
 *     format: 'pdf',
 *     period_start: weekAgo,
 *     period_end: now,
 *   });
 * }
 * </script>
 * ```
 */
export function useReports(
  deviceId: ReturnType<typeof ref<string>>,
): UseReportsReturn {
  const api = useApi();
  const data = ref<Report[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function refetch(): Promise<void> {
    if (!deviceId.value) return;

    loading.value = true;
    error.value = null;

    try {
      data.value = await api.listReports(deviceId.value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch reports';
    } finally {
      loading.value = false;
    }
  }

  async function create(reportData: ReportCreate): Promise<Report> {
    error.value = null;
    try {
      return await api.createReport(reportData);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create report';
      throw err;
    }
  }

  async function get(reportId: string): Promise<Report> {
    error.value = null;
    try {
      return await api.getReport(reportId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get report';
      throw err;
    }
  }

  async function remove(reportId: string): Promise<void> {
    error.value = null;
    try {
      await api.deleteReport(reportId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete report';
      throw err;
    }
  }

  onMounted(() => {
    void refetch();
  });

  return {
    data,
    loading,
    error,
    refetch,
    create,
    get,
    remove,
  };
}
