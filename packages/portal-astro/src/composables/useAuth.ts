/**
 * Vue composable wrapping Clerk authentication.
 *
 * @module composables/useAuth
 */

import { ref, computed, onMounted } from 'vue';

/**
 * Authentication state and helpers.
 */
export interface UseAuthReturn {
  /** Current authenticated user object */
  user: ReturnType<typeof ref<any>>;
  /** Whether Clerk has finished loading */
  isLoaded: ReturnType<typeof ref<boolean>>;
  /** Whether user is signed in */
  isSignedIn: ReturnType<typeof computed<boolean>>;
  /** Gets the current session JWT token */
  getToken: () => Promise<string | null>;
  /** Signs out the current user */
  signOut: () => Promise<void>;
}

/**
 * Provides access to Clerk authentication state and helpers.
 *
 * This composable wraps Clerk's authentication state in a Vue-friendly API.
 * It should be used in components that need to access user information or tokens.
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

  const isSignedIn = computed(() => !!user.value);

  onMounted(async () => {
    // @ts-expect-error - Clerk global is injected by Clerk script
    if (window.Clerk) {
      // @ts-expect-error
      await window.Clerk.load();
      // @ts-expect-error
      user.value = window.Clerk.user;
      isLoaded.value = true;

      // Listen for user changes
      // @ts-expect-error
      window.Clerk.addListener((clerk: any) => {
        user.value = clerk.user;
      });
    }
  });

  async function getToken(): Promise<string | null> {
    // @ts-expect-error
    if (!window.Clerk?.session) return null;
    try {
      // @ts-expect-error
      return await window.Clerk.session.getToken();
    } catch {
      return null;
    }
  }

  async function signOut(): Promise<void> {
    // @ts-expect-error
    if (window.Clerk) {
      // @ts-expect-error
      await window.Clerk.signOut();
      user.value = null;
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
