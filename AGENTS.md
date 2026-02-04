# NGFW.sh Agent Specification

Technical specification for the NGFW.sh API server and router agent.

## System components

### Schema API (packages/schema — specs.ngfw.sh)

TypeScript Hono + Chanfana server on Cloudflare Workers. Handles OpenAPI spec generation, CRUD operations, D1 queries, and user-facing REST endpoints. Uses Zod for validation.

### Rust API (packages/api — api.ngfw.sh)

Rust workers-rs server on Cloudflare Workers. Handles WebSocket connections from router agents via Durable Objects (`AgentConnection`), JWT verification, real-time RPC, and high-performance request handling. Compiles to WASM.

Both API servers share the same D1 database (`ngfw-db`), KV namespaces (DEVICES, CONFIGS, SESSIONS, CACHE), and R2 buckets (FIRMWARE, BACKUPS, REPORTS).

### Router agent

Runs on the router hardware. Executes configuration changes and reports status via WebSocket to the Rust API server at `wss://api.ngfw.sh/agent/ws`.

## Authentication

### Clerk.com Integration

| Parameter        | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| Instance         | `tough-unicorn-25`                                                        |
| Publishable Key  | `pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk`                 |
| JWKS Endpoint    | `https://tough-unicorn-25.clerk.accounts.dev/.well-known/jwks.json`       |
| Auth Methods     | Email/Password, Phone Number                                              |
| Dashboard        | https://dashboard.clerk.com                                               |

### Enabled Features

- Email + Password authentication
- Phone number authentication
- Waitlist mode
- Multi-factor authentication (MFA)
- Clerk Sessions
- B2C Billing
- Passkeys
- User API Keys

### API Authentication

All API requests include an `Authorization: Bearer <token>` header. Tokens are JWTs issued by Clerk with the following claims:

- `sub`: User ID (Clerk user_id)
- `azp`: Authorized party (client application)
- `exp`: Expiration timestamp
- `iat`: Issued at timestamp
- `iss`: Issuer (Clerk instance URL)

JWT verification uses Clerk's JWKS endpoint to validate tokens.

### Router agent authentication

Agents authenticate using a device-specific API key stored in Cloudflare KV. The key is generated during device registration.

## API endpoints

### System

| Method | Path                     | Description                    |
| ------ | ------------------------ | ------------------------------ |
| GET    | `/api/system/status`     | System health and uptime       |
| GET    | `/api/system/interfaces` | Interface list with statistics |
| GET    | `/api/system/hardware`   | CPU, memory, temperature data  |
| POST   | `/api/system/reboot`     | Initiate system reboot         |
| POST   | `/api/system/shutdown`   | Initiate system shutdown       |

### WAN

| Method | Path               | Description                   |
| ------ | ------------------ | ----------------------------- |
| GET    | `/api/wan/config`  | Current WAN configuration     |
| PUT    | `/api/wan/config`  | Update WAN configuration      |
| POST   | `/api/wan/renew`   | Renew DHCP lease              |
| POST   | `/api/wan/release` | Release DHCP lease            |
| GET    | `/api/wan/status`  | Connection status and IP info |

### LAN

| Method | Path                 | Description                  |
| ------ | -------------------- | ---------------------------- |
| GET    | `/api/lan/config`    | LAN and bridge configuration |
| PUT    | `/api/lan/config`    | Update LAN configuration     |
| GET    | `/api/lan/vlans`     | VLAN list                    |
| POST   | `/api/lan/vlans`     | Create VLAN                  |
| PUT    | `/api/lan/vlans/:id` | Update VLAN                  |
| DELETE | `/api/lan/vlans/:id` | Delete VLAN                  |

### WiFi

| Method | Path                     | Description           |
| ------ | ------------------------ | --------------------- |
| GET    | `/api/wifi/radios`       | Radio configuration   |
| PUT    | `/api/wifi/radios/:id`   | Update radio settings |
| GET    | `/api/wifi/networks`     | SSID list             |
| POST   | `/api/wifi/networks`     | Create SSID           |
| PUT    | `/api/wifi/networks/:id` | Update SSID           |
| DELETE | `/api/wifi/networks/:id` | Delete SSID           |
| GET    | `/api/wifi/clients`      | Connected client list |

### DHCP

