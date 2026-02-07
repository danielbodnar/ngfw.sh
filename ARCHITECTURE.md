# NGFW.sh Architecture

Comprehensive technical architecture for the NGFW.sh cloud-managed next-generation firewall platform.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Package Structure](#3-package-structure)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Data Storage](#5-data-storage)
6. [API Specification](#6-api-specification)
7. [Router Agent Protocol](#7-router-agent-protocol)
8. [Configuration Schemas](#8-configuration-schemas)
9. [Error Handling](#9-error-handling)
10. [Development & Deployment](#10-development--deployment)

---

## 1. System Overview

NGFW.sh replaces embedded router web interfaces with an edge-hosted management console running entirely on Cloudflare Workers. On-premises router agents connect via WebSocket to the Rust API for real-time configuration and monitoring.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Workers Edge                              │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│   │     Web      │  │    Schema    │  │     Rust     │  │    Config     │   │
│   │    Portal    │  │     API      │  │     API      │  │     Store     │   │
│   │              │  │              │  │              │  │               │   │
│   │  Astro/Vue   │  │    Hono/     │  │  workers-rs  │  │   D1/KV/R2    │   │
│   │              │  │   Chanfana   │  │              │  │               │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘   │
│         │                  │                 │                  │           │
│    app.ngfw.sh       specs.ngfw.sh      api.ngfw.sh         (bindings)      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │  WebSocket / HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Router (On-Premises)                                │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          NGFW Agent (Rust)                           │   │
│   │                               ↕                                      │   │
│   │         nftables  ·  dnsmasq  ·  hostapd  ·  WireGuard              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries

| Service | Domain | Purpose |
|---------|--------|---------|
| Portal | `app.ngfw.sh` | Dashboard SPA (Astro + Vue) |
| Marketing | `ngfw.sh` | Marketing site |
| Schema API | `specs.ngfw.sh` | OpenAPI, CRUD operations, D1 queries |
| Rust API | `api.ngfw.sh` | WebSocket RPC, Durable Objects, real-time metrics |
| Docs | `docs.ngfw.sh` | User documentation (Starlight) |

### Two API Servers

The project maintains two separate API servers that share the same D1/KV/R2 bindings:

**Schema API (`packages/schema`)** — TypeScript Hono + Chanfana server on Cloudflare Workers. Handles OpenAPI spec generation, CRUD operations, D1 queries, and user-facing REST endpoints. Uses Zod for validation.

**Rust API (`packages/api`)** — Rust workers-rs server on Cloudflare Workers. Handles WebSocket connections from router agents via Durable Objects (`AgentConnection`), JWT verification, and real-time RPC. Compiles to WASM.

---

## 2. Technology Stack

### Quick Reference

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Astro | 5.17+ |
| | Vue 3 | 3.5+ |
| | React (legacy portal) | 19 |
| | Tailwind CSS | 4.1+ |
| | Vite | 7 |
| **Backend** | Hono | 4 |
| | Chanfana (OpenAPI) | 3 |
| | Zod | 4 |
| | workers-rs | 0.7 |
| **Auth** | Clerk.com | - |
| **Database** | Cloudflare D1 | SQLite |
| **Cache** | Cloudflare KV | 4 namespaces |
| **Storage** | Cloudflare R2 | 3 buckets |
| **Runtime** | Cloudflare Workers | - |

For detailed configuration patterns, see individual package READMEs:
- [`packages/api/README.md`](packages/api/README.md) — Rust API architecture
- [`packages/schema/README.md`](packages/schema/README.md) — Schema API patterns
- [`packages/portal-astro/README.md`](packages/portal-astro/README.md) — Portal frontend

---

## 3. Package Structure

```
ngfw.sh/
├── packages/
│   ├── api/              # Rust WebSocket API (workers-rs)
│   ├── schema/           # TypeScript REST API (Hono + Chanfana)
│   ├── portal/           # React Portal (legacy, being replaced)
│   ├── portal-astro/     # Astro + Vue Portal (active development)
│   ├── www/              # Marketing site
│   ├── awrtconf/         # ASUS router config deobfuscation CLI
│   └── firmware/         # Firmware tooling and configs
├── docs/                 # Starlight documentation site
├── tests/integration/    # Docker + QEMU test environment
├── assets/               # Screenshots and media
└── .agent-coordination/  # Multi-agent coordination (archived)
```

### Package Details

#### `packages/api` — Rust WebSocket API

```
src/
├── lib.rs                       # Entry point (#[event(fetch)] macro)
├── handlers/
│   ├── mod.rs, agent.rs, fleet.rs, network.rs, router.rs
│   ├── security.rs, services.rs, system.rs, user.rs
├── middleware/
│   ├── mod.rs, auth.rs, cors.rs, rate_limit.rs
├── models/
│   ├── mod.rs, error.rs, fleet.rs, network.rs, rpc.rs
│   ├── security.rs, services.rs, system.rs, user.rs
├── rpc/
│   ├── mod.rs, agent_connection.rs  # Durable Object for WebSocket
└── storage/
    └── mod.rs                       # KV, D1, R2 abstractions
```

Uses `RefCell` for interior mutability in Durable Objects. WebSocket connections from router agents flow through the `AgentConnection` Durable Object. Release profile is size-optimized with LTO and `panic=abort`.

#### `packages/schema` — Schema API

```
src/
├── index.ts                     # Hono app, CORS, Chanfana OpenAPI registry
├── types.ts                     # AppContext type
└── endpoints/
    ├── billing/                 # Plan and subscription management
    ├── fleet/                   # Device CRUD and status
    ├── routing/                 # Static routes
    ├── nat/                     # NAT rules and UPnP
    ├── ips/                     # IDS/IPS configuration
    ├── vpn-server/              # VPN server config and peers
    ├── vpn-client/              # VPN client profiles
    ├── qos/                     # QoS traffic shaping
    ├── ddns/                    # Dynamic DNS
    ├── reports/                 # Report generation
    ├── logs/                    # Log queries
    └── onboarding/              # Device registration flow
```

Chanfana auto-generates OpenAPI 3.1 specs. Endpoints extend Chanfana base classes. Error responses use `ApiException`.

#### `packages/portal-astro` — Astro + Vue Portal

```
src/
├── components/
│   ├── layout/          # Sidebar, Header
│   ├── ui/              # Button, Card, Table, Modal, etc. (12 components)
│   ├── network/         # WAN, LAN, WiFi, DHCP, Routing (10 components)
│   ├── security/        # IPS, NAT, Firewall (5 components)
│   ├── services/        # VPN, QoS, DDNS (8 components)
│   ├── monitoring/      # Dashboards, Reports, Logs (7 components)
│   └── onboarding/      # Registration wizard (6 components)
├── composables/         # Vue API hooks (16 composables)
├── layouts/             # Base, Portal, Auth layouts
├── middleware/          # Clerk authentication
├── pages/               # Astro routes (34 pages)
├── lib/                 # API client, types
└── styles/              # Global CSS (Tailwind)
```

---

## 4. Authentication & Authorization

### Clerk.com Integration

| Parameter | Value |
|-----------|-------|
| Instance | `tough-unicorn-25` |
| Publishable Key | `pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk` |
| JWKS Endpoint | `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json` |
| Dashboard | https://dashboard.clerk.com |

#### Enabled Features

- Email + Password authentication
- Phone number authentication
- Waitlist mode
- Multi-factor authentication (MFA)
- Clerk Sessions
- B2C Billing
- Passkeys
- User API Keys

### JWT Flow

All API requests include an `Authorization: Bearer <token>` header. Tokens are JWTs issued by Clerk with the following claims:

| Claim | Description |
|-------|-------------|
| `sub` | User ID (Clerk user_id) |
| `azp` | Authorized party (client application) |
| `exp` | Expiration timestamp |
| `iat` | Issued at timestamp |
| `iss` | Issuer (Clerk instance URL) |

JWT verification uses Clerk's JWKS endpoint to validate tokens.

### Implementation by Package

**Portal (`packages/portal-astro`):** `@clerk/astro` — Clerk middleware for SSR auth checks, `useAuth()` composable for client-side state.

**Schema API (`packages/schema`):** `@clerk/backend` — `verifyToken` via custom middleware.

**Rust API (`packages/api`):** `jsonwebtoken` crate — RS256 via Web Crypto API + JWKS with KV cache.

### Router Agent Authentication

Agents authenticate using a device-specific API key stored in Cloudflare KV. The key is generated during device registration and passed in the WebSocket handshake.

### Environment Variables

| Package | Variable | Purpose |
|---------|----------|---------|
| Portal | `VITE_CLERK_PUBLISHABLE_KEY` | Client-side Clerk init |
| Schema API | `CLERK_SECRET_KEY` | Wrangler secret |
| Rust API | `CLERK_SECRET_KEY` | Wrangler secret |

---

## 5. Data Storage

### Cloudflare Bindings

Both API servers share the same bindings:

| Type | Binding | Resource | Purpose |
|------|---------|----------|---------|
| D1 | `DB` | `ngfw-db` | Users, devices, configs, subscriptions |
| KV | `DEVICES` | - | Device registry and API keys |
| KV | `CONFIGS` | - | Device configurations |
| KV | `SESSIONS` | - | User sessions |
| KV | `CACHE` | - | Blocklist and threat feed cache |
| R2 | `FIRMWARE` | - | Firmware images |
| R2 | `BACKUPS` | - | Configuration backups |
| R2 | `REPORTS` | - | Generated reports |

### D1 Database Schema

Key tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `organizations` | Business plan organizations |
| `subscriptions` | Billing subscriptions |
| `invoices` | Invoice records |
| `devices` | Registered routers |
| `audit_log` | Configuration change history |
| `ddns_configs` | DDNS provider configurations |
| `vpn_client_profiles` | VPN client profiles |

Migrations live in `packages/schema/migrations/`.

---

## 6. API Specification

### System Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system/status` | System health and uptime |
| GET | `/api/system/interfaces` | Interface list with statistics |
| GET | `/api/system/hardware` | CPU, memory, temperature data |
| POST | `/api/system/reboot` | Initiate system reboot |
| POST | `/api/system/shutdown` | Initiate system shutdown |

### WAN Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wan/config` | Current WAN configuration |
| PUT | `/api/wan/config` | Update WAN configuration |
| POST | `/api/wan/renew` | Renew DHCP lease |
| POST | `/api/wan/release` | Release DHCP lease |
| GET | `/api/wan/status` | Connection status and IP info |

### LAN Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lan/config` | LAN and bridge configuration |
| PUT | `/api/lan/config` | Update LAN configuration |
| GET | `/api/lan/vlans` | VLAN list |
| POST | `/api/lan/vlans` | Create VLAN |
| PUT | `/api/lan/vlans/:id` | Update VLAN |
| DELETE | `/api/lan/vlans/:id` | Delete VLAN |

### WiFi Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wifi/radios` | Radio configuration |
| PUT | `/api/wifi/radios/:id` | Update radio settings |
| GET | `/api/wifi/networks` | SSID list |
| POST | `/api/wifi/networks` | Create SSID |
| PUT | `/api/wifi/networks/:id` | Update SSID |
| DELETE | `/api/wifi/networks/:id` | Delete SSID |
| GET | `/api/wifi/clients` | Connected client list |

### DHCP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dhcp/config` | DHCP server configuration |
| PUT | `/api/dhcp/config` | Update DHCP configuration |
| GET | `/api/dhcp/leases` | Active lease list |
| DELETE | `/api/dhcp/leases/:ip` | Revoke lease |
| GET | `/api/dhcp/reservations` | Static reservation list |
| POST | `/api/dhcp/reservations` | Create reservation |
| DELETE | `/api/dhcp/reservations/:mac` | Delete reservation |

### Firewall Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/firewall/rules` | Rule list with hit counters |
| POST | `/api/firewall/rules` | Create rule |
| PUT | `/api/firewall/rules/:id` | Update rule |
| DELETE | `/api/firewall/rules/:id` | Delete rule |
| PUT | `/api/firewall/rules/order` | Reorder rules |
| GET | `/api/firewall/zones` | Zone configuration |
| PUT | `/api/firewall/zones/:id` | Update zone |
| GET | `/api/firewall/policies` | Default policies per zone pair |
| PUT | `/api/firewall/policies` | Update default policies |

### NAT Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/nat/rules` | NAT rule list |
| POST | `/api/nat/rules` | Create NAT rule |
| PUT | `/api/nat/rules/:id` | Update NAT rule |
| DELETE | `/api/nat/rules/:id` | Delete NAT rule |
| GET | `/api/nat/upnp` | UPnP lease list |
| DELETE | `/api/nat/upnp/:id` | Revoke UPnP lease |

### Traffic Logs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/traffic/logs` | Paginated traffic log |
| GET | `/api/traffic/logs/stream` | WebSocket real-time stream |
| GET | `/api/traffic/stats` | Aggregated statistics |
| GET | `/api/traffic/top/clients` | Top clients by bandwidth |
| GET | `/api/traffic/top/destinations` | Top destinations |

Query parameters for `/api/traffic/logs`:
- `action`: Filter by accept, drop, reject
- `proto`: Filter by protocol
- `src`: Filter by source IP or CIDR
- `dst`: Filter by destination IP or CIDR
- `port`: Filter by port
- `app`: Filter by application
- `geo`: Filter by country code
- `threat`: Filter by threat type
- `limit`: Results per page (default 50, max 500)
- `offset`: Pagination offset

### DNS Filtering

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dns/config` | DNS resolver configuration |
| PUT | `/api/dns/config` | Update DNS configuration |
| GET | `/api/dns/blocklists` | Blocklist subscriptions |
| POST | `/api/dns/blocklists` | Add blocklist |
| DELETE | `/api/dns/blocklists/:id` | Remove blocklist |
| POST | `/api/dns/blocklists/:id/update` | Force blocklist update |
| GET | `/api/dns/allowlist` | Allowlist entries |
| POST | `/api/dns/allowlist` | Add to allowlist |
| DELETE | `/api/dns/allowlist/:domain` | Remove from allowlist |
| GET | `/api/dns/queries` | Query log |
| GET | `/api/dns/stats` | Query statistics |

### IDS/IPS Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ids/config` | IDS/IPS configuration |
| PUT | `/api/ids/config` | Update IDS/IPS configuration |
| GET | `/api/ids/categories` | Rule categories |
| PUT | `/api/ids/categories/:id` | Update category (enable/disable/mode) |
| GET | `/api/ids/rules` | Custom rules |
| POST | `/api/ids/rules` | Create custom rule |
| DELETE | `/api/ids/rules/:id` | Delete custom rule |
| GET | `/api/ids/alerts` | Alert history |
| GET | `/api/ids/alerts/stream` | WebSocket real-time alerts |

### VPN Server Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vpn/server/config` | Server configuration |
| PUT | `/api/vpn/server/config` | Update server configuration |
| GET | `/api/vpn/server/peers` | Peer list |
| POST | `/api/vpn/server/peers` | Create peer |
| PUT | `/api/vpn/server/peers/:id` | Update peer |
| DELETE | `/api/vpn/server/peers/:id` | Delete peer |
| GET | `/api/vpn/server/peers/:id/qr` | Peer QR code |
| GET | `/api/vpn/server/status` | Connection status per peer |

### VPN Client Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vpn/client/profiles` | Profile list |
| POST | `/api/vpn/client/profiles` | Create profile |
| PUT | `/api/vpn/client/profiles/:id` | Update profile |
| DELETE | `/api/vpn/client/profiles/:id` | Delete profile |
| POST | `/api/vpn/client/profiles/:id/connect` | Connect to profile |
| POST | `/api/vpn/client/profiles/:id/disconnect` | Disconnect |
| GET | `/api/vpn/client/status` | Connection status |

### QoS Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/qos/config` | QoS configuration |
| PUT | `/api/qos/config` | Update QoS configuration |
| GET | `/api/qos/classes` | Traffic class definitions |
| POST | `/api/qos/classes` | Create traffic class |
| PUT | `/api/qos/classes/:id` | Update traffic class |
| DELETE | `/api/qos/classes/:id` | Delete traffic class |
| GET | `/api/qos/device-limits` | Per-device limits |
| PUT | `/api/qos/device-limits/:mac` | Set device limit |
| DELETE | `/api/qos/device-limits/:mac` | Remove device limit |

### Dynamic DNS Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ddns/config` | DDNS configuration |
| PUT | `/api/ddns/config` | Update DDNS configuration |
| POST | `/api/ddns/update` | Force DDNS update |
| GET | `/api/ddns/status` | Update status and history |

### Firmware Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/firmware/current` | Current firmware info |
| GET | `/api/firmware/available` | Available updates |
| POST | `/api/firmware/download` | Download update |
| POST | `/api/firmware/install` | Install downloaded update |
| POST | `/api/firmware/upload` | Upload manual image |
| GET | `/api/firmware/slots` | Boot slot info |
| POST | `/api/firmware/slots/:id/activate` | Activate boot slot |

### Backup Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/backup/list` | Saved backup list |
| POST | `/api/backup/create` | Create backup |
| GET | `/api/backup/:id/download` | Download backup file |
| POST | `/api/backup/restore` | Restore from backup |
| DELETE | `/api/backup/:id` | Delete backup |
| POST | `/api/backup/factory-reset` | Factory reset |

### Fleet Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fleet/devices` | Managed device list |
| POST | `/api/fleet/devices` | Register device |
| DELETE | `/api/fleet/devices/:id` | Remove device |
| GET | `/api/fleet/devices/:id/status` | Device status |
| POST | `/api/fleet/devices/:id/command` | Send command to device |
| GET | `/api/fleet/templates` | Configuration templates |
| POST | `/api/fleet/templates` | Create template |
| POST | `/api/fleet/templates/:id/apply` | Apply template to devices |

### User Account

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/profile` | User profile |
| PUT | `/api/user/profile` | Update profile |
| PUT | `/api/user/password` | Change password |
| GET | `/api/user/2fa` | 2FA status |
| POST | `/api/user/2fa/enable` | Enable 2FA |
| DELETE | `/api/user/2fa` | Disable 2FA |
| GET | `/api/user/sessions` | Active sessions |
| DELETE | `/api/user/sessions/:id` | Revoke session |

### Billing Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/plans` | List all plans |
| GET | `/api/billing/plans/:id` | Get plan details |
| GET | `/api/billing/plan` | Current subscription |
| PUT | `/api/billing/plan` | Change plan |
| GET | `/api/billing/usage` | Current period usage |
| GET | `/api/billing/payment-methods` | Payment methods |
| POST | `/api/billing/payment-methods` | Add payment method |
| DELETE | `/api/billing/payment-methods/:id` | Remove payment method |
| GET | `/api/billing/invoices` | Invoice history |
| GET | `/api/billing/invoices/:id` | Download invoice |

### Plan Tiers

| | Starter | Pro | Business | Business Plus |
|---|---------|-----|----------|---------------|
| **Monthly** | $25/mo | $49/mo | $99/mo | $199/mo |
| **Annual** | $240/yr | $468/yr | $948/yr | $1,908/yr |
| Routers | 1 | 3 | 10 | 25 |
| DNS filtering | 1 blocklist | 5 blocklists | Unlimited | Unlimited |
| DNS log retention | 24h | 7d | 30d | 90d |
| Traffic log retention | 24h | 7d | 30d | 90d |
| Audit log | 7d | 30d | 90d | 1yr |
| Config backups | 3 | 10 | 50 | Unlimited |
| VLANs | 2 | 8 | 32 | Unlimited |
| IDS/IPS | - | Yes | Yes | Yes |
| IDS/IPS custom rules | - | 10 | 100 | Unlimited |
| QoS | - | Yes | Yes | Yes |
| Dynamic DNS | - | Yes | Yes | Yes |
| Traffic streaming | - | Yes | Yes | Yes |
| Fleet management | - | - | Yes | Yes |
| API access | - | - | Yes | Yes |
| Webhooks | - | - | 5 | Unlimited |

Plan IDs: `starter`, `pro`, `business`, `business_plus`. Prices stored in cents.

### Rate Limits

| Endpoint pattern | Limit |
|------------------|-------|
| `/api/auth/*` | 10/min |
| `/api/traffic/logs` | 60/min |
| `/api/*/stream` | 5 concurrent |
| All other endpoints | 120/min |

### Webhooks

Business and Business Plus plan users can configure webhooks for these events:

| Event | Description |
|-------|-------------|
| `device.online` | Router agent connected |
| `device.offline` | Router agent disconnected |
| `threat.detected` | IDS alert triggered |
| `config.changed` | Configuration updated |
| `firmware.available` | New firmware available |

---

## 7. Router Agent Protocol

The router agent connects to the API server via WebSocket at `wss://api.ngfw.sh/agent/ws`.

### Connection Handshake

1. Agent sends `AUTH` message with device API key
2. Server responds with `AUTH_OK` or `AUTH_FAIL`
3. Agent sends `STATUS` message with current state
4. Server acknowledges with `STATUS_OK`

### Message Format

```json
{
  "id": "<uuid>",
  "type": "<message_type>",
  "payload": {}
}
```

### Server → Agent Messages

| Type | Description |
|------|-------------|
| `CONFIG_PUSH` | Push new configuration section |
| `CONFIG_FULL` | Push complete configuration |
| `EXEC` | Execute command |
| `REBOOT` | Reboot device |
| `UPGRADE` | Start firmware upgrade |
| `STATUS_REQUEST` | Request status update |

### Agent → Server Messages

| Type | Description |
|------|-------------|
| `AUTH` | Authentication request |
| `STATUS` | Status update |
| `CONFIG_ACK` | Configuration applied |
| `CONFIG_FAIL` | Configuration failed |
| `EXEC_RESULT` | Command execution result |
| `LOG` | Log message |
| `ALERT` | Security alert |
| `METRICS` | Performance metrics |

### Status Payload

```json
{
  "uptime": 1234567,
  "cpu": 23,
  "memory": 41,
  "temperature": 52,
  "load": [0.42, 0.38, 0.35],
  "interfaces": [
    {
      "name": "eth0",
      "status": "up",
      "ip": "203.0.113.42/24",
      "rx_bytes": 847293847234,
      "tx_bytes": 234827348123,
      "rx_rate": 12847293,
      "tx_rate": 3948273
    }
  ],
  "connections": 847,
  "wan_ip": "203.0.113.42",
  "firmware": "v2.4.1-stable"
}
```

### Metrics Payload

Sent every 5 seconds:

```json
{
  "timestamp": 1703520000,
  "cpu": 23,
  "memory": 41,
  "temperature": 52,
  "interfaces": {
    "eth0": { "rx_rate": 12847293, "tx_rate": 3948273 },
    "eth1": { "rx_rate": 8473920, "tx_rate": 12938470 }
  },
  "connections": {
    "total": 847,
    "tcp": 623,
    "udp": 224
  },
  "dns": {
    "queries": 1247,
    "blocked": 234,
    "cached": 847
  }
}
```

---

## 8. Configuration Schemas

### Firewall Rule

```json
{
  "id": 1,
  "name": "Allow Established",
  "enabled": true,
  "zone_from": "WAN",
  "zone_to": "LAN",
  "source": "any",
  "destination": "any",
  "protocol": "all",
  "port": "*",
  "action": "accept",
  "schedule": {
    "enabled": false,
    "start": "00:00",
    "end": "23:59",
    "days": [0, 1, 2, 3, 4, 5, 6]
  },
  "log": false,
  "hits": 48273942
}
```

### WiFi Network

```json
{
  "id": 1,
  "ssid": "NGFW.sh-5G",
  "enabled": true,
  "hidden": false,
  "radio": "wlan0",
  "security": {
    "mode": "wpa3",
    "password": "<encrypted>",
    "radius": null
  },
  "vlan": null,
  "isolated": false,
  "bandwidth_limit": null
}
```

### DHCP Configuration

```json
{
  "enabled": true,
  "interface": "br0",
  "range_start": "192.168.1.100",
  "range_end": "192.168.1.254",
  "lease_time": 86400,
  "gateway": "192.168.1.1",
  "dns": ["192.168.1.1", "1.1.1.1"],
  "domain": "lan.local",
  "ntp": ["pool.ntp.org"],
  "pxe": null
}
```

### VPN Peer

```json
{
  "id": 1,
  "name": "Phone",
  "public_key": "<base64>",
  "preshared_key": "<base64>",
  "allowed_ips": ["10.0.0.2/32"],
  "persistent_keepalive": 25,
  "enabled": true,
  "last_handshake": 1703520000,
  "rx_bytes": 8374829123,
  "tx_bytes": 5273948234
}
```

---

## 9. Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_CONFIG",
    "message": "Invalid subnet mask",
    "field": "subnet_mask",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_CONFIG` | 400 | Configuration validation failed |
| `DEVICE_OFFLINE` | 503 | Router agent not connected |
| `PLAN_LIMIT` | 403 | Plan limit exceeded |
| `RATE_LIMIT` | 429 | Too many requests |

---

## 10. Development & Deployment

### Commands

All commands run from the repository root unless noted otherwise.

#### Setup & Development

```bash
bun run setup                    # Install deps for all packages
bun run dev:portal               # Portal dev server (Vite)
bun run dev:schema               # Schema API dev server (Wrangler)
bun run dev:api                  # Rust API dev server (Wrangler)
bun run dev:www                  # Marketing site dev server
bun run dev:docs                 # Documentation dev server (Astro)
```

#### Build

```bash
bun run build                    # Build www, portal, schema, docs
bun run build:all                # Build all including Rust API
bun run build:api                # Build Rust API (worker-build --release)
```

#### Test

```bash
bun run test                     # Run schema tests (Vitest + Cloudflare pool)
bun run test:integration:docker  # RT-AX92U simulation (Docker)
bun run test:integration:qemu    # RT-AX92U simulation (QEMU VM)
```

#### Lint & Format

```bash
bun run lint                     # oxlint (config: .oxlintrc.json)
bun run lint:fix                 # oxlint --fix
bun run format                   # oxfmt --write
bun run format:check             # oxfmt --check
```

#### Database

```bash
bun run db:migrate:local         # Apply D1 migrations locally
bun run db:migrate:remote        # Apply D1 migrations to production
```

#### Deploy

```bash
bun run deploy                   # Deploy www, portal, schema, docs
bun run deploy:all               # Deploy all including Rust API
bun run deploy:api               # Deploy Rust API to api.ngfw.sh

# Secrets (must be set before first deploy):
bunx wrangler secret put CLERK_SECRET_KEY --config packages/schema/wrangler.jsonc
bunx wrangler secret put CLERK_SECRET_KEY --config packages/api/wrangler.toml
```

#### Rust API (packages/api/)

```bash
cd packages/api
cargo build --target wasm32-unknown-unknown    # Build WASM
cargo clippy                                    # Lint
cargo fmt                                       # Format
cargo install -q worker-build && worker-build --release  # Full worker build
```

### Git Workflow

```bash
lumen draft | git commit -F -    # Conventional commit via lumen
```

### Key Files

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | This document — complete technical reference |
| `PROJECT.md` | Task tracking and project status |
| `RESEARCH.md` | Market research and pricing analysis |
| `.oxlintrc.json` | Root oxlint configuration |
| `packages/portal-astro/src/` | Portal frontend source |
| `packages/api/src/rpc/agent_connection.rs` | Durable Object for WebSocket |
| `packages/schema/migrations/` | D1 SQL migrations |

---

## Appendix: Supported Router Hardware

Research completed — 4 supported routers:

| Model | Platform | WiFi | Notes |
|-------|----------|------|-------|
| ASUS RT-AX92U | Merlin NG | WiFi 6, AX6100 tri-band | Primary test target |
| GL.iNet Flint 2 (GL-MT6000) | OpenWrt | WiFi 6, quad-core | Native OpenWrt |
| Linksys WRT3200ACM | OpenWrt | AC2600, dual-core 1.8GHz | OpenWrt champion |
| GL.iNet Flint 3 | OpenWrt | WiFi 7, 5x 2.5Gb | Latest generation |

---

*Last updated: 2026-02-07*
