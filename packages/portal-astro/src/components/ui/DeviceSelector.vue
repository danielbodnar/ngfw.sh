<script setup lang="ts">
import { computed, watch } from 'vue';
import { useDevices } from '../../composables/useDevices';
import { useSelectedDevice } from '../../composables/useSelectedDevice';
import Select from './Select.vue';
import Spinner from './Spinner.vue';
import Badge from './Badge.vue';

/**
 * Device selector dropdown component.
 *
 * Displays a list of user's devices and allows selecting one.
 * The selected device is persisted globally and used across all pages.
 */

const { data: devices, loading, error } = useDevices();
const { deviceId, selectDevice, hasDevice } = useSelectedDevice();

/**
 * Options for the Select component
 */
const deviceOptions = computed(() => {
  if (!devices.value) return [];

  return devices.value.map((device) => ({
    value: device.id,
    label: device.name || device.id,
    // Include status badge in the display
    meta: device.status,
  }));
});

/**
 * Auto-select first device if none is selected
 */
watch(
  [devices, hasDevice],
  ([deviceList, selected]) => {
    if (!selected && deviceList && deviceList.length > 0) {
      // Auto-select the first online device, or just the first device
      const firstOnline = deviceList.find((d) => d.status === 'online');
      const firstDevice = firstOnline || deviceList[0];
      selectDevice(firstDevice);
    }
  },
  { immediate: true }
);

/**
 * Handle device selection change
 */
function handleChange(value: string) {
  const device = devices.value?.find((d) => d.id === value);
  if (device) {
    selectDevice(device);
  }
}

/**
 * Get status badge variant based on device status
 */
function getStatusVariant(status: string): 'success' | 'danger' | 'warning' {
  if (status === 'online') return 'success';
  if (status === 'offline') return 'danger';
  return 'warning';
}
</script>

<template>
  <div class="device-selector">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center space-x-2 px-3 py-2">
      <Spinner size="sm" />
      <span class="text-sm text-[--color-text-secondary]">Loading devices...</span>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="px-3 py-2 text-sm text-red-600 dark:text-red-400"
      :title="error"
    >
      Failed to load devices
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!devices || devices.length === 0"
      class="px-3 py-2 text-sm text-[--color-text-secondary]"
    >
      No devices registered
    </div>

    <!-- Device Selector -->
    <div v-else class="flex items-center space-x-3">
      <label for="device-selector" class="text-sm font-medium text-[--color-text-primary] whitespace-nowrap">
        Device:
      </label>

      <div class="flex-1 min-w-[200px]">
        <Select
          id="device-selector"
          :model-value="deviceId || ''"
          @update:model-value="handleChange"
          :options="deviceOptions"
          placeholder="Select a device..."
          class="w-full"
        >
          <!-- Custom option slot to show status badge -->
          <template #option="{ option }">
            <div class="flex items-center justify-between w-full">
              <span>{{ option.label }}</span>
              <Badge
                v-if="option.meta"
                :variant="getStatusVariant(option.meta)"
                size="sm"
              >
                {{ option.meta }}
              </Badge>
            </div>
          </template>
        </Select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-selector {
  @apply flex items-center;
}
</style>
