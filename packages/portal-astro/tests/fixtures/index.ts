/**
 * Test fixtures for NGFW API resources.
 *
 * Provides realistic test data matching the API schema.
 */

import type {
  Device,
  DeviceStatus,
  DeviceRegistrationResponse,
  Route,
  NATRule,
  IPSConfig,
  IPSRule,
  IPSAlert,
  VPNServerConfig,
  VPNServerPeer,
  VPNClientProfile,
  VPNClientStatus,
  QoSRule,
  DDNSConfig,
  Report,
  LogEntry,
  Dashboard,
} from '../../src/lib/api/types';

const now = Date.now();

/**
 * Sample devices
 */
export const devices: Device[] = [
  {
    id: 'device-1',
    name: 'Home Router',
    model: 'RT-AX86U',
    serial: 'SN123456789',
    owner_id: 'user-1',
    firmware_version: '1.0.0',
    status: 'online',
    created_at: now - 86400000 * 30,
    last_seen: now - 60000,
  },
  {
    id: 'device-2',
    name: 'Office Router',
    model: 'RT-AX88U',
    serial: 'SN987654321',
    owner_id: 'user-1',
    firmware_version: '1.0.0',
    status: 'offline',
    created_at: now - 86400000 * 15,
    last_seen: now - 3600000,
  },
];

/**
 * Device registration response
 */
export const deviceRegistration: DeviceRegistrationResponse = {
  ...devices[0],
  api_key: 'sk_test_1234567890abcdef',
  websocket_url: 'wss://ws.ngfw.sh/device/device-1',
};

/**
 * Device status with metrics
 */
export const deviceStatus: DeviceStatus = {
  device: devices[0],
  connection: {
    online: true,
    last_seen: now - 60000,
  },
  metrics: {
    uptime: 86400 * 7,
    cpu: 35.2,
    memory: 62.8,
    temperature: 48.5,
    load: [0.5, 0.6, 0.4],
    connections: 142,
  },
};

/**
 * Sample routes
 */
export const routes: Route[] = [
  {
    id: 'route-1',
    device_id: 'device-1',
    destination: '10.0.0.0/8',
    gateway: '192.168.1.1',
    interface: 'eth0',
    metric: 100,
    type: 'static',
    enabled: true,
    description: 'Private network route',
    created_at: now - 86400000 * 7,
    updated_at: now - 86400000 * 7,
  },
  {
    id: 'route-2',
    device_id: 'device-1',
    destination: '0.0.0.0/0',
    gateway: '192.168.1.254',
    interface: 'eth1',
    metric: 1,
    type: 'static',
    enabled: true,
    description: 'Default gateway',
    created_at: now - 86400000 * 7,
    updated_at: now - 86400000 * 7,
  },
];

/**
 * Sample NAT rules
 */
export const natRules: NATRule[] = [
  {
    id: 'nat-1',
    device_id: 'device-1',
    name: 'SSH Port Forward',
    type: 'port_forward',
    external_ip: '203.0.113.1',
    external_port: 22,
    internal_ip: '192.168.1.100',
    internal_port: 22,
    protocol: 'tcp',
    enabled: true,
    description: 'SSH access to server',
    created_at: now - 86400000 * 5,
    updated_at: now - 86400000 * 5,
  },
  {
    id: 'nat-2',
    device_id: 'device-1',
    name: 'Web Server',
    type: 'port_forward',
    external_ip: '203.0.113.1',
    external_port: 443,
    internal_ip: '192.168.1.101',
    internal_port: 443,
    protocol: 'tcp',
    enabled: true,
    description: 'HTTPS traffic to web server',
    created_at: now - 86400000 * 3,
    updated_at: now - 86400000 * 3,
  },
];

/**
 * IPS configuration
 */
export const ipsConfig: IPSConfig = {
  id: 'ips-1',
  device_id: 'device-1',
  enabled: true,
  mode: 'prevent',
  sensitivity: 'medium',
  updated_at: now - 86400000 * 2,
};

