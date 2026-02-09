<script setup lang="ts">
import { computed, ref } from "vue";

export type WizardStep =
	| "welcome"
	| "router"
	| "config"
	| "summary"
	| "submitting"
	| "complete";

export interface WizardState {
	currentStep: WizardStep;
	selectedRouter: any | null;
	config: any | null;
	orderId: string | null;
}

const props = defineProps<{
	initialStep?: WizardStep;
}>();

const emit = defineEmits<{
	stepChange: [step: WizardStep];
	complete: [orderId: string];
}>();

const currentStep = ref<WizardStep>(props.initialStep || "welcome");
const selectedRouter = ref<any | null>(null);
const config = ref<any | null>(null);
const orderId = ref<string | null>(null);

const steps: Array<{ id: WizardStep; label: string; icon: string }> = [
	{ id: "welcome", label: "Welcome", icon: "👋" },
	{ id: "router", label: "Select Router", icon: "📡" },
	{ id: "config", label: "Configure", icon: "⚙️" },
	{ id: "summary", label: "Review", icon: "📋" },
	{ id: "complete", label: "Complete", icon: "✅" },
];

const stepIndex = computed(() => {
	return steps.findIndex((s) => s.id === currentStep.value);
});

const canGoBack = computed(() => {
	return (
		currentStep.value !== "welcome" &&
		currentStep.value !== "submitting" &&
		currentStep.value !== "complete"
	);
});

const canGoNext = computed(() => {
	if (currentStep.value === "welcome") return true;
	if (currentStep.value === "router") return selectedRouter.value !== null;
	if (currentStep.value === "config") return config.value !== null;
	if (currentStep.value === "summary") return true;
	return false;
});

const goToStep = (step: WizardStep) => {
	currentStep.value = step;
	emit("stepChange", step);
};

const goNext = () => {
	const nextIndex = stepIndex.value + 1;
	if (nextIndex < steps.length) {
		goToStep(steps[nextIndex].id);
	}
};

const goBack = () => {
	const prevIndex = stepIndex.value - 1;
	if (prevIndex >= 0) {
		goToStep(steps[prevIndex].id);
	}
};

const setRouter = (router: any) => {
	selectedRouter.value = router;
};

const setConfig = (newConfig: any) => {
	config.value = newConfig;
};

const setOrderId = (id: string) => {
	orderId.value = id;
	emit("complete", id);
};

// Expose methods for parent components
defineExpose({
	currentStep,
	goToStep,
	goNext,
	goBack,
	setRouter,
	setConfig,
	setOrderId,
	selectedRouter,
	config,
	orderId,
});
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Progress Steps -->
    <div v-if="currentStep !== 'complete'" class="mb-8">
      <div class="flex items-center justify-between">
        <div
          v-for="(step, index) in steps.filter(s => s.id !== 'complete')"
          :key="step.id"
          class="flex items-center flex-1"
        >
          <!-- Step Circle -->
          <div class="flex flex-col items-center">
            <div
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold transition-all',
                index <= stepIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              ]"
            >
              {{ step.icon }}
            </div>
            <span
              :class="[
                'text-xs mt-2 font-medium',
                index <= stepIndex
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400'
              ]"
            >
              {{ step.label }}
            </span>
          </div>

          <!-- Connector Line -->
          <div
            v-if="index < steps.length - 2"
            :class="[
              'flex-1 h-1 mx-4 transition-all',
              index < stepIndex
                ? 'bg-blue-600'
                : 'bg-slate-200 dark:bg-slate-700'
            ]"
          />
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
      <div class="p-8">
        <slot
          :currentStep="currentStep"
          :goNext="goNext"
          :goBack="goBack"
          :setRouter="setRouter"
          :setConfig="setConfig"
          :setOrderId="setOrderId"
          :selectedRouter="selectedRouter"
          :config="config"
          :orderId="orderId"
        />
      </div>

      <!-- Navigation Buttons -->
      <div
        v-if="currentStep !== 'complete' && currentStep !== 'submitting'"
        class="flex items-center justify-between px-8 py-4 border-t border-slate-200 dark:border-slate-800"
      >
        <button
          v-if="canGoBack"
          @click="goBack"
          class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          ← Back
        </button>
        <div v-else />

        <button
          v-if="currentStep !== 'summary'"
          @click="goNext"
          :disabled="!canGoNext"
          :class="[
            'px-6 py-2 text-sm font-medium rounded-lg transition-colors',
            canGoNext
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          ]"
        >
          Continue →
        </button>
      </div>
    </div>
  </div>
</template>