| Method | Path                          | Description               |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/dhcp/config`            | DHCP server configuration |
| PUT    | `/api/dhcp/config`            | Update DHCP configuration |
| GET    | `/api/dhcp/leases`            | Active lease list         |
| DELETE | `/api/dhcp/leases/:ip`        | Revoke lease              |
| GET    | `/api/dhcp/reservations`      | Static reservation list   |
| POST   | `/api/dhcp/reservations`      | Create reservation        |
| DELETE | `/api/dhcp/reservations/:mac` | Delete reservation        |

### Firewall

| Method | Path                        | Description                    |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/api/firewall/rules`       | Rule list with hit counters    |
| POST   | `/api/firewall/rules`       | Create rule                    |
| PUT    | `/api/firewall/rules/:id`   | Update rule                    |
| DELETE | `/api/firewall/rules/:id`   | Delete rule                    |
| PUT    | `/api/firewall/rules/order` | Reorder rules                  |
| GET    | `/api/firewall/zones`       | Zone configuration             |
| PUT    | `/api/firewall/zones/:id`   | Update zone                    |
| GET    | `/api/firewall/policies`    | Default policies per zone pair |
| PUT    | `/api/firewall/policies`    | Update default policies        |

### NAT

| Method | Path                 | Description       |
| ------ | -------------------- | ----------------- |
| GET    | `/api/nat/rules`     | NAT rule list     |
| POST   | `/api/nat/rules`     | Create NAT rule   |
| PUT    | `/api/nat/rules/:id` | Update NAT rule   |
| DELETE | `/api/nat/rules/:id` | Delete NAT rule   |
| GET    | `/api/nat/upnp`      | UPnP lease list   |
| DELETE | `/api/nat/upnp/:id`  | Revoke UPnP lease |

### Traffic logs

| Method | Path                            | Description                |
| ------ | ------------------------------- | -------------------------- |
| GET    | `/api/traffic/logs`             | Paginated traffic log      |
| GET    | `/api/traffic/logs/stream`      | WebSocket real-time stream |
| GET    | `/api/traffic/stats`            | Aggregated statistics      |
| GET    | `/api/traffic/top/clients`      | Top clients by bandwidth   |
| GET    | `/api/traffic/top/destinations` | Top destinations           |

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

### DNS filtering

| Method | Path                             | Description                |
| ------ | -------------------------------- | -------------------------- |
| GET    | `/api/dns/config`                | DNS resolver configuration |
| PUT    | `/api/dns/config`                | Update DNS configuration   |
| GET    | `/api/dns/blocklists`            | Blocklist subscriptions    |
| POST   | `/api/dns/blocklists`            | Add blocklist              |
| DELETE | `/api/dns/blocklists/:id`        | Remove blocklist           |
| POST   | `/api/dns/blocklists/:id/update` | Force blocklist update     |
| GET    | `/api/dns/allowlist`             | Allowlist entries          |
| POST   | `/api/dns/allowlist`             | Add to allowlist           |
| DELETE | `/api/dns/allowlist/:domain`     | Remove from allowlist      |
| GET    | `/api/dns/queries`               | Query log                  |
| GET    | `/api/dns/stats`                 | Query statistics           |

### IDS/IPS

| Method | Path                      | Description                           |
| ------ | ------------------------- | ------------------------------------- |
| GET    | `/api/ids/config`         | IDS/IPS configuration                 |
| PUT    | `/api/ids/config`         | Update IDS/IPS configuration          |
| GET    | `/api/ids/categories`     | Rule categories                       |
| PUT    | `/api/ids/categories/:id` | Update category (enable/disable/mode) |
| GET    | `/api/ids/rules`          | Custom rules                          |
| POST   | `/api/ids/rules`          | Create custom rule                    |
| DELETE | `/api/ids/rules/:id`      | Delete custom rule                    |
| GET    | `/api/ids/alerts`         | Alert history                         |
| GET    | `/api/ids/alerts/stream`  | WebSocket real-time alerts            |

### VPN server

| Method | Path                           | Description                 |
| ------ | ------------------------------ | --------------------------- |
| GET    | `/api/vpn/server/config`       | Server configuration        |
| PUT    | `/api/vpn/server/config`       | Update server configuration |
| GET    | `/api/vpn/server/peers`        | Peer list                   |
| POST   | `/api/vpn/server/peers`        | Create peer                 |
| PUT    | `/api/vpn/server/peers/:id`    | Update peer                 |
| DELETE | `/api/vpn/server/peers/:id`    | Delete peer                 |
| GET    | `/api/vpn/server/peers/:id/qr` | Peer QR code                |
| GET    | `/api/vpn/server/status`       | Connection status per peer  |

