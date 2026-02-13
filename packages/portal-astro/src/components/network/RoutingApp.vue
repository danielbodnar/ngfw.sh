<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { z } from "zod";
import { useDevices } from "../../composables/useDevices";
import { usePolling } from "../../composables/usePolling";
import { useRoutes } from "../../composables/useRoutes";
import type { RouteCreate, RouteUpdate } from "../../lib/api/generated";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Modal from "../ui/Modal.vue";
import Select from "../ui/Select.vue";
import Spinner from "../ui/Spinner.vue";
import Toggle from "../ui/Toggle.vue";

/**
 * Route form schema for validation.
 */
const RouteFormSchema = z.object({
	destination: z
		.string()
		.regex(
			/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
			"Invalid CIDR format (e.g., 10.0.0.0/8)",
		),
	gateway: z.string().ip("Invalid gateway IP address"),
	interface: z.string().min(1, "Interface is required"),
	metric: z.number().min(0).max(9999).default(100),
	type: z.enum(["static", "dynamic", "policy"]).default("static"),
	enabled: z.boolean().default(true),
	description: z.string().optional(),
});

type RouteForm = z.infer<typeof RouteFormSchema>;

const { data: devices, loading: devicesLoading } = useDevices();
const selectedDeviceId = ref<string>("");
const {
	data: routes,
	loading,
	error,
	refetch,
	create,
	update,
	remove,
} = useRoutes(selectedDeviceId);

const showForm = ref(false);
const editingRouteId = ref<string | null>(null);
const formData = ref<RouteForm>({
	destination: "",
	gateway: "",
	interface: "eth0",
	metric: 100,
	type: "static",
	enabled: true,
	description: "",
});

const saving = ref(false);
const validationErrors = ref<Record<string, string>>({});

/**
 * Select the first device on mount.
 */
onMounted(() => {
	if (devices.value && devices.value.length > 0) {
		selectedDeviceId.value = devices.value[0].id;
	}
});

/**
 * Auto-refresh every 30 seconds.
 */
usePolling({
	fetcher: refetch,
	interval: 30000,
	immediate: false,
});

/**
 * Get device options for select.
 */
const deviceOptions = computed(() => {
	if (!devices.value) return [];
	return devices.value.map((d) => ({
		value: d.id,
		label: d.name,
	}));
});

/**
 * Interface options.
 */
const interfaceOptions = [
	{ value: "eth0", label: "eth0 (WAN)" },
	{ value: "eth1", label: "eth1 (LAN)" },
	{ value: "eth2", label: "eth2 (LAN)" },
	{ value: "wlan0", label: "wlan0 (WiFi)" },
	{ value: "wlan1", label: "wlan1 (WiFi)" },
];

/**
 * Route type options.
 */
const typeOptions = [
	{ value: "static", label: "Static Route" },
	{ value: "dynamic", label: "Dynamic Route" },
	{ value: "policy", label: "Policy-based Route" },
];

/**
 * Open form to add new route.
 */
function openAddForm(): void {
	editingRouteId.value = null;
	formData.value = {
		destination: "",
		gateway: "",
		interface: "eth0",
		metric: 100,
		type: "static",
		enabled: true,
		description: "",
	};
	validationErrors.value = {};
	showForm.value = true;
}

/**
 * Open form to edit existing route.
 */
function openEditForm(routeId: string): void {
	const route = routes.value.find((r) => r.id === routeId);
	if (!route) return;

	editingRouteId.value = routeId;
	formData.value = {
		destination: route.destination,
		gateway: route.gateway,
		interface: route.interface,
		metric: route.metric,
		type: route.type,
		enabled: route.enabled,
		description: route.description || "",
	};
	validationErrors.value = {};
	showForm.value = true;
}

/**
 * Close form modal.
 */
function closeForm(): void {
	showForm.value = false;
	editingRouteId.value = null;
	validationErrors.value = {};
}

/**
 * Save route (create or update).
 */
async function saveRoute(): Promise<void> {
	validationErrors.value = {};

	const result = RouteFormSchema.safeParse(formData.value);
	if (!result.success) {
		result.error.errors.forEach((err) => {
			if (err.path[0]) {
				validationErrors.value[err.path[0] as string] = err.message;
			}
		});
		return;
	}

	if (!selectedDeviceId.value) {
		validationErrors.value.general = "Please select a device";
		return;
	}

	saving.value = true;

	try {
		if (editingRouteId.value) {
			const updateData: RouteUpdate = { ...formData.value };
			await update(editingRouteId.value, updateData);
		} else {
			const createData: RouteCreate = {
				device_id: selectedDeviceId.value,
				...formData.value,
			};
			await create(createData);
		}

		await refetch();
		closeForm();
	} catch (err) {
		validationErrors.value.general =
			err instanceof Error ? err.message : "Failed to save route";
	} finally {
		saving.value = false;
	}
}

