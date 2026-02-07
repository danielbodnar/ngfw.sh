# NGFW.sh Portal Migration: Complete Implementation Plan

## Context

The NGFW.sh portal migration from React SPA to Astro + Vue is **architecturally 95% complete**. All 48 Vue components, 34 Astro pages, and 16 composables exist. However, beta.ngfw.sh appears empty because pages display placeholder content instead of real API-driven data.

**Root Cause Analysis**:
- **React Portal** (`packages/portal/src/App.tsx`): Monolithic 1,600-line file with 25 views and 500+ lines of comprehensive mock data
- **Astro Portal** (`packages/portal-astro/`): Modern component-based architecture with proper separation of concerns
- **Gap**: Pages have inline TODO comments saying "Replace with composables" but composables exist and are ready to use

**Infrastructure Status** (COMPLETE):
- ✅ 48 Vue components (UI, Network, Security, Services, Monitoring, Onboarding)
- ✅ 34 Astro pages (Dashboard, Network, Security, Services, Monitoring, System, Auth)
- ✅ 16 composables (useDevices, useNAT, useIPS, useVPNServer, useQoS, etc.)
- ✅ 50+ TypeScript types (403 lines in lib/api/types.ts)
- ✅ ApiClient with all methods implemented
- ✅ Clerk authentication working on beta.ngfw.sh

**Problem Being Solved**: Connect existing pages to existing composables to fetch real data from specs.ngfw.sh API.

---

## Complete File Inventory

### Vue Components (48 total)

**UI Components (12)**:
- Button.vue - Variants (default, primary, danger, ghost) × Sizes (sm, default, lg)
- Card.vue - Container component
- Input.vue - Form input with validation
- Select.vue - Dropdown with multi-select
- Badge.vue - Status chips
- Toggle.vue - Checkbox toggle
- Table.vue - Data table with sorting
- Modal.vue - Dialog component
- Spinner.vue - Loading indicator
- Stat.vue - Statistics card with trend
- GaugeComponent.vue - Circular progress
- MiniChart.vue - Line/bar chart
- index.ts - TypeScript barrel exports

**Layout Components (3)**:
- Header.astro - Portal header bar
- Sidebar.astro - Navigation sidebar
- UserMenu.vue - User profile dropdown

**Network Components (10)**:
- DhcpConfig.vue - DHCP server config form
- DhcpLeases.vue - DHCP leases table
- LanConfig.vue - LAN interface settings
- RadioSettings.vue - WiFi radio config
- RoutingForm.vue - Static route form
- RoutingTable.vue - Routes table
- VlanTable.vue - VLAN configuration
- WanConfig.vue - WAN interface form
- WanStatus.vue - WAN status display
- WiFiNetworkCard.vue - WiFi network card

**Security Components (5)**:
- IPSAlertList.vue - IPS alerts table
- IPSConfig.vue - IPS configuration form
- IPSRuleList.vue - IPS rules table
- NATRuleForm.vue - NAT rule editor
- NATRuleList.vue - NAT rules table

**Services Components (8)**:
- DDNSConfig.vue - Dynamic DNS config
- QoSRuleForm.vue - QoS rule editor
- QoSRuleList.vue - QoS rules table
- VPNClientForm.vue - VPN profile editor
- VPNClientList.vue - VPN profiles list
- VPNPeerForm.vue - VPN peer editor
- VPNPeerList.vue - VPN peers table
- VPNServerConfig.vue - VPN server config

**Monitoring Components (7)**:
- DashboardGrid.vue - Widget grid layout
- DashboardViewer.vue - Dashboard display
- LogFilter.vue - Log filtering UI
- LogViewer.vue - Log entries table
- ReportGenerator.vue - Report wizard
- ReportList.vue - Reports table

**Onboarding Components (6)**:
- ConfigForm.vue - Router configuration
- OnboardingFlow.vue - Flow manager
- OnboardingWizard.vue - Step wizard
- OrderComplete.vue - Completion screen
- OrderSummary.vue - Order summary
- RouterSelector.vue - Model selector

### Astro Pages (34 total)

**Auth & Home (3)**:
- `/index.astro` - Landing page
- `/sign-in.astro` - Sign-in (Clerk)
- `/sign-up.astro` - Sign-up (Clerk)

