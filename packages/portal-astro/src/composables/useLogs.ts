/**
 * Vue composable for Logs API.
 *
 * @module composables/useLogs
 */

import { ref, watch } from "vue";
import type { LogEntry, LogQuery } from "../lib/api/generated";
import { useApi } from "./useApi";

/**
 * Return value from useLogs.
 */
export interface UseLogsReturn {
	/** List of log entries */
	data: ReturnType<typeof ref<LogEntry[]>>;
	/** Loading state */
	loading: ReturnType<typeof ref<boolean>>;
	/** Error message if fetch fails */
	error: ReturnType<typeof ref<string | null>>;
	/** Manually refetch logs */
	refetch: () => Promise<void>;
	/** Update the query parameters */
	setQuery: (query: LogQuery) => void;
}

/**
 * Queries and manages logs with reactive filters.
 *
 * @param initialQuery - Initial log query parameters
 * @returns Logs state and controls
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useLogs } from '@/composables/useLogs';
 *
 * const { data: logs, loading, setQuery } = useLogs({
 *   device_id: 'device-123',
 *   level: 'error',
 *   limit: 100,
 * });
 *
 * function filterBySeverity(level: string) {
 *   setQuery({ device_id: 'device-123', level, limit: 100 });
 * }
 * </script>
 * ```
 */
export function useLogs(initialQuery: LogQuery = {}): UseLogsReturn {
	const api = useApi();
	const data = ref<LogEntry[]>([]);
	const loading = ref(true);
	const error = ref<string | null>(null);
	const query = ref<LogQuery>(initialQuery);

	async function refetch(): Promise<void> {
		loading.value = true;
		error.value = null;

		try {
			data.value = await api.queryLogs(query.value);
		} catch (err) {
			error.value = err instanceof Error ? err.message : "Failed to fetch logs";
		} finally {
			loading.value = false;
		}
	}

	function setQuery(newQuery: LogQuery): void {
		query.value = newQuery;
	}

	// Auto-refetch when query changes
	watch(
		query,
		() => {
			void refetch();
		},
		{ deep: true, immediate: true },
	);

	return {
		data,
		loading,
		error,
		refetch,
		setQuery,
	};
}
