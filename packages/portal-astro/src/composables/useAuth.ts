/**
 * Vue composable wrapping Clerk authentication.
 *
 * @module composables/useAuth
 */

import { type ComputedRef, computed, onMounted, type Ref, ref } from "vue";

/**
 * Authentication state and helpers.
 */
export interface UseAuthReturn {
	/** Current authenticated user object */
	user: Ref<any>;
	/** Whether Clerk has finished loading */
	isLoaded: Ref<boolean>;
	/** Whether user is signed in */
	isSignedIn: ComputedRef<boolean>;
	/** Gets the current session JWT token */
	getToken: () => Promise<string | null>;
	/** Signs out the current user */
	signOut: () => Promise<void>;
}

/**
 * Provides access to Clerk authentication state and helpers.
 *
 * This composable fetches user info and tokens from server-side API endpoints
 * that have access to Clerk's server SDK.
 *
 * @returns Authentication state and methods
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useAuth } from '@/composables/useAuth';
 *
 * const { user, isSignedIn, getToken, signOut } = useAuth();
 *
 * async function loadData() {
 *   const token = await getToken();
 *   // Use token for API calls
 * }
 * </script>
 * ```
 */
export function useAuth(): UseAuthReturn {
	const user = ref<any>(null);
	const isLoaded = ref(false);
	const tokenCache = ref<{ token: string; expires: number } | null>(null);

	const isSignedIn = computed(() => !!user.value);

	onMounted(async () => {
		try {
			// Fetch user info from server-side API
			const response = await fetch("/api/user");
			if (response.ok) {
				user.value = await response.json();
			}
		} catch (error) {
			console.error("Failed to load user:", error);
		} finally {
			isLoaded.value = true;
		}
	});

	async function getToken(): Promise<string | null> {
		// Check if cached token is still valid (cache for 5 minutes)
		const now = Date.now();
		if (tokenCache.value && tokenCache.value.expires > now) {
			return tokenCache.value.token;
		}

		try {
			// Fetch token from server-side API
			const response = await fetch("/api/session-token");
			if (!response.ok) {
				console.error("Failed to get session token:", response.statusText);
				return null;
			}

			const data = (await response.json()) as { token: string };

			// Cache token for 5 minutes (tokens typically expire in 60 minutes)
			tokenCache.value = {
				token: data.token,
				expires: now + 5 * 60 * 1000,
			};

			return data.token;
		} catch (error) {
			console.error("Error fetching session token:", error);
			return null;
		}
	}

	async function signOut(): Promise<void> {
		try {
			await fetch("/api/sign-out", { method: "POST" });
			user.value = null;
			tokenCache.value = null;
			window.location.href = "/sign-in";
		} catch (error) {
			console.error("Error signing out:", error);
		}
	}

	return {
		user,
		isLoaded,
		isSignedIn,
		getToken,
		signOut,
	};
}
