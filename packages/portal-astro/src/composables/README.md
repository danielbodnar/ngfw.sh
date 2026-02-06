# Vue 3 Composables for NGFW.sh

This directory contains Vue 3 Composition API composables for the NGFW.sh portal. All composables follow a consistent pattern and integrate with the Clerk authentication system.

## Architecture

```
composables/
├── index.ts                 # Barrel export
├── useApi.ts               # API client factory
├── useAuth.ts              # Clerk authentication wrapper
├── usePolling.ts           # Generic polling with visibility handling
├── useDevices.ts           # Device list management
├── useDeviceStatus.ts      # Single device polling (5s)
├── useRegisterDevice.ts    # Device registration mutation
├── useRoutes.ts            # Routing API
├── useNAT.ts              # NAT rules API
├── useIPS.ts              # IPS configuration API
├── useVPNServer.ts        # VPN server management
├── useVPNClient.ts        # VPN client profiles
├── useQoS.ts              # QoS rules API
├── useDDNS.ts             # DDNS configuration
├── useReports.ts          # Reports generation
├── useLogs.ts             # Log querying
└── useDashboards.ts       # Dashboard management
```

## Common Patterns

All data-fetching composables return a consistent interface:

```typescript
{
  data: Ref<T | T[]>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  refetch: () => Promise<void>
}
```

Mutation composables (create, update, delete) throw errors on failure, allowing components to handle them with try/catch.

## Core Composables

### `useApi()`

Returns an authenticated API client instance. Automatically includes the Clerk JWT token in all requests.

```vue
<script setup lang="ts">
import { useApi } from '@/composables';

const api = useApi();
const devices = await api.listDevices();
</script>
```

### `useAuth()`

Wraps Clerk authentication with a Vue-friendly API.

```vue
<script setup lang="ts">
import { useAuth } from '@/composables';

const { user, isSignedIn, getToken, signOut } = useAuth();
</script>

<template>
  <div v-if="isSignedIn">
    Welcome, {{ user?.firstName }}
    <button @click="signOut">Sign Out</button>
  </div>
</template>
```

**Returns:**
- `user` - Current user object (reactive)
- `isLoaded` - Whether Clerk has finished loading
- `isSignedIn` - Computed boolean (true if user exists)
- `getToken()` - Async function returning JWT token
- `signOut()` - Async function to sign out

### `usePolling(options)`

Generic polling composable with automatic pause/resume on visibility change.

```vue
<script setup lang="ts">
import { usePolling, useApi } from '@/composables';

const api = useApi();
const { data, loading, error } = usePolling({
  fetcher: () => api.getDeviceStatus('device-123'),
  interval: 5000, // 5 seconds
  immediate: true,
  enabled: true,
});
</script>
```

**Features:**
- Pauses polling when page is hidden
- Resumes when page becomes visible
- Configurable interval (default: 5000ms)
- Can be enabled/disabled reactively

## Fleet Management

### `useDevices()`

Fetches the user's device list on mount.

```vue
<script setup lang="ts">
import { useDevices } from '@/composables';

const { data: devices, loading, error, refetch } = useDevices();
</script>
```

### `useDeviceStatus(deviceId)`

Polls a single device's status every 5 seconds.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useDeviceStatus } from '@/composables';

const deviceId = ref<string | null>('device-123');
const { data: status, loading, error } = useDeviceStatus(deviceId);
</script>

<template>
  <div v-if="status">
    <p>CPU: {{ status.metrics?.cpu }}%</p>
    <p>Memory: {{ status.metrics?.memory }}%</p>
    <p>Uptime: {{ status.metrics?.uptime }}s</p>
  </div>
</template>
```

### `useRegisterDevice()`

Mutation-style hook for registering a new device.

```vue
<script setup lang="ts">
import { useRegisterDevice } from '@/composables';

const { register, loading, error } = useRegisterDevice();

async function handleRegister() {
  const result = await register({
    name: 'Edge Router',
    model: 'RT-AX92U',
  });

  console.log('API Key:', result.api_key);
  console.log('WebSocket URL:', result.websocket_url);
}
</script>
```

## Network Configuration

### `useRoutes(deviceId)`

Manages static and policy routes.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRoutes } from '@/composables';

const deviceId = ref('device-123');
const { data: routes, create, update, remove } = useRoutes(deviceId);

async function addRoute() {
  await create({
    device_id: deviceId.value,
    destination: '10.0.0.0/24',
    gateway: '192.168.1.1',
    interface: 'eth0',
    metric: 100,
  });
  await refetch();
}
</script>
```

### `useNAT(deviceId)`

Manages NAT rules (port forwarding, SNAT, DNAT).

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useNAT } from '@/composables';

const deviceId = ref('device-123');
const { data: rules, create } = useNAT(deviceId);

async function addPortForward() {
  await create({
    device_id: deviceId.value,
    name: 'Web Server',
    type: 'port_forward',
    external_ip: '203.0.113.42',
    external_port: 80,
    internal_ip: '192.168.1.10',
    internal_port: 8080,
    protocol: 'tcp',
  });
}
</script>
```

## Security

### `useIPS(deviceId)`

Manages IPS configuration, rules, and alerts.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useIPS } from '@/composables';

const deviceId = ref('device-123');
const { config, rules, alerts, updateConfig } = useIPS(deviceId);

async function enableIPS() {
  await updateConfig({
    enabled: true,
    mode: 'prevent',
    sensitivity: 'high',
  });
}
</script>
```

