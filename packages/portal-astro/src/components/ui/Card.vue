<script setup lang="ts">
export interface CardProps {
  title?: string;
  noPadding?: boolean;
}

withDefaults(defineProps<CardProps>(), {
  noPadding: false,
});
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
    <div v-if="title || $slots.actions" class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
      <h3 v-if="title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{ title }}
      </h3>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div :class="noPadding ? '' : 'p-6'">
      <slot />
    </div>
  </div>
</template>
