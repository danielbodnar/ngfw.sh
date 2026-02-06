/**
 * Vue composable for routing API.
 *
 * @module composables/useRoutes
 */

import { ref, onMounted } from 'vue';
import { useApi } from './useApi';
import type { Route, RouteCreate, RouteUpdate } from '../lib/api/types';

/**
 * Return value from useRoutes.
 */
export interface UseRoutesReturn {
  /** List of routes */
  data: ReturnType<typeof ref<Route[]>>;
  /** Loading state */
  loading: ReturnType<typeof ref<boolean>>;
  /** Error message if fetch fails */
  error: ReturnType<typeof ref<string | null>>;
  /** Manually refetch routes */
  refetch: () => Promise<void>;
  /** Create a new route */
  create: (data: RouteCreate) => Promise<Route>;
  /** Update an existing route */
  update: (routeId: string, data: RouteUpdate) => Promise<Route>;
  /** Delete a route */
  remove: (routeId: string) => Promise<void>;
}

/**
 * Manages routing configuration for a device.
 *
 * @param deviceId - Device ID to fetch routes for
 * @returns Routes state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useRoutes } from '@/composables/useRoutes';
 *
 * const deviceId = ref('device-123');
 * const { data: routes, loading, error, create, remove } = useRoutes(deviceId);
 *
 * async function addRoute() {
 *   await create({
 *     device_id: deviceId.value,
 *     destination: '10.0.0.0/24',
 *     gateway: '192.168.1.1',
 *     interface: 'eth0',
 *     metric: 100,
 *   });
 *   await refetch();
 * }
 * </script>
 * ```
 */
export function useRoutes(
  deviceId: ReturnType<typeof ref<string>>,
): UseRoutesReturn {
  const api = useApi();
  const data = ref<Route[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function refetch(): Promise<void> {
    if (!deviceId.value) return;

    loading.value = true;
    error.value = null;

    try {
      data.value = await api.listRoutes(deviceId.value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch routes';
    } finally {
      loading.value = false;
    }
  }

  async function create(routeData: RouteCreate): Promise<Route> {
    error.value = null;
    try {
      return await api.createRoute(routeData);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create route';
      throw err;
    }
  }

  async function update(routeId: string, routeData: RouteUpdate): Promise<Route> {
    error.value = null;
    try {
      return await api.updateRoute(routeId, routeData);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update route';
      throw err;
    }
  }

  async function remove(routeId: string): Promise<void> {
    error.value = null;
    try {
      await api.deleteRoute(routeId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete route';
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
    update,
    remove,
  };
}
