<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { z } from "zod";
import { usePolling } from "../../composables/usePolling";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";
import Spinner from "../ui/Spinner.vue";

/**
 * WAN configuration schema for validation.
 */
const WANConfigSchema = z.object({
	type: z.enum(["dhcp", "static", "pppoe", "lte"]),
	hostname: z.string().optional(),
	mac_clone: z.string().optional(),
	mtu: z.number().min(576).max(9000).default(1500),
	ip_address: z.string().ip().optional(),
	netmask: z.string().optional(),
	gateway: z.string().ip().optional(),
	dns_primary: z.string().ip().optional(),
	dns_secondary: z.string().ip().optional(),
	username: z.string().optional(),
	password: z.string().optional(),
	service_name: z.string().optional(),
	apn: z.string().optional(),
	pin: z.string().optional(),
});

type WANConfig = z.infer<typeof WANConfigSchema>;

interface WANStatus {
	connected: boolean;
	uptime: string;
	interface: string;
	ip_address: string;
	gateway: string;
	dns_servers: string[];
	rx_bytes: number;
	tx_bytes: number;
	rx_packets: number;
	tx_packets: number;
}

const loading = ref(true);
const error = ref<string | null>(null);
const status = ref<WANStatus | null>(null);
const config = ref<WANConfig>({
	type: "dhcp",
	hostname: "",
	mac_clone: "",
	mtu: 1500,
	ip_address: "",
	netmask: "",
	gateway: "",
	dns_primary: "",
	dns_secondary: "",
	username: "",
	password: "",
	service_name: "",
	apn: "",
	pin: "",
});

const saving = ref(false);
const validationErrors = ref<Record<string, string>>({});

/**
 * Fetch WAN status and config.
 * Uses mock data as backend endpoints don't exist yet.
 */
async function fetchData(): Promise<void> {
	loading.value = true;
	error.value = null;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// const [statusData, configData] = await Promise.all([
		//   api.getWANStatus(),
		//   api.getWANConfig(),
		// ]);
		// status.value = statusData;
		// config.value = configData;

		// Mock data for now
		await new Promise((resolve) => setTimeout(resolve, 500));

		status.value = {
			connected: true,
			uptime: "7d 14h 32m",
			interface: "eth0",
			ip_address: "203.0.113.45",
			gateway: "203.0.113.1",
			dns_servers: ["1.1.1.1", "8.8.8.8"],
			rx_bytes: 45678912345,
			tx_bytes: 12345678901,
			rx_packets: 34567890,
			tx_packets: 23456789,
		};

		config.value = {
			type: "dhcp",
			hostname: "ngfw-router",
			mac_clone: "",
			mtu: 1500,
			ip_address: "",
			netmask: "",
			gateway: "",
			dns_primary: "",
			dns_secondary: "",
			username: "",
			password: "",
			service_name: "",
			apn: "",
			pin: "",
		};
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to fetch WAN data";
	} finally {
		loading.value = false;
	}
}

/**
 * Save WAN configuration.
 */
async function saveConfig(): Promise<void> {
	validationErrors.value = {};

	const result = WANConfigSchema.safeParse(config.value);
	if (!result.success) {
		result.error.errors.forEach((err) => {
			if (err.path[0]) {
				validationErrors.value[err.path[0] as string] = err.message;
			}
		});
		return;
	}

	saving.value = true;
	error.value = null;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// await api.updateWANConfig(config.value);

		await new Promise((resolve) => setTimeout(resolve, 1000));
		await fetchData();
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to save WAN configuration";
	} finally {
		saving.value = false;
	}
}

/**
 * Format bytes to human-readable format.
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get connection status badge variant.
 */
const statusVariant = computed(() => {
	return status.value?.connected ? "success" : "danger";
});

/**
 * Connection type options.
 */