### VPN client

| Method | Path                                      | Description        |
| ------ | ----------------------------------------- | ------------------ |
| GET    | `/api/vpn/client/profiles`                | Profile list       |
| POST   | `/api/vpn/client/profiles`                | Create profile     |
| PUT    | `/api/vpn/client/profiles/:id`            | Update profile     |
| DELETE | `/api/vpn/client/profiles/:id`            | Delete profile     |
| POST   | `/api/vpn/client/profiles/:id/connect`    | Connect to profile |
| POST   | `/api/vpn/client/profiles/:id/disconnect` | Disconnect         |
| GET    | `/api/vpn/client/status`                  | Connection status  |

### QoS

| Method | Path                          | Description               |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/qos/config`             | QoS configuration         |
| PUT    | `/api/qos/config`             | Update QoS configuration  |
| GET    | `/api/qos/classes`            | Traffic class definitions |
| POST   | `/api/qos/classes`            | Create traffic class      |
| PUT    | `/api/qos/classes/:id`        | Update traffic class      |
| DELETE | `/api/qos/classes/:id`        | Delete traffic class      |
| GET    | `/api/qos/device-limits`      | Per-device limits         |
| PUT    | `/api/qos/device-limits/:mac` | Set device limit          |
| DELETE | `/api/qos/device-limits/:mac` | Remove device limit       |

### Dynamic DNS

| Method | Path               | Description               |
| ------ | ------------------ | ------------------------- |
| GET    | `/api/ddns/config` | DDNS configuration        |
| PUT    | `/api/ddns/config` | Update DDNS configuration |
| POST   | `/api/ddns/update` | Force DDNS update         |
| GET    | `/api/ddns/status` | Update status and history |

### Firmware

| Method | Path                               | Description               |
| ------ | ---------------------------------- | ------------------------- |
| GET    | `/api/firmware/current`            | Current firmware info     |
| GET    | `/api/firmware/available`          | Available updates         |
| POST   | `/api/firmware/download`           | Download update           |
| POST   | `/api/firmware/install`            | Install downloaded update |
| POST   | `/api/firmware/upload`             | Upload manual image       |
| GET    | `/api/firmware/slots`              | Boot slot info            |
| POST   | `/api/firmware/slots/:id/activate` | Activate boot slot        |

### Backup

| Method | Path                        | Description          |
| ------ | --------------------------- | -------------------- |
| GET    | `/api/backup/list`          | Saved backup list    |
| POST   | `/api/backup/create`        | Create backup        |
| GET    | `/api/backup/:id/download`  | Download backup file |
| POST   | `/api/backup/restore`       | Restore from backup  |
| DELETE | `/api/backup/:id`           | Delete backup        |
| POST   | `/api/backup/factory-reset` | Factory reset        |

### Fleet management

| Method | Path                             | Description               |
| ------ | -------------------------------- | ------------------------- |
| GET    | `/api/fleet/devices`             | Managed device list       |
| POST   | `/api/fleet/devices`             | Register device           |
| DELETE | `/api/fleet/devices/:id`         | Remove device             |
| GET    | `/api/fleet/devices/:id/status`  | Device status             |
| POST   | `/api/fleet/devices/:id/command` | Send command to device    |
| GET    | `/api/fleet/templates`           | Configuration templates   |
| POST   | `/api/fleet/templates`           | Create template           |
| POST   | `/api/fleet/templates/:id/apply` | Apply template to devices |

### User account

| Method | Path                     | Description     |
| ------ | ------------------------ | --------------- |
| GET    | `/api/user/profile`      | User profile    |
| PUT    | `/api/user/profile`      | Update profile  |
| PUT    | `/api/user/password`     | Change password |
| GET    | `/api/user/2fa`          | 2FA status      |
| POST   | `/api/user/2fa/enable`   | Enable 2FA      |
| DELETE | `/api/user/2fa`          | Disable 2FA     |
| GET    | `/api/user/sessions`     | Active sessions |
| DELETE | `/api/user/sessions/:id` | Revoke session  |

### Billing

| Method | Path                               | Description           |
| ------ | ---------------------------------- | --------------------- |
| GET    | `/api/billing/plans`               | List all plans        |
| GET    | `/api/billing/plans/:id`           | Get plan details      |
| GET    | `/api/billing/plan`                | Current subscription  |
| PUT    | `/api/billing/plan`                | Change plan           |
| GET    | `/api/billing/usage`               | Current period usage  |
| GET    | `/api/billing/payment-methods`     | Payment methods       |
| POST   | `/api/billing/payment-methods`     | Add payment method    |
| DELETE | `/api/billing/payment-methods/:id` | Remove payment method |
| GET    | `/api/billing/invoices`            | Invoice history       |
| GET    | `/api/billing/invoices/:id`        | Download invoice      |

#### Plan tiers

| | Starter | Pro | Business | Business Plus |
|---|---|---|---|---|
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
| PDF reports | - | Monthly | Weekly | Daily |

Pricing is feature-based, not limit-based. There are no per-plan caps on devices, users, VPN peers, or firewall rules.

Plan IDs: `starter`, `pro`, `business`, `business_plus`

Prices stored in cents (e.g. `2500` = $25.00). Limit value `-1` means unlimited.

## Router agent RPC

The router agent connects to the API server via WebSocket at `wss://api.ngfw.sh/agent/ws`.