**Dashboard (1)**:
- `/dashboard.astro` - Main dashboard

**Network (5)**:
- `/network/wan.astro` - WAN config
- `/network/lan.astro` - LAN config
- `/network/wifi.astro` - WiFi management
- `/network/dhcp.astro` - DHCP server
- `/network/routing.astro` - Static routing

**Security (5)**:
- `/security/firewall.astro` - Firewall rules
- `/security/nat.astro` - NAT rules
- `/security/ips.astro` - IPS config
- `/security/dns-filter.astro` - DNS filtering
- `/security/traffic.astro` - Traffic rules

**Services (4)**:
- `/services/vpn-server.astro` - VPN server
- `/services/vpn-client.astro` - VPN client
- `/services/qos.astro` - QoS rules
- `/services/ddns.astro` - Dynamic DNS

**Monitoring (13)**:
- `/monitoring/reports.astro` - Reports list
- `/monitoring/dashboards/index.astro` - Dashboard gallery
- `/monitoring/dashboards/[id].astro` - Custom dashboards
- `/monitoring/dashboards/dns-analytics.astro` - DNS dashboard
- `/monitoring/dashboards/firewall-rules.astro` - Firewall dashboard
- `/monitoring/dashboards/network-overview.astro` - Network dashboard
- `/monitoring/dashboards/qos-metrics.astro` - QoS dashboard
- `/monitoring/dashboards/security-events.astro` - Security dashboard
- `/monitoring/dashboards/system-resources.astro` - System dashboard
- `/monitoring/dashboards/traffic-analysis.astro` - Traffic dashboard
- `/monitoring/dashboards/vpn-metrics.astro` - VPN dashboard
- `/monitoring/dashboards/wan-health.astro` - WAN dashboard
- `/monitoring/dashboards/wifi-performance.astro` - WiFi dashboard

**System & Onboarding (3)**:
- `/system/logs.astro` - System logs
- `/onboarding/index.astro` - Device onboarding
- `/onboarding/complete.astro` - Onboarding complete

**API Routes (2)**:
- `/api/sign-out.ts` - Sign-out handler
- `/api/user.ts` - User info endpoint

### Composables (16 total)

**Core**:
- useApi.ts - Authenticated API client
- useAuth.ts - Authentication state
- usePolling.ts - Interval polling

**Fleet**:
- useDevices.ts - Device CRUD
- useDeviceStatus.ts - Device metrics
- useRegisterDevice.ts - Registration

**Network**:
- useRoutes.ts - Static routing

**Security**:
- useNAT.ts - NAT rules
- useIPS.ts - IPS config

**Services**:
- useVPNServer.ts - VPN server
- useVPNClient.ts - VPN client
- useQoS.ts - QoS rules
- useDDNS.ts - Dynamic DNS

**Monitoring**:
- useReports.ts - Reports
- useLogs.ts - Log queries
- useDashboards.ts - Dashboards

### API Client Methods (50+ total)

**Fleet**: listDevices, registerDevice, getDeviceStatus, deleteDevice
**Routing**: listRoutes, createRoute, updateRoute, deleteRoute
**NAT**: listNATRules, createNATRule, updateNATRule, deleteNATRule
**IPS**: getIPSConfig, updateIPSConfig, listIPSRules, listIPSAlerts
**VPN Server**: getVPNServerConfig, updateVPNServerConfig, listVPNServerPeers, createVPNServerPeer, deleteVPNServerPeer
**VPN Client**: listVPNClientProfiles, createVPNClientProfile, updateVPNClientProfile, deleteVPNClientProfile, getVPNClientStatus, connectVPNClient, disconnectVPNClient
**QoS**: listQoSRules, createQoSRule, updateQoSRule, deleteQoSRule
**DDNS**: listDDNSConfigs, createDDNSConfig, updateDDNSConfig, deleteDDNSConfig, forceDDNSUpdate
**Reports**: listReports, createReport, getReport, deleteReport
**Logs**: queryLogs
**Dashboards**: listDashboards, createDashboard, updateDashboard, deleteDashboard

---

## React Portal Analysis (Reference)

### Mock Data Available (for E2E Testing)

**System Stats**:
- CPU: 23%, Memory: 41%, Temp: 52°C
- Uptime: 14d 7h 23m
- 847 connections, 34 LAN clients

