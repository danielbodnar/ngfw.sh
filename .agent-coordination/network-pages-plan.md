# Network Pages Migration Plan

## Overview
Migrate 5 network-related pages from React SPA to Astro + Vue architecture.

## Source Analysis (packages/portal/src/App.tsx)

### 1. WAN Page (lines 982-1049)
**Features:**
- Connection status card (IP, Gateway, DNS, uptime)
- WAN configuration form with 3 connection types:
  - DHCP (Automatic)
  - Static IP (requires IP, subnet, gateway, DNS)
  - PPPoE (requires username, password, service name)
- MTU and MAC clone settings
- IPv6 and VLAN tagging toggles
- Dual-WAN configuration table

**Components to create:**
- `WanStatus.vue` - Connection status display
- `WanConfig.vue` - Configuration form with dynamic fields based on connection type

### 2. LAN Page (lines 1052-1100)
**Features:**
- Primary LAN (br0) configuration
- Guest Network (br1) configuration
- VLAN configuration table with add/edit/delete

**Components to create:**
- `LanConfig.vue` - Primary and guest network config forms
- `VlanTable.vue` - VLAN list with CRUD operations

**Mock Data:**
- 4 VLANs: Default (1), IoT (10), Cameras (20), Management (99)

### 3. WiFi Page (lines 1103-1146)
**Features:**
- 4 WiFi network cards (NGFW.sh-5G, NGFW.sh-2G, IoT-Network, Guest-Network)
- Radio settings for 5GHz and 2.4GHz bands
- Channel, width, TX power configuration
- Band steering and airtime fairness toggles

**Components to create:**
- `WiFiNetworkCard.vue` - Individual network card with toggle, stats, configure button
- `RadioSettings.vue` - Radio configuration form (channel, width, power)

**Mock Data (line 132-137):**
```typescript
const wifiNetworks = [
  { ssid: 'NGFW.sh-5G', band: '5GHz', channel: 149, width: '80MHz', security: 'WPA3', clients: 18, signal: -42, hidden: false, enabled: true },
  { ssid: 'NGFW.sh-2G', band: '2.4GHz', channel: 6, width: '40MHz', security: 'WPA2/WPA3', clients: 12, signal: -38, hidden: false, enabled: true },
  { ssid: 'IoT-Network', band: '2.4GHz', channel: 11, width: '20MHz', security: 'WPA2', clients: 8, signal: -45, hidden: false, enabled: true, vlan: 10 },
  { ssid: 'Guest-Network', band: '2.4GHz', channel: 6, width: '20MHz', security: 'WPA2', clients: 2, signal: -48, hidden: false, enabled: true, isolated: true, vlan: 20 },
];
```

### 4. DHCP Page (lines 1149-1197)
**Features:**
- DHCP server configuration (start IP, end IP, lease time, domain, DNS, gateway, NTP)
- Active leases table with filter and refresh
- Static reservations table with add/edit/delete

**Components to create:**
- `DhcpConfig.vue` - Server configuration form
- `DhcpLeases.vue` - Combined active leases and static reservations tables

**Mock Data (lines 117-130):**
- 12 DHCP leases (3 static, 9 dynamic)
- Includes IP, MAC, hostname, vendor, expiry, status

### 5. Routing Page (NEW - currently placeholder at line 1883)
**Features to implement:**
- Static routes table (destination, gateway, interface, metric)
- Add route form
- Edit route modal
- Delete route confirmation

**API Endpoints (to be created by routing-api agent):**
- GET `/routing/routes` - List all static routes
- POST `/routing/routes` - Create new route
- PUT `/routing/routes/:id` - Update route
- DELETE `/routing/routes/:id` - Delete route

**Components to create:**
- `RoutingTable.vue` - Routes table with add/edit/delete actions
- `RoutingForm.vue` - Add/edit route form

**Mock Data (create in component):**
```typescript
const mockRoutes = [
  { id: 1, destination: '10.0.0.0/8', gateway: '192.168.1.254', interface: 'eth0', metric: 10, enabled: true },
  { id: 2, destination: '172.16.0.0/12', gateway: '192.168.1.253', interface: 'eth0', metric: 20, enabled: true },
  { id: 3, destination: '0.0.0.0/0', gateway: '203.0.113.1', interface: 'eth0', metric: 100, enabled: true },
];
```

