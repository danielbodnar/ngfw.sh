<script setup lang="ts">
import { onMounted, ref } from "vue";
import Badge from "../ui/Badge.vue";

interface RouterSpec {
	cpu: string;
	ram: string;
	storage: string;
	wanPorts: string;
	lanPorts: string;
	wifi: string;
	maxDevices: number;
}

interface RouterOption {
	id: string;
	name: string;
	manufacturer: string;
	firmware: string;
	price: number;
	specs: RouterSpec;
	features: string[];
	image: string;
	recommended?: boolean;
	inStock: boolean;
}

const props = defineProps<{
	selectedRouterId?: string | null;
}>();

const emit = defineEmits<{
	select: [router: RouterOption];
}>();

const routers = ref<RouterOption[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const loadRouters = async () => {
	try {
		loading.value = true;
		const apiUrl = import.meta.env.VITE_API_BASE_URL || "https://api.ngfw.sh";
		const response = await fetch(`${apiUrl}/onboarding/routers`);
		const data = await response.json();

		if (data.success) {
			routers.value = data.result;
		} else {
			error.value = "Failed to load router options";
		}
	} catch (err) {
		error.value = "Network error. Please try again.";
		console.error("Failed to load routers:", err);
	} finally {
		loading.value = false;
	}
};

const selectRouter = (router: RouterOption) => {
	if (router.inStock) {
		emit("select", router);
	}
};

onMounted(() => {
	loadRouters();
});
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Choose Your Router
      </h2>
      <p class="text-slate-600 dark:text-slate-400">
        Select a router that best fits your needs. All routers come pre-configured and ready to use.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <button
        @click="loadRouters"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>

    <!-- Router Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="router in routers"
        :key="router.id"
        @click="selectRouter(router)"
        :class="[
          'border rounded-lg p-6 transition-all cursor-pointer',
          selectedRouterId === router.id
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600',
          !router.inStock && 'opacity-50 cursor-not-allowed'
        ]"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {{ router.manufacturer }} {{ router.name }}
              </h3>
              <Badge v-if="router.recommended" variant="success">Recommended</Badge>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {{ router.firmware }} firmware
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ${{ router.price }}
            </div>
            <Badge v-if="router.inStock" variant="success">In Stock</Badge>
            <Badge v-else variant="default">Out of Stock</Badge>
          </div>
        </div>

        <!-- Image -->
        <div class="mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
          <img
            :src="router.image"
            :alt="`${router.manufacturer} ${router.name}`"
            class="w-full h-48 object-cover"
          />
        </div>

        <!-- Specs -->
        <div class="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h4 class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">
            Specifications
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-slate-600 dark:text-slate-400">CPU:</span>
              <span class="ml-1 text-slate-900 dark:text-slate-100">{{ router.specs.cpu }}</span>
            </div>
            <div>
              <span class="text-slate-600 dark:text-slate-400">RAM:</span>
              <span class="ml-1 text-slate-900 dark:text-slate-100">{{ router.specs.ram }}</span>
            </div>
            <div>
              <span class="text-slate-600 dark:text-slate-400">WiFi:</span>
              <span class="ml-1 text-slate-900 dark:text-slate-100">{{ router.specs.wifi }}</span>
            </div>
            <div>
              <span class="text-slate-600 dark:text-slate-400">Devices:</span>
              <span class="ml-1 text-slate-900 dark:text-slate-100">{{ router.specs.maxDevices }}</span>
            </div>
          </div>
        </div>

        <!-- Features -->
        <div>
          <h4 class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">
            Key Features
          </h4>
          <ul class="space-y-1">
            <li
              v-for="feature in router.features.slice(0, 3)"
              :key="feature"
              class="flex items-start text-sm text-slate-600 dark:text-slate-400"
            >
              <span class="mr-2 text-green-600">✓</span>
              {{ feature }}
            </li>
          </ul>
        </div>

        <!-- Selection Indicator -->
        <div
          v-if="selectedRouterId === router.id"
          class="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 text-center"
        >
          <span class="text-sm font-medium text-blue-600 dark:text-blue-400">
            ✓ Selected
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