**Interfaces (5)**:
- eth0 (WAN): 203.0.113.42/24
- eth1 (LAN): 192.168.1.1/24
- wlan0 (5GHz): 18 clients
- wlan1 (2.4GHz): 12 clients
- wg0 (WireGuard): 4 clients

**Firewall Rules (15 mock rules)**:
- Allow Established, Block Telnet, Allow SSH Internal
- Block NetBIOS, Rate Limit ICMP, Allow DNS
- IoT Isolation, Guest Bandwidth Limit
- Block Crypto Mining, Kids Bedtime Block
- Each with: hits, enabled state, zones

**Traffic Logs (100 entries)**:
- Realistic IPs, ports, protocols
- Actions (ACCEPT/DROP), apps, geo
- Threat detection (Port Scan, Brute Force)

**DNS Queries (80 entries)**:
- Real domains (google.com, facebook.com, etc.)
- Blocked/resolved status
- Response IPs, latency

**DHCP Leases (12 entries)**:
- IPs, MACs, hostnames, vendors
- Lease times, static assignments

**WiFi Networks (4)**:
- NGFW.sh-5G (WPA3, 80MHz, 18 clients)
- NGFW.sh-2G (WPA2/WPA3, 40MHz, 12 clients)
- IoT-Network (VLAN 10, 8 clients)
- Guest-Network (VLAN 20, 2 clients)

**Billing Plans (4)**:
- Starter ($25/mo), Pro ($49/mo), Business ($99/mo), Business Plus ($199/mo)

---

## Recommended Approach

### Phase 1: Foundation & Dashboard (Days 1-3)

**Goal**: Establish the API integration pattern with the highest-value page.

**Page to Convert**: `/dashboard.astro`

**Current State**:
```typescript
---
import PortalLayout from '../layouts/PortalLayout.astro';

const { userId } = Astro.locals.auth();
if (!userId) return Astro.redirect('/sign-in');

// TODO: Replace with real data
const mockDevices = [
  { id: '1', name: 'Router 1', status: 'online' },
];
---

<PortalLayout title="Dashboard">
  <div>Active Devices: 3</div>
  <!-- Static placeholder content -->
</PortalLayout>
```

**Target State**:
```typescript
---
import PortalLayout from '../layouts/PortalLayout.astro';
import DashboardApp from '../components/dashboard/DashboardApp.vue';

const { userId } = Astro.locals.auth();
if (!userId) return Astro.redirect('/sign-in');
---

<PortalLayout title="Dashboard">
  <DashboardApp client:load />
</PortalLayout>
```

**New Component**: `components/dashboard/DashboardApp.vue`

```vue
<script setup lang="ts">
import { useDevices } from '@/composables/useDevices';
import { useDeviceStatus } from '@/composables/useDeviceStatus';
import { usePolling } from '@/composables/usePolling';
import { ref, computed } from 'vue';

const { data: devices, loading, error, refetch } = useDevices();

// Auto-refresh every 30s
usePolling(refetch, 30000);

// Aggregate stats from device list
const stats = computed(() => ({
  activeDevices: devices.value?.filter(d => d.status === 'online').length || 0,
  totalDevices: devices.value?.length || 0,
  offlineDevices: devices.value?.filter(d => d.status === 'offline').length || 0,
}));
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="flex justify-center items-center h-64">
    <Spinner size="lg" />
    <span class="ml-3 text-[--color-text-secondary]">Loading dashboard...</span>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
    <div class="flex items-start">
      <svg class="w-6 h-6 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="ml-3">
        <h3 class="text-red-800 font-medium">Failed to load dashboard</h3>
        <p class="text-red-700 mt-1">{{ error }}</p>
        <Button @click="refetch" variant="danger" size="sm" class="mt-3">
          Retry
        </Button>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else-if="!devices || devices.length === 0" class="text-center py-12">
    <svg class="mx-auto h-12 w-12 text-[--color-text-muted]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
    <h3 class="mt-4 text-lg font-medium text-[--color-text-primary]">No devices registered</h3>
    <p class="mt-2 text-[--color-text-secondary]">Get started by registering your first router.</p>
    <Button @click="$router.push('/onboarding')" class="mt-6">
      Register Device
    </Button>
  </div>

  <!-- Success State with Data -->
  <div v-else class="space-y-6">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Stat label="Active Devices" :value="stats.activeDevices" />
      <Stat label="Total Devices" :value="stats.totalDevices" />
      <Stat label="Offline Devices" :value="stats.offlineDevices" />
      <Stat label="Pending Updates" :value="0" />
    </div>

    <!-- Device List -->
    <Card>
      <div class="p-6">
        <h2 class="text-lg font-semibold text-[--color-text-primary] mb-4">Your Devices</h2>
        <Table
          :columns="[
            { key: 'name', label: 'Name' },
            { key: 'model', label: 'Model' },
            { key: 'firmware', label: 'Firmware' },
            { key: 'status', label: 'Status' },
          ]"
          :data="devices"
        >
          <template #cell-status="{ row }">
            <Badge :variant="row.status === 'online' ? 'success' : 'danger'">
              {{ row.status }}
            </Badge>
          </template>
        </Table>
      </div>
    </Card>
  </div>
</template>
```

