/**
 * Typed API client for the NGFW Schema API (specs.ngfw.sh).
 *
 * All requests are authenticated via Clerk JWT tokens passed through
 * the `Authorization: Bearer` header.
 *
 * @module lib/api/client
 */

import { ApiError } from './errors';
import type {
  Device,
  DeviceRegistration,
  DeviceRegistrationResponse,
  DeviceStatus,
  Route,
  RouteCreate,
  RouteUpdate,
  NATRule,
  NATRuleCreate,
  NATRuleUpdate,
  IPSConfig,
  IPSRule,
  IPSAlert,
  VPNServerConfig,
  VPNServerPeer,
  VPNClientProfile,
  VPNClientStatus,
  QoSRule,
  QoSRuleCreate,
  QoSRuleUpdate,
  DDNSConfig,
  DDNSConfigCreate,
  DDNSConfigUpdate,
  Report,
  ReportCreate,
  LogEntry,
  LogQuery,
  Dashboard,
  DashboardCreate,
  DashboardUpdate,
} from './types';

// ---------------------------------------------------------------------------
// Client Interface
// ---------------------------------------------------------------------------

export interface ApiClient {
  // Fleet / Device Management
  listDevices(): Promise<Device[]>;
  registerDevice(data: DeviceRegistration): Promise<DeviceRegistrationResponse>;
  getDeviceStatus(deviceId: string): Promise<DeviceStatus>;
  deleteDevice(deviceId: string): Promise<void>;

  // Routing
  listRoutes(deviceId: string): Promise<Route[]>;
  createRoute(data: RouteCreate): Promise<Route>;
  updateRoute(routeId: string, data: RouteUpdate): Promise<Route>;
  deleteRoute(routeId: string): Promise<void>;

  // NAT
  listNATRules(deviceId: string): Promise<NATRule[]>;
  createNATRule(data: NATRuleCreate): Promise<NATRule>;
  updateNATRule(ruleId: string, data: NATRuleUpdate): Promise<NATRule>;
  deleteNATRule(ruleId: string): Promise<void>;

  // IPS
  getIPSConfig(deviceId: string): Promise<IPSConfig>;
  updateIPSConfig(deviceId: string, config: Partial<IPSConfig>): Promise<IPSConfig>;
  listIPSRules(deviceId: string): Promise<IPSRule[]>;
  listIPSAlerts(deviceId: string): Promise<IPSAlert[]>;

  // VPN Server
  getVPNServerConfig(deviceId: string): Promise<VPNServerConfig>;
  updateVPNServerConfig(deviceId: string, config: Partial<VPNServerConfig>): Promise<VPNServerConfig>;
  listVPNServerPeers(deviceId: string): Promise<VPNServerPeer[]>;
  createVPNServerPeer(deviceId: string, peer: Partial<VPNServerPeer>): Promise<VPNServerPeer>;
  deleteVPNServerPeer(peerId: string): Promise<void>;

  // VPN Client
  listVPNClientProfiles(deviceId: string): Promise<VPNClientProfile[]>;
  createVPNClientProfile(profile: Partial<VPNClientProfile>): Promise<VPNClientProfile>;
  updateVPNClientProfile(profileId: string, profile: Partial<VPNClientProfile>): Promise<VPNClientProfile>;
  deleteVPNClientProfile(profileId: string): Promise<void>;
  getVPNClientStatus(profileId: string): Promise<VPNClientStatus>;
  connectVPNClient(profileId: string): Promise<void>;
  disconnectVPNClient(profileId: string): Promise<void>;

  // QoS
  listQoSRules(deviceId: string): Promise<QoSRule[]>;
  createQoSRule(data: QoSRuleCreate): Promise<QoSRule>;
  updateQoSRule(ruleId: string, data: QoSRuleUpdate): Promise<QoSRule>;
  deleteQoSRule(ruleId: string): Promise<void>;

