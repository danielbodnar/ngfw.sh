# Security Pages Implementation Plan

**Agent:** security-pages
**Status:** Waiting for prerequisites (astro-setup, vue-components, vue-composables)
**Updated:** 2026-02-06

## Overview

This agent will migrate and create all security-related pages from the React monolithic SPA (`packages/portal/src/App.tsx`) to the new Astro + Vue architecture in `packages/portal-astro/`.

## Prerequisites

Must wait for completion of:
1. **astro-setup** - Base Astro project, layouts, Clerk integration, routing structure
2. **vue-components** - UI component library (Button, Card, Table, Badge, etc.)
3. **vue-composables** - API composables (useApi, useAuth, useIPS, useNAT, useFirewall, useTraffic, useDNS)

## Pages to Create

### 1. IPS (Intrusion Prevention System) - NEW
**Path:** `src/pages/security/ips.astro`

**Features:**
- IPS configuration (enable/disable, mode: monitor/block)
- Rule categories (grouped by threat type) with enable/disable toggles
- Custom rules table (CRUD operations)
- Recent alerts list (real-time via WebSocket)
- Alert statistics (critical/high/medium/low counts)

**API Endpoints Used:**
- `GET /api/ids/config` - Get IPS configuration
- `PUT /api/ids/config` - Update IPS configuration
- `GET /api/ids/categories` - List rule categories
- `PUT /api/ids/categories/:id` - Update category settings
- `GET /api/ids/rules` - List custom rules
- `POST /api/ids/rules` - Create custom rule
- `DELETE /api/ids/rules/:id` - Delete custom rule
- `GET /api/ids/alerts` - List recent alerts
- `GET /api/ids/alerts/stream` - WebSocket real-time alerts

**Mock Data Needed:**
```typescript
const ipsConfig = {
  enabled: true,
  mode: 'block', // 'monitor' | 'block'
  log_all: true,
  update_interval: 3600
};

const ipsCategories = [
  { id: 1, name: 'Malware', enabled: true, mode: 'block', rules: 2847, alerts_today: 23 },
  { id: 2, name: 'Exploits', enabled: true, mode: 'block', rules: 1923, alerts_today: 12 },
  { id: 3, name: 'Scanning', enabled: true, mode: 'monitor', rules: 847, alerts_today: 156 },
  { id: 4, name: 'Botnet C2', enabled: true, mode: 'block', rules: 4729, alerts_today: 8 },
  { id: 5, name: 'Crypto Mining', enabled: true, mode: 'block', rules: 234, alerts_today: 4 }
];

const ipsRules = [
  { id: 1, name: 'Block Known Bad IPs', pattern: 'src:185.234.72.0/24', action: 'drop', hits: 847 },
  { id: 2, name: 'Rate Limit SSH', pattern: 'dport:22', action: 'limit', threshold: 5, hits: 234 }
];

const ipsAlerts = [
  { id: 1, time: '14:21:33', severity: 'critical', category: 'Malware', signature: 'Emotet C2 Communication', src: '192.168.1.142', dst: '185.234.72.12', blocked: true },
  { id: 2, time: '14:18:47', severity: 'high', category: 'Exploits', signature: 'SSH Brute Force Attempt', src: '45.33.32.156', dst: '203.0.113.42:22', blocked: true }
];
```

### 2. NAT (Network Address Translation) - NEW
**Path:** `src/pages/security/nat.astro`

**Features:**
- NAT rules table (CRUD operations)
- Port forwarding configuration
- UPnP leases list (active mappings from devices)
- NAT statistics (sessions, mappings)

**API Endpoints Used:**
- `GET /api/nat/rules` - List NAT rules
- `POST /api/nat/rules` - Create NAT rule
- `PUT /api/nat/rules/:id` - Update NAT rule
- `DELETE /api/nat/rules/:id` - Delete NAT rule
- `GET /api/nat/upnp` - List UPnP leases
- `DELETE /api/nat/upnp/:id` - Revoke UPnP lease