/**
 * Sample IPS rules
 */
export const ipsRules: IPSRule[] = [
  {
    id: 'ips-rule-1',
    device_id: 'device-1',
    signature_id: 2000001,
    category: 'malware',
    severity: 'critical',
    description: 'Known malware command and control traffic',
    enabled: true,
    action: 'drop',
    created_at: now - 86400000 * 10,
  },
  {
    id: 'ips-rule-2',
    device_id: 'device-1',
    signature_id: 2000002,
    category: 'exploit',
    severity: 'high',
    description: 'SQL injection attempt',
    enabled: true,
    action: 'alert',
    created_at: now - 86400000 * 10,
  },
];

/**
 * Sample IPS alerts
 */
export const ipsAlerts: IPSAlert[] = [
  {
    id: 'alert-1',
    device_id: 'device-1',
    signature_id: 2000001,
    category: 'malware',
    severity: 'critical',
    source_ip: '198.51.100.42',
    destination_ip: '192.168.1.100',
    protocol: 'tcp',
    timestamp: now - 3600000,
    blocked: true,
  },
  {
    id: 'alert-2',
    device_id: 'device-1',
    signature_id: 2000002,
    category: 'exploit',
    severity: 'high',
    source_ip: '203.0.113.88',
    destination_ip: '192.168.1.101',
    protocol: 'tcp',
    timestamp: now - 1800000,
    blocked: false,
  },
];

/**
 * VPN server configuration
 */
export const vpnServerConfig: VPNServerConfig = {
  id: 'vpn-server-1',
  device_id: 'device-1',
  enabled: true,
  protocol: 'wireguard',
  port: 51820,
  subnet: '10.8.0.0/24',
  dns_servers: ['1.1.1.1', '8.8.8.8'],
  updated_at: now - 86400000 * 1,
};

/**
 * Sample VPN server peers
 */
export const vpnServerPeers: VPNServerPeer[] = [
  {
    id: 'peer-1',
    device_id: 'device-1',
    name: 'Laptop',
    public_key: 'gN7Z5x1qXJKxMJ8qxR9bvqNxGz8Lb7Gy3D2Jx5K8nQM=',
    allowed_ips: ['10.8.0.2/32'],
    endpoint: '198.51.100.10:51820',
    last_handshake: now - 300000,
    enabled: true,
    created_at: now - 86400000 * 5,
  },
  {
    id: 'peer-2',
    device_id: 'device-1',
    name: 'Phone',
    public_key: 'aB3Y2x9wXYZxKL7mqxR1bvqMxGz2Lb3Gy8D9Jx2K4nQP=',
    allowed_ips: ['10.8.0.3/32'],
    endpoint: null,
    last_handshake: null,
    enabled: true,
    created_at: now - 86400000 * 2,
  },
];

/**
 * Sample VPN client profiles
 */
export const vpnClientProfiles: VPNClientProfile[] = [
  {
    id: 'client-1',
    device_id: 'device-1',
    name: 'Corporate VPN',
    protocol: 'wireguard',
    server: 'vpn.company.com',
    port: 51820,
    credentials: '[WireGuard Config]',
    enabled: true,
    auto_connect: true,
    created_at: now - 86400000 * 10,
    updated_at: now - 86400000 * 10,
  },
];

/**
 * VPN client status
 */
export const vpnClientStatus: VPNClientStatus = {
  profile_id: 'client-1',
  connected: true,
  ip_address: '10.9.0.2',
  connected_at: now - 7200000,
  bytes_sent: 1024 * 1024 * 50,
  bytes_received: 1024 * 1024 * 200,
};

/**
 * Sample QoS rules
 */
