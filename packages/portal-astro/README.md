# NGFW.sh Portal (Astro + Vue)

> Cloud-managed next-generation firewall portal built with Astro 5 and Vue 3.

**Live portal**: [app.ngfw.sh](https://app.ngfw.sh)

## Overview

Server-rendered dashboard application on Cloudflare Pages that provides:

- **Astro 5** — Server-side rendering with Cloudflare adapter
- **Vue 3** — Interactive components with Composition API
- **Tailwind CSS 4** — Modern utility-first styling with dark theme
- **Clerk** — Authentication via `@clerk/astro` integration
- **TypeScript** — Full type safety across components and composables

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages Edge                        │
│                                                                  │
│  ┌─────────────────┐    ┌───────────────────────────────────┐   │
│  │  Astro Router   │───▶│     Vue Islands (Hydration)       │   │
│  │                 │    │                                   │   │
│  │  /dashboard     │    │  • DashboardApp.vue               │   │
│  │  /network/*     │    │  • WanConfig.vue                  │   │
│  │  /security/*    │    │  • IPSConfig.vue                  │   │
│  │  /services/*    │    │  • VPNServerConfig.vue            │   │
│  │  /monitoring/*  │    │  • ...                            │   │
│  │  /onboarding/*  │    │                                   │   │
│  └─────────────────┘    └───────────────────────────────────┘   │
│          │                           │                          │
│          ▼                           ▼                          │
│  ┌─────────────────┐    ┌───────────────────────────────────┐   │
│  │  Clerk Middleware│    │      Vue Composables              │   │
│  │                 │    │                                   │   │
│  │  • Auth check   │    │  useApi()      useDevices()       │   │
│  │  • User context │    │  useAuth()     useVPNServer()     │   │
│  │  • Redirects    │    │  usePolling()  useDashboards()    │   │
│  └─────────────────┘    └───────────────────────────────────┘   │
│                                      │                          │
│                                      ▼                          │
│                         ┌───────────────────────────────────┐   │
│                         │        API Client (lib/api)       │   │
│                         │  → specs.ngfw.sh (REST)           │   │
│                         │  → api.ngfw.sh (WebSocket)        │   │
│                         └───────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
packages/portal-astro/
├── src/
│   ├── pages/                    # Astro pages (routes)
│   │   ├── index.astro           # Landing / redirect
│   │   ├── dashboard.astro       # Main dashboard
│   │   ├── sign-in.astro         # Clerk sign-in
│   │   ├── sign-up.astro         # Clerk sign-up
│   │   ├── network/
│   │   │   └── wan.astro
│   │   ├── monitoring/
│   │   │   ├── reports.astro
│   │   │   └── dashboards/
│   │   │       ├── index.astro
│   │   │       ├── [id].astro
│   │   │       ├── traffic-analysis.astro
│   │   │       └── ...
│   │   ├── system/
│   │   │   └── logs.astro
│   │   └── onboarding/
│   │       ├── index.astro
│   │       └── complete.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro      # HTML shell
│   │   ├── AuthLayout.astro      # Auth pages
│   │   └── PortalLayout.astro    # Dashboard shell (Sidebar + Header)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Sidebar.astro
│   │   │   └── UserMenu.vue
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.vue
│   │   │   ├── Card.vue
│   │   │   ├── Modal.vue
│   │   │   ├── Table.vue
│   │   │   ├── Badge.vue
│   │   │   ├── Toggle.vue
│   │   │   ├── Spinner.vue
│   │   │   ├── Stat.vue
│   │   │   ├── GaugeComponent.vue
│   │   │   ├── MiniChart.vue
│   │   │   └── index.ts
│   │   ├── dashboard/
│   │   │   └── DashboardApp.vue
│   │   ├── network/
│   │   │   ├── WanConfig.vue
│   │   │   ├── WanStatus.vue
│   │   │   ├── LanConfig.vue
│   │   │   ├── VlanTable.vue
│   │   │   ├── DhcpConfig.vue
│   │   │   ├── DhcpLeases.vue
│   │   │   ├── RadioSettings.vue
│   │   │   ├── WiFiNetworkCard.vue
│   │   │   ├── RoutingTable.vue
│   │   │   └── RoutingForm.vue
│   │   ├── security/
│   │   │   ├── IPSConfig.vue
│   │   │   ├── IPSRuleList.vue
│   │   │   ├── IPSAlertList.vue
│   │   │   ├── NATRuleList.vue
│   │   │   └── NATRuleForm.vue
│   │   ├── services/
│   │   │   ├── VPNServerConfig.vue
│   │   │   ├── VPNPeerList.vue
│   │   │   ├── VPNPeerForm.vue
│   │   │   ├── VPNClientList.vue
│   │   │   ├── VPNClientForm.vue
│   │   │   ├── QoSRuleList.vue
│   │   │   ├── QoSRuleForm.vue
│   │   │   └── DDNSConfig.vue
│   │   ├── monitoring/
│   │   │   ├── LogViewer.vue
│   │   │   ├── LogFilter.vue
│   │   │   ├── ReportList.vue
│   │   │   ├── ReportGenerator.vue
│   │   │   ├── DashboardViewer.vue
│   │   │   └── DashboardGrid.vue
│   │   └── onboarding/
│   │       ├── OnboardingFlow.vue
│   │       ├── OnboardingWizard.vue
│   │       ├── RouterSelector.vue
│   │       ├── ConfigForm.vue
│   │       ├── OrderSummary.vue
│   │       └── OrderComplete.vue
│   ├── composables/              # Vue composables
│   │   ├── index.ts
│   │   ├── useApi.ts             # Authenticated API client
│   │   ├── useAuth.ts            # Clerk auth state
│   │   ├── usePolling.ts         # Auto-refresh data
│   │   ├── useDevices.ts         # Fleet device management
│   │   ├── useDeviceStatus.ts    # Device status polling
│   │   ├── useRegisterDevice.ts  # Device registration
│   │   ├── useRoutes.ts          # Static routing
│   │   ├── useNAT.ts             # NAT rules
│   │   ├── useIPS.ts             # IDS/IPS config
│   │   ├── useVPNServer.ts       # WireGuard server
│   │   ├── useVPNClient.ts       # VPN client profiles
│   │   ├── useQoS.ts             # Traffic shaping
│   │   ├── useDDNS.ts            # Dynamic DNS
│   │   ├── useLogs.ts            # System/security logs
│   │   ├── useReports.ts         # Report generation
│   │   └── useDashboards.ts      # Dashboard widgets
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts         # API client factory
│   │   │   ├── types.ts          # API types
│   │   │   └── errors.ts         # Error handling
│   │   └── utils/
│   │       ├── cn.ts             # Class name utility
│   │       ├── date.ts           # Date formatting
│   │       └── format.ts         # Number/data formatting
│   ├── middleware/
│   │   └── index.ts              # Clerk auth middleware
│   ├── styles/
│   │   └── globals.css           # Tailwind imports
│   └── env.d.ts                  # TypeScript env declarations
├── public/                       # Static assets
├── astro.config.mjs              # Astro configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Key Patterns

### Astro + Vue Integration

```astro
---
// pages/network/wan.astro
import PortalLayout from '@/layouts/PortalLayout.astro';
import WanConfig from '@/components/network/WanConfig.vue';
import WanStatus from '@/components/network/WanStatus.vue';
---

<PortalLayout title="WAN Configuration">
  <div class="space-y-6">
    <WanStatus client:load />
    <WanConfig client:load />
  </div>
</PortalLayout>
```

### Vue Composable Pattern

```typescript
// composables/useVPNServer.ts
import { ref, computed } from 'vue';
import { useApi } from './useApi';
import { usePolling } from './usePolling';

export function useVPNServer() {
  const api = useApi();
  const config = ref(null);
  const peers = ref([]);
  const loading = ref(false);

  async function fetchConfig() {
    loading.value = true;
    config.value = await api.get('/vpn/server/config');
    loading.value = false;
  }

  async function createPeer(data) {
    const peer = await api.post('/vpn/server/peers', data);
    peers.value.push(peer);
    return peer;
  }

  // Auto-refresh every 30 seconds
  usePolling(fetchConfig, 30000);

  return { config, peers, loading, fetchConfig, createPeer };
}
```

### API Client with Auth

```typescript
// lib/api/client.ts
export function createApiClient(getToken: () => Promise<string>): ApiClient {
  const baseUrl = import.meta.env.PUBLIC_API_URL || 'https://specs.ngfw.sh';

  async function request(path: string, options: RequestInit = {}) {
    const token = await getToken();
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    return response.json();
  }

  return { get: (path) => request(path), post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }), /* ... */ };
}
```

### Clerk Middleware

```typescript
// middleware/index.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  if (!isPublicRoute(context.request)) {
    const { userId } = auth();
    if (!userId) {
      return context.redirect('/sign-in');
    }
  }
  return next();
});
```

## Development

### Prerequisites

- Bun 1.2.23+
- Node.js 20+ (for compatibility)

### Getting Started

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Set your Clerk publishable key in .env
# VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Start development server
bun run dev
```