**Mock Data Needed:**
```typescript
const natRules = [
  { id: 1, name: 'Plex Media Server', proto: 'tcp', wan_port: 32400, lan_ip: '192.168.1.50', lan_port: 32400, enabled: true },
  { id: 2, name: 'SSH External', proto: 'tcp', wan_port: 2222, lan_ip: '192.168.1.101', lan_port: 22, enabled: true },
  { id: 3, name: 'Game Server', proto: 'udp', wan_port: 27015, lan_ip: '192.168.1.125', lan_port: 27015, enabled: true },
  { id: 4, name: 'Web Server', proto: 'tcp', wan_port: 8080, lan_ip: '192.168.1.130', lan_port: 80, enabled: false }
];

const upnpLeases = [
  { id: 1, device: '192.168.1.119', proto: 'tcp', ext_port: 5432, int_port: 5432, description: 'Plex DLNA', expires: '2h 15m' },
  { id: 2, device: '192.168.1.125', proto: 'udp', ext_port: 3074, int_port: 3074, description: 'Xbox Live', expires: '1h 42m' }
];
```

### 3. Firewall Rules - MIGRATE
**Path:** `src/pages/security/firewall.astro`

**Current Location:** `packages/portal/src/App.tsx` (FirewallPage component, lines 1432-1477)

**Features:**
- Firewall rules table with filtering (zone, search)
- Rule CRUD operations
- Import/Export functionality
- Rule statistics (hits counter)
- Rule ordering (drag-and-drop in future)

**Existing Mock Data:** `firewallRules` array (lines 38-54 in App.tsx)

**Migration Notes:**
- Keep existing UI/UX patterns
- Convert from React useState to Vue ref/reactive
- Use Vue composable `useFirewall()` for API calls
- Maintain zone filtering (WAN, LAN, IoT, Guest)

### 4. Traffic Logs - MIGRATE
**Path:** `src/pages/security/traffic.astro`

**Current Location:** `packages/portal/src/App.tsx` (TrafficPage component, lines 815-884)

**Features:**
- Real-time traffic log streaming
- Filtering (action, protocol, search)
- Live mode toggle (pause/resume)
- Export functionality
- Statistics cards (total, accepted, dropped, threats)

**API Endpoints Used:**
- `GET /api/traffic/logs` - Paginated logs (with query params: action, proto, src, dst, port, app, geo, threat)
- `GET /api/traffic/logs/stream` - WebSocket real-time stream
- `GET /api/traffic/stats` - Aggregated statistics

**Existing Mock Data:** `trafficLogs` array (line 156 in App.tsx, generated by `generateTrafficLogs()`)

**Migration Notes:**
- Keep existing table layout (monospace font for IPs/ports)
- Implement WebSocket streaming for live mode
- Use Vue composable `useTraffic()` for API calls
- Maintain filter state management

### 5. DNS Filter - MIGRATE
**Path:** `src/pages/security/dns-filter.astro`

**Current Location:** `packages/portal/src/App.tsx` (DNSFilterPage component, lines 887-979)

**Features:**
- DNS query log with filtering
- Blocklist management (enable/disable lists)
- Top blocked domains chart
- DNS statistics (total queries, blocked %, cached %, avg latency)

**API Endpoints Used:**
- `GET /api/dns/config` - DNS resolver configuration
- `PUT /api/dns/config` - Update DNS configuration
- `GET /api/dns/blocklists` - List configured blocklists
- `PUT /api/dns/blocklists/:id` - Update blocklist (enable/disable)
- `GET /api/dns/queries` - Query log (with filters: status, client, domain)
- `GET /api/dns/stats` - DNS statistics

**Existing Mock Data:** `dnsQueries` array (line 157 in App.tsx, generated by `generateDnsQueries()`)

**Migration Notes:**
- Keep existing layout (stats cards, blocklist table, query log)
- Use Vue composable `useDNS()` for API calls
- Maintain blocklist toggle functionality
- Keep top blocked domains sidebar

