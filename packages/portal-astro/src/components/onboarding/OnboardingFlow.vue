<script setup lang="ts">
import { computed, ref } from "vue";
import { useRegisterDevice } from "../../composables/useRegisterDevice";
import ConfigForm from "./ConfigForm.vue";
import OnboardingWizard, { type WizardStep } from "./OnboardingWizard.vue";
import OrderComplete from "./OrderComplete.vue";
import OrderSummary from "./OrderSummary.vue";
import RouterSelector from "./RouterSelector.vue";

interface RouterOption {
	id: string;
	name: string;
	manufacturer: string;
	firmware: string;
	price: number;
	specs: any;
	features: string[];
	image: string;
	recommended?: boolean;
	inStock: boolean;
}

interface OnboardingConfig {
	deviceName: string;
	shippingAddress: any;
	wifiConfig: any;
	wanType: string;
	wanConfig?: any;
	adminPassword: string;
	securityPreset: string;
	enableIPS: boolean;
	enableDNSFilter: boolean;
	enableAutoUpdates: boolean;
}

interface OrderResponse {
	orderId: string;
	deviceId: string;
	estimatedDelivery: string;
	trackingUrl?: string;
	setupInstructions: string;
	status: string;
	createdAt: string;
}

const wizardRef = ref<InstanceType<typeof OnboardingWizard>>();
const selectedRouter = ref<RouterOption | null>(null);
const config = ref<OnboardingConfig | null>(null);
const orderResponse = ref<OrderResponse | null>(null);
const submitError = ref<string | null>(null);

const {
	register,
	loading: registering,
	error: registerError,
} = useRegisterDevice();

const currentView = computed(() => {
	const step = wizardRef.value?.currentStep;

	if (!step) return "welcome";
	return step;
});

const handleRouterSelect = (router: RouterOption) => {
	selectedRouter.value = router;
	wizardRef.value?.setRouter(router);
	wizardRef.value?.goNext();
};

const handleConfigSubmit = (newConfig: OnboardingConfig) => {
	config.value = newConfig;
	wizardRef.value?.setConfig(newConfig);
	wizardRef.value?.goNext();
};

const handleOrderSubmit = async () => {
	if (!selectedRouter.value || !config.value) {
		submitError.value = "Missing router or configuration";
		return;
	}

	wizardRef.value?.goToStep("submitting");
	submitError.value = null;

	try {
		const registrationResponse = await register({
			name: config.value.deviceName,
			model: `${selectedRouter.value.manufacturer} ${selectedRouter.value.name}`,
		});

		orderResponse.value = {
			orderId: registrationResponse.id,
			deviceId: registrationResponse.id,
			estimatedDelivery: new Date(
				Date.now() + 7 * 24 * 60 * 60 * 1000,
			).toISOString(),
			setupInstructions: "https://docs.ngfw.sh/setup/quick-start",
			status: "provisioning",
			createdAt: new Date().toISOString(),
		};

		wizardRef.value?.setOrderId(registrationResponse.id);
		wizardRef.value?.goToStep("complete");
	} catch (err) {
		console.error("Device registration failed:", err);
		submitError.value = registerError.value || "Failed to register device";
		wizardRef.value?.goToStep("summary");
	}
};

const handleEditRouter = () => {
	wizardRef.value?.goToStep("router");
};

const handleEditConfig = () => {
	wizardRef.value?.goToStep("config");
};
</script>

<template>
  <OnboardingWizard ref="wizardRef" initial-step="welcome">
    <template #default="{ currentStep }">
      <!-- Welcome Step -->
      <div v-if="currentStep === 'welcome'" class="text-center py-12">
        <div class="mb-8">
          <div class="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Welcome to NGFW.sh
          </h2>
          <p class="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Let's get you set up with a powerful, cloud-managed router. This wizard will guide you through selecting a router and configuring it to your needs.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
          <div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div class="text-4xl mb-3">📡</div>
            <h3 class="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Choose Your Router
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Select from our curated list of high-performance routers
            </p>
          </div>
          <div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div class="text-4xl mb-3">⚙️</div>
            <h3 class="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Configure Settings
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              We'll set up your WiFi, security, and network preferences
            </p>
          </div>
          <div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div class="text-4xl mb-3">🚀</div>
            <h3 class="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Ready to Use
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Your router arrives pre-configured and ready to connect
            </p>
          </div>
        </div>

        <p class="text-sm text-slate-500 dark:text-slate-500">
          This process takes about 5 minutes to complete
        </p>
      </div>

      <!-- Router Selection Step -->
      <div v-else-if="currentStep === 'router'">
        <RouterSelector
          :selected-router-id="selectedRouter?.id"
          @select="handleRouterSelect"
        />
      </div>

      <!-- Configuration Step -->
      <div v-else-if="currentStep === 'config'">
        <ConfigForm @submit="handleConfigSubmit" />
      </div>

      <!-- Summary Step -->
      <div v-else-if="currentStep === 'summary'">
        <div v-if="submitError" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-red-900 dark:text-red-100">
                Order submission failed
              </p>
              <p class="text-sm text-red-700 dark:text-red-300 mt-1">
                {{ submitError }}
              </p>
            </div>
          </div>
        </div>
        <OrderSummary
          v-if="selectedRouter && config"
          :router="selectedRouter"
          :config="config"
          @submit="handleOrderSubmit"
          @edit="(section) => section === 'router' ? handleEditRouter() : handleEditConfig()"
        />
      </div>

      <!-- Submitting Step -->
      <div v-else-if="currentStep === 'submitting'" class="text-center py-16">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6" />
        <h3 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Processing Your Order
        </h3>
        <p class="text-slate-600 dark:text-slate-400">
          Please wait while we set everything up...
        </p>
      </div>

      <!-- Complete Step -->
      <div v-else-if="currentStep === 'complete' && orderResponse">
        <OrderComplete :order="orderResponse" />
      </div>
    </template>
  </OnboardingWizard>
</template>