### Connection handshake

1. Agent sends `AUTH` message with device API key
2. Server responds with `AUTH_OK` or `AUTH_FAIL`
3. Agent sends `STATUS` message with current state
4. Server acknowledges with `STATUS_OK`

### Message format

```json
{
  "id": "<uuid>",
  "type": "<message_type>",
  "payload": {}
}
```

### Message types (server to agent)

| Type             | Description                    |
| ---------------- | ------------------------------ |
| `CONFIG_PUSH`    | Push new configuration section |
| `CONFIG_FULL`    | Push complete configuration    |
| `EXEC`           | Execute command                |
| `REBOOT`         | Reboot device                  |
| `UPGRADE`        | Start firmware upgrade         |
| `STATUS_REQUEST` | Request status update          |

### Message types (agent to server)

| Type          | Description              |
| ------------- | ------------------------ |
| `AUTH`        | Authentication request   |
| `STATUS`      | Status update            |
| `CONFIG_ACK`  | Configuration applied    |
| `CONFIG_FAIL` | Configuration failed     |
| `EXEC_RESULT` | Command execution result |
| `LOG`         | Log message              |
| `ALERT`       | Security alert           |
| `METRICS`     | Performance metrics      |

### Status payload

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

### Metrics payload

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

## Configuration schema

### Firewall rule

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

### WiFi network

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

### DHCP configuration

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

### VPN peer

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

## Data storage

### Cloudflare KV namespaces

| Namespace  | Purpose                         |
| ---------- | ------------------------------- |
| `DEVICES`  | Device registry and API keys    |
| `CONFIGS`  | Device configurations           |
| `SESSIONS` | User sessions                   |
| `CACHE`    | Blocklist and threat feed cache |

### Cloudflare D1 tables

| Table           | Purpose                      |
| --------------- | ---------------------------- |
| `users`         | User accounts                |
| `organizations` | Business plan organizations  |
| `subscriptions` | Billing subscriptions        |
| `invoices`      | Invoice records              |
| `audit_log`     | Configuration change history |

### Cloudflare R2 buckets

| Bucket     | Purpose               |
| ---------- | --------------------- |
| `firmware` | Firmware images       |
| `backups`  | Configuration backups |
| `reports`  | Generated PDF reports |

## Error handling

All error responses use this format:

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

### Error codes

| Code             | HTTP Status | Description                     |
| ---------------- | ----------- | ------------------------------- |
| `UNAUTHORIZED`   | 401         | Invalid or expired token        |
| `FORBIDDEN`      | 403         | Insufficient permissions        |
| `NOT_FOUND`      | 404         | Resource not found              |
| `INVALID_CONFIG` | 400         | Configuration validation failed |
| `DEVICE_OFFLINE` | 503         | Router agent not connected      |
| `PLAN_LIMIT`     | 403         | Plan limit exceeded             |
| `RATE_LIMIT`     | 429         | Too many requests               |

## Rate limits

| Endpoint pattern    | Limit        |
| ------------------- | ------------ |
| `/api/auth/*`       | 10/min       |
| `/api/traffic/logs` | 60/min       |
| `/api/*/stream`     | 5 concurrent |
| All other endpoints | 120/min      |

## Webhooks

Business and Business Plus plan users can configure webhooks for these events:

| Event                | Description               |
| -------------------- | ------------------------- |
| `device.online`      | Router agent connected    |
| `device.offline`     | Router agent disconnected |
| `threat.detected`    | IDS alert triggered       |
| `config.changed`     | Configuration updated     |
| `firmware.available` | New firmware available    |
