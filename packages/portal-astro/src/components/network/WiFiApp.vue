<script setup lang="ts">
import { onMounted, ref } from "vue";
import { z } from "zod";
import { usePolling } from "../../composables/usePolling";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";
import Spinner from "../ui/Spinner.vue";
import Toggle from "../ui/Toggle.vue";

/**
 * WiFi network schema for validation.
 */
const WiFiNetworkSchema = z.object({
	id: z.string(),
	ssid: z.string().min(1).max(32),
	band: z.enum(["2.4GHz", "5GHz", "both"]),
	channel: z.number().min(1).max(165),
	width: z.enum(["20MHz", "40MHz", "80MHz", "160MHz"]),
	security: z.enum(["none", "WPA2", "WPA3", "WPA2/WPA3"]),
	password: z.string().min(8).optional(),
	clients: z.number(),
	signal: z.number(),
	hidden: z.boolean(),
	enabled: z.boolean(),
	vlan: z.number().optional(),
	isolated: z.boolean().optional(),
});

type WiFiNetwork = z.infer<typeof WiFiNetworkSchema>;

interface RadioConfig {
	band: "2.4GHz" | "5GHz";
	enabled: boolean;
	channel: number;
	width: string;
	tx_power: number;
	country_code: string;
}

const loading = ref(true);
const error = ref<string | null>(null);
const networks = ref<WiFiNetwork[]>([]);
const radios = ref<RadioConfig[]>([]);

const saving = ref(false);
const validationErrors = ref<Record<string, string>>({});

/**
 * Fetch WiFi configuration.
 * Uses mock data as backend endpoints don't exist yet.
 */
async function fetchData(): Promise<void> {
	loading.value = true;
	error.value = null;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// const [networksData, radiosData] = await Promise.all([
		//   api.getWiFiNetworks(),
		//   api.getWiFiRadios(),
		// ]);
		// networks.value = networksData;
		// radios.value = radiosData;

		// Mock data for now
		await new Promise((resolve) => setTimeout(resolve, 500));

		networks.value = [
			{
				id: "1",
				ssid: "NGFW.sh-5G",
				band: "5GHz",
				channel: 149,
				width: "80MHz",
				security: "WPA3",
				password: "********",
				clients: 18,
				signal: -42,
				hidden: false,
				enabled: true,
			},
			{
				id: "2",
				ssid: "NGFW.sh-2G",
				band: "2.4GHz",
				channel: 6,
				width: "40MHz",
				security: "WPA2/WPA3",
				password: "********",
				clients: 12,
				signal: -38,
				hidden: false,
				enabled: true,
			},
			{
				id: "3",
				ssid: "IoT-Network",
				band: "2.4GHz",
				channel: 11,
				width: "20MHz",
				security: "WPA2",
				password: "********",
				clients: 8,
				signal: -45,
				hidden: false,
				enabled: true,
				vlan: 10,
			},
			{
				id: "4",
				ssid: "Guest-Network",
				band: "2.4GHz",
				channel: 6,
				width: "20MHz",
				security: "WPA2",
				password: "********",
				clients: 2,
				signal: -48,
				hidden: false,
				enabled: true,
				isolated: true,
				vlan: 20,
			},
		];

		radios.value = [
			{
				band: "5GHz",
				enabled: true,
				channel: 149,
				width: "80MHz",
				tx_power: 20,
				country_code: "US",
			},
			{
				band: "2.4GHz",
				enabled: true,
				channel: 6,
				width: "40MHz",
				tx_power: 20,
				country_code: "US",
			},
		];
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to fetch WiFi configuration";
	} finally {
		loading.value = false;
	}
}

/**
 * Toggle network enabled state.
 */
async function toggleNetwork(networkId: string): Promise<void> {
	const network = networks.value.find((n) => n.id === networkId);
	if (!network) return;

	network.enabled = !network.enabled;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// await api.updateWiFiNetwork(networkId, { enabled: network.enabled });

		await new Promise((resolve) => setTimeout(resolve, 500));
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to update network";
		network.enabled = !network.enabled;
	}
}

/**
 * Save radio configuration.
 */
async function saveRadioConfig(): Promise<void> {
	saving.value = true;
	error.value = null;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// await api.updateWiFiRadios(radios.value);

		await new Promise((resolve) => setTimeout(resolve, 1000));
		await fetchData();
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to save radio configuration";
	} finally {
		saving.value = false;
	}
}

