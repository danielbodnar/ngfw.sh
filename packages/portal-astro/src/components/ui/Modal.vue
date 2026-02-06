<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';

export interface ModalProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<ModalProps>(), {
  open: false,
  size: 'md',
});

const emit = defineEmits<{
  close: [];
}>();

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close');
  }
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) {
    emit('close');
  }
};

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @click="handleBackdropClick"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            :class="['w-full bg-white dark:bg-slate-900 rounded-lg shadow-xl', sizeClasses[size]]"
          >
            <div
              v-if="title || $slots.title"
              class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800"
            >
              <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                <slot name="title">{{ title }}</slot>
              </h2>
              <button
                type="button"
                class="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                @click="emit('close')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="px-6 py-4">
              <slot />
            </div>
            <div v-if="$slots.actions" class="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <slot name="actions" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
