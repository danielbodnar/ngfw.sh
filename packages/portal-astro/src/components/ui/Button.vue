<script setup lang="ts">
import { computed } from 'vue';

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
  type: 'button',
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    default: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm rounded-md',
    default: 'h-10 px-4 py-2 rounded-lg',
    lg: 'h-12 px-6 text-lg rounded-lg',
  };

  return `${base} ${variants[props.variant]} ${sizes[props.size]}`;
});

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};
</script>

<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