**Deliverables**:
1. ✅ Convert dashboard.astro to use DashboardApp.vue
2. ✅ Create DashboardApp.vue component
3. ✅ Test all 4 states: loading, error, empty, success
4. ✅ Verify auto-refresh works (30s polling)
5. ✅ Document pattern for remaining pages

**Testing**:
```bash
cd packages/portal-astro
bun run dev

# Navigate to http://localhost:4321/dashboard
# Verify:
- [ ] Loading spinner appears briefly
- [ ] Dashboard shows device count from API
- [ ] Stats cards display real data
- [ ] Device table shows registered devices
- [ ] Clicking device name navigates to detail
- [ ] Error state shows if API fails
- [ ] Empty state shows if no devices
- [ ] Metrics refresh every 30 seconds
```

---

### Phase 2: Security Pages (Days 4-6)

**Goal**: Complete high-priority security configuration pages.

**Pages to Convert** (3):
1. `/security/nat.astro` - NAT rules management
2. `/security/ips.astro` - IPS configuration
3. `/security/firewall.astro` - Firewall rules (needs backend endpoint)

**Pattern**: Each page follows dashboard pattern:
```typescript
// 1. Import layout + component
import PortalLayout from '../../layouts/PortalLayout.astro';
import NATRulesApp from '../../components/security/NATRulesApp.vue';

// 2. Auth check
const { userId } = Astro.locals.auth();
if (!userId) return Astro.redirect('/sign-in');

// 3. Render with island
<PortalLayout title="NAT Rules">
  <NATRulesApp client:load />
</PortalLayout>
```

**Component Pattern**: Each Vue app component:
```vue
<script setup>
import { useNAT } from '@/composables/useNAT';
const { data, loading, error, create, update, delete: del } = useNAT();
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else>
    <NATRuleList :rules="data" @edit="update" @delete="del" />
    <NATRuleForm @save="create" />
  </div>
</template>
```

**Deliverables**:
- ✅ 3 security pages converted
- ✅ CRUD operations working (create, read, update, delete)
- ✅ Form validation with Zod
- ✅ Toast notifications for success/error

---

### Phase 3: Network Pages (Days 7-10)

**Goal**: Complete network configuration pages.

**Backend Work Required**: Create these Schema API endpoints:
- `GET/PUT /api/wan/config` - WAN interface config
- `GET/PUT /api/lan/config` - LAN interface config
- `GET/PUT /api/wifi/radios` - WiFi radio config
- `GET/PUT /api/dhcp/config` - DHCP server config

**Reference Pattern** (from existing endpoints):
```typescript
// packages/schema/src/endpoints/fleet/deviceList.ts
export class DeviceList extends OpenAPIRoute {
  schema = {
    summary: 'List devices',
    tags: ['Fleet'],
    security: [{ bearerAuth: [] }],
    responses: {
      '200': {
        description: 'Device list',
        content: { 'application/json': { schema: z.array(DeviceSchema) } },
      },
    },
  };

  async handle(request: Request, env: Env, context: any, data: any) {
    const devices = await env.DB.prepare('SELECT * FROM devices WHERE owner_id = ?')
      .bind(context.user.userId)
      .all();
    return devices.results;
  }
}
```

**Pages to Convert** (5):
1. `/network/wan.astro`
2. `/network/lan.astro`
3. `/network/wifi.astro`
4. `/network/dhcp.astro`
5. `/network/routing.astro` (already has backend API)