export const qosRules: QoSRule[] = [
  {
    id: 'qos-1',
    device_id: 'device-1',
    name: 'Video Conferencing',
    source_ip: null,
    destination_ip: null,
    source_port: null,
    destination_port: 8080,
    protocol: 'udp',
    priority: 'high',
    max_bandwidth: null,
    min_bandwidth: 2048,
    enabled: true,
    created_at: now - 86400000 * 4,
    updated_at: now - 86400000 * 4,
  },
  {
    id: 'qos-2',
    device_id: 'device-1',
    name: 'Gaming Traffic',
    source_ip: '192.168.1.50',
    destination_ip: null,
    source_port: null,
    destination_port: null,
    protocol: null,
    priority: 'critical',
    max_bandwidth: null,
    min_bandwidth: 5120,
    enabled: true,
    created_at: now - 86400000 * 3,
    updated_at: now - 86400000 * 3,
  },
];

/**
 * Sample DDNS configurations
 */
export const ddnsConfigs: DDNSConfig[] = [
  {
    id: 'ddns-1',
    device_id: 'device-1',
    provider: 'duckdns',
    hostname: 'myhome.duckdns.org',
    username: 'token',
    password: 'abcd-1234-efgh-5678',
    enabled: true,
    last_update: now - 3600000,
    last_ip: '203.0.113.1',
    update_interval: 300,
    created_at: now - 86400000 * 20,
    updated_at: now - 86400000 * 1,
  },
];

/**
 * Sample reports
 */
export const reports: Report[] = [
  {
    id: 'report-1',
    device_id: 'device-1',
    type: 'traffic',
    format: 'pdf',
    period_start: now - 86400000 * 7,
    period_end: now,
    status: 'completed',
    url: 'https://storage.ngfw.sh/reports/report-1.pdf',
    created_at: now - 3600000,
    completed_at: now - 3000000,
  },
  {
    id: 'report-2',
    device_id: 'device-1',
    type: 'security',
    format: 'csv',
    period_start: now - 86400000 * 30,
    period_end: now,
    status: 'generating',
    url: null,
    created_at: now - 600000,
    completed_at: null,
  },
];

/**
 * Sample log entries
 */
export const logEntries: LogEntry[] = [
  {
    id: 'log-1',
    device_id: 'device-1',
    timestamp: now - 300000,
    level: 'warning',
    category: 'firewall',
    message: 'Blocked connection attempt from untrusted source',
    source_ip: '198.51.100.99',
    destination_ip: '192.168.1.100',
    protocol: 'tcp',
    action: 'drop',
  },
  {
    id: 'log-2',
    device_id: 'device-1',
    timestamp: now - 600000,
    level: 'info',
    category: 'vpn',
    message: 'VPN peer connected successfully',
    source_ip: '198.51.100.10',
    destination_ip: '10.8.0.1',
    protocol: 'udp',
    action: 'accept',
  },
  {
    id: 'log-3',
    device_id: 'device-1',
    timestamp: now - 900000,
    level: 'error',
    category: 'system',
    message: 'Failed to update DDNS record',
    source_ip: null,
    destination_ip: null,
    protocol: null,
    action: null,
  },
];

/**
 * Sample dashboard
 */
export const dashboards: Dashboard[] = [
  {
    id: 'dashboard-1',
    user_id: 'user-1',
    name: 'Overview',
    layout: [
      {
        id: 'widget-1',
        type: 'metric',
        title: 'Active Connections',
        config: { deviceId: 'device-1', metric: 'connections' },
        position: { x: 0, y: 0, width: 2, height: 1 },
      },
      {
        id: 'widget-2',
        type: 'chart',
        title: 'Bandwidth Usage',
        config: { deviceId: 'device-1', chartType: 'line', period: '24h' },
        position: { x: 2, y: 0, width: 4, height: 2 },
      },
    ],
    is_default: true,
    created_at: now - 86400000 * 30,
    updated_at: now - 86400000 * 5,
  },
];

/**
 * Mock user data
 */
export const mockUser = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  primaryEmailAddress: { emailAddress: 'test@example.com' },
  imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
};

/**
 * Mock JWT token
 */
export const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
