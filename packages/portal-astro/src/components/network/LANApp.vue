<script setup lang="ts">
import { onMounted, ref } from "vue";
import { z } from "zod";
import { usePolling } from "../../composables/usePolling";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Spinner from "../ui/Spinner.vue";
import Toggle from "../ui/Toggle.vue";

/**
 * LAN configuration schema for validation.
 */
const LANConfigSchema = z.object({
	primary: z.object({
		ip_address: z.string().ip(),
		netmask: z.string(),
		dhcp_enabled: z.boolean(),
		dhcp_start: z.string().ip().optional(),
		dhcp_end: z.string().ip().optional(),
	}),
	guest: z.object({
		enabled: z.boolean(),
		ip_address: z.string().ip().optional(),
		netmask: z.string().optional(),
		dhcp_enabled: z.boolean(),
		dhcp_start: z.string().ip().optional(),
		dhcp_end: z.string().ip().optional(),
		isolated: z.boolean(),
	}),
	vlans: z.array(
		z.object({
			id: z.string(),
			vlan_id: z.number().min(1).max(4094),
			name: z.string(),
			ip_address: z.string().ip(),
			netmask: z.string(),
			enabled: z.boolean(),
		}),
	),
});

type LANConfig = z.infer<typeof LANConfigSchema>;

const loading = ref(true);
const error = ref<string | null>(null);
const config = ref<LANConfig>({
	primary: {
		ip_address: "192.168.1.1",
		netmask: "255.255.255.0",
		dhcp_enabled: true,
		dhcp_start: "192.168.1.100",
		dhcp_end: "192.168.1.200",
	},
	guest: {
		enabled: false,
		ip_address: "192.168.2.1",
		netmask: "255.255.255.0",
		dhcp_enabled: true,
		dhcp_start: "192.168.2.100",
		dhcp_end: "192.168.2.200",
		isolated: true,
	},
	vlans: [],
});

const saving = ref(false);
const validationErrors = ref<Record<string, string>>({});
const editingVlan = ref<string | null>(null);
const showVlanForm = ref(false);

/**
 * Fetch LAN configuration.
 * Uses mock data as backend endpoints don't exist yet.
 */
async function fetchData(): Promise<void> {
	loading.value = true;
	error.value = null;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// const configData = await api.getLANConfig();
		// config.value = configData;

		// Mock data for now
		await new Promise((resolve) => setTimeout(resolve, 500));

		config.value = {
			primary: {
				ip_address: "192.168.1.1",
				netmask: "255.255.255.0",
				dhcp_enabled: true,
				dhcp_start: "192.168.1.100",
				dhcp_end: "192.168.1.200",
			},
			guest: {
				enabled: true,
				ip_address: "192.168.2.1",
				netmask: "255.255.255.0",
				dhcp_enabled: true,
				dhcp_start: "192.168.2.100",
				dhcp_end: "192.168.2.200",
				isolated: true,
			},
			vlans: [
				{
					id: "1",
					vlan_id: 1,
					name: "Default",
					ip_address: "192.168.1.1",
					netmask: "255.255.255.0",
					enabled: true,
				},
				{
					id: "2",
					vlan_id: 10,
					name: "IoT Devices",
					ip_address: "192.168.10.1",
					netmask: "255.255.255.0",
					enabled: true,
				},
				{
					id: "3",
					vlan_id: 20,
					name: "Cameras",
					ip_address: "192.168.20.1",
					netmask: "255.255.255.0",
					enabled: true,
				},
				{
					id: "4",
					vlan_id: 99,
					name: "Management",
					ip_address: "192.168.99.1",
					netmask: "255.255.255.0",
					enabled: true,
				},
			],
		};
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to fetch LAN configuration";
	} finally {
		loading.value = false;
	}
}

/**
 * Save LAN configuration.
 */