**Deliverables**:
- ✅ 4 backend endpoints created
- ✅ 5 network pages converted
- ✅ Form validation working
- ✅ Configuration persists on save

---

### Phase 4: Services & Monitoring (Days 11-14)

**Goal**: Complete remaining pages.

**Services Pages** (4):
- `/services/vpn-server.astro` (backend ready)
- `/services/vpn-client.astro` (backend ready)
- `/services/qos.astro` (backend ready)
- `/services/ddns.astro` (backend ready)

**Monitoring Pages** (14):
- `/monitoring/reports.astro` (backend ready)
- `/monitoring/dashboards/*.astro` (13 dashboard pages, backend ready)

**System Pages** (2):
- `/system/logs.astro` (backend ready)
- `/onboarding/index.astro` (backend ready)

**Deliverables**:
- ✅ All 20 remaining pages converted
- ✅ Reports generate and download
- ✅ Custom dashboards save/load
- ✅ Logs filter and export
- ✅ Onboarding flow works end-to-end

---

## Technical Approach

### 1. Error Handling Pattern

**Consistent across all pages**:
```typescript
async function handleSave(data: ConfigType) {
  try {
    loading.value = true;
    await api.updateConfig(deviceId, data);
    toast.success('Configuration saved successfully');
    await refetch(); // Refresh data
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        // Session expired
        window.location.href = '/sign-in';
      } else if (err.status === 404) {
        toast.error('Configuration not found');
      } else if (err.status === 422) {
        toast.error(`Validation error: ${err.message}`);
      } else {
        toast.error(err.message);
      }
    } else {
      toast.error('An unexpected error occurred');
      console.error(err);
    }
  } finally {
    loading.value = false;
  }
}
```

### 2. Fallback for Missing Endpoints

**Progressive enhancement**:
```typescript
export function useWANConfig(deviceId: string) {
  const api = useApi();
  const data = ref(null);
  const loading = ref(true);
  const error = ref(null);

  async function fetch() {
    try {
      data.value = await api.getWANConfig(deviceId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Endpoint not implemented yet
        console.warn('WAN config endpoint not available, using mock data');
        data.value = getMockWANConfig(); // Fallback
      } else {
        error.value = err.message;
      }
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetch);
  return { data, loading, error, refetch: fetch };
}
```

### 3. Form Validation with Zod

```typescript
import { z } from 'zod';

const natRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  external_ip: z.string().ip('Invalid IP address'),
  external_port: z.number().min(1).max(65535),
  internal_ip: z.string().ip('Invalid IP address'),
  internal_port: z.number().min(1).max(65535),
  protocol: z.enum(['tcp', 'udp', 'both']),
  enabled: z.boolean().default(true),
});

// In component
const formErrors = computed(() => {
  const result = natRuleSchema.safeParse(formData.value);
  return result.success ? {} : result.error.flatten().fieldErrors;
});

const isValid = computed(() => Object.keys(formErrors.value).length === 0);
```

### 4. Data Polling

```typescript
import { usePolling } from '@/composables/usePolling';

// Poll every 30 seconds
usePolling(refetch, 30000);

// Composable implementation (already exists):
export function usePolling(
  fn: () => Promise<void>,
  interval: number = 5000
) {
  let timeoutId: NodeJS.Timeout | null = null;

  async function poll() {
    try {
      await fn();
      timeoutId = setTimeout(poll, interval);
    } catch (err) {
      console.error('Polling error:', err);
      // Exponential backoff on error
      timeoutId = setTimeout(poll, interval * 2);
    }
  }

  onMounted(poll);
  onUnmounted(() => timeoutId && clearTimeout(timeoutId));
}
```

---

## Verification Plan

### Phase 1 Testing (Dashboard)
```bash
cd packages/portal-astro
bun run dev

# Test dashboard at http://localhost:4321/dashboard
- [ ] Loading state appears briefly
- [ ] Device stats display real data from API
- [ ] Device table shows registered devices
- [ ] Error state shows on network failure
- [ ] Empty state shows when no devices
- [ ] Metrics auto-refresh every 30s
- [ ] No console errors
- [ ] JWT token in Authorization headers
```