## Astro Page Structure

Each page follows this template:

```astro
---
import PortalLayout from '../../layouts/PortalLayout.astro';
import { getAuth } from '@clerk/astro/server';

const auth = await getAuth(Astro.request);
if (!auth.userId) {
  return Astro.redirect('/sign-in');
}
---

<PortalLayout title="Page Title">
  <div class="space-y-6">
    <VueComponent client:load />
  </div>
</PortalLayout>
```

## Vue Component Patterns

### Using composables:
```vue
<script setup lang="ts">
import { useRoutes } from '../../composables/useRoutes';
import { useApi } from '../../composables/useApi';

const { routes, loading, error, refetch } = useRoutes();
const api = useApi();

const addRoute = async (route) => {
  await api.post('/routing/routes', route);
  await refetch();
};
</script>
```

### Using UI components:
```vue
<script setup lang="ts">
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Table from '../ui/Table.vue';
import Input from '../ui/Input.vue';
</script>
```

## File Structure

```
packages/portal-astro/src/
├── pages/
│   └── network/
│       ├── routing.astro
│       ├── wan.astro
│       ├── lan.astro
│       ├── wifi.astro
│       └── dhcp.astro
├── components/
│   ├── network/
│   │   ├── RoutingTable.vue
│   │   ├── RoutingForm.vue
│   │   ├── WanStatus.vue
│   │   ├── WanConfig.vue
│   │   ├── LanConfig.vue
│   │   ├── VlanTable.vue
│   │   ├── WiFiNetworkCard.vue
│   │   ├── RadioSettings.vue
│   │   ├── DhcpConfig.vue
│   │   └── DhcpLeases.vue
│   └── ui/ (provided by vue-components agent)
│       ├── Button.vue
│       ├── Card.vue
│       ├── Table.vue
│       ├── Input.vue
│       ├── Select.vue
│       ├── Toggle.vue
│       └── Badge.vue
├── composables/ (provided by vue-composables agent)
│   ├── useApi.ts
│   ├── useAuth.ts
│   ├── useDevices.ts
│   └── useRoutes.ts (NEW - for routing page)
└── layouts/ (provided by astro-setup agent)
    └── PortalLayout.astro
```

## Dependencies

### Required from other agents:
1. **astro-setup**: PortalLayout.astro, Clerk middleware, base Astro config
2. **vue-components**: Button, Card, Table, Input, Select, Toggle, Badge
3. **vue-composables**: useApi, useAuth, useDevices (+ new useRoutes)

### Required from routing-api agent:
- `/routing/routes` endpoints (GET, POST, PUT, DELETE)
- Zod schemas in `packages/schema/src/endpoints/routing/base.ts`

## Implementation Order

1. **Wait for prerequisites** to complete
2. Create `pages/network/` directory
3. Implement **routing.astro** first (new feature, most complex)
   - Create RoutingTable.vue
   - Create RoutingForm.vue
   - Create useRoutes.ts composable
4. Migrate **wan.astro** (split into WanStatus.vue + WanConfig.vue)
5. Migrate **lan.astro** (split into LanConfig.vue + VlanTable.vue)
6. Migrate **wifi.astro** (split into WiFiNetworkCard.vue + RadioSettings.vue)
7. Migrate **dhcp.astro** (split into DhcpConfig.vue + DhcpLeases.vue)

## Testing Checklist

- [ ] All pages accessible via direct URL (e.g., `/network/routing`)
- [ ] Clerk auth redirects to sign-in when not authenticated
- [ ] All forms submit correctly (mock responses for now)
- [ ] All tables display mock data correctly
- [ ] Toggle, input, select components work
- [ ] Add/edit/delete modals open and close
- [ ] Tailwind CSS 4 styles render correctly
- [ ] Vue components load with `client:load`
- [ ] No console errors
- [ ] TypeScript compiles with zero errors