## Vue Components to Create

All components in `src/components/security/`

### 1. IPSConfig.vue
**Purpose:** IPS configuration form (enable/disable, mode selection)

**Props:**
```typescript
interface Props {
  config: IPSConfig;
  onSave: (config: IPSConfig) => Promise<void>;
}
```

**Features:**
- Toggle for IPS enabled/disabled
- Mode selection (monitor/block)
- Log all traffic option
- Update interval configuration
- Save button with loading state

### 2. IPSRuleList.vue
**Purpose:** IPS rules table with CRUD operations

**Props:**
```typescript
interface Props {
  rules: IPSRule[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (rule: IPSRule) => void;
  onDelete?: (id: number) => Promise<void>;
}
```

**Features:**
- Sortable table (name, pattern, action, hits)
- Add/Edit/Delete actions
- Enable/disable toggles per rule
- Search/filter functionality

### 3. IPSAlertList.vue
**Purpose:** Recent IPS alerts with real-time updates

**Props:**
```typescript
interface Props {
  alerts: IPSAlert[];
  loading?: boolean;
  autoRefresh?: boolean;
}
```

**Features:**
- Real-time alert list (WebSocket)
- Severity badges (critical/high/medium/low)
- Expandable details per alert
- Filter by severity/category
- Auto-scroll to new alerts

### 4. NATRuleList.vue
**Purpose:** NAT rules table with port forwarding management

**Props:**
```typescript
interface Props {
  rules: NATRule[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (rule: NATRule) => void;
  onDelete?: (id: number) => Promise<void>;
}
```

**Features:**
- Rules table (name, protocol, ports, target IP)
- Enable/disable toggles
- Add/Edit/Delete actions
- Validation for port conflicts

### 5. NATRuleForm.vue
**Purpose:** Add/Edit NAT rule form (modal or inline)

**Props:**
```typescript
interface Props {
  rule?: NATRule | null; // null = create mode
  onSave: (rule: Partial<NATRule>) => Promise<void>;
  onCancel: () => void;
}
```

**Features:**
- Input fields (name, protocol, WAN port, LAN IP, LAN port)
- Validation (port range, IP format, conflict detection)
- Protocol selection (TCP/UDP/Both)
- Enable/disable toggle
- Save/Cancel buttons with loading states

## Composables to Use

These should be created by the **vue-composables** agent:

### 1. useIPS()
```typescript
interface UseIPSReturn {
  config: Ref<IPSConfig | null>;
  categories: Ref<IPSCategory[]>;
  rules: Ref<IPSRule[]>;
  alerts: Ref<IPSAlert[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  updateConfig: (config: Partial<IPSConfig>) => Promise<void>;
  updateCategory: (id: number, data: Partial<IPSCategory>) => Promise<void>;
  createRule: (rule: Partial<IPSRule>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  fetchAlerts: (params?: { limit?: number; severity?: string }) => Promise<void>;
  subscribeAlerts: () => void; // WebSocket subscription
  unsubscribeAlerts: () => void;
}
```

### 2. useNAT()
```typescript
interface UseNATReturn {
  rules: Ref<NATRule[]>;
  upnpLeases: Ref<UPnPLease[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  createRule: (rule: Partial<NATRule>) => Promise<void>;
  updateRule: (id: number, data: Partial<NATRule>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  revokeUPnPLease: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}
```

### 3. useFirewall()
```typescript
interface UseFirewallReturn {
  rules: Ref<FirewallRule[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  createRule: (rule: Partial<FirewallRule>) => Promise<void>;
  updateRule: (id: number, data: Partial<FirewallRule>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  reorderRules: (ids: number[]) => Promise<void>;
  importRules: (file: File) => Promise<void>;
  exportRules: () => Promise<Blob>;
  refetch: () => Promise<void>;
}
```