Portal available at `http://localhost:4321`

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run deploy` | Deploy to Cloudflare Pages |

## Authentication

### Clerk Integration

Authentication is handled by Clerk via `@clerk/astro`:

- Middleware protects routes and redirects unauthenticated users
- User context available via `Astro.locals.user` in Astro pages
- `useAuth()` composable provides auth state to Vue components

### Route Protection

| Route | Auth Required |
|-------|---------------|
| `/` | No |
| `/sign-in` | No |
| `/sign-up` | No |
| All other routes | Yes |

## Deployment

### Deploy to Cloudflare Pages

```bash
bun run build
bun run deploy
```

### Cloudflare Dashboard Configuration

| Setting | Value |
|---------|-------|
| Build command | `bun run build` |
| Build output directory | `dist` |
| Node.js version | 20 |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `PUBLIC_API_URL` | API base URL (defaults to `https://specs.ngfw.sh`) |

### Bindings (optional for SSR)

If using server-side features that access Cloudflare services:

| Type | Binding | Purpose |
|------|---------|---------|
| D1 | `DB` | Database (if needed) |
| KV | `DEVICES` | Device registry |
| KV | `CONFIGS` | Configurations |
| KV | `SESSIONS` | Sessions |
| KV | `CACHE` | Cache |
| R2 | `FIRMWARE` | Firmware |
| R2 | `BACKUPS` | Backups |
| R2 | `REPORTS` | Reports |

