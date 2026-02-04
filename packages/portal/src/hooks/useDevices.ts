/**
 * React hooks for device management.
 *
 * These hooks wrap the typed API client and provide reactive state for
 * listing, polling, and registering devices.
 *
 * @module hooks/useDevices
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  createApiClient,
  type Device,
  type DeviceStatus,
  type DeviceRegistration,
  type DeviceRegistrationResponse,
} from '../api.ts';

// ---------------------------------------------------------------------------
// useDevices — fetch the device list
// ---------------------------------------------------------------------------

export interface UseDevicesReturn {
  devices: Device[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the authenticated user's device list on mount and exposes a
 * `refetch` callback for manual refreshes.
 *
 * @example
 * ```tsx
 * const { devices, loading, error, refetch } = useDevices();
 * ```
 */
export function useDevices(): UseDevicesReturn {
  const { getToken } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createApiClient(getToken);
      const list = await api.listDevices();
      setDevices(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  return { devices, loading, error, refetch: fetchDevices };
}

// ---------------------------------------------------------------------------
// useDeviceStatus — poll a single device's status
// ---------------------------------------------------------------------------

export interface UseDeviceStatusReturn {
  status: DeviceStatus | null;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 5_000;

/**
 * Polls the status of a single device every 5 seconds.
 *
 * Polling only runs when `deviceId` is non-null and stops automatically
 * when the component unmounts or `deviceId` changes.
 *
 * @param deviceId - The device to poll, or `null` to disable polling.
 *
 * @example
 * ```tsx
 * const { status, loading, error } = useDeviceStatus(selectedDeviceId);
 * ```
 */
export function useDeviceStatus(
  deviceId: string | null,
): UseDeviceStatusReturn {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to getToken so the interval callback never goes stale.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!deviceId) {
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const api = createApiClient(getTokenRef.current);
        const data = await api.getDeviceStatus(deviceId!);
        if (!cancelled) setStatus(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch device status',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Initial fetch, then poll on an interval.
    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [deviceId]);

  return { status, loading, error };
}

// ---------------------------------------------------------------------------
// useRegisterDevice — mutation hook for device registration
// ---------------------------------------------------------------------------

export interface UseRegisterDeviceReturn {
  register: (data: DeviceRegistration) => Promise<DeviceRegistrationResponse>;
  loading: boolean;
  error: string | null;
}

/**
 * Mutation-style hook for registering a new device. Call `register()` to
 * initiate the request. The returned promise resolves with the full
 * registration response (including the one-time `api_key`).
 *
 * @example
 * ```tsx
 * const { register, loading, error } = useRegisterDevice();
 * const result = await register({ name: 'Edge Router' });
 * console.log(result.api_key);
 * ```
 */
export function useRegisterDevice(): UseRegisterDeviceReturn {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (data: DeviceRegistration): Promise<DeviceRegistrationResponse> => {
      setLoading(true);
      setError(null);
      try {
        const api = createApiClient(getToken);
        return await api.registerDevice(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to register device';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  return { register, loading, error };
}