const connectionTypes = [
	{ value: "dhcp", label: "DHCP (Automatic)" },
	{ value: "static", label: "Static IP" },
	{ value: "pppoe", label: "PPPoE" },
	{ value: "lte", label: "LTE/Mobile" },
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
        >Loading WAN configuration...</span
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
            Failed to load WAN configuration
          </h3>
          <p class="text-red-700 dark:text-red-300 mt-1 text-sm">{{ error }}</p>
          <Button variant="danger" size="sm" class="mt-3" @click="fetchData">
            Retry
          </Button>
        </div>
      </div>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- WAN Status Card -->
      <Card v-if="status">
        <template #actions>
          <Button size="sm" @click="fetchData">
            <svg
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              WAN Connection Status
            </h2>
            <Badge :variant="statusVariant">
              {{ status.connected ? 'Connected' : 'Disconnected' }}
            </Badge>
          </div>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
              Connection Details
            </h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Interface</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ status.interface }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">IP Address</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ status.ip_address }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Gateway</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ status.gateway }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">DNS Servers</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ status.dns_servers.join(', ') }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Uptime</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ status.uptime }}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
              Traffic Statistics
            </h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Downloaded</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ formatBytes(status.rx_bytes) }} ({{ status.rx_packets.toLocaleString() }} packets)
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-600 dark:text-slate-400">Uploaded</dt>
                <dd class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ formatBytes(status.tx_bytes) }} ({{ status.tx_packets.toLocaleString() }} packets)
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <!-- WAN Configuration Card -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            WAN Configuration
          </h2>
        </div>

        <form @submit.prevent="saveConfig" class="p-6 space-y-6">
          <!-- Connection Type -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Connection Type
            </label>
            <Select
              v-model="config.type"
              :options="connectionTypes"
              :error="validationErrors.type"
            />
          </div>

          <!-- Common Settings -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              v-model="config.hostname"
              label="Hostname"
              type="text"
              placeholder="ngfw-router"
              :error="validationErrors.hostname"
            />
            <Input
              v-model.number="config.mtu"
              label="MTU"
              type="number"
              :min="576"
              :max="9000"
              :error="validationErrors.mtu"
            />
          </div>

          <Input
            v-model="config.mac_clone"
            label="MAC Address Clone (Optional)"
            type="text"
            placeholder="00:11:22:33:44:55"
            :error="validationErrors.mac_clone"
          />

          <!-- Static IP Fields -->
          <div v-if="config.type === 'static'" class="space-y-6">
            <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">
              Static IP Configuration
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                v-model="config.ip_address"
                label="IP Address"
                type="text"
                placeholder="203.0.113.45"
                :error="validationErrors.ip_address"
                required
              />
              <Input
                v-model="config.netmask"
                label="Subnet Mask"
                type="text"
                placeholder="255.255.255.0"
                :error="validationErrors.netmask"
                required
              />
              <Input
                v-model="config.gateway"
                label="Gateway"
                type="text"
                placeholder="203.0.113.1"
                :error="validationErrors.gateway"
                required
              />
              <Input
                v-model="config.dns_primary"
                label="Primary DNS"
                type="text"
                placeholder="1.1.1.1"
                :error="validationErrors.dns_primary"
              />
              <Input
                v-model="config.dns_secondary"
                label="Secondary DNS"
                type="text"
                placeholder="8.8.8.8"
                :error="validationErrors.dns_secondary"
              />
            </div>
          </div>

          <!-- PPPoE Fields -->
          <div v-if="config.type === 'pppoe'" class="space-y-6">
            <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">
              PPPoE Configuration
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                v-model="config.username"
                label="Username"
                type="text"
                :error="validationErrors.username"
                required
              />
              <Input
                v-model="config.password"
                label="Password"
                type="password"
                :error="validationErrors.password"
                required
              />
              <Input
                v-model="config.service_name"
                label="Service Name (Optional)"
                type="text"
                :error="validationErrors.service_name"
              />
            </div>
          </div>

          <!-- LTE Fields -->
          <div v-if="config.type === 'lte'" class="space-y-6">
            <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">
              LTE Configuration
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                v-model="config.apn"
                label="APN"
                type="text"
                placeholder="internet"
                :error="validationErrors.apn"
                required
              />
              <Input
                v-model="config.pin"
                label="SIM PIN (Optional)"
                type="password"
                :error="validationErrors.pin"
              />
            </div>
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