### Integration Testing
```bash
# Deploy to beta.ngfw.sh
bun run deploy

# Test production auth flow
1. Visit beta.ngfw.sh
2. Sign in with Clerk
3. View dashboard → should show devices
4. Register device → should persist in DB
5. Navigate to security pages → should load
6. Create NAT rule → should save
7. Sign out → should redirect to landing
```

### End-to-End User Flow
```
1. New user visits beta.ngfw.sh
2. Clicks "Sign Up" → Clerk registration
3. Completes profile
4. Redirects to /dashboard → empty state
5. Clicks "Register Device"
6. Follows onboarding flow
7. Device registers successfully
8. Returns to dashboard → device appears
9. Navigates to Network → WAN config loads
10. Updates WAN settings → saves successfully
11. Navigates to Security → creates firewall rule
12. Rule persists after page refresh
```

---

## Dependencies & Risks

### Backend API Dependencies

**Phase 1**: None - Fleet APIs exist
**Phase 2**: None - NAT/IPS/Routing APIs exist
**Phase 3**: Required (1-2 days):
- WAN config endpoint
- LAN config endpoint
- WiFi radios endpoint
- DHCP config endpoint

**Phase 4**: None - All APIs exist

### Risk Mitigation

**Risk 1: Backend Not Ready**
- Mitigation: Use fallback mock data (Technical Approach #2)
- Impact: Low - users see UI, data won't persist

**Risk 2: Auth Token Expiration**
- Mitigation: Redirect to /sign-in on 401
- Impact: Low - standard flow

**Risk 3: Performance Issues**
- Mitigation: Configurable polling, exponential backoff
- Impact: Low - user can disable auto-refresh

---

## Success Criteria

### Phase 1 Complete:
- ✅ Dashboard shows real device data
- ✅ Loading/error/empty/success states work
- ✅ Auto-refresh working
- ✅ Pattern documented for team

### Phase 2 Complete:
- ✅ NAT rules CRUD functional
- ✅ IPS config saves
- ✅ Firewall rules display
- ✅ Form validation prevents errors

### Phase 3 Complete:
- ✅ All network config pages save
- ✅ Changes persist across reloads
- ✅ Backend endpoints tested

### Phase 4 Complete:
- ✅ All pages functional
- ✅ Full application tested E2E
- ✅ Deployed to production (app.ngfw.sh)
- ✅ Beta users can configure routers

---

## Critical File Paths

### Phase 1 Files

**Create**:
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/components/dashboard/DashboardApp.vue`

**Modify**:
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/pages/dashboard.astro`

**Verify** (already exist):
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/composables/useDevices.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/composables/useDeviceStatus.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/composables/usePolling.ts`

### Phase 2 Files

**Create**:
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/components/security/NATRulesApp.vue`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/components/security/IPSApp.vue`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/components/security/FirewallApp.vue`

**Modify**:
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/pages/security/nat.astro`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/pages/security/ips.astro`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/portal-astro/src/pages/security/firewall.astro`

### Phase 3 Backend Files

**Create** (in Schema API):
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/wan/router.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/wan/configRead.ts`
- `/workspaces/code/github.com/danielbodnar/ngfw.sh/packages/schema/src/endpoints/wan/configUpdate.ts`
- (Same structure for LAN, WiFi, DHCP)

---

## Timeline

**Total Estimate**: 14 working days (3 weeks with buffer)

- **Phase 1**: 3 days (Dashboard pattern + 1 reference page)
- **Phase 2**: 3 days (3 security pages)
- **Phase 3**: 4 days (2 days backend + 2 days frontend for 5 network pages)
- **Phase 4**: 4 days (20 remaining pages, batch conversion)

**Buffer**: Additional 1 week for testing, bug fixes, performance optimization

---

## Related Plans

- **async-frolicking-sonnet.md** - RT-AX92U router test environment (agent integration testing)
- **magical-hugging-cook.md** - Rust API diagnostics fixes (121 Clippy warnings)

---

## Next Steps

1. **Immediate**: Start Phase 1 (Dashboard conversion)
2. **Day 4**: Start Phase 2 (Security pages)
3. **Day 7**: Create Phase 3 backend endpoints
4. **Day 11**: Begin Phase 4 batch conversion
5. **Day 14**: E2E testing and production deploy prep

This plan is actionable, detailed, and ready for implementation.