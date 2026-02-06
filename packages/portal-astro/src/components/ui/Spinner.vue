<script setup lang="ts">
import { computed } from 'vue';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<SpinnerProps>(), {
  size: 'md',
});

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };
  return sizes[props.size];
});
</script>

<template>
  <div
    :class="[
      'inline-block animate-spin rounded-full border-blue-600 border-t-transparent dark:border-blue-400',
      sizeClasses,
    ]"
    role="status"
    aria-label="Loading"
  >
    <span class="sr-only">Loading...</span>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