## UI Components

### Reusable Components

| Component | Description |
|-----------|-------------|
| `Button.vue` | Primary, secondary, danger variants |
| `Card.vue` | Container with header/body/footer |
| `Modal.vue` | Dialog overlay |
| `Table.vue` | Data table with sorting |
| `Badge.vue` | Status indicators |
| `Toggle.vue` | Switch input |
| `Spinner.vue` | Loading indicator |
| `Stat.vue` | Metric display |
| `GaugeComponent.vue` | Circular gauge |
| `MiniChart.vue` | Inline sparkline |
| `Input.vue` | Form input |
| `Select.vue` | Dropdown select |

### Design System

- **Theme**: Dark mode by default (zinc palette)
- **Layout**: Sidebar + Header shell
- **Icons**: Lucide Vue
- **Charts**: Custom Vue components

## Development Notes

- Portal uses SSR mode with Cloudflare adapter
- Vue components hydrate on client (`client:load` directive)
- All pages use `PortalLayout` which includes Sidebar and Header
- Middleware runs on every request for authentication
- API calls use Clerk session token for authorization

## Related Packages

| Package | Domain | Relationship |
|---------|--------|--------------|
| `packages/schema` | specs.ngfw.sh | REST API (consumed by portal) |
| `packages/api` | api.ngfw.sh | WebSocket RPC |
| `packages/www` | ngfw.sh | Marketing site |
| `docs/` | docs.ngfw.sh | Documentation |

## Documentation

- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** — Full system architecture
- **[PROJECT.md](../../PROJECT.md)** — Task tracking and roadmap
- **[specs.ngfw.sh](https://specs.ngfw.sh)** — API documentation
