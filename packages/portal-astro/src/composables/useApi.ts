/**
 * Vue composable for accessing the authenticated API client.
 *
 * @module composables/useApi
 */

import { type ApiClient, createApiClient } from "../lib/api/client";
import { useAuth } from "./useAuth";

/**
 * Returns an authenticated API client instance.
 *
 * The client is automatically configured with the user's Clerk session token.
 *
 * @returns Authenticated {@link ApiClient}
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useApi } from '@/composables/useApi';
 *
 * const api = useApi();
 * const devices = await api.listDevices();
 * </script>
 * ```
 */
export function useApi(): ApiClient {
	const { getToken } = useAuth();
	return createApiClient(getToken);
}