**Returns:**
- `config` - IPS configuration object
- `rules` - List of IPS rules
- `alerts` - Recent IPS alerts
- `updateConfig()` - Update IPS settings

## VPN Services

### `useVPNServer(deviceId)`

Manages VPN server configuration and peers.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useVPNServer } from '@/composables';

const deviceId = ref('device-123');
const { config, peers, updateConfig, createPeer, deletePeer } = useVPNServer(deviceId);

async function enableVPN() {
  await updateConfig({
    enabled: true,
    protocol: 'wireguard',
    port: 51820,
    subnet: '10.0.0.0/24',
    dns_servers: ['1.1.1.1', '8.8.8.8'],
  });
}
</script>
```

### `useVPNClient(deviceId)`

Manages VPN client profiles and connections.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useVPNClient } from '@/composables';

const deviceId = ref('device-123');
const { profiles, create, connect, disconnect, getStatus } = useVPNClient(deviceId);

async function connectToVPN(profileId: string) {
  await connect(profileId);
  const status = await getStatus(profileId);
  console.log('Connected:', status.connected);
}
</script>
```

## Traffic Management

### `useQoS(deviceId)`

Manages QoS rules for traffic shaping.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useQoS } from '@/composables';

const deviceId = ref('device-123');
const { data: rules, create } = useQoS(deviceId);

async function prioritizeVideoConf() {
  await create({
    device_id: deviceId.value,
    name: 'Video Conference Priority',
    destination_port: 8801,
    protocol: 'udp',
    priority: 'critical',
    min_bandwidth: 5000000, // 5 Mbps
  });
}
</script>
```

### `useDDNS(deviceId)`

Manages DDNS configurations.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useDDNS } from '@/composables';

const deviceId = ref('device-123');
const { data: configs, create, forceUpdate } = useDDNS(deviceId);

async function setupDDNS() {
  const config = await create({
    device_id: deviceId.value,
    provider: 'cloudflare',
    hostname: 'home.example.com',
    username: 'user@example.com',
    password: 'api-key',
    update_interval: 300,
  });

  await forceUpdate(config.id);
}
</script>
```

## Monitoring

### `useReports(deviceId)`

Generates and manages reports.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useReports } from '@/composables';

const deviceId = ref('device-123');
const { data: reports, create } = useReports(deviceId);

async function generateWeeklyReport() {
  const now = Date.now() / 1000;
  const weekAgo = now - 7 * 24 * 60 * 60;

  await create({
    device_id: deviceId.value,
    type: 'traffic',
    format: 'pdf',
    period_start: weekAgo,
    period_end: now,
  });
}
</script>
```

### `useLogs(initialQuery)`

Queries logs with reactive filters.

```vue
<script setup lang="ts">
import { useLogs } from '@/composables';

const { data: logs, loading, setQuery } = useLogs({
  device_id: 'device-123',
  level: 'error',
  limit: 100,
});

function filterByCategory(category: string) {
  setQuery({
    device_id: 'device-123',
    category,
    limit: 100,
  });
}
</script>
```

**Features:**
- Automatically refetches when query changes
- Supports filtering by level, category, time range
- Pagination support (limit/offset)

### `useDashboards()`

Manages user dashboards.

```vue
<script setup lang="ts">
import { useDashboards } from '@/composables';

const { data: dashboards, create, update } = useDashboards();

async function createCustomDashboard() {
  await create({
    name: 'Security Overview',
    layout: [
      {
        id: 'widget-1',
        type: 'chart',
        title: 'Threats Blocked',
        config: { chartType: 'line' },
        position: { x: 0, y: 0, width: 6, height: 4 },
      },
    ],
    is_default: false,
  });
}
</script>
```

## Error Handling

All composables follow a consistent error handling pattern:

```vue
<script setup lang="ts">
import { useDevices } from '@/composables';

const { data, error, refetch } = useDevices();

// Display error in template
</script>

<template>
  <div v-if="error" class="error">
    {{ error }}
    <button @click="refetch">Retry</button>
  </div>
</template>
```

For mutations, errors are thrown and should be caught:

```vue
<script setup lang="ts">
import { useRegisterDevice } from '@/composables';

const { register, error } = useRegisterDevice();

async function handleSubmit() {
  try {
    await register({ name: 'Router' });
    // Success
  } catch (err) {
    // Error is also stored in error.value
    console.error('Registration failed:', err);
  }
}
</script>
```

## TypeScript Support

All composables are fully typed. Import types from the composables module:

```typescript
import type {
  UseDevicesReturn,
  UseRoutesReturn,
  UseIPSReturn,
} from '@/composables';
```

All API types are available from `lib/api/types`:

```typescript
import type {
  Device,
  Route,
  NATRule,
  IPSConfig,
} from '@/lib/api/types';
```

## Best Practices

1. **Always use reactive refs for deviceId**: Pass `ref('device-123')` not just the string
2. **Destructure only what you need**: `const { data, loading } = useDevices()`
3. **Handle errors gracefully**: Display error messages and provide retry options
4. **Use polling sparingly**: Only poll when necessary (device status, live metrics)
5. **Clean up on unmount**: Composables handle cleanup automatically
6. **Type everything**: Leverage TypeScript for better DX and fewer runtime errors

## Related Files

- **API Client**: `/lib/api/client.ts` - HTTP client with all endpoint methods
- **API Types**: `/lib/api/types.ts` - TypeScript interfaces for all data models
- **Utilities**: `/lib/utils/` - Formatting helpers (formatBytes, formatUptime, etc.)