### 4. useTraffic()
```typescript
interface UseTrafficReturn {
  logs: Ref<TrafficLog[]>;
  stats: Ref<TrafficStats | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  liveMode: Ref<boolean>;

  fetchLogs: (params?: TrafficLogParams) => Promise<void>;
  fetchStats: () => Promise<void>;
  toggleLiveMode: () => void;
  subscribeLogs: () => void; // WebSocket subscription
  unsubscribeLogs: () => void;
}
```

### 5. useDNS()
```typescript
interface UseDNSReturn {
  config: Ref<DNSConfig | null>;
  blocklists: Ref<DNSBlocklist[]>;
  queries: Ref<DNSQuery[]>;
  stats: Ref<DNSStats | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  updateConfig: (config: Partial<DNSConfig>) => Promise<void>;
  updateBlocklist: (id: number, data: Partial<DNSBlocklist>) => Promise<void>;
  fetchQueries: (params?: { status?: string; search?: string; limit?: number }) => Promise<void>;
  fetchStats: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

## Layout Structure

All pages will use the same Astro layout provided by **astro-setup** agent:

```astro
---
import MainLayout from '@/layouts/MainLayout.astro';
import { IPSConfig, IPSRuleList, IPSAlertList } from '@/components/security';
---

<MainLayout title="Intrusion Prevention System">
  <div class="space-y-6">
    <!-- Page content -->
  </div>
</MainLayout>
```

## Navigation Integration

Pages should be accessible via:
- `/security/ips` - IPS configuration
- `/security/nat` - NAT & Port Forwarding
- `/security/firewall` - Firewall Rules
- `/security/traffic` - Traffic Logs
- `/security/dns-filter` - DNS Filtering

The **astro-setup** agent should configure these routes in the sidebar navigation under a "Security" group.

## Authentication

All pages require Clerk authentication. The **astro-setup** agent should provide:
- Clerk middleware for SSR auth checks
- `useAuth()` composable for client-side auth state
- Redirect to sign-in if unauthenticated

## Styling

- Use Tailwind CSS 4 (as configured by **astro-setup**)
- Follow existing dark theme from React portal
- Maintain consistent spacing, typography, colors
- Use Vue component library from **vue-components** agent
- Color palette:
  - Background: zinc-950
  - Cards: zinc-900
  - Borders: zinc-800
  - Text: zinc-200 (primary), zinc-500 (secondary)
  - Accent: emerald-500 (success), red-500 (danger), blue-500 (info), amber-500 (warning)

## Testing Strategy

After implementation:
1. Verify all pages render correctly
2. Test authentication flow (redirect if not logged in)
3. Test CRUD operations with mock data
4. Test filtering/search functionality
5. Test WebSocket subscriptions (traffic logs, IPS alerts)
6. Test responsive layout (mobile/tablet/desktop)

## Dependencies

- Wait for **astro-setup** to complete base project
- Wait for **vue-components** to provide UI library
- Wait for **vue-composables** to provide API hooks
- Coordinate with **ips-api** and **nat-api** agents for backend endpoints

## Success Criteria

- [ ] All 5 pages created and accessible via direct URLs
- [ ] All Vue components functional with props/events
- [ ] Pages use composables for data fetching
- [ ] Clerk authentication enforced on all pages
- [ ] Styling matches existing portal theme
- [ ] Mock data provided where backend not ready
- [ ] Code passes oxlint with zero errors
- [ ] TypeScript compiles with zero errors
- [ ] All pages responsive (mobile/tablet/desktop)

## Implementation Order

1. Wait for prerequisites to complete
2. Create directory structure (`src/pages/security/`, `src/components/security/`)
3. Implement Vue components (IPSConfig, IPSRuleList, etc.)
4. Implement NEW pages (IPS, NAT) with mock data
5. Migrate existing pages (firewall, traffic, dns-filter)
6. Test all pages thoroughly
7. Update status to "complete"

---

**Status Updated:** 2026-02-06T01:43:00Z
**Next Action:** Monitor prerequisite agent status files and begin implementation when ready