/**
 * Get signal strength badge variant.
 */
function getSignalVariant(signal: number): "success" | "warning" | "danger" {
	if (signal > -50) return "success";
	if (signal > -70) return "warning";
	return "danger";
}

/**
 * Get signal strength label.
 */
function getSignalLabel(signal: number): string {
	if (signal > -50) return "Excellent";
	if (signal > -60) return "Good";
	if (signal > -70) return "Fair";
	return "Poor";
}

const channelOptions5GHz = [
	{ value: 36, label: "Channel 36 (5180 MHz)" },
	{ value: 40, label: "Channel 40 (5200 MHz)" },
	{ value: 44, label: "Channel 44 (5220 MHz)" },
	{ value: 48, label: "Channel 48 (5240 MHz)" },
	{ value: 149, label: "Channel 149 (5745 MHz)" },
	{ value: 153, label: "Channel 153 (5765 MHz)" },
	{ value: 157, label: "Channel 157 (5785 MHz)" },
	{ value: 161, label: "Channel 161 (5805 MHz)" },
];

const channelOptions24GHz = [
	{ value: 1, label: "Channel 1 (2412 MHz)" },
	{ value: 6, label: "Channel 6 (2437 MHz)" },
	{ value: 11, label: "Channel 11 (2462 MHz)" },
];

const widthOptions = [
	{ value: "20MHz", label: "20 MHz" },
	{ value: "40MHz", label: "40 MHz" },
	{ value: "80MHz", label: "80 MHz" },
	{ value: "160MHz", label: "160 MHz" },
];

onMounted(() => {
	void fetchData();
});

// Auto-refresh every 30 seconds
usePolling({
	fetcher: fetchData,
	interval: 30000,
	immediate: false,
});
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex flex-col justify-center items-center h-64 space-y-4"
    >
      <Spinner size="lg" />
      <span class="text-sm text-[--color-text-secondary]"
        >Loading WiFi configuration...</span
      >
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
    >
      <div class="flex items-start">
        <svg
          class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="ml-3 flex-1">
          <h3 class="text-red-800 dark:text-red-200 font-medium">
            Failed to load WiFi configuration
          </h3>
          <p class="text-red-700 dark:text-red-300 mt-1 text-sm">{{ error }}</p>
          <Button variant="danger" size="sm" class="mt-3" @click="fetchData">
            Retry
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!networks || networks.length === 0"
      class="text-center py-12"
    >
      <svg
        class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
        No WiFi networks configured
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Get started by creating your first WiFi network.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- WiFi Networks Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card v-for="network in networks" :key="network.id">
          <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {{ network.ssid }}
                </h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {{ network.band }} • {{ network.security }}
                </p>
              </div>
              <Toggle
                :modelValue="network.enabled"
                @update:modelValue="toggleNetwork(network.id)"
                label=""
              />
            </div>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Channel</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ network.channel }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Width</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ network.width }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Clients</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ network.clients }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Signal</dt>
                <dd class="text-sm">
                  <Badge :variant="getSignalVariant(network.signal)">
                    {{ getSignalLabel(network.signal) }}
                  </Badge>
                </dd>
              </div>
            </div>

            <div v-if="network.vlan" class="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span class="text-sm text-slate-600 dark:text-slate-400">
                VLAN {{ network.vlan }}
              </span>
            </div>

            <div v-if="network.isolated" class="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span class="text-sm text-slate-600 dark:text-slate-400">
                Network Isolation Enabled
              </span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Radio Settings -->
      <Card v-for="radio in radios" :key="radio.band">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ radio.band }} Radio Settings
            </h2>
            <Toggle v-model="radio.enabled" label="" />
          </div>
        </div>

        <form v-if="radio.enabled" @submit.prevent="saveRadioConfig" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Channel
              </label>
              <Select
                v-model.number="radio.channel"
                :options="radio.band === '5GHz' ? channelOptions5GHz : channelOptions24GHz"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Channel Width
              </label>
              <Select
                v-model="radio.width"
                :options="widthOptions"
              />
            </div>

            <Input
              v-model.number="radio.tx_power"
              label="TX Power (dBm)"
              type="number"
              :min="1"
              :max="30"
            />

            <Input
              v-model="radio.country_code"
              label="Country Code"
              type="text"
              maxlength="2"
              placeholder="US"
            />
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" @click="fetchData">
              Cancel
            </Button>
            <Button type="submit" variant="primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Configuration' }}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>
