import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Shield, Wifi, Globe, Server, Database, Settings, Monitor, FileText, ChevronDown, ChevronRight, Search, Bell, User, Power, HardDrive, Network, Radio, Lock, Eye, EyeOff, Filter, Download, Upload, RefreshCw, Plus, Trash2, Edit, Copy, Check, X, AlertTriangle, Zap, Clock, TrendingUp, TrendingDown, BarChart3, PieChart, Layers, Route, ShieldAlert, ShieldCheck, ShieldOff, Cpu, Thermometer, MemoryStick, ArrowUpDown, ExternalLink, Terminal, Key, Users, Map, List, Grid, Play, Pause, Square, ChevronLeft, Home, Menu, Maximize2, Minimize2, CreditCard, LogOut, Mail, Building, Crown, Sparkles, Router, CircuitBoard } from 'lucide-react';

// Types
type View = 'dashboard' | 'wan' | 'lan' | 'wifi' | 'dhcp' | 'routing' | 'firewall' | 'nat' | 'traffic' | 'dns-filter' | 'ips' | 'vpn-server' | 'vpn-client' | 'qos' | 'ddns' | 'grafana' | 'loki' | 'reports' | 'firmware' | 'backup' | 'logs' | 'hardware' | 'devices' | 'profile' | 'billing';
type AuthView = 'login' | 'signup' | 'app';

interface NavItem { id: View; label: string; icon: React.ReactNode; }
interface NavGroup { label: string; items: NavItem[]; }

// Utility functions
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');
const formatBytes = (b: number) => b >= 1e9 ? `${(b/1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b/1e6).toFixed(2)} MB` : b >= 1e3 ? `${(b/1e3).toFixed(2)} KB` : `${b} B`;
const formatRate = (b: number) => `${formatBytes(b)}/s`;
const formatNumber = (n: number) => n.toLocaleString();

// Extended Mock Data
const systemStats = { cpu: 23, memory: 41, temp: 52, uptime: '14d 7h 23m', load: [0.42, 0.38, 0.35], connections: 847, wanIp: '203.0.113.42', lanClients: 34 };

