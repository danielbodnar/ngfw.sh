<script setup lang="ts">
import { computed, ref } from "vue";
import { useNAT } from "../../composables/useNAT";
import { usePolling } from "../../composables/usePolling";
import { useSelectedDevice } from "../../composables/useSelectedDevice";
import { useToast } from "../../composables/useToast";
import type {
	NATRule,
	NATRuleCreate,
	NATRuleUpdate,
} from "../../lib/api/generated";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Modal from "../ui/Modal.vue";
import Spinner from "../ui/Spinner.vue";

// Use globally selected device
const { deviceId } = useSelectedDevice();

// Fetch NAT rules with auto-refresh
const {
	data: rules,
	loading,
	error,
	refetch,
	create,
	update,
	remove,
} = useNAT(deviceId);

// Auto-refresh every 30 seconds
usePolling({
	fetcher: refetch,
	interval: 30000,
	immediate: false,
});

// Toast notifications
const { success, error: showError } = useToast();

// Modal state
const showModal = ref(false);
const editingRule = ref<NATRule | null>(null);

// Form state
const form = ref<Partial<NATRuleCreate>>({
	device_id: deviceId.value,
	name: "",
	type: "port_forward",
	external_ip: "",
	external_port: 0,
	internal_ip: "",
	internal_port: 0,
	protocol: "tcp",
	enabled: true,
	description: "",
});

// Form validation
const formErrors = ref<Record<string, string>>({});

function validateForm(): boolean {
	formErrors.value = {};

	if (!form.value.name?.trim()) {
		formErrors.value.name = "Name is required";
	}

	if (!form.value.external_ip?.trim()) {
		formErrors.value.external_ip = "External IP is required";
	}

	if (!form.value.internal_ip?.trim()) {
		formErrors.value.internal_ip = "Internal IP is required";
	}

	if (
		!form.value.external_port ||
		form.value.external_port < 1 ||
		form.value.external_port > 65535
	) {
		formErrors.value.external_port = "Valid port (1-65535) is required";
	}

	if (
		!form.value.internal_port ||
		form.value.internal_port < 1 ||
		form.value.internal_port > 65535
	) {
		formErrors.value.internal_port = "Valid port (1-65535) is required";
	}

	return Object.keys(formErrors.value).length === 0;
}

// Reset form to defaults
function resetForm(): void {
	form.value = {
		device_id: deviceId.value,
		name: "",
		type: "port_forward",
		external_ip: "",
		external_port: 0,
		internal_ip: "",
		internal_port: 0,
		protocol: "tcp",
		enabled: true,
		description: "",
	};
	formErrors.value = {};
}

// Open modal for creating new rule
function handleAdd(): void {
	editingRule.value = null;
	resetForm();
	showModal.value = true;
}

// Open modal for editing existing rule
function handleEdit(rule: NATRule): void {
	editingRule.value = rule;
	form.value = {
		device_id: rule.device_id,
		name: rule.name,
		type: rule.type,
		external_ip: rule.external_ip,
		external_port: rule.external_port,
		internal_ip: rule.internal_ip,
		internal_port: rule.internal_port,
		protocol: rule.protocol,
		enabled: rule.enabled,
		description: rule.description,
	};
	showModal.value = true;
}

// Save rule (create or update)
async function handleSave(): Promise<void> {
	if (!validateForm()) return;

	try {
		if (editingRule.value) {
			// Update existing rule
			const updates: NATRuleUpdate = {
				name: form.value.name,
				type: form.value.type,
				external_ip: form.value.external_ip,
				external_port: form.value.external_port,
				internal_ip: form.value.internal_ip,
				internal_port: form.value.internal_port,
				protocol: form.value.protocol,
				enabled: form.value.enabled,
				description: form.value.description,
			};
			await update(editingRule.value.id, updates);
			success("NAT rule updated successfully");
		} else {
			// Create new rule
			await create(form.value as NATRuleCreate);
			success("NAT rule created successfully");
		}

		showModal.value = false;
		resetForm();
		await refetch();
	} catch (err) {
		showError(err instanceof Error ? err.message : "Failed to save NAT rule");
	}
}

// Delete rule
async function handleDelete(ruleId: string, ruleName: string): Promise<void> {
	if (!confirm(`Are you sure you want to delete "${ruleName}"?`)) {
		return;
	}

	try {
		await remove(ruleId);
		success("NAT rule deleted successfully");
		await refetch();
	} catch (err) {
		showError(err instanceof Error ? err.message : "Failed to delete NAT rule");
	}
}

