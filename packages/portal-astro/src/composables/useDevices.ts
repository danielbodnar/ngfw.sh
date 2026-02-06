/**
 * Vue composable for device management.
 *
 * @module composables/useDevices
 */

import { ref, onMounted } from 'vue';
import { useApi } from './useApi';
import type { Device } from '../lib/api/types';

/**
 * Return value from useDevices.
 */
export interface UseDevicesReturn {
  /** List of devices */
  data: ReturnType<typeof ref<Device[]>>;
  /** Loading state */
  loading: ReturnType<typeof ref<boolean>>;
  /** Error message if fetch fails */
  error: ReturnType<typeof ref<string | null>>;
  /** Manually refetch devices */
  refetch: () => Promise<void>;
}

/**
 * Fetches and manages the authenticated user's device list.
 *
 * Loads devices on mount and provides a refetch function for manual updates.
 *
 * @returns Device list state and controls
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useDevices } from '@/composables/useDevices';
 *
 * const { data: devices, loading, error, refetch } = useDevices();
 * </script>
 *
 * <template>
 *   <div v-if="loading">Loading devices...</div>
 *   <div v-else-if="error">{{ error }}</div>
 *   <ul v-else>
 *     <li v-for="device in devices" :key="device.id">
 *       {{ device.name }} - {{ device.status }}
 *     </li>
 *   </ul>
 * </template>
 * ```
 */
export function useDevices(): UseDevicesReturn {
  const api = useApi();
  const data = ref<Device[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function refetch(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      data.value = await api.listDevices();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch devices';
    } finally {
      loading.value = false;
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
  };
}