  // DDNS
  listDDNSConfigs(deviceId: string): Promise<DDNSConfig[]>;
  createDDNSConfig(data: DDNSConfigCreate): Promise<DDNSConfig>;
  updateDDNSConfig(configId: string, data: DDNSConfigUpdate): Promise<DDNSConfig>;
  deleteDDNSConfig(configId: string): Promise<void>;
  forceDDNSUpdate(configId: string): Promise<void>;

  // Reports
  listReports(deviceId: string): Promise<Report[]>;
  createReport(data: ReportCreate): Promise<Report>;
  getReport(reportId: string): Promise<Report>;
  deleteReport(reportId: string): Promise<void>;

  // Logs
  queryLogs(query: LogQuery): Promise<LogEntry[]>;

  // Dashboards
  listDashboards(): Promise<Dashboard[]>;
  createDashboard(data: DashboardCreate): Promise<Dashboard>;
  updateDashboard(dashboardId: string, data: DashboardUpdate): Promise<Dashboard>;
  deleteDashboard(dashboardId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Client Factory
// ---------------------------------------------------------------------------

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
    import.meta.env.VITE_API_URL ?? 'https://api.ngfw.sh'
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
    // Fleet / Device Management
    listDevices() {
      return request<Device[]>('/fleet/devices');
    },

    registerDevice(data) {
      return request<DeviceRegistrationResponse>('/fleet/devices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getDeviceStatus(deviceId) {
      return request<DeviceStatus>(`/fleet/devices/${encodeURIComponent(deviceId)}/status`);
    },

    deleteDevice(deviceId) {
      return request<void>(`/fleet/devices/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
      });
    },

    // Routing
    listRoutes(deviceId) {
      return request<Route[]>(`/routing/routes?device_id=${encodeURIComponent(deviceId)}`);
    },

    createRoute(data) {
      return request<Route>('/routing/routes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateRoute(routeId, data) {
      return request<Route>(`/routing/routes/${encodeURIComponent(routeId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteRoute(routeId) {
      return request<void>(`/routing/routes/${encodeURIComponent(routeId)}`, {
        method: 'DELETE',
      });
    },

    // NAT
    listNATRules(deviceId) {
      return request<NATRule[]>(`/nat/rules?device_id=${encodeURIComponent(deviceId)}`);
    },

    createNATRule(data) {
      return request<NATRule>('/nat/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateNATRule(ruleId, data) {
      return request<NATRule>(`/nat/rules/${encodeURIComponent(ruleId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteNATRule(ruleId) {
      return request<void>(`/nat/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
    },

    // IPS
    getIPSConfig(deviceId) {
      return request<IPSConfig>(`/ips/config?device_id=${encodeURIComponent(deviceId)}`);
    },

    updateIPSConfig(deviceId, config) {
      return request<IPSConfig>(`/ips/config?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },

    listIPSRules(deviceId) {
      return request<IPSRule[]>(`/ips/rules?device_id=${encodeURIComponent(deviceId)}`);
    },

    listIPSAlerts(deviceId) {
      return request<IPSAlert[]>(`/ips/alerts?device_id=${encodeURIComponent(deviceId)}`);
    },

    // VPN Server
    getVPNServerConfig(deviceId) {
      return request<VPNServerConfig>(`/vpn/server/config?device_id=${encodeURIComponent(deviceId)}`);
    },

    updateVPNServerConfig(deviceId, config) {
      return request<VPNServerConfig>(`/vpn/server/config?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },

    listVPNServerPeers(deviceId) {
      return request<VPNServerPeer[]>(`/vpn/server/peers?device_id=${encodeURIComponent(deviceId)}`);
    },

    createVPNServerPeer(deviceId, peer) {
      return request<VPNServerPeer>('/vpn/server/peers', {
        method: 'POST',
        body: JSON.stringify({ ...peer, device_id: deviceId }),
      });
    },

    deleteVPNServerPeer(peerId) {
      return request<void>(`/vpn/server/peers/${encodeURIComponent(peerId)}`, {
        method: 'DELETE',
      });
    },

    // VPN Client
    listVPNClientProfiles(deviceId) {
      return request<VPNClientProfile[]>(`/vpn/client/profiles?device_id=${encodeURIComponent(deviceId)}`);
    },

    createVPNClientProfile(profile) {
      return request<VPNClientProfile>('/vpn/client/profiles', {
        method: 'POST',
        body: JSON.stringify(profile),
      });
    },

    updateVPNClientProfile(profileId, profile) {
      return request<VPNClientProfile>(`/vpn/client/profiles/${encodeURIComponent(profileId)}`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
    },

    deleteVPNClientProfile(profileId) {
      return request<void>(`/vpn/client/profiles/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
      });
    },

    getVPNClientStatus(profileId) {
      return request<VPNClientStatus>(`/vpn/client/profiles/${encodeURIComponent(profileId)}/status`);
    },

    connectVPNClient(profileId) {
      return request<void>(`/vpn/client/profiles/${encodeURIComponent(profileId)}/connect`, {
        method: 'POST',
      });
    },

    disconnectVPNClient(profileId) {
      return request<void>(`/vpn/client/profiles/${encodeURIComponent(profileId)}/disconnect`, {
        method: 'POST',
      });
    },

    // QoS
    listQoSRules(deviceId) {
      return request<QoSRule[]>(`/qos/rules?device_id=${encodeURIComponent(deviceId)}`);
    },

    createQoSRule(data) {
      return request<QoSRule>('/qos/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateQoSRule(ruleId, data) {
      return request<QoSRule>(`/qos/rules/${encodeURIComponent(ruleId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteQoSRule(ruleId) {
      return request<void>(`/qos/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
    },

    // DDNS
    listDDNSConfigs(deviceId) {
      return request<DDNSConfig[]>(`/ddns/configs?device_id=${encodeURIComponent(deviceId)}`);
    },

    createDDNSConfig(data) {
      return request<DDNSConfig>('/ddns/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateDDNSConfig(configId, data) {
      return request<DDNSConfig>(`/ddns/configs/${encodeURIComponent(configId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteDDNSConfig(configId) {
      return request<void>(`/ddns/configs/${encodeURIComponent(configId)}`, {
        method: 'DELETE',
      });
    },

    forceDDNSUpdate(configId) {
      return request<void>(`/ddns/configs/${encodeURIComponent(configId)}/update`, {
        method: 'POST',
      });
    },

    // Reports
    listReports(deviceId) {
      return request<Report[]>(`/reports?device_id=${encodeURIComponent(deviceId)}`);
    },

    createReport(data) {
      return request<Report>('/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getReport(reportId) {
      return request<Report>(`/reports/${encodeURIComponent(reportId)}`);
    },

    deleteReport(reportId) {
      return request<void>(`/reports/${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
      });
    },

    // Logs
    queryLogs(query) {
      const params = new URLSearchParams();
      if (query.device_id) params.set('device_id', query.device_id);
      if (query.level) params.set('level', query.level);
      if (query.category) params.set('category', query.category);
      if (query.start_time) params.set('start_time', query.start_time.toString());
      if (query.end_time) params.set('end_time', query.end_time.toString());
      if (query.limit) params.set('limit', query.limit.toString());
      if (query.offset) params.set('offset', query.offset.toString());

      return request<LogEntry[]>(`/logs?${params.toString()}`);
    },

    // Dashboards
    listDashboards() {
      return request<Dashboard[]>('/dashboards');
    },

    createDashboard(data) {
      return request<Dashboard>('/dashboards', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateDashboard(dashboardId, data) {
      return request<Dashboard>(`/dashboards/${encodeURIComponent(dashboardId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteDashboard(dashboardId) {
      return request<void>(`/dashboards/${encodeURIComponent(dashboardId)}`, {
        method: 'DELETE',
      });
    },
  };
}
