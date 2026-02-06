/**
 * Vue composable for VPN Client API.
 *
 * @module composables/useVPNClient
 */

import { ref, onMounted } from 'vue';
import { useApi } from './useApi';
import type { VPNClientProfile, VPNClientStatus } from '../lib/api/types';

/**
 * Return value from useVPNClient.
 */
export interface UseVPNClientReturn {
  /** VPN client profiles */
  profiles: ReturnType<typeof ref<VPNClientProfile[]>>;
  /** Loading state */
  loading: ReturnType<typeof ref<boolean>>;
  /** Error message if fetch fails */
  error: ReturnType<typeof ref<string | null>>;
  /** Manually refetch profiles */
  refetch: () => Promise<void>;
  /** Create a new profile */
  create: (profile: Partial<VPNClientProfile>) => Promise<VPNClientProfile>;
  /** Update an existing profile */
  update: (profileId: string, profile: Partial<VPNClientProfile>) => Promise<VPNClientProfile>;
  /** Delete a profile */
  remove: (profileId: string) => Promise<void>;
  /** Get status of a profile */
  getStatus: (profileId: string) => Promise<VPNClientStatus>;
  /** Connect to a VPN profile */
  connect: (profileId: string) => Promise<void>;
  /** Disconnect from a VPN profile */
  disconnect: (profileId: string) => Promise<void>;
}

/**
 * Manages VPN client profiles and connections for a device.
 *
 * @param deviceId - Device ID to fetch VPN client profiles for
 * @returns VPN client state and mutation functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useVPNClient } from '@/composables/useVPNClient';
 *
 * const deviceId = ref('device-123');
 * const { profiles, create, connect, disconnect } = useVPNClient(deviceId);
 *
 * async function addProfile() {
 *   const profile = await create({
 *     device_id: deviceId.value,
 *     name: 'Corporate VPN',
 *     protocol: 'wireguard',
 *     server: 'vpn.example.com',
 *     port: 51820,
 *     credentials: '...',
 *   });
 *   await connect(profile.id);
 * }
 * </script>
 * ```
 */
export function useVPNClient(
  deviceId: ReturnType<typeof ref<string>>,
): UseVPNClientReturn {
  const api = useApi();
  const profiles = ref<VPNClientProfile[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function refetch(): Promise<void> {
    if (!deviceId.value) return;

    loading.value = true;
    error.value = null;

    try {
      profiles.value = await api.listVPNClientProfiles(deviceId.value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch VPN client profiles';
    } finally {
      loading.value = false;
    }
  }

  async function create(profile: Partial<VPNClientProfile>): Promise<VPNClientProfile> {
    error.value = null;
    try {
      return await api.createVPNClientProfile(profile);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create VPN profile';
      throw err;
    }
  }

  async function update(profileId: string, profile: Partial<VPNClientProfile>): Promise<VPNClientProfile> {
    error.value = null;
    try {
      return await api.updateVPNClientProfile(profileId, profile);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update VPN profile';
      throw err;
    }
  }

  async function remove(profileId: string): Promise<void> {
    error.value = null;
    try {
      await api.deleteVPNClientProfile(profileId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete VPN profile';
      throw err;
    }
  }

  async function getStatus(profileId: string): Promise<VPNClientStatus> {
    error.value = null;
    try {
      return await api.getVPNClientStatus(profileId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get VPN status';
      throw err;
    }
  }

  async function connect(profileId: string): Promise<void> {
    error.value = null;
    try {
      await api.connectVPNClient(profileId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect VPN';
      throw err;
    }
  }

  async function disconnect(profileId: string): Promise<void> {
    error.value = null;
    try {
      await api.disconnectVPNClient(profileId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect VPN';
      throw err;
    }
  }

  onMounted(() => {
    void refetch();
  });

  return {
    profiles,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    getStatus,
    connect,
    disconnect,
  };
}