/**
 * Delete route with confirmation.
 */
async function deleteRoute(routeId: string): Promise<void> {
	if (!confirm("Are you sure you want to delete this route?")) {
		return;
	}

	try {
		await remove(routeId);
		await refetch();
	} catch (err) {
		console.error("Failed to delete route:", err);
	}
}

/**
 * Get route type badge variant.
 */
function getTypeVariant(type: string): "primary" | "success" | "warning" {
	if (type === "static") return "primary";
	if (type === "dynamic") return "success";
	return "warning";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="loading || devicesLoading"
      class="flex flex-col justify-center items-center h-64 space-y-4"
    >
      <Spinner size="lg" />
      <span class="text-sm text-[--color-text-secondary]"
        >Loading routing configuration...</span
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
            Failed to load routing configuration
          </h3>
          <p class="text-red-700 dark:text-red-300 mt-1 text-sm">{{ error }}</p>
          <Button variant="danger" size="sm" class="mt-3" @click="refetch">
            Retry
          </Button>
        </div>
      </div>
    </div>

    <!-- No Device Selected -->
    <div
      v-else-if="!selectedDeviceId && devices && devices.length > 0"
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
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
        No device selected
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Select a device to manage its routing configuration.
      </p>
    </div>

    <!-- No Devices -->
    <div
      v-else-if="!devices || devices.length === 0"
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
        No devices registered
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Register a device to configure routing.
      </p>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- Device Selector -->
      <Card v-if="deviceOptions.length > 0">
        <div class="p-6">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Select Device
          </label>
          <Select
            v-model="selectedDeviceId"
            :options="deviceOptions"
            @update:modelValue="refetch"
          />
        </div>
      </Card>

      <!-- Routes Table -->
      <Card>
        <template #actions>
          <div class="flex space-x-2">
            <Button size="sm" @click="refetch">
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
            <Button size="sm" variant="primary" @click="openAddForm">
              Add Route
            </Button>
          </div>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Static Routes
          </h2>
        </div>

        <div v-if="!routes || routes.length === 0" class="text-center py-12">
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            No routes configured
          </h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Get started by adding your first static route.
          </p>
          <Button variant="primary" class="mt-6" @click="openAddForm">
            Add Route
          </Button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Destination
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Gateway
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Interface
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Metric
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="route in routes"
                :key="route.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ route.destination }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ route.gateway }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ route.interface }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ route.metric }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getTypeVariant(route.type)">
                    {{ route.type }}
                  </Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="route.enabled ? 'success' : 'danger'">
                    {{ route.enabled ? 'Enabled' : 'Disabled' }}
                  </Badge>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {{ route.description || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                  <Button size="sm" @click="openEditForm(route.id)">
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" @click="deleteRoute(route.id)">
                    Delete
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Add/Edit Route Modal -->
    <Modal :show="showForm" @close="closeForm" :title="editingRouteId ? 'Edit Route' : 'Add Route'">
      <form @submit.prevent="saveRoute" class="space-y-6">
        <div v-if="validationErrors.general" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p class="text-sm text-red-700 dark:text-red-300">{{ validationErrors.general }}</p>
        </div>

        <Input
          v-model="formData.destination"
          label="Destination Network (CIDR)"
          type="text"
          placeholder="10.0.0.0/8"
          :error="validationErrors.destination"
          required
        />

        <Input
          v-model="formData.gateway"
          label="Gateway IP"
          type="text"
          placeholder="192.168.1.254"
          :error="validationErrors.gateway"
          required
        />

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Interface
          </label>
          <Select
            v-model="formData.interface"
            :options="interfaceOptions"
            :error="validationErrors.interface"
          />
        </div>

        <Input
          v-model.number="formData.metric"
          label="Metric"
          type="number"
          :min="0"
          :max="9999"
          :error="validationErrors.metric"
        />

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Route Type
          </label>
          <Select
            v-model="formData.type"
            :options="typeOptions"
            :error="validationErrors.type"
          />
        </div>

        <Input
          v-model="formData.description"
          label="Description (Optional)"
          type="text"
          placeholder="Remote office network"
          :error="validationErrors.description"
        />

        <Toggle
          v-model="formData.enabled"
          label="Enable this route"
        />

        <div class="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" @click="closeForm">
            Cancel
          </Button>
          <Button type="submit" variant="primary" :disabled="saving">
            {{ saving ? 'Saving...' : editingRouteId ? 'Update Route' : 'Add Route' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
