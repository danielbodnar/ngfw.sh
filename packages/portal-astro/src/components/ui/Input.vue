<script setup lang="ts">
import { computed } from "vue";

export interface InputProps {
	modelValue?: string | number;
	label?: string;
	type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
	placeholder?: string;
	error?: string;
	help?: string;
	disabled?: boolean;
	required?: boolean;
	maxlength?: number;
	id?: string;
}

const props = withDefaults(defineProps<InputProps>(), {
	type: "text",
	disabled: false,
	required: false,
});

const emit = defineEmits<{
	"update:modelValue": [value: string | number];
}>();

const inputId = computed(
	() => props.id || `input-${Math.random().toString(36).slice(2, 9)}`,
);

const inputClasses = computed(() => {
	const base =
		"flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-slate-400";

	if (props.error) {
		return `${base} border-red-500 focus-visible:ring-red-500 dark:border-red-400`;
	}

	return `${base} border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 focus-visible:ring-blue-500`;
});

const handleInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = props.type === "number" ? target.valueAsNumber : target.value;
	emit("update:modelValue", value);
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <label
      v-if="label"
      :for="inputId"
      class="text-sm font-medium text-slate-900 dark:text-slate-100"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :maxlength="maxlength"
      :class="inputClasses"
      @input="handleInput"
    />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <p v-else-if="help" class="text-xs text-slate-500 dark:text-slate-400">
      {{ help }}
    </p>
  </div>
</template>