// Toggle rule enabled/disabled
async function handleToggle(rule: NATRule): Promise<void> {
	try {
		await update(rule.id, { enabled: !rule.enabled });
		success(`NAT rule ${!rule.enabled ? "enabled" : "disabled"}`);
		await refetch();
	} catch (err) {
		showError(err instanceof Error ? err.message : "Failed to toggle NAT rule");
	}
}

// Cancel modal
function handleCancel(): void {
	showModal.value = false;
	resetForm();
}

// Get protocol badge variant
const getProtocolVariant = (
	protocol: string,
): "info" | "success" | "warning" => {
	if (protocol === "tcp") return "info";
	if (protocol === "udp") return "success";
	return "warning";
};

// Get type display name
const getTypeDisplay = (type: string): string => {
	if (type === "port_forward") return "Port Forward";
	if (type === "source_nat") return "Source NAT";
	if (type === "destination_nat") return "Destination NAT";
	return type;
};
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
        >Loading NAT rules...</span
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
            Failed to load NAT rules
          </h3>
          <p class="text-red-700 dark:text-red-300 mt-1 text-sm">{{ error }}</p>
          <Button variant="danger" size="sm" class="mt-3" @click="refetch">
            Retry
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!rules || rules.length === 0"
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
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <h3
        class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"
      >
        No NAT rules configured
      </h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Get started by creating your first NAT rule.
      </p>
      <Button variant="primary" class="mt-6" @click="handleAdd">
        Add NAT Rule
      </Button>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <Card>
        <template #actions>
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
          <Button variant="primary" size="sm" @click="handleAdd">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Rule
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            NAT Rules
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead
              class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
            >
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  External
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Internal
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Protocol
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="rule in rules"
                :key="rule.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  {{ rule.name }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ getTypeDisplay(rule.type) }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ rule.external_ip }}:{{ rule.external_port }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                >
                  {{ rule.internal_ip }}:{{ rule.internal_port }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getProtocolVariant(rule.protocol)">
                    {{ rule.protocol.toUpperCase() }}
                  </Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="rule.enabled ? 'success' : 'secondary'">
                    {{ rule.enabled ? 'Enabled' : 'Disabled' }}
                  </Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <div class="flex gap-2">
                    <Button variant="secondary" size="sm" @click="handleEdit(rule)">
                      Edit
                    </Button>
                    <Button
                      :variant="rule.enabled ? 'warning' : 'success'"
                      size="sm"
                      @click="handleToggle(rule)"
                    >
                      {{ rule.enabled ? 'Disable' : 'Enable' }}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      @click="handleDelete(rule.id, rule.name)"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Create/Edit Modal -->
    <Modal :open="showModal" :title="editingRule ? 'Edit NAT Rule' : 'Add NAT Rule'" size="lg" @close="handleCancel">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Name
          </label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            :class="{ 'border-red-500': formErrors.name }"
          />
          <p v-if="formErrors.name" class="mt-1 text-sm text-red-600 dark:text-red-400">
            {{ formErrors.name }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Type
          </label>
          <select
            v-model="form.type"
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="port_forward">Port Forward</option>
            <option value="source_nat">Source NAT</option>
            <option value="destination_nat">Destination NAT</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              External IP
            </label>
            <input
              v-model="form.external_ip"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              :class="{ 'border-red-500': formErrors.external_ip }"
            />
            <p v-if="formErrors.external_ip" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.external_ip }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              External Port
            </label>
            <input
              v-model.number="form.external_port"
              type="number"
              min="1"
              max="65535"
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              :class="{ 'border-red-500': formErrors.external_port }"
            />
            <p v-if="formErrors.external_port" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.external_port }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal IP
            </label>
            <input
              v-model="form.internal_ip"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              :class="{ 'border-red-500': formErrors.internal_ip }"
            />
            <p v-if="formErrors.internal_ip" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.internal_ip }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal Port
            </label>
            <input
              v-model.number="form.internal_port"
              type="number"
              min="1"
              max="65535"
              class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              :class="{ 'border-red-500': formErrors.internal_port }"
            />
            <p v-if="formErrors.internal_port" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.internal_port }}
            </p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Protocol
          </label>
          <select
            v-model="form.protocol"
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div class="flex items-center">
          <input
            v-model="form.enabled"
            type="checkbox"
            id="enabled"
            class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label for="enabled" class="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Enabled
          </label>
        </div>
      </div>

      <template #actions>
        <Button variant="secondary" @click="handleCancel">
          Cancel
        </Button>
        <Button variant="primary" @click="handleSave">
          {{ editingRule ? 'Update' : 'Create' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
