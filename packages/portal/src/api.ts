/**
 * Typed API client for the NGFW Schema API (specs.ngfw.sh).
 *
 * All requests are authenticated via Clerk JWT tokens passed through
 * the `Authorization: Bearer` header.
 *
 * @module api
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Device {
  id: string;
  name: string;
  model: string | null;
  serial: string | null;
  owner_id: string;
  firmware_version: string | null;
  status: 'provisioning' | 'online' | 'offline';
  created_at: number;
  last_seen: number | null;
}

export interface DeviceRegistration {
  name: string;
  model?: string;
}

export interface DeviceRegistrationResponse extends Device {
  /** Only returned once at registration time. */
  api_key: string;
  websocket_url: string;
}

export interface DeviceStatus {
  device: Device;
  connection: {
    online: boolean;
    last_seen: number | null;
  } | null;
  metrics: {
    uptime: number;
    cpu: number;
    memory: number;
    temperature: number | null;
    load: [number, number, number];
    connections: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface ApiClient {
  listDevices(): Promise<Device[]>;
  registerDevice(data: DeviceRegistration): Promise<DeviceRegistrationResponse>;
  getDeviceStatus(deviceId: string): Promise<DeviceStatus>;
  deleteDevice(deviceId: string): Promise<void>;
}

/**
 * Creates an authenticated API client.
 *
 * @param getToken - Async function that returns a Clerk session JWT.
 *                   Typically obtained from `useAuth().getToken`.
 * @returns An {@link ApiClient} instance bound to the Schema API.
 *
 * @example
 * ```ts
 * const { getToken } = useAuth();
 * const api = createApiClient(getToken);
 * const devices = await api.listDevices();
 * ```
 */
export function createApiClient(
  getToken: () => Promise<string | null>,
): ApiClient {
  const baseUrl = (
    import.meta.env.VITE_API_URL ?? 'https://specs.ngfw.sh'
  ).replace(/\/+$/, '');

  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } catch {
        // Response body was not JSON — fall through to statusText.
      }
      throw new ApiError(res.status, message);
    }

    // 204 No Content — nothing to parse.
    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  return {
    listDevices() {
      return request<Device[]>('/api/devices');
    },

    registerDevice(data) {
      return request<DeviceRegistrationResponse>('/api/devices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getDeviceStatus(deviceId) {
      return request<DeviceStatus>(`/api/devices/${encodeURIComponent(deviceId)}/status`);
    },

    deleteDevice(deviceId) {
      return request<void>(`/api/devices/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
      });
    },
  };
}
