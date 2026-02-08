/**
 * Vue composable for toast notifications.
 *
 * @module composables/useToast
 */

import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const toasts = ref<Toast[]>([]);

/**
 * Display a toast notification.
 *
 * @param type - Toast type
 * @param message - Toast message
 * @param duration - Duration in milliseconds (default: 3000)
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useToast } from '@/composables/useToast';
 *
 * const { showToast } = useToast();
 *
 * function handleSuccess() {
 *   showToast('success', 'Rule created successfully');
 * }
 * </script>
 * ```
 */
export function useToast() {
  function showToast(type: ToastType, message: string, duration = 3000): void {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, message, duration };

    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }

  function removeToast(id: string): void {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  }

  function success(message: string, duration?: number): void {
    showToast('success', message, duration);
  }

  function error(message: string, duration?: number): void {
    showToast('error', message, duration);
  }

  function warning(message: string, duration?: number): void {
    showToast('warning', message, duration);
  }

  function info(message: string, duration?: number): void {
    showToast('info', message, duration);
  }

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
