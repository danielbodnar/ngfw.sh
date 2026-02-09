<script setup lang="ts">
import { computed } from "vue";

export interface GaugeProps {
	value: number;
	max?: number;
	label?: string;
	size?: "sm" | "md" | "lg";
	color?: "blue" | "green" | "yellow" | "red" | "purple";
}

const props = withDefaults(defineProps<GaugeProps>(), {
	max: 100,
	size: "md",
	color: "blue",
});

const percentage = computed(() => {
	return Math.min(Math.max((props.value / props.max) * 100, 0), 100);
});

const sizeConfig = computed(() => {
	const sizes = {
		sm: { size: 80, stroke: 6, fontSize: "text-lg" },
		md: { size: 120, stroke: 8, fontSize: "text-2xl" },
		lg: { size: 160, stroke: 10, fontSize: "text-3xl" },
	};
	return sizes[props.size];
});

const colorClasses = computed(() => {
	const colors = {
		blue: "stroke-blue-600 dark:stroke-blue-400",
		green: "stroke-green-600 dark:stroke-green-400",
		yellow: "stroke-yellow-600 dark:stroke-yellow-400",
		red: "stroke-red-600 dark:stroke-red-400",
		purple: "stroke-purple-600 dark:stroke-purple-400",
	};
	return colors[props.color];
});

const radius = computed(() => {
	return (sizeConfig.value.size - sizeConfig.value.stroke) / 2;
});

const circumference = computed(() => {
	return 2 * Math.PI * radius.value;
});

const strokeDashoffset = computed(() => {
	return circumference.value - (percentage.value / 100) * circumference.value;
});

const center = computed(() => sizeConfig.value.size / 2);
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="relative">
      <svg
        :width="sizeConfig.size"
        :height="sizeConfig.size"
        class="transform -rotate-90"
      >
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke-width="sizeConfig.stroke"
          class="stroke-slate-200 dark:stroke-slate-800"
          fill="none"
        />
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke-width="sizeConfig.stroke"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          :class="colorClasses"
          fill="none"
          stroke-linecap="round"
          class="transition-all duration-500 ease-out"
        />
      </svg>
      <div
        class="absolute inset-0 flex items-center justify-center"
        :class="sizeConfig.fontSize"
      >
        <span class="font-bold text-slate-900 dark:text-slate-100">
          {{ percentage.toFixed(0) }}%
        </span>
      </div>
    </div>
    <span v-if="label" class="text-sm font-medium text-slate-600 dark:text-slate-400">
      {{ label }}
    </span>
  </div>
</template>
