<script setup lang="ts">
import { computed } from "vue";

export interface SelectOption {
	value: string | number;
	label: string;
	disabled?: boolean;
}

export interface SelectProps {
	modelValue?: string | number;
	label?: string;
	options: SelectOption[];
	placeholder?: string;
	error?: string;
	help?: string;
	disabled?: boolean;
	required?: boolean;
	id?: string;
}

const props = withDefaults(defineProps<SelectProps>(), {
	disabled: false,
	required: false,
});

const emit = defineEmits<{
	"update:modelValue": [value: string | number];
}>();

const selectId = computed(
	() => props.id || `select-${Math.random().toString(36).slice(2, 9)}`,
);

const selectClasses = computed(() => {
	const base =
		"flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

	if (props.error) {
		return `${base} border-red-500 focus-visible:ring-red-500 dark:border-red-400`;
	}

	return `${base} border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 focus-visible:ring-blue-500`;
});

const handleChange = (event: Event) => {
	const target = event.target as HTMLSelectElement;
	emit("update:modelValue", target.value);
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <label
      v-if="label"
      :for="selectId"
      class="text-sm font-medium text-slate-900 dark:text-slate-100"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :class="selectClasses"
      @change="handleChange"
    >
      <option v-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <p v-else-if="help" class="text-xs text-slate-500 dark:text-slate-400">
      {{ help }}
    </p>
  </div>
</template>
