<script setup lang="ts">
import { computed } from "vue";

export interface ToggleProps {
	modelValue: boolean;
	label?: string;
	description?: string;
	disabled?: boolean;
	id?: string;
}

const props = withDefaults(defineProps<ToggleProps>(), {
	disabled: false,
});

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
}>();

const toggleId = computed(
	() => props.id || `toggle-${Math.random().toString(36).slice(2, 9)}`,
);

const switchClasses = computed(() => {
	const base =
		"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

	if (props.modelValue) {
		return `${base} bg-blue-600 dark:bg-blue-500`;
	}

	return `${base} bg-slate-200 dark:bg-slate-700`;
});

const thumbClasses = computed(() => {
	const base =
		"pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform";

	if (props.modelValue) {
		return `${base} translate-x-5`;
	}

	return `${base} translate-x-0.5`;
});

const handleToggle = () => {
	if (!props.disabled) {
		emit("update:modelValue", !props.modelValue);
	}
};
</script>

<template>
  <div class="flex items-start gap-3">
    <button
      :id="toggleId"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :class="switchClasses"
      :disabled="disabled"
      @click="handleToggle"
    >
      <span :class="thumbClasses" />
    </button>
    <div v-if="label || description" class="flex-1">
      <label
        v-if="label"
        :for="toggleId"
        class="text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer block"
        @click="handleToggle"
      >
        {{ label }}
      </label>
      <p v-if="description" class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
        {{ description }}
      </p>
    </div>
  </div>
</template>