async function saveConfig(): Promise<void> {
	validationErrors.value = {};

	const result = LANConfigSchema.safeParse(config.value);
	if (!result.success) {
		result.error.errors.forEach((err) => {
			if (err.path[0]) {
				validationErrors.value[err.path.join(".")] = err.message;
			}
		});
		return;
	}

	saving.value = true;
	error.value = null;

	try {
		// TODO: Replace with real API call when backend is ready
		// const api = useApi();
		// await api.updateLANConfig(config.value);

		await new Promise((resolve) => setTimeout(resolve, 1000));
		await fetchData();
	} catch (err) {
		error.value =
			err instanceof Error ? err.message : "Failed to save LAN configuration";
	} finally {
		saving.value = false;
	}
}

/**
 * Delete VLAN.
 */
function deleteVlan(vlanId: string): void {
	if (confirm("Are you sure you want to delete this VLAN?")) {
		config.value.vlans = config.value.vlans.filter((v) => v.id !== vlanId);
	}
}

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
        >Loading LAN configuration...</span
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
            Failed to load LAN configuration
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
      <!-- Primary LAN Configuration -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Primary LAN (br0)
          </h2>
        </div>

        <form @submit.prevent="saveConfig" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              v-model="config.primary.ip_address"
              label="IP Address"
              type="text"
              placeholder="192.168.1.1"
              :error="validationErrors['primary.ip_address']"
              required
            />
            <Input
              v-model="config.primary.netmask"
              label="Subnet Mask"
              type="text"
              placeholder="255.255.255.0"
              :error="validationErrors['primary.netmask']"
              required
            />
          </div>

          <Toggle
            v-model="config.primary.dhcp_enabled"
            label="Enable DHCP Server"
          />

          <div v-if="config.primary.dhcp_enabled" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              v-model="config.primary.dhcp_start"
              label="DHCP Start IP"
              type="text"
              placeholder="192.168.1.100"
              :error="validationErrors['primary.dhcp_start']"
            />
            <Input
              v-model="config.primary.dhcp_end"
              label="DHCP End IP"
              type="text"
              placeholder="192.168.1.200"
              :error="validationErrors['primary.dhcp_end']"
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

      <!-- Guest Network Configuration -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Guest Network (br1)
            </h2>
            <Toggle v-model="config.guest.enabled" label="" />
          </div>
        </div>

        <form v-if="config.guest.enabled" @submit.prevent="saveConfig" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              v-model="config.guest.ip_address"
              label="IP Address"
              type="text"
              placeholder="192.168.2.1"
              :error="validationErrors['guest.ip_address']"
            />
            <Input
              v-model="config.guest.netmask"
              label="Subnet Mask"
              type="text"
              placeholder="255.255.255.0"
              :error="validationErrors['guest.netmask']"
            />
          </div>

          <Toggle
            v-model="config.guest.dhcp_enabled"
            label="Enable DHCP Server"
          />

          <div v-if="config.guest.dhcp_enabled" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              v-model="config.guest.dhcp_start"
              label="DHCP Start IP"
              type="text"
              placeholder="192.168.2.100"
              :error="validationErrors['guest.dhcp_start']"
            />
            <Input
              v-model="config.guest.dhcp_end"
              label="DHCP End IP"
              type="text"
              placeholder="192.168.2.200"
              :error="validationErrors['guest.dhcp_end']"
            />
          </div>

          <Toggle
            v-model="config.guest.isolated"
            label="Network Isolation (guests cannot access primary LAN)"
          />

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

      <!-- VLANs Table -->
      <Card>
        <template #actions>
          <Button size="sm" variant="primary" @click="showVlanForm = true">
            Add VLAN
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            VLAN Configuration
          </h2>
        </div>

        <div v-if="config.vlans.length === 0" class="text-center py-12">
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
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            No VLANs configured
          </h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Get started by creating your first VLAN.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  VLAN ID
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Subnet Mask
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="vlan in config.vlans"
                :key="vlan.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ vlan.vlan_id }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ vlan.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ vlan.ip_address }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ vlan.netmask }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="vlan.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                    {{ vlan.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                  <Button size="sm" variant="danger" @click="deleteVlan(vlan.id)">
                    Delete
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