const interfaces = [
  { name: 'eth0', type: 'WAN', status: 'up', ip: '203.0.113.42/24', mac: '00:1A:2B:3C:4D:5E', rx: 847293847234, tx: 234827348123, rxRate: 12847293, txRate: 3948273 },
  { name: 'eth1', type: 'LAN', status: 'up', ip: '192.168.1.1/24', mac: '00:1A:2B:3C:4D:5F', rx: 234827348123, tx: 847293847234, rxRate: 8473920, txRate: 12938470 },
  { name: 'wlan0', type: 'WiFi 5GHz', status: 'up', ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:60', rx: 98374928123, tx: 47829374234, rxRate: 4827394, txRate: 2938471, clients: 18 },
  { name: 'wlan1', type: 'WiFi 2.4GHz', status: 'up', ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:61', rx: 28374829123, tx: 18273948234, rxRate: 1827394, txRate: 938471, clients: 12 },
  { name: 'wg0', type: 'WireGuard', status: 'up', ip: '10.0.0.1/24', mac: 'N/A', rx: 8374829123, tx: 5273948234, rxRate: 827394, txRate: 438471, clients: 4 },
];

const generateFirewallRules = () => [
  { id: 1, name: 'Allow Established', src: 'any', dst: 'any', proto: 'all', port: '*', action: 'accept', hits: 48273942, enabled: true, zone: 'WAN→LAN', schedule: 'Always' },
  { id: 2, name: 'Block Telnet', src: 'WAN', dst: 'any', proto: 'tcp', port: '23', action: 'drop', hits: 8472, enabled: true, zone: 'WAN→LAN', schedule: 'Always' },
  { id: 3, name: 'Allow SSH Internal', src: '192.168.1.0/24', dst: 'self', proto: 'tcp', port: '22', action: 'accept', hits: 2341, enabled: true, zone: 'LAN→Router', schedule: 'Always' },
  { id: 4, name: 'Allow HTTPS Internal', src: '192.168.1.0/24', dst: 'self', proto: 'tcp', port: '443', action: 'accept', hits: 84729, enabled: true, zone: 'LAN→Router', schedule: 'Always' },
  { id: 5, name: 'Block NetBIOS', src: 'any', dst: 'WAN', proto: 'udp', port: '137-139', action: 'drop', hits: 283742, enabled: true, zone: 'LAN→WAN', schedule: 'Always' },
  { id: 6, name: 'Rate Limit ICMP', src: 'WAN', dst: 'self', proto: 'icmp', port: '*', action: 'limit', hits: 92831, enabled: true, zone: 'WAN→Router', schedule: 'Always' },
  { id: 7, name: 'Allow DNS', src: '192.168.1.0/24', dst: 'self', proto: 'udp', port: '53', action: 'accept', hits: 1827394, enabled: true, zone: 'LAN→Router', schedule: 'Always' },
  { id: 8, name: 'Block SMB External', src: 'WAN', dst: 'any', proto: 'tcp', port: '445', action: 'drop', hits: 47293, enabled: true, zone: 'WAN→LAN', schedule: 'Always' },
  { id: 9, name: 'Allow WireGuard', src: 'WAN', dst: 'self', proto: 'udp', port: '51820', action: 'accept', hits: 8472, enabled: true, zone: 'WAN→Router', schedule: 'Always' },
  { id: 10, name: 'IoT Isolation', src: 'VLAN10', dst: 'LAN', proto: 'all', port: '*', action: 'drop', hits: 182739, enabled: true, zone: 'IoT→LAN', schedule: 'Always' },
  { id: 11, name: 'Guest Bandwidth Limit', src: 'VLAN20', dst: 'WAN', proto: 'all', port: '*', action: 'shape', hits: 472934, enabled: true, zone: 'Guest→WAN', schedule: 'Always' },
  { id: 12, name: 'Block Crypto Mining', src: 'LAN', dst: 'any', proto: 'tcp', port: '3333,4444,8333', action: 'drop', hits: 1823, enabled: true, zone: 'LAN→WAN', schedule: 'Always' },
  { id: 13, name: 'Kids Bedtime Block', src: '192.168.1.150-160', dst: 'WAN', proto: 'all', port: '*', action: 'drop', hits: 8472, enabled: true, zone: 'LAN→WAN', schedule: '22:00-07:00' },
  { id: 14, name: 'Allow Plex Remote', src: 'WAN', dst: '192.168.1.50', proto: 'tcp', port: '32400', action: 'accept', hits: 2847, enabled: true, zone: 'WAN→LAN', schedule: 'Always' },
  { id: 15, name: 'Block TikTok', src: 'VLAN10', dst: 'any', proto: 'all', port: '*', action: 'drop', hits: 47293, enabled: true, zone: 'IoT→WAN', schedule: 'Always', app: 'TikTok' },
];

const generateTrafficLogs = () => {
  const protocols = ['TCP', 'UDP', 'ICMP', 'QUIC', 'TCP'];
  const actions = ['ACCEPT', 'ACCEPT', 'ACCEPT', 'DROP', 'ACCEPT', 'ACCEPT'];
  const apps = ['HTTPS', 'DNS', 'SSH', 'HTTP', 'QUIC', 'DoT', 'NTP', 'SMTP', 'IMAP', 'FTP'];
  const geos = ['US', 'US', 'DE', 'CN', 'GB', 'JP', 'AU', 'CA', 'FR', 'NL'];
  const flags = ['ACK,PSH', 'ACK', 'SYN', 'SYN,ACK', 'FIN,ACK', 'RST', '-'];
  const srcIps = ['192.168.1.101', '192.168.1.105', '192.168.1.108', '192.168.1.112', '192.168.1.119', '192.168.1.125', '192.168.1.130', '192.168.1.142', '192.168.1.155', '192.168.1.160'];
  const dstIps = ['142.250.185.78', '151.101.1.140', '1.1.1.1', '172.217.14.99', '140.82.112.3', '104.16.132.229', '13.107.42.14', '52.94.236.248', '34.149.87.45', '203.0.113.89'];
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    time: `14:${String(23 - Math.floor(i / 4)).padStart(2, '0')}:${String(59 - (i % 60)).padStart(2, '0')}.${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    src: i % 7 === 0 ? dstIps[Math.floor(Math.random() * 3)] : srcIps[Math.floor(Math.random() * srcIps.length)],
    srcPort: 30000 + Math.floor(Math.random() * 35000),
    dst: i % 7 === 0 ? '203.0.113.42' : dstIps[Math.floor(Math.random() * dstIps.length)],
    dstPort: [443, 80, 53, 22, 853, 123, 25, 993, 21, 8080][Math.floor(Math.random() * 10)],
    proto: protocols[Math.floor(Math.random() * protocols.length)],
    bytes: Math.floor(Math.random() * 50000),
    packets: Math.floor(Math.random() * 100) + 1,
    action: i % 7 === 0 && Math.random() > 0.5 ? 'DROP' : actions[Math.floor(Math.random() * actions.length)],
    app: apps[Math.floor(Math.random() * apps.length)],
    geo: geos[Math.floor(Math.random() * geos.length)],
    flags: flags[Math.floor(Math.random() * flags.length)],
    threat: Math.random() > 0.95 ? 'Port Scan' : Math.random() > 0.98 ? 'Brute Force' : null,
  }));
};

const generateDnsQueries = () => {
  const clients = ['192.168.1.101', '192.168.1.105', '192.168.1.108', '192.168.1.112', '192.168.1.119', '192.168.1.125', '192.168.1.130', '192.168.1.142'];
  const domains = [
    { query: 'www.google.com', status: 'resolved', answer: '142.250.185.78' },
    { query: 'ads.doubleclick.net', status: 'blocked', answer: '0.0.0.0' },
    { query: 'api.segment.io', status: 'blocked', answer: '0.0.0.0' },
    { query: 'github.com', status: 'resolved', answer: '140.82.112.3' },
    { query: 'telemetry.microsoft.com', status: 'blocked', answer: '0.0.0.0' },
    { query: 'cdn.jsdelivr.net', status: 'resolved', answer: '104.16.85.20' },
    { query: 'facebook.com', status: 'resolved', answer: '157.240.1.35' },
    { query: 'pixel.facebook.com', status: 'blocked', answer: '0.0.0.0' },
    { query: 'api.twitter.com', status: 'resolved', answer: '104.244.42.1' },
    { query: 'analytics.google.com', status: 'blocked', answer: '0.0.0.0' },
    { query: 'cloudflare.com', status: 'resolved', answer: '104.16.132.229' },
    { query: 'netflix.com', status: 'resolved', answer: '54.155.178.5' },
    { query: 'track.hubspot.com', status: 'blocked', answer: '0.0.0.0' },
    { query: 'amazon.com', status: 'resolved', answer: '176.32.103.205' },
    { query: 'ads.yahoo.com', status: 'blocked', answer: '0.0.0.0' },
  ];
  
  return Array.from({ length: 80 }, (_, i) => {
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return {
      id: i + 1,
      time: `14:${String(23 - Math.floor(i / 4)).padStart(2, '0')}:${String(59 - (i % 60)).padStart(2, '0')}`,
      client: clients[Math.floor(Math.random() * clients.length)],
      ...domain,
      type: Math.random() > 0.9 ? 'AAAA' : 'A',
      latency: domain.status === 'blocked' ? 0 : Math.floor(Math.random() * 50) + 5,
      cached: Math.random() > 0.4,
    };
  });
};

const dhcpLeases = [
  { ip: '192.168.1.101', mac: '48:2C:6A:1E:59:3D', hostname: 'daniels-desktop', vendor: 'Dell Inc.', expires: '6h 23m', static: false, online: true, lastSeen: '2m ago' },
  { ip: '192.168.1.102', mac: 'DC:A6:32:12:7B:4E', hostname: 'pi-hole-backup', vendor: 'Raspberry Pi', expires: 'static', static: true, online: true, lastSeen: '1m ago' },
  { ip: '192.168.1.105', mac: 'F0:18:98:3C:49:21', hostname: 'macbook-pro', vendor: 'Apple Inc.', expires: '4h 12m', static: false, online: true, lastSeen: '30s ago' },
  { ip: '192.168.1.108', mac: '94:B8:6D:C2:48:9F', hostname: 'iphone-lauren', vendor: 'Apple Inc.', expires: '5h 47m', static: false, online: true, lastSeen: '5m ago' },
  { ip: '192.168.1.112', mac: 'B4:2E:99:51:C8:3A', hostname: 'selah-laptop', vendor: 'HP Inc.', expires: '7h 02m', static: false, online: true, lastSeen: '12m ago' },
  { ip: '192.168.1.119', mac: 'E8:9F:80:12:34:56', hostname: 'living-room-tv', vendor: 'Samsung', expires: '3h 15m', static: false, online: true, lastSeen: '1h ago' },
  { ip: '192.168.1.125', mac: 'A4:C1:38:AB:CD:EF', hostname: 'gaming-pc', vendor: 'ASUS', expires: '2h 45m', static: false, online: true, lastSeen: '15m ago' },
  { ip: '192.168.1.130', mac: '00:11:22:33:44:55', hostname: 'nas-synology', vendor: 'Synology', expires: 'static', static: true, online: true, lastSeen: '1m ago' },
  { ip: '192.168.1.142', mac: '66:77:88:99:AA:BB', hostname: 'ring-doorbell', vendor: 'Amazon', expires: '8h 30m', static: false, online: true, lastSeen: '3m ago' },
  { ip: '192.168.1.150', mac: 'CC:DD:EE:FF:00:11', hostname: 'kids-ipad', vendor: 'Apple Inc.', expires: '4h 00m', static: false, online: false, lastSeen: '2h ago' },
  { ip: '192.168.1.155', mac: '22:33:44:55:66:77', hostname: 'nest-thermostat', vendor: 'Google', expires: 'static', static: true, online: true, lastSeen: '5m ago' },
  { ip: '192.168.1.160', mac: '88:99:AA:BB:CC:DD', hostname: 'sonos-speaker', vendor: 'Sonos', expires: '6h 10m', static: false, online: true, lastSeen: '20m ago' },
];

const wifiNetworks = [
  { ssid: 'NGFW.sh-5G', band: '5GHz', channel: 149, width: '80MHz', security: 'WPA3', clients: 18, signal: -42, hidden: false, enabled: true },
  { ssid: 'NGFW.sh-2G', band: '2.4GHz', channel: 6, width: '40MHz', security: 'WPA2/WPA3', clients: 12, signal: -38, hidden: false, enabled: true },
  { ssid: 'IoT-Network', band: '2.4GHz', channel: 11, width: '20MHz', security: 'WPA2', clients: 8, signal: -45, hidden: false, enabled: true, vlan: 10 },
  { ssid: 'Guest-Network', band: '2.4GHz', channel: 6, width: '20MHz', security: 'WPA2', clients: 2, signal: -48, hidden: false, enabled: true, isolated: true, vlan: 20 },
];

const threatEvents = [
  { time: '14:21:33', type: 'Port Scan', src: '203.0.113.89', dst: '203.0.113.42', severity: 'medium', blocked: true },
  { time: '14:18:47', type: 'Brute Force SSH', src: '45.33.32.156', dst: '203.0.113.42:22', severity: 'high', blocked: true },
  { time: '14:12:22', type: 'Malware C2', src: '192.168.1.142', dst: '185.234.72.12', severity: 'critical', blocked: true },
  { time: '13:58:11', type: 'DNS Tunneling', src: '192.168.1.125', dst: 'tunnel.evil.com', severity: 'high', blocked: true },
  { time: '13:45:03', type: 'Crypto Mining', src: '192.168.1.130', dst: 'pool.minexmr.com', severity: 'medium', blocked: true },
];

const topClients = [
  { ip: '192.168.1.105', hostname: 'macbook-pro', download: 12847293847, upload: 2847293847, connections: 847 },
  { ip: '192.168.1.125', hostname: 'gaming-pc', download: 9847293847, upload: 1847293847, connections: 623 },
  { ip: '192.168.1.119', hostname: 'living-room-tv', download: 8473928472, upload: 284729384, connections: 234 },
  { ip: '192.168.1.130', hostname: 'nas-synology', download: 7293847293, upload: 8293847293, connections: 1247 },
  { ip: '192.168.1.112', hostname: 'selah-laptop', download: 5847293847, upload: 847293847, connections: 412 },
];

const firewallRules = generateFirewallRules();
const trafficLogs = generateTrafficLogs();
const dnsQueries = generateDnsQueries();

// Time series data for graphs
const generateTimeSeriesData = (hours: number, baseValue: number, variance: number) => 
  Array.from({ length: hours * 12 }, (_, i) => ({
    time: i,
    value: baseValue + Math.sin(i / 10) * variance + (Math.random() - 0.5) * variance * 0.5,
  }));

const bandwidthData = generateTimeSeriesData(24, 50, 30);
const connectionsData = generateTimeSeriesData(24, 500, 200);
const dnsData = generateTimeSeriesData(24, 1000, 400);
const threatData = generateTimeSeriesData(24, 10, 15);

// Billing Plans
const billingPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Essential security for getting started',
    features: [
      'Basic firewall rules',
      'Traffic monitoring (24h retention)',
      'Up to 5 devices',
      'Community support',
      'Basic dashboard',
    ],
    notIncluded: ['DNS ad blocking', 'Web filtering', 'VPN', 'IDS/IPS', 'API access'],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'home',
    name: 'Home',
    price: 12,
    period: 'month',
    description: 'Advanced protection for home networks',
    features: [
      'Everything in Free',
      'DNS ad & tracker blocking',
      'Basic web filtering (10 presets)',
      'Up to 50 devices',
      '7-day log retention',
      'Email support',
      'Custom firewall rules',
      'Basic reporting',
    ],
    notIncluded: ['VPN server', 'IDS/IPS', 'API access'],
    cta: 'Upgrade',
    popular: false,
  },
  {
    id: 'homeplus',
    name: 'Home+',
    price: 24,
    period: 'month',
    description: 'Complete home security suite',
    features: [
      'Everything in Home',
      'Advanced web filtering (custom categories)',
      'Malware & phishing protection',
      'WireGuard VPN server (5 peers)',
      'Up to 100 devices',
      '30-day log retention',
      'Priority email support',
      'Advanced reporting & analytics',
      'Parental controls',
      'Device fingerprinting',
    ],
    notIncluded: ['IDS/IPS', 'API access', 'Multi-site'],
    cta: 'Upgrade',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 60,
    period: 'month',
    description: 'Professional-grade network security',
    features: [
      'Everything in Home+',
      'Intrusion Detection System (IDS)',
      'Intrusion Prevention System (IPS)',
      'Application control & DPI',
      'QoS traffic shaping',
      'WireGuard VPN (unlimited peers)',
      'Unlimited devices',
      'Multi-site management (up to 3)',
      '90-day log retention',
      'RESTful API access',
      'Phone support',
      'Threat intelligence feeds',
    ],
    notIncluded: [],
    cta: 'Upgrade',
    popular: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 120,
    period: 'month',
    description: 'Enterprise features for SMB',
    features: [
      'Everything in Pro',
      'Active Directory / LDAP integration',
      'RADIUS authentication',
      'High Availability (HA) clustering',
      'Custom threat feeds',
      'Compliance reporting (SOC2, HIPAA)',
      'Unlimited sites',
      '1-year log retention',
      'Dedicated account manager',
      '99.9% SLA guarantee',
      'SSO / SAML support',
      'Audit logging',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

const routers = [
  { id: 'br100', name: 'NGFW.sh 100', price: 149, image: '📦', specs: 'Dual-core 1GHz, 512MB RAM, 4x GbE', plans: ['home', 'homeplus'] },
  { id: 'br200', name: 'NGFW.sh 200', price: 249, image: '📦', specs: 'Quad-core 1.5GHz, 1GB RAM, 5x GbE, WiFi 6', plans: ['home', 'homeplus', 'pro'] },
  { id: 'br400', name: 'NGFW.sh 400 Pro', price: 449, image: '📦', specs: 'Quad-core 2GHz, 4GB RAM, 8x 2.5GbE, WiFi 6E, 10G SFP+', plans: ['pro', 'business'] },
];

// Components
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }) => {
  const colors = { default: 'bg-zinc-700 text-zinc-300', success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800', warning: 'bg-amber-900/50 text-amber-400 border border-amber-800', danger: 'bg-red-900/50 text-red-400 border border-red-800', info: 'bg-blue-900/50 text-blue-400 border border-blue-800', purple: 'bg-purple-900/50 text-purple-400 border border-purple-800' };
  return <span className={cn('px-2 py-0.5 text-xs font-mono rounded', colors[variant])}>{children}</span>;
};

const Stat = ({ label, value, sub, trend, icon }: { label: string; value: string | number; sub?: string; trend?: 'up' | 'down'; icon?: React.ReactNode }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      {icon && <span className="text-zinc-600">{icon}</span>}
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-mono text-zinc-100">{value}</span>
      {trend && (trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />)}
    </div>
    {sub && <span className="text-xs text-zinc-500 font-mono">{sub}</span>}
  </div>
);

const GaugeComponent = ({ value, max = 100, label, color = 'emerald' }: { value: number; max?: number; label: string; color?: string }) => {
  const pct = (value / max) * 100;
  const colors: Record<string, string> = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-blue-500' };
  const barColor = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : colors[color];
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span className="text-zinc-500">{label}</span><span className="font-mono text-zinc-300">{value}%</span></div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} /></div>
    </div>
  );
};

const MiniChart = ({ data, color = 'emerald', height = 40 }: { data: { time: number; value: number }[]; color?: string; height?: number }) => {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d.value - min) / range) * 100}`).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;
  const colors: Record<string, { stroke: string; fill: string }> = {
    emerald: { stroke: '#10b981', fill: 'url(#emeraldGradient)' },
    blue: { stroke: '#3b82f6', fill: 'url(#blueGradient)' },
    amber: { stroke: '#f59e0b', fill: 'url(#amberGradient)' },
    red: { stroke: '#ef4444', fill: 'url(#redGradient)' },
  };
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.3" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
        <linearGradient id="amberGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></linearGradient>
        <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
      </defs>
      <polygon points={areaPoints} fill={colors[color].fill} />
      <polyline points={points} fill="none" stroke={colors[color].stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const Table = ({ columns, data, onRowClick }: { columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[]; data: any[]; onRowClick?: (row: any) => void }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">{columns.map(c => <th key={c.key} className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">{c.label}</th>)}</tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {data.map((row, i) => (
          <tr key={i} className={cn('hover:bg-zinc-800/30 transition-colors', onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(row)}>
            {columns.map(c => <td key={c.key} className="px-3 py-2 font-mono text-zinc-300 whitespace-nowrap">{c.render ? c.render(row[c.key], row) : row[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Card = ({ title, children, actions, className }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) => (
  <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg', className)}>
    {(title || actions) && <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800"><h3 className="text-sm font-medium text-zinc-200">{title}</h3>{actions}</div>}
    <div className="p-4">{children}</div>
  </div>
);

const Button = ({ children, variant = 'default', size = 'default', className, ...props }: { children: React.ReactNode; variant?: 'default' | 'primary' | 'danger' | 'ghost'; size?: 'sm' | 'default' | 'lg'; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = { default: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700', primary: 'bg-emerald-600 hover:bg-emerald-500 text-white', danger: 'bg-red-600 hover:bg-red-500 text-white', ghost: 'hover:bg-zinc-800 text-zinc-400' };
  const sizes = { sm: 'px-2 py-1 text-xs', default: 'px-3 py-1.5 text-sm', lg: 'px-6 py-3 text-base' };
  return <button className={cn('rounded font-medium transition-colors inline-flex items-center justify-center gap-1.5', variants[variant], sizes[size], className)} {...props}>{children}</button>;
};

const Input = ({ label, className, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={className}>{label && <label className="block text-xs text-zinc-500 mb-1">{label}</label>}<input className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500" {...props} /></div>
);

const Select = ({ label, options, className, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className={className}>{label && <label className="block text-xs text-zinc-500 mb-1">{label}</label>}<select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500" {...props}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
);

const Toggle = ({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <button onClick={() => onChange(!enabled)} className="flex items-center gap-2">
    <div className={cn('w-8 h-4 rounded-full transition-colors relative', enabled ? 'bg-emerald-600' : 'bg-zinc-700')}>
      <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform', enabled ? 'translate-x-4' : 'translate-x-0.5')} />
    </div>
    {label && <span className="text-sm text-zinc-400">{label}</span>}
  </button>
);

// Auth Pages
const LoginPage = ({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleWorkOSLogin = () => {
    const clientId = 'client_01KA05Y23RP9FKCAE0HS19D6RK';
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `https://api.workos.com/sso/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&provider=authkit`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Router className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">NGFW.sh</h1>
          <p className="text-zinc-500 mt-1">Next-generation firewall management</p>
        </div>

        <Card>
          <div className="space-y-4">
            <button
              onClick={handleWorkOSLogin}
              className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.15 8.4h-4.3v1.6h4.2c-.2 2.2-2 3.8-4.2 3.8-2.4 0-4.3-1.9-4.3-4.3s1.9-4.3 4.3-4.3c1.1 0 2.1.4 2.9 1.1l1.2-1.2C15.7 4.1 14 3.4 12 3.4 8.3 3.4 5.3 6.4 5.3 10s3 6.6 6.7 6.6c3.9 0 6.5-2.7 6.5-6.5 0-.6 0-1-.1-1.4l-1.25-.3z"/></svg>
              Continue with Google
            </button>
            
            <button
              onClick={handleWorkOSLogin}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Continue with GitHub
            </button>
            
            <button
              onClick={handleWorkOSLogin}
              className="w-full bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Building className="w-5 h-5" />
              Continue with SSO
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-zinc-500">or continue with email</span></div>
            </div>

            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />

            <Button variant="primary" className="w-full" size="lg" onClick={onLogin}>Sign In</Button>

            <p className="text-center text-sm text-zinc-500">
              Don't have an account? <button onClick={onSignup} className="text-emerald-500 hover:text-emerald-400">Sign up</button>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-zinc-600 mt-6">
          By continuing, you agree to NGFW.sh's <a href="#" className="text-zinc-500 hover:text-zinc-400">Terms of Service</a> and <a href="#" className="text-zinc-500 hover:text-zinc-400">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

const SignupPage = ({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleWorkOSSignup = () => {
    const clientId = 'client_01KA05Y23RP9FKCAE0HS19D6RK';
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `https://api.workos.com/sso/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&provider=authkit&screen_hint=sign-up`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Router className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-zinc-500 mt-1">Start securing your network in minutes</p>
        </div>

        <Card>
          <div className="space-y-4">
            <button
              onClick={handleWorkOSSignup}
              className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.15 8.4h-4.3v1.6h4.2c-.2 2.2-2 3.8-4.2 3.8-2.4 0-4.3-1.9-4.3-4.3s1.9-4.3 4.3-4.3c1.1 0 2.1.4 2.9 1.1l1.2-1.2C15.7 4.1 14 3.4 12 3.4 8.3 3.4 5.3 6.4 5.3 10s3 6.6 6.7 6.6c3.9 0 6.5-2.7 6.5-6.5 0-.6 0-1-.1-1.4l-1.25-.3z"/></svg>
              Sign up with Google
            </button>
            
            <button
              onClick={handleWorkOSSignup}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Sign up with GitHub
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-zinc-500">or sign up with email</span></div>
            </div>

            <Input label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />

            <Button variant="primary" className="w-full" size="lg" onClick={onSignup}>Create Account</Button>

            <p className="text-center text-sm text-zinc-500">
              Already have an account? <button onClick={onLogin} className="text-emerald-500 hover:text-emerald-400">Sign in</button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Profile Page
const ProfilePage = () => {
  const user = { name: 'Daniel Chen', email: 'daniel@example.com', company: 'Acme Corp', plan: 'Home+', avatar: null, createdAt: '2024-01-15', devices: 3 };
  
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{user.name}</h2>
          <p className="text-zinc-400">{user.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="purple"><Crown className="w-3 h-3 inline mr-1" />{user.plan}</Badge>
            <span className="text-xs text-zinc-500">Member since {user.createdAt}</span>
          </div>
        </div>
        <Button><Edit className="w-4 h-4" />Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Personal Information">
          <div className="space-y-4">
            <Input label="Full Name" defaultValue={user.name} />
            <Input label="Email Address" type="email" defaultValue={user.email} />
            <Input label="Company (optional)" defaultValue={user.company} />
            <Input label="Phone (optional)" placeholder="+1 (555) 000-0000" />
            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <Button variant="primary">Save Changes</Button>
            </div>
          </div>
        </Card>

        <Card title="Security">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <div>
                <p className="text-sm text-zinc-200">Password</p>
                <p className="text-xs text-zinc-500">Last changed 30 days ago</p>
              </div>
              <Button size="sm">Change</Button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <div>
                <p className="text-sm text-zinc-200">Two-Factor Authentication</p>
                <p className="text-xs text-zinc-500">Add an extra layer of security</p>
              </div>
              <Badge variant="warning">Not Enabled</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-zinc-200">Active Sessions</p>
                <p className="text-xs text-zinc-500">3 devices currently signed in</p>
              </div>
              <Button size="sm" variant="ghost">Manage</Button>
            </div>
          </div>
        </Card>

        <Card title="Connected Accounts">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </div>
                <div><p className="text-sm text-zinc-200">GitHub</p><p className="text-xs text-zinc-500">Connected as @danielchen</p></div>
              </div>
              <Button size="sm" variant="ghost">Disconnect</Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.15 8.4h-4.3v1.6h4.2c-.2 2.2-2 3.8-4.2 3.8-2.4 0-4.3-1.9-4.3-4.3s1.9-4.3 4.3-4.3c1.1 0 2.1.4 2.9 1.1l1.2-1.2C15.7 4.1 14 3.4 12 3.4 8.3 3.4 5.3 6.4 5.3 10s3 6.6 6.7 6.6c3.9 0 6.5-2.7 6.5-6.5 0-.6 0-1-.1-1.4l-1.25-.3z"/></svg>
                </div>
                <div><p className="text-sm text-zinc-200">Google</p><p className="text-xs text-zinc-500">daniel@example.com</p></div>
              </div>
              <Button size="sm" variant="ghost">Disconnect</Button>
            </div>
          </div>
        </Card>

        <Card title="Notification Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-zinc-300">Security Alerts</span><Toggle enabled={true} onChange={() => {}} /></div>
            <div className="flex items-center justify-between"><span className="text-sm text-zinc-300">Threat Reports (Weekly)</span><Toggle enabled={true} onChange={() => {}} /></div>
            <div className="flex items-center justify-between"><span className="text-sm text-zinc-300">Product Updates</span><Toggle enabled={false} onChange={() => {}} /></div>
            <div className="flex items-center justify-between"><span className="text-sm text-zinc-300">Marketing Emails</span><Toggle enabled={false} onChange={() => {}} /></div>
          </div>
        </Card>
      </div>

      <Card title="Danger Zone" className="border-red-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-200">Delete Account</p>
            <p className="text-xs text-zinc-500">Permanently delete your account and all associated data</p>
          </div>
          <Button variant="danger">Delete Account</Button>
        </div>
      </Card>
    </div>
  );
};

// Billing Page
const BillingPage = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState('homeplus');
  const currentPlan = 'homeplus';

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Plans & Billing</h2>
          <p className="text-zinc-400">Manage your subscription and payment methods</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
          <button onClick={() => setBillingCycle('monthly')} className={cn('px-4 py-2 text-sm rounded-md transition-colors', billingCycle === 'monthly' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}>Monthly</button>
          <button onClick={() => setBillingCycle('annual')} className={cn('px-4 py-2 text-sm rounded-md transition-colors', billingCycle === 'annual' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}>
            Annual <Badge variant="success">Save 20%</Badge>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {billingPlans.map(plan => (
          <div key={plan.id} className={cn('bg-zinc-900 border rounded-xl p-5 relative transition-all', plan.popular ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-zinc-800', plan.id === currentPlan && 'ring-2 ring-emerald-500')}>
            {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="success"><Sparkles className="w-3 h-3 inline mr-1" />Most Popular</Badge></div>}
            {plan.id === currentPlan && <div className="absolute -top-3 right-4"><Badge variant="purple">Current</Badge></div>}
            
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold text-white">${billingCycle === 'annual' ? Math.floor(plan.price * 0.8) : plan.price}</span>
              {plan.price > 0 && <span className="text-zinc-500">/{billingCycle === 'annual' ? 'mo' : 'month'}</span>}
              {billingCycle === 'annual' && plan.price > 0 && <p className="text-xs text-zinc-500">billed annually</p>}
            </div>
            <p className="text-sm text-zinc-400 mb-4">{plan.description}</p>
            
            <Button variant={plan.id === currentPlan ? 'default' : plan.popular ? 'primary' : 'default'} className="w-full mb-4" disabled={plan.id === currentPlan}>
              {plan.id === currentPlan ? 'Current Plan' : plan.cta}
            </Button>

            <ul className="space-y-2">
              {plan.features.slice(0, 6).map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
              {plan.features.length > 6 && <li className="text-xs text-zinc-500">+{plan.features.length - 6} more features</li>}
            </ul>
            
            {plan.notIncluded.length > 0 && (
              <ul className="space-y-2 mt-3 pt-3 border-t border-zinc-800">
                {plan.notIncluded.slice(0, 3).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <X className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                    <span className="text-zinc-600">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Card title="Hardware Options" actions={<span className="text-xs text-zinc-500">One-time purchase with your plan</span>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routers.map(router => (
            <div key={router.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer">
              <div className="text-4xl mb-3">{router.image}</div>
              <h4 className="font-semibold text-white">{router.name}</h4>
              <p className="text-2xl font-bold text-white mt-1">${router.price}</p>
              <p className="text-xs text-zinc-500 mt-2">{router.specs}</p>
              <div className="flex gap-1 mt-3">
                {router.plans.map(p => <Badge key={p} variant="info">{p}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Payment Method">
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
              <div>
                <p className="text-sm text-zinc-200">•••• •••• •••• 4242</p>
                <p className="text-xs text-zinc-500">Expires 12/25</p>
              </div>
            </div>
            <Button size="sm" variant="ghost">Update</Button>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm"><Plus className="w-3 h-3" />Add Card</Button>
            <Button size="sm" variant="ghost">Add PayPal</Button>
          </div>
        </Card>

        <Card title="Billing History">
          <Table
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'description', label: 'Description' },
              { key: 'amount', label: 'Amount' },
              { key: 'status', label: 'Status', render: v => <Badge variant={v === 'Paid' ? 'success' : 'warning'}>{v}</Badge> },
              { key: 'invoice', label: '', render: () => <Button size="sm" variant="ghost"><Download className="w-3 h-3" /></Button> },
            ]}
            data={[
              { date: '2024-12-01', description: 'Home+ Plan', amount: '$24.00', status: 'Paid' },
              { date: '2024-11-01', description: 'Home+ Plan', amount: '$24.00', status: 'Paid' },
              { date: '2024-10-01', description: 'Home+ Plan', amount: '$24.00', status: 'Paid' },
            ]}
          />
        </Card>
      </div>

      <Card title="Usage This Period" className="bg-gradient-to-r from-zinc-900 to-zinc-900/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase">Devices</p>
            <p className="text-2xl font-bold text-white">34 <span className="text-sm font-normal text-zinc-500">/ 100</span></p>
            <div className="h-1.5 bg-zinc-800 rounded-full mt-2"><div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: '34%' }} /></div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">DNS Queries</p>
            <p className="text-2xl font-bold text-white">847K</p>
            <p className="text-xs text-zinc-500">Unlimited</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Threats Blocked</p>
            <p className="text-2xl font-bold text-emerald-400">2,341</p>
            <p className="text-xs text-zinc-500">This month</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">VPN Peers</p>
            <p className="text-2xl font-bold text-white">4 <span className="text-sm font-normal text-zinc-500">/ 5</span></p>
            <div className="h-1.5 bg-zinc-800 rounded-full mt-2"><div className="h-1.5 bg-blue-500 rounded-full" style={{ width: '80%' }} /></div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Dashboard with more graphs
const Dashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat label="WAN IP" value={systemStats.wanIp} sub="eth0 • DHCP" icon={<Globe className="w-4 h-4" />} />
      <Stat label="Active Connections" value={formatNumber(systemStats.connections)} sub="+23 last 5m" trend="up" icon={<Activity className="w-4 h-4" />} />
      <Stat label="LAN Clients" value={systemStats.lanClients} sub="18 WiFi • 16 Wired" icon={<Users className="w-4 h-4" />} />
      <Stat label="Uptime" value={systemStats.uptime} icon={<Clock className="w-4 h-4" />} />
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card title="System Health" className="lg:col-span-1">
        <div className="space-y-4">
          <GaugeComponent value={systemStats.cpu} label="CPU" />
          <GaugeComponent value={systemStats.memory} label="Memory" />
          <GaugeComponent value={systemStats.temp} max={90} label="Temperature" color="amber" />
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex justify-between text-xs"><span className="text-zinc-500">Load Average</span><span className="font-mono text-zinc-300">{systemStats.load.join(' / ')}</span></div>
          </div>
        </div>
      </Card>
      
      <Card title="Bandwidth (24h)" actions={<span className="text-xs text-zinc-500">12.4 GB total</span>} className="lg:col-span-3">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-emerald-400">↓ Download: 9.8 GB</span>
              <span className="text-blue-400">↑ Upload: 2.6 GB</span>
            </div>
            <span className="text-zinc-500">Peak: 847 Mbps</span>
          </div>
          <MiniChart data={bandwidthData} color="emerald" height={100} />
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Active Connections (24h)" className="lg:col-span-1">
        <MiniChart data={connectionsData} color="blue" height={80} />
        <div className="flex justify-between text-xs mt-2"><span className="text-zinc-500">Avg: 523</span><span className="text-zinc-500">Peak: 1,247</span></div>
      </Card>
      <Card title="DNS Queries (24h)" className="lg:col-span-1">
        <MiniChart data={dnsData} color="amber" height={80} />
        <div className="flex justify-between text-xs mt-2"><span className="text-zinc-500">Total: 48,293</span><span className="text-zinc-500">Blocked: 18.2%</span></div>
      </Card>
      <Card title="Threat Events (24h)" className="lg:col-span-1">
        <MiniChart data={threatData} color="red" height={80} />
        <div className="flex justify-between text-xs mt-2"><span className="text-zinc-500">Detected: 47</span><span className="text-zinc-500">Blocked: 100%</span></div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Top Clients by Traffic" actions={<Button size="sm" variant="ghost">View All</Button>}>
        <Table
          columns={[
            { key: 'hostname', label: 'Device' },
            { key: 'ip', label: 'IP' },
            { key: 'download', label: '↓ Down', render: v => formatBytes(v) },
            { key: 'upload', label: '↑ Up', render: v => formatBytes(v) },
            { key: 'connections', label: 'Conn' },
          ]}
          data={topClients}
        />
      </Card>
      
      <Card title="Recent Threat Events" actions={<Button size="sm" variant="ghost">View All</Button>}>
        <Table
          columns={[
            { key: 'time', label: 'Time' },
            { key: 'type', label: 'Type', render: v => <span className="text-red-400">{v}</span> },
            { key: 'src', label: 'Source' },
            { key: 'severity', label: 'Severity', render: v => <Badge variant={v === 'critical' ? 'danger' : v === 'high' ? 'warning' : 'info'}>{v}</Badge> },
            { key: 'blocked', label: 'Status', render: v => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Blocked' : 'Allowed'}</Badge> },
          ]}
          data={threatEvents}
        />
      </Card>
    </div>

    <Card title="Interface Status">
      <Table
        columns={[
          { key: 'name', label: 'Interface', render: (v, r) => <div className="flex items-center gap-2"><span className={cn('w-2 h-2 rounded-full', r.status === 'up' ? 'bg-emerald-500' : 'bg-red-500')} /><span>{v}</span></div> },
          { key: 'type', label: 'Type', render: v => <Badge>{v}</Badge> },
          { key: 'ip', label: 'IP Address' },
          { key: 'mac', label: 'MAC' },
          { key: 'rx', label: 'RX Total', render: v => formatBytes(v) },
          { key: 'tx', label: 'TX Total', render: v => formatBytes(v) },
          { key: 'rxRate', label: 'RX Rate', render: v => <span className="text-emerald-400">{formatRate(v)}</span> },
          { key: 'txRate', label: 'TX Rate', render: v => <span className="text-blue-400">{formatRate(v)}</span> },
        ]}
        data={interfaces}
      />
    </Card>
  </div>
);

// Traffic Logs with filtering
const TrafficPage = () => {
  const [filter, setFilter] = useState({ action: 'all', proto: 'all', search: '' });
  const [liveMode, setLiveMode] = useState(true);
  
  const filteredLogs = useMemo(() => {
    return trafficLogs.filter(log => {
      if (filter.action !== 'all' && log.action.toLowerCase() !== filter.action) return false;
      if (filter.proto !== 'all' && log.proto.toLowerCase() !== filter.proto) return false;
      if (filter.search && !`${log.src} ${log.dst} ${log.app}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} options={[{ value: 'all', label: 'All Actions' }, { value: 'accept', label: 'Accepted' }, { value: 'drop', label: 'Dropped' }]} className="w-36" />
          <Select value={filter.proto} onChange={e => setFilter(f => ({ ...f, proto: e.target.value }))} options={[{ value: 'all', label: 'All Protocols' }, { value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }, { value: 'icmp', label: 'ICMP' }, { value: 'quic', label: 'QUIC' }]} className="w-36" />
          <Input placeholder="Search IP, app..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} className="w-48" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={liveMode ? 'primary' : 'default'} onClick={() => setLiveMode(!liveMode)}>{liveMode ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}{liveMode ? 'Pause' : 'Live'}</Button>
          <Button size="sm"><Download className="w-3 h-3" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Connections" value={formatNumber(filteredLogs.length)} icon={<Activity className="w-4 h-4" />} />
        <Stat label="Accepted" value={formatNumber(filteredLogs.filter(l => l.action === 'ACCEPT').length)} icon={<Check className="w-4 h-4" />} />
        <Stat label="Dropped" value={formatNumber(filteredLogs.filter(l => l.action === 'DROP').length)} icon={<X className="w-4 h-4" />} />
        <Stat label="Threats Detected" value={formatNumber(filteredLogs.filter(l => l.threat).length)} icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead><tr className="border-b border-zinc-800 text-left">{['Time', 'Source', 'S.Port', 'Destination', 'D.Port', 'Proto', 'Flags', 'Bytes', 'Pkts', 'App', 'Geo', 'Threat', 'Action'].map(h => <th key={h} className="px-2 py-2 text-zinc-500 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredLogs.slice(0, 50).map((log, i) => (
                <tr key={i} className="hover:bg-zinc-800/30 cursor-pointer">
                  <td className="px-2 py-1.5 text-zinc-500">{log.time}</td>
                  <td className="px-2 py-1.5 text-zinc-300">{log.src}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{log.srcPort}</td>
                  <td className="px-2 py-1.5 text-zinc-300">{log.dst}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{log.dstPort}</td>
                  <td className="px-2 py-1.5"><Badge>{log.proto}</Badge></td>
                  <td className="px-2 py-1.5 text-zinc-500">{log.flags}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{formatNumber(log.bytes)}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{log.packets}</td>
                  <td className="px-2 py-1.5 text-blue-400">{log.app}</td>
                  <td className="px-2 py-1.5"><Badge variant="info">{log.geo}</Badge></td>
                  <td className="px-2 py-1.5">{log.threat && <Badge variant="danger">{log.threat}</Badge>}</td>
                  <td className="px-2 py-1.5"><Badge variant={log.action === 'ACCEPT' ? 'success' : 'danger'}>{log.action}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-4">
          <span className="text-xs text-zinc-500">Showing {Math.min(50, filteredLogs.length)} of {filteredLogs.length} entries</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled><ChevronLeft className="w-3 h-3" />Previous</Button>
            <Button size="sm" variant="ghost">Next<ChevronRight className="w-3 h-3" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// DNS Filter with more data
const DNSFilterPage = () => {
  const [filter, setFilter] = useState({ status: 'all', search: '' });
  
  const filteredQueries = useMemo(() => {
    return dnsQueries.filter(q => {
      if (filter.status !== 'all' && q.status !== filter.status) return false;
      if (filter.search && !q.query.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [filter]);

  const stats = useMemo(() => ({
    total: dnsQueries.length,
    blocked: dnsQueries.filter(q => q.status === 'blocked').length,
    cached: dnsQueries.filter(q => q.cached).length,
  }), []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Queries (24h)" value={formatNumber(stats.total * 150)} icon={<Database className="w-4 h-4" />} />
        <Stat label="Blocked" value={formatNumber(stats.blocked * 150)} sub={`${((stats.blocked / stats.total) * 100).toFixed(1)}%`} icon={<ShieldOff className="w-4 h-4" />} />
        <Stat label="Cached" value={formatNumber(stats.cached * 150)} sub={`${((stats.cached / stats.total) * 100).toFixed(1)}%`} icon={<Zap className="w-4 h-4" />} />
        <Stat label="Avg Latency" value="12ms" icon={<Clock className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Blocklists" className="lg:col-span-2" actions={<Button size="sm"><Plus className="w-3 h-3" />Add List</Button>}>
          <Table
            columns={[
              { key: 'enabled', label: '', render: v => <Toggle enabled={v} onChange={() => {}} /> },
              { key: 'name', label: 'Name' },
              { key: 'entries', label: 'Entries', render: v => formatNumber(v) },
              { key: 'updated', label: 'Updated' },
              { key: 'blocked', label: 'Blocked Today', render: v => <span className="text-red-400">{formatNumber(v)}</span> },
            ]}
            data={[
              { enabled: true, name: 'AdGuard DNS Filter', entries: 48293, updated: '2h ago', blocked: 1247 },
              { enabled: true, name: 'Steven Black Unified', entries: 82341, updated: '6h ago', blocked: 2341 },
              { enabled: true, name: 'OISD Big', entries: 184729, updated: '12h ago', blocked: 847 },
              { enabled: true, name: 'Phishing Army', entries: 12847, updated: '1h ago', blocked: 23 },
              { enabled: false, name: 'Energized Ultimate', entries: 723849, updated: '1d ago', blocked: 0 },
            ]}
          />
        </Card>

        <Card title="Top Blocked Domains">
          <div className="space-y-3">
            {[
              { domain: 'ads.doubleclick.net', count: 2847 },
              { domain: 'telemetry.microsoft.com', count: 1923 },
              { domain: 'pixel.facebook.com', count: 1247 },
              { domain: 'analytics.google.com', count: 984 },
              { domain: 'track.hubspot.com', count: 847 },
              { domain: 'api.segment.io', count: 623 },
              { domain: 'ads.yahoo.com', count: 412 },
              { domain: 'graph.facebook.com', count: 384 },
            ].map((d, i) => (
              <div key={d.domain} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-xs w-4">{i + 1}</span>
                  <span className="font-mono text-xs text-zinc-400 truncate">{d.domain}</span>
                </div>
                <span className="text-xs text-red-400">{formatNumber(d.count)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Query Log" actions={
        <div className="flex gap-2">
          <Input placeholder="Search domain..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} className="w-48" />
          <Select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} options={[{ value: 'all', label: 'All' }, { value: 'blocked', label: 'Blocked' }, { value: 'resolved', label: 'Resolved' }]} className="w-32" />
        </div>
      }>
        <Table
          columns={[
            { key: 'time', label: 'Time' },
            { key: 'client', label: 'Client' },
            { key: 'query', label: 'Domain', render: v => <span className="text-blue-400">{v}</span> },
            { key: 'type', label: 'Type' },
            { key: 'answer', label: 'Answer' },
            { key: 'latency', label: 'Latency', render: v => `${v}ms` },
            { key: 'cached', label: 'Cached', render: v => v ? <Badge variant="info">HIT</Badge> : <span className="text-zinc-600">—</span> },
            { key: 'status', label: 'Status', render: v => <Badge variant={v === 'blocked' ? 'danger' : 'success'}>{v}</Badge> },
          ]}
          data={filteredQueries.slice(0, 20)}
        />
      </Card>
    </div>
  );
};

// WAN Page
const WANPage = () => {
  const [connType, setConnType] = useState('dhcp');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Connection Status" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /><span className="text-lg text-zinc-200">Connected</span></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">IP Address</span><span className="font-mono text-zinc-200">203.0.113.42</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Gateway</span><span className="font-mono text-zinc-200">203.0.113.1</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">DNS Servers</span><span className="font-mono text-zinc-200">1.1.1.1, 8.8.8.8</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Subnet Mask</span><span className="font-mono text-zinc-200">255.255.255.0</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Lease Time</span><span className="font-mono text-zinc-200">23h 47m remaining</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Uptime</span><span className="font-mono text-zinc-200">14d 7h 23m</span></div>
            </div>
            <div className="flex gap-2 pt-2"><Button size="sm"><RefreshCw className="w-3 h-3" />Renew Lease</Button><Button size="sm" variant="danger"><Power className="w-3 h-3" />Release</Button></div>
          </div>
        </Card>

        <Card title="WAN Configuration" className="lg:col-span-2">
          <div className="space-y-4">
            <Select label="Connection Type" value={connType} onChange={e => setConnType(e.target.value)} options={[{ value: 'dhcp', label: 'DHCP (Automatic)' }, { value: 'static', label: 'Static IP' }, { value: 'pppoe', label: 'PPPoE' }]} />
            {connType === 'static' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="IP Address" placeholder="203.0.113.42" />
                <Input label="Subnet Mask" placeholder="255.255.255.0" />
                <Input label="Gateway" placeholder="203.0.113.1" />
                <Input label="DNS Server" placeholder="1.1.1.1" />
              </div>
            )}
            {connType === 'pppoe' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Username" placeholder="user@isp.com" />
                <Input label="Password" type="password" placeholder="••••••••" />
                <Input label="Service Name" placeholder="(optional)" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="MTU" placeholder="1500" defaultValue="1500" />
              <Input label="MAC Address Clone" placeholder="Leave blank for default" />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Toggle enabled={true} onChange={() => {}} label="Enable IPv6" />
              <Toggle enabled={false} onChange={() => {}} label="VLAN Tagging" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800"><Button variant="ghost">Reset</Button><Button variant="primary">Apply Changes</Button></div>
          </div>
        </Card>
      </div>

      <Card title="Dual-WAN Configuration">
        <div className="space-y-4">
          <div className="flex items-center gap-4"><Toggle enabled={false} onChange={() => {}} label="Enable Dual-WAN" /><Select options={[{ value: 'failover', label: 'Failover Mode' }, { value: 'loadbalance', label: 'Load Balance' }]} className="w-48" /></div>
          <Table
            columns={[
              { key: 'interface', label: 'Interface' },
              { key: 'status', label: 'Status', render: v => <Badge variant={v === 'Primary' ? 'success' : 'info'}>{v}</Badge> },
              { key: 'weight', label: 'Weight' },
              { key: 'failover', label: 'Failover Priority' },
            ]}
            data={[{ interface: 'eth0 (WAN1)', status: 'Primary', weight: '70%', failover: '1' }, { interface: 'eth2 (WAN2)', status: 'Standby', weight: '30%', failover: '2' }]}
          />
        </div>
      </Card>
    </div>
  );
};

// LAN Page
const LANPage = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Primary LAN (br0)">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="IP Address" defaultValue="192.168.1.1" />
            <Input label="Subnet Mask" defaultValue="255.255.255.0" />
          </div>
          <Toggle enabled={true} onChange={() => {}} label="Enable DHCP Server" />
          <Toggle enabled={false} onChange={() => {}} label="Enable IGMP Snooping" />
          <div className="flex justify-end pt-4 border-t border-zinc-800"><Button variant="primary">Apply</Button></div>
        </div>
      </Card>
      
      <Card title="Guest Network (br1)">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="IP Address" defaultValue="192.168.10.1" />
            <Input label="Subnet Mask" defaultValue="255.255.255.0" />
          </div>
          <Toggle enabled={true} onChange={() => {}} label="Client Isolation" />
          <Toggle enabled={true} onChange={() => {}} label="Block LAN Access" />
          <Input label="Bandwidth Limit (Mbps)" defaultValue="50" />
          <div className="flex justify-end pt-4 border-t border-zinc-800"><Button variant="primary">Apply</Button></div>
        </div>
      </Card>
    </div>

    <Card title="VLAN Configuration" actions={<Button size="sm"><Plus className="w-3 h-3" />Add VLAN</Button>}>
      <Table
        columns={[
          { key: 'id', label: 'VLAN ID' },
          { key: 'name', label: 'Name' },
          { key: 'subnet', label: 'Subnet' },
          { key: 'ports', label: 'Tagged Ports' },
          { key: 'enabled', label: 'Status', render: v => <Badge variant={v ? 'success' : 'default'}>{v ? 'Active' : 'Disabled'}</Badge> },
          { key: 'actions', label: '', render: () => <div className="flex gap-1"><Button size="sm" variant="ghost"><Edit className="w-3 h-3" /></Button><Button size="sm" variant="ghost"><Trash2 className="w-3 h-3" /></Button></div> },
        ]}
        data={[
          { id: 1, name: 'Default', subnet: '192.168.1.0/24', ports: 'eth1-4', enabled: true },
          { id: 10, name: 'IoT', subnet: '192.168.10.0/24', ports: 'eth3', enabled: true },
          { id: 20, name: 'Cameras', subnet: '192.168.20.0/24', ports: 'eth4', enabled: true },
          { id: 99, name: 'Management', subnet: '192.168.99.0/24', ports: 'eth1', enabled: true },
        ]}
      />
    </Card>
  </div>
);

// WiFi Page
const WiFiPage = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {wifiNetworks.map(net => (
        <Card key={net.ssid}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200">{net.ssid}</span>
              <Toggle enabled={net.enabled} onChange={() => {}} />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Band</span><span className="text-zinc-300">{net.band}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Channel</span><span className="text-zinc-300">{net.channel} ({net.width})</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Security</span><Badge variant="info">{net.security}</Badge></div>
              <div className="flex justify-between"><span className="text-zinc-500">Clients</span><span className="text-zinc-300">{net.clients}</span></div>
              {net.vlan && <div className="flex justify-between"><span className="text-zinc-500">VLAN</span><span className="text-zinc-300">{net.vlan}</span></div>}
            </div>
            <Button size="sm" variant="ghost" className="w-full"><Settings className="w-3 h-3" />Configure</Button>
          </div>
        </Card>
      ))}
    </div>

    <Card title="Radio Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-300">5GHz Radio (wlan0)</h4>
          <Select label="Channel" options={[{ value: 'auto', label: 'Auto' }, { value: '36', label: '36' }, { value: '40', label: '40' }, { value: '149', label: '149 (Current)' }, { value: '153', label: '153' }]} defaultValue="149" />
          <Select label="Channel Width" options={[{ value: '20', label: '20 MHz' }, { value: '40', label: '40 MHz' }, { value: '80', label: '80 MHz (Current)' }, { value: '160', label: '160 MHz' }]} defaultValue="80" />
          <Select label="TX Power" options={[{ value: 'auto', label: 'Auto' }, { value: '100', label: '100%' }, { value: '75', label: '75%' }, { value: '50', label: '50%' }]} defaultValue="auto" />
          <Toggle enabled={true} onChange={() => {}} label="Band Steering" />
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-300">2.4GHz Radio (wlan1)</h4>
          <Select label="Channel" options={[{ value: 'auto', label: 'Auto' }, { value: '1', label: '1' }, { value: '6', label: '6 (Current)' }, { value: '11', label: '11' }]} defaultValue="6" />
          <Select label="Channel Width" options={[{ value: '20', label: '20 MHz' }, { value: '40', label: '40 MHz (Current)' }]} defaultValue="40" />
          <Select label="TX Power" options={[{ value: 'auto', label: 'Auto' }, { value: '100', label: '100%' }, { value: '75', label: '75%' }, { value: '50', label: '50%' }]} defaultValue="auto" />
          <Toggle enabled={false} onChange={() => {}} label="Airtime Fairness" />
        </div>
      </div>
      <div className="flex justify-end pt-4 mt-4 border-t border-zinc-800"><Button variant="primary">Apply Radio Settings</Button></div>
    </Card>
  </div>
);

// DHCP Page
const DHCPPage = () => (
  <div className="space-y-6">
    <Card title="DHCP Server Configuration">
      <div className="space-y-4">
        <Toggle enabled={true} onChange={() => {}} label="Enable DHCP Server" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Start IP" defaultValue="192.168.1.100" />
          <Input label="End IP" defaultValue="192.168.1.254" />
          <Input label="Lease Time" defaultValue="86400" />
          <Input label="Domain" defaultValue="lan.local" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Primary DNS" defaultValue="192.168.1.1" />
          <Input label="Secondary DNS" defaultValue="1.1.1.1" />
          <Input label="Gateway" defaultValue="192.168.1.1" />
          <Input label="NTP Server" defaultValue="pool.ntp.org" />
        </div>
        <div className="flex justify-end pt-4 border-t border-zinc-800"><Button variant="primary">Apply</Button></div>
      </div>
    </Card>

    <Card title="Active Leases" actions={<div className="flex gap-2"><Input placeholder="Filter..." className="w-48" /><Button size="sm"><RefreshCw className="w-3 h-3" />Refresh</Button></div>}>
      <Table
        columns={[
          { key: 'ip', label: 'IP Address' },
          { key: 'mac', label: 'MAC Address' },
          { key: 'hostname', label: 'Hostname' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'expires', label: 'Expires', render: (v, r) => r.static ? <Badge variant="info">Static</Badge> : v },
          { key: 'online', label: 'Status', render: v => <Badge variant={v ? 'success' : 'default'}>{v ? 'Online' : 'Offline'}</Badge> },
          { key: 'actions', label: '', render: (_, r) => <div className="flex gap-1"><Button size="sm" variant="ghost" title="Make Static"><Lock className="w-3 h-3" /></Button><Button size="sm" variant="ghost" title="Wake"><Power className="w-3 h-3" /></Button></div> },
        ]}
        data={dhcpLeases}
      />
    </Card>

    <Card title="Static Reservations" actions={<Button size="sm"><Plus className="w-3 h-3" />Add Reservation</Button>}>
      <Table
        columns={[
          { key: 'ip', label: 'IP Address' },
          { key: 'mac', label: 'MAC Address' },
          { key: 'hostname', label: 'Hostname' },
          { key: 'actions', label: '', render: () => <div className="flex gap-1"><Button size="sm" variant="ghost"><Edit className="w-3 h-3" /></Button><Button size="sm" variant="ghost"><Trash2 className="w-3 h-3" /></Button></div> },
        ]}
        data={dhcpLeases.filter(l => l.static)}
      />
    </Card>
  </div>
);

// Firmware Page
const FirmwarePage = () => (
  <div className="space-y-6">
    <Card title="Current Firmware">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-zinc-500">Version</span><span className="font-mono text-zinc-200">v2.4.1-stable</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-500">Build Date</span><span className="font-mono text-zinc-200">2024-12-15 14:23:47 UTC</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-500">Kernel</span><span className="font-mono text-zinc-200">6.1.72-edge</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-500">Architecture</span><span className="font-mono text-zinc-200">aarch64 (ARM Cortex-A53)</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-500">Boot Slot</span><Badge variant="success">A (Active)</Badge></div>
        </div>
        <div className="space-y-3">
          <div className="bg-zinc-800/50 rounded p-4">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-400">System Up to Date</span></div>
            <p className="text-xs text-zinc-500">Last checked: 2 hours ago</p>
          </div>
          <div className="flex gap-2"><Button><RefreshCw className="w-3 h-3" />Check for Updates</Button><Button variant="ghost"><Download className="w-3 h-3" />Download Offline</Button></div>
        </div>
      </div>
    </Card>

    <Card title="Boot Slots">
      <Table
        columns={[
          { key: 'slot', label: 'Slot' },
          { key: 'version', label: 'Version' },
          { key: 'date', label: 'Installed' },
          { key: 'status', label: 'Status', render: v => <Badge variant={v === 'Active' ? 'success' : 'default'}>{v}</Badge> },
          { key: 'actions', label: '', render: (_, r) => r.status !== 'Active' && <Button size="sm">Boot This Slot</Button> },
        ]}
        data={[
          { slot: 'A', version: 'v2.4.1-stable', date: '2024-12-15', status: 'Active' },
          { slot: 'B', version: 'v2.4.0-stable', date: '2024-11-28', status: 'Standby' },
        ]}
      />
    </Card>

    <Card title="Manual Upload">
      <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center">
        <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400 mb-2">Drag and drop firmware image or click to browse</p>
        <p className="text-xs text-zinc-600">Supported formats: .bin, .img, .tar.gz (GPG signed)</p>
        <Button variant="ghost" className="mt-4">Browse Files</Button>
      </div>
    </Card>
  </div>
);

// Backup Page
const BackupPage = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Export Configuration">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Download a complete backup of your router configuration.</p>
          <div className="space-y-2">
            <Toggle enabled={true} onChange={() => {}} label="Include WiFi passwords" />
            <Toggle enabled={true} onChange={() => {}} label="Include VPN keys" />
            <Toggle enabled={false} onChange={() => {}} label="Encrypt backup file" />
          </div>
          <Input label="Encryption Password" type="password" placeholder="Enter password if encrypting" disabled />
          <Button variant="primary"><Download className="w-4 h-4" />Export Configuration</Button>
        </div>
      </Card>

      <Card title="Restore Configuration">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center">
            <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Drop config file or click to browse</p>
          </div>
          <Input label="Decryption Password" type="password" placeholder="If backup is encrypted" />
          <Button variant="danger"><Upload className="w-4 h-4" />Restore Configuration</Button>
        </div>
      </Card>
    </div>

    <Card title="Saved Backups">
      <Table
        columns={[
          { key: 'name', label: 'Filename' },
          { key: 'date', label: 'Created' },
          { key: 'size', label: 'Size' },
          { key: 'encrypted', label: 'Encrypted', render: v => v ? <Lock className="w-4 h-4 text-emerald-500" /> : <span className="text-zinc-600">—</span> },
          { key: 'actions', label: '', render: () => <div className="flex gap-1"><Button size="sm" variant="ghost"><Download className="w-3 h-3" /></Button><Button size="sm" variant="ghost"><Trash2 className="w-3 h-3" /></Button></div> },
        ]}
        data={[
          { name: 'config-2024-12-20.json', date: '2024-12-20 14:30', size: '24 KB', encrypted: false },
          { name: 'config-2024-12-15.json.enc', date: '2024-12-15 09:15', size: '28 KB', encrypted: true },
          { name: 'config-2024-12-01.json', date: '2024-12-01 18:45', size: '22 KB', encrypted: false },
        ]}
      />
    </Card>

    <Card title="Factory Reset">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-zinc-300">Reset all settings to factory defaults</p><p className="text-xs text-zinc-500">This action cannot be undone. All configuration will be lost.</p></div>
        <Button variant="danger"><AlertTriangle className="w-4 h-4" />Factory Reset</Button>
      </div>
    </Card>
  </div>
);

// Hardware Page
const HardwarePage = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="CPU Usage" value={`${systemStats.cpu}%`} icon={<Cpu className="w-4 h-4" />} />
      <Stat label="Memory" value={`${systemStats.memory}%`} sub="1.64 GB / 4 GB" icon={<MemoryStick className="w-4 h-4" />} />
      <Stat label="Temperature" value={`${systemStats.temp}°C`} icon={<Thermometer className="w-4 h-4" />} />
      <Stat label="Load Average" value={systemStats.load[0].toFixed(2)} sub={systemStats.load.join(' / ')} />
    </div>

    <Card title="System Information">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        {[
          ['Model', 'NGFW.sh 200'],
          ['CPU', 'MediaTek MT7621AT (880 MHz, 2 cores)'],
          ['Memory', '4 GB DDR3'],
          ['Storage', '128 MB NOR + 8 GB eMMC'],
          ['Switch Chip', 'MT7530 (5-port GbE)'],
          ['WiFi 5GHz', 'MT7915 (802.11ax 4x4:4)'],
          ['WiFi 2.4GHz', 'MT7915 (802.11ax 2x2:2)'],
          ['Serial', 'BR200-2847293847'],
        ].map(([k, v]) => <div key={k} className="flex justify-between py-2 border-b border-zinc-800"><span className="text-zinc-500">{k}</span><span className="font-mono text-zinc-300">{v}</span></div>)}
      </div>
    </Card>

    <Card title="Network Interfaces">
      <Table
        columns={[
          { key: 'name', label: 'Interface' },
          { key: 'mac', label: 'MAC Address' },
          { key: 'speed', label: 'Speed' },
          { key: 'duplex', label: 'Duplex' },
          { key: 'status', label: 'Link', render: v => <Badge variant={v === 'up' ? 'success' : 'default'}>{v}</Badge> },
        ]}
        data={[
          { name: 'eth0', mac: '00:1A:2B:3C:4D:5E', speed: '1000 Mbps', duplex: 'Full', status: 'up' },
          { name: 'eth1', mac: '00:1A:2B:3C:4D:5F', speed: '1000 Mbps', duplex: 'Full', status: 'up' },
          { name: 'eth2', mac: '00:1A:2B:3C:4D:60', speed: '—', duplex: '—', status: 'down' },
          { name: 'eth3', mac: '00:1A:2B:3C:4D:61', speed: '100 Mbps', duplex: 'Full', status: 'up' },
          { name: 'eth4', mac: '00:1A:2B:3C:4D:62', speed: '1000 Mbps', duplex: 'Full', status: 'up' },
        ]}
      />
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="LED Control">
        <div className="space-y-3">
          {['Power', 'WAN', 'LAN', 'WiFi 5G', 'WiFi 2G'].map(led => (
            <div key={led} className="flex items-center justify-between"><span className="text-sm text-zinc-300">{led}</span><Toggle enabled={true} onChange={() => {}} /></div>
          ))}
        </div>
      </Card>

      <Card title="System Actions">
        <div className="space-y-3">
          <Button className="w-full justify-center"><RefreshCw className="w-4 h-4" />Reboot System</Button>
          <Button variant="ghost" className="w-full justify-center"><Power className="w-4 h-4" />Shutdown</Button>
          <Button variant="ghost" className="w-full justify-center"><Terminal className="w-4 h-4" />Open Console</Button>
        </div>
      </Card>
    </div>
  </div>
);

// Grafana Page
const GrafanaPage = () => (
  <div className="space-y-6">
    <Card title="Grafana Configuration">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Input label="Grafana URL" defaultValue="https://grafana.local:3000" className="lg:col-span-2" />
        <Input label="API Token" type="password" defaultValue="••••••••••••••••" />
      </div>
      <div className="flex gap-2 mt-4"><Button variant="primary">Connect</Button><Button variant="ghost">Test Connection</Button></div>
    </Card>

    <Card title="Embedded Dashboard" className="min-h-[600px]">
      <div className="bg-zinc-950 rounded border border-zinc-800 h-[550px] flex items-center justify-center">
        <div className="text-center text-zinc-600">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Grafana dashboard will be embedded here</p>
          <p className="text-xs mt-1">Configure endpoint above to connect</p>
        </div>
      </div>
    </Card>
  </div>
);

// Loki Page
const LokiPage = () => (
  <div className="space-y-6">
    <Card title="Loki Configuration">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Input label="Loki URL" defaultValue="https://loki.local:3100" className="lg:col-span-2" />
        <Input label="Auth Header" type="password" placeholder="Bearer token (optional)" />
      </div>
      <div className="flex gap-2 mt-4"><Button variant="primary">Connect</Button><Button variant="ghost">Test Connection</Button></div>
    </Card>

    <Card title="Log Explorer">
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input placeholder='{job="firewall"} |= "DROP"' className="flex-1 font-mono" />
          <Select options={[{ value: '15m', label: 'Last 15 minutes' }, { value: '1h', label: 'Last 1 hour' }, { value: '6h', label: 'Last 6 hours' }, { value: '24h', label: 'Last 24 hours' }]} className="w-48" />
          <Button variant="primary"><Play className="w-4 h-4" />Run Query</Button>
        </div>
        <div className="flex gap-2">
          <Badge>job=firewall</Badge>
          <Badge>job=dhcp</Badge>
          <Badge>job=dns</Badge>
          <Badge>job=system</Badge>
        </div>
        <div className="bg-zinc-950 rounded border border-zinc-800 p-4 font-mono text-xs h-96 overflow-auto">
          <div className="space-y-1 text-zinc-400">
            <div><span className="text-zinc-600">2024-12-25T14:23:47.293Z</span> <span className="text-emerald-500">INFO</span> [firewall] ACCEPT src=192.168.1.105 dst=142.250.185.78:443 proto=TCP</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.982Z</span> <span className="text-red-500">WARN</span> [firewall] DROP src=203.0.113.89 dst=203.0.113.42:22 proto=TCP flags=SYN</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.847Z</span> <span className="text-emerald-500">INFO</span> [dns] RESOLVE client=192.168.1.108 query=github.com answer=140.82.112.3 latency=8ms</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.729Z</span> <span className="text-amber-500">BLOCK</span> [dns] BLOCKED client=192.168.1.112 query=ads.doubleclick.net reason=blocklist</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.612Z</span> <span className="text-red-500">WARN</span> [firewall] DROP src=45.33.32.156 dst=203.0.113.42:23 proto=TCP reason=telnet-blocked</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.501Z</span> <span className="text-emerald-500">INFO</span> [dhcp] LEASE ip=192.168.1.142 mac=66:77:88:99:AA:BB hostname=ring-doorbell</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.388Z</span> <span className="text-emerald-500">INFO</span> [firewall] ACCEPT src=192.168.1.125 dst=104.16.132.229:443 proto=TCP</div>
            <div><span className="text-zinc-600">2024-12-25T14:23:46.274Z</span> <span className="text-blue-500">DEBUG</span> [system] CPU=23% MEM=41% TEMP=52C LOAD=0.42</div>
          </div>
        </div>
      </div>
    </Card>
  </div>
);

// Firewall with more rules
const FirewallPage = () => {
  const [filter, setFilter] = useState({ zone: 'all', search: '' });
  
  const filteredRules = useMemo(() => {
    return firewallRules.filter(rule => {
      if (filter.zone !== 'all' && !rule.zone.toLowerCase().includes(filter.zone.toLowerCase())) return false;
      if (filter.search && !rule.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filter.zone} onChange={e => setFilter(f => ({ ...f, zone: e.target.value }))} options={[{ value: 'all', label: 'All Zones' }, { value: 'wan', label: 'WAN' }, { value: 'lan', label: 'LAN' }, { value: 'iot', label: 'IoT' }, { value: 'guest', label: 'Guest' }]} className="w-40" />
          <Input placeholder="Search rules..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} className="w-48" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost"><Upload className="w-3 h-3" />Import</Button>
          <Button size="sm" variant="ghost"><Download className="w-3 h-3" />Export</Button>
          <Button size="sm" variant="primary"><Plus className="w-3 h-3" />Add Rule</Button>
        </div>
      </div>

      <Card>
        <Table
          columns={[
            { key: 'id', label: '#', render: v => <span className="text-zinc-500">{v}</span> },
            { key: 'enabled', label: '', render: v => <span className={cn('w-2 h-2 rounded-full inline-block', v ? 'bg-emerald-500' : 'bg-zinc-600')} /> },
            { key: 'name', label: 'Name', render: v => <span className="text-zinc-200 font-medium">{v}</span> },
            { key: 'zone', label: 'Zone', render: v => <Badge variant="info">{v}</Badge> },
            { key: 'src', label: 'Source' },
            { key: 'dst', label: 'Destination' },
            { key: 'proto', label: 'Protocol', render: v => <span className="uppercase">{v}</span> },
            { key: 'port', label: 'Port' },
            { key: 'action', label: 'Action', render: v => <Badge variant={v === 'accept' ? 'success' : v === 'drop' ? 'danger' : 'warning'}>{v.toUpperCase()}</Badge> },
            { key: 'hits', label: 'Hits', render: v => formatNumber(v) },
            { key: 'schedule', label: 'Schedule', render: v => v !== 'Always' ? <Badge variant="purple">{v}</Badge> : <span className="text-zinc-600">—</span> },
          ]}
          data={filteredRules}
        />
      </Card>
    </div>
  );
};

// Navigation structure
const navGroups: NavGroup[] = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: <Monitor className="w-4 h-4" /> }] },
  { label: 'Network', items: [
    { id: 'wan', label: 'WAN', icon: <Globe className="w-4 h-4" /> },
    { id: 'lan', label: 'LAN', icon: <Network className="w-4 h-4" /> },
    { id: 'wifi', label: 'WiFi', icon: <Wifi className="w-4 h-4" /> },
    { id: 'dhcp', label: 'DHCP', icon: <Server className="w-4 h-4" /> },
    { id: 'routing', label: 'Routing', icon: <Route className="w-4 h-4" /> },
  ]},
  { label: 'Security', items: [
    { id: 'firewall', label: 'Firewall Rules', icon: <Shield className="w-4 h-4" /> },
    { id: 'nat', label: 'NAT / Port Forward', icon: <ArrowUpDown className="w-4 h-4" /> },
    { id: 'traffic', label: 'Traffic Logs', icon: <Activity className="w-4 h-4" /> },
    { id: 'dns-filter', label: 'DNS Filtering', icon: <Filter className="w-4 h-4" /> },
    { id: 'ips', label: 'Intrusion Prevention', icon: <ShieldAlert className="w-4 h-4" /> },
  ]},
  { label: 'Services', items: [
    { id: 'vpn-server', label: 'VPN Server', icon: <Lock className="w-4 h-4" /> },
    { id: 'vpn-client', label: 'VPN Client', icon: <Key className="w-4 h-4" /> },
    { id: 'qos', label: 'QoS', icon: <Zap className="w-4 h-4" /> },
    { id: 'ddns', label: 'Dynamic DNS', icon: <Globe className="w-4 h-4" /> },
  ]},
  { label: 'Monitoring', items: [
    { id: 'grafana', label: 'Grafana', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'loki', label: 'Loki Logs', icon: <FileText className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <PieChart className="w-4 h-4" /> },
  ]},
  { label: 'System', items: [
    { id: 'firmware', label: 'Firmware', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'backup', label: 'Backup / Restore', icon: <Database className="w-4 h-4" /> },
    { id: 'logs', label: 'System Logs', icon: <FileText className="w-4 h-4" /> },
    { id: 'hardware', label: 'Hardware', icon: <Cpu className="w-4 h-4" /> },
  ]},
  { label: 'Fleet', items: [
    { id: 'devices', label: 'Managed Devices', icon: <Layers className="w-4 h-4" /> },
  ]},
  { label: 'Account', items: [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  ]},
];

// Main App
export default function App() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(navGroups.map(g => g.label));

  const toggleGroup = (label: string) => setExpandedGroups(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);

  const handleLogin = () => setAuthView('app');
  const handleSignup = () => setAuthView('app');
  const handleLogout = () => setAuthView('login');

  if (authView === 'login') return <LoginPage onLogin={handleLogin} onSignup={() => setAuthView('signup')} />;
  if (authView === 'signup') return <SignupPage onLogin={() => setAuthView('login')} onSignup={handleSignup} />;

  const pages: Record<View, React.ReactNode> = {
    dashboard: <Dashboard />,
    wan: <WANPage />,
    lan: <LANPage />,
    wifi: <WiFiPage />,
    dhcp: <DHCPPage />,
    routing: <div className="text-zinc-500">Routing page</div>,
    firewall: <FirewallPage />,
    nat: <div className="text-zinc-500">NAT page</div>,
    traffic: <TrafficPage />,
    'dns-filter': <DNSFilterPage />,
    ips: <div className="text-zinc-500">IPS page</div>,
    'vpn-server': <div className="text-zinc-500">VPN Server page</div>,
    'vpn-client': <div className="text-zinc-500">VPN Client page</div>,
    qos: <div className="text-zinc-500">QoS page</div>,
    ddns: <div className="text-zinc-500">DDNS page</div>,
    grafana: <GrafanaPage />,
    loki: <LokiPage />,
    reports: <div className="text-zinc-500">Reports page</div>,
    firmware: <FirmwarePage />,
    backup: <BackupPage />,
    logs: <div className="text-zinc-500">System Logs page</div>,
    hardware: <HardwarePage />,
    devices: <div className="text-zinc-500">Managed Devices page</div>,
    profile: <ProfilePage />,
    billing: <BillingPage />,
  };

  const currentLabel = navGroups.flatMap(g => g.items).find(i => i.id === view)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className={cn('bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200', sidebarOpen ? 'w-56' : 'w-0 overflow-hidden')}>
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Router className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-zinc-100">NGFW.sh</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navGroups.map(group => (
            <div key={group.label}>
              <button onClick={() => toggleGroup(group.label)} className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300">
                {group.label}
                {expandedGroups.includes(group.label) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {expandedGroups.includes(group.label) && (
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <button key={item.id} onClick={() => setView(item.id)} className={cn('w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors', view === item.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200')}>
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Connected to home-router
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors">
            <LogOut className="w-3 h-3" />Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 hover:text-zinc-200"><Menu className="w-5 h-5" /></button>
            <h1 className="text-sm font-medium text-zinc-200">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-zinc-500"><span className="w-2 h-2 rounded-full bg-emerald-500" />System OK</div>
            <button className="text-zinc-400 hover:text-zinc-200 relative"><Bell className="w-4 h-4" /><span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
            <button onClick={() => setView('profile')} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{pages[view]}</main>
      </div>
    </div>
  );
}
