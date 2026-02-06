<script setup lang="ts">
import { computed } from 'vue';

export interface StatProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const props = defineProps<StatProps>();

const trendClasses = computed(() => {
  if (!props.trend) return '';

  const base = 'text-sm font-medium';
  if (props.trend === 'up') return `${base} text-green-600 dark:text-green-400`;
  if (props.trend === 'down') return `${base} text-red-600 dark:text-red-400`;
  return `${base} text-slate-600 dark:text-slate-400`;
});

const trendIcon = computed(() => {
  if (props.trend === 'up') return '↑';
  if (props.trend === 'down') return '↓';
  return '→';
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-slate-600 dark:text-slate-400">
        {{ label }}
      </span>
      <span v-if="icon" class="text-2xl">{{ icon }}</span>
    </div>
    <div class="flex items-baseline justify-between">
      <span class="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {{ value }}
      </span>
      <span v-if="trend && trendValue" :class="trendClasses">
        {{ trendIcon }} {{ trendValue }}
      </span>
    </div>
  </div>
</template>
