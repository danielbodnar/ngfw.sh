<script setup lang="ts">
import { computed } from "vue";

export interface BadgeProps {
	variant?:
		| "success"
		| "danger"
		| "warning"
		| "info"
		| "purple"
		| "default"
		| "secondary"
		| "error";
}

const props = withDefaults(defineProps<BadgeProps>(), {
	variant: "info",
});

const badgeClasses = computed(() => {
	const base =
		"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";

	const variants = {
		success:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		warning:
			"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
		info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
		purple:
			"bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
		default:
			"bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
		secondary:
			"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
	};

	return `${base} ${variants[props.variant]}`;
});
</script>

<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>
