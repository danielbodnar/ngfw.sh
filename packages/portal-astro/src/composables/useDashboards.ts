/**
 * Vue composable for Dashboards API.
 *
 * @module composables/useDashboards
 */

import { onMounted, ref } from "vue";
import type {
	Dashboard,
	DashboardCreate,
	DashboardUpdate,
} from "../lib/api/generated";
import { useApi } from "./useApi";

/**
 * Return value from useDashboards.
 */
export interface UseDashboardsReturn {
	/** List of dashboards */
	data: ReturnType<typeof ref<Dashboard[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch dashboards */
	refetch: () => Promise<void>;
	/** Create a new dashboard */
	create: (data: DashboardCreate) => Promise<Dashboard>;
	/** Update an existing dashboard */
	update: (dashboardId: string, data: DashboardUpdate) => Promise<Dashboard>;
	/** Delete a dashboard */
	remove: (dashboardId: string) => Promise<void>;
}

/**
 * Manages user dashboards.
 *
 * @returns Dashboards state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useDashboards } from '@/composables/useDashboards';
 *
 * const { data: dashboards, create, update } = useDashboards();
 *
 * async function createCustomDashboard() {
 *   await create({
 *     name: 'Security Overview',
 *     layout: [
 *       {
 *         id: 'widget-1',
 *         type: 'chart',
 *         title: 'Threats Blocked',
 *         config: { chartType: 'line' },
 *         position: { x: 0, y: 0, width: 6, height: 4 },
 *       },
 *     ],
 *     is_default: false,
 *   });
 * }
 * </script>
 * ```
 */
export function useDashboards(): UseDashboardsReturn {
	const api = useApi();
	const data = ref<Dashboard[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);

	async function refetch(): Promise<void> {
		loading.value = true;
		error.value = null;

		try {
			data.value = await api.listDashboards();
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to fetch dashboards";
		} finally {
			loading.value = false;
		}
	}

	async function create(dashboardData: DashboardCreate): Promise<Dashboard> {
		error.value = null;
		try {
			return await api.createDashboard(dashboardData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to create dashboard";
			throw err;
		}
	}

	async function update(
		dashboardId: string,
		dashboardData: DashboardUpdate,
	): Promise<Dashboard> {
		error.value = null;
		try {
			return await api.updateDashboard(dashboardId, dashboardData);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to update dashboard";
			throw err;
		}
	}

	async function remove(dashboardId: string): Promise<void> {
		error.value = null;
		try {
			await api.deleteDashboard(dashboardId);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Failed to delete dashboard";
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
