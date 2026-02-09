import { computed, ref, watch } from "vue";
import type { Device } from "../lib/api/types";

/**
 * Selected device storage key
 */
const STORAGE_KEY = "ngfw_selected_device_id";

/**
 * Reactive selected device ID
 * Initialized from localStorage if available
 */
const selectedDeviceId = ref<string | null>(
	typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
);

/**
 * Selected device data (optional, for displaying in UI)
 */
const selectedDevice = ref<Device | null>(null);

/**
 * Composable for managing the globally selected device.
 *
 * This provides a single source of truth for which device the user
 * is currently managing. The selection persists across page navigations
 * via localStorage.
 *
 * @example
 * ```ts
 * // In a component:
 * const { deviceId, selectDevice, clearDevice } = useSelectedDevice();
 *
 * // Use deviceId in API calls:
 * const { data } = useNAT(deviceId);
 *
 * // Select a device:
 * selectDevice('device-abc-123');
 * ```
 */
export function useSelectedDevice() {
	/**
	 * Select a device by ID
	 */
	function selectDevice(deviceIdOrDevice: string | Device) {
		if (typeof deviceIdOrDevice === "string") {
			selectedDeviceId.value = deviceIdOrDevice;
			selectedDevice.value = null;
		} else {
			selectedDeviceId.value = deviceIdOrDevice.id;
			selectedDevice.value = deviceIdOrDevice;
		}
	}

	/**
	 * Clear the selected device
	 */
	function clearDevice() {
		selectedDeviceId.value = null;
		selectedDevice.value = null;
	}

	/**
	 * Computed to ensure reactivity
	 */
	const deviceId = computed(() => selectedDeviceId.value);
	const device = computed(() => selectedDevice.value);

	/**
	 * Persist to localStorage whenever selection changes
	 */
	if (typeof window !== "undefined") {
		watch(selectedDeviceId, (newValue) => {
			if (newValue) {
				localStorage.setItem(STORAGE_KEY, newValue);
			} else {
				localStorage.removeItem(STORAGE_KEY);
			}
		});
	}

	return {
		/**
		 * Currently selected device ID (reactive)
		 */
		deviceId,

		/**
		 * Currently selected device data (reactive, may be null)
		 */
		device,

		/**
		 * Select a device (by ID or full Device object)
		 */
		selectDevice,

		/**
		 * Clear the selected device
		 */
		clearDevice,

		/**
		 * Whether a device is currently selected
		 */
		hasDevice: computed(() => !!selectedDeviceId.value),
	};
}
