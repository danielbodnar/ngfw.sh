/**
 * Vue composable for polling data at regular intervals.
 *
 * @module composables/usePolling
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';

/**
 * Configuration options for polling.
 */
export interface PollingOptions<T> {
  /** Function to fetch data */
  fetcher: () => Promise<T>;
  /** Polling interval in milliseconds (default: 5000) */
  interval?: number;
  /** Whether to poll immediately on mount (default: true) */
  immediate?: boolean;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return value from usePolling.
 */
export interface UsePollingReturn<T> {
  /** Current data */
  data: ReturnType<typeof ref<T | null>>;
  /** Loading state */
  loading: ReturnType<typeof ref<boolean>>;
  /** Error message if fetch fails */
  error: ReturnType<typeof ref<string | null>>;
  /** Manually trigger a fetch */
  refetch: () => Promise<void>;
  /** Stop polling */
  stop: () => void;
  /** Resume polling */
  resume: () => void;
}

/**
 * Generic polling composable with visibility handling.
 *
 * Automatically pauses polling when the page is hidden and resumes when visible.
 * Useful for fetching device status, metrics, or any time-sensitive data.
 *
 * @param options - Polling configuration
 * @returns Polling state and controls
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { usePolling } from '@/composables/usePolling';
 * import { useApi } from '@/composables/useApi';
 *
 * const api = useApi();
 * const deviceId = 'device-123';
 *
 * const { data, loading, error, refetch } = usePolling({
 *   fetcher: () => api.getDeviceStatus(deviceId),
 *   interval: 5000,
 * });
 * </script>
 * ```
 */
export function usePolling<T>(options: PollingOptions<T>): UsePollingReturn<T> {
  const {
    fetcher,
    interval = 5000,
    immediate = true,
    enabled = true,
  } = options;

  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let intervalId: number | null = null;
  let isPolling = false;

  async function refetch(): Promise<void> {
    if (!enabled) return;

    loading.value = true;
    error.value = null;

    try {
      data.value = await fetcher();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch data';
    } finally {
      loading.value = false;
    }
  }

  function stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      isPolling = false;
    }
  }

  function resume(): void {
    if (isPolling || !enabled) return;

    isPolling = true;
    void refetch();
    intervalId = window.setInterval(() => void refetch(), interval);
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      stop();
    } else {
      resume();
    }
  }

  onMounted(() => {
    if (enabled) {
      if (immediate) {
        void refetch();
      }
      resume();

      // Pause/resume on visibility change
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  onUnmounted(() => {
    stop();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  // Watch enabled state
  watch(
    () => enabled,
    (newEnabled) => {
      if (newEnabled) {
        resume();
      } else {
        stop();
      }
    },
  );

  return {
    data,
    loading,
    error,
    refetch,
    stop,
    resume,
  };
}
