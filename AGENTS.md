# NGFW.sh Agent Guide

Cloud-managed next-generation firewall and router administration platform running on Cloudflare's Edge.

## Quick Reference

| Stack Layer     | Technologies                                        |
|-----------------|-----------------------------------------------------|
| Frontend        | Astro 5 + Vue 3, Tailwind CSS 4, Vite 7            |
| Frontend (legacy) | React 19 (packages/portal — bug fixes only)      |
| Backend (TS)    | Hono 4, Chanfana 3, Zod 4, Cloudflare Workers      |
| Backend (Rust)  | workers-rs, Durable Objects, WebSocket RPC         |
| Router Agent    | Rust (tokio, async), cross-compiled for ARM64      |
| Auth            | Clerk.com                                          |
| Storage         | Cloudflare D1 (SQLite), KV, R2                     |
| Package Manager | Bun                                                |

## Build & Dev Commands

```bash
# Setup
bun run setup              # Install all package dependencies

# Development servers
bun run dev:portal         # Portal         -> localhost:5173
bun run dev:schema         # Schema API     -> localhost:8787
bun run dev:api            # Rust API       -> localhost:8788
bun run dev:www            # Marketing      -> localhost:4321
bun run dev:docs           # Documentation  -> localhost:4322

# Build
bun run build              # Build all TypeScript packages
bun run build:agent        # Cross-compile Rust agent for ARM64

# Quality
bun run lint               # Lint with oxlint
bun run lint:fix           # Auto-fix linting issues
bun run format             # Format with oxfmt
bun run format:check       # Check formatting
```

## Testing

```bash
# TypeScript tests (Vitest + Cloudflare Workers pool)
bun run test               # Run schema tests
bun run test:schema        # Same as above

# Run a single test file
cd packages/schema && npx vitest run tests/integration/tasks.test.ts --config tests/vitest.config.mts

# Run tests matching a pattern
cd packages/schema && npx vitest run -t "should create" --config tests/vitest.config.mts

# Rust tests
cargo test -p ngfw-protocol            # Protocol crate tests
cargo test -p ngfw-agent               # Agent tests
cargo test -p ngfw-agent test_name     # Single test by name

# Integration & E2E
bun run test:integration               # Docker-based integration tests
bun run test:e2e                       # End-to-end tests
bun run test:e2e:smoke                 # Quick smoke tests
```

## Code Style

### TypeScript

**Formatting:**
- Single quotes, no semicolons
- 2-space indentation (tabs in JSON configs)
- Linting: `oxlint` (config in `.oxlintrc.json`)
- Formatting: `oxfmt`

**Imports - order by group:**
```typescript
// 1. Framework/platform imports
import { SELF } from "cloudflare:test";
import { contentJson, OpenAPIRoute } from "chanfana";
// 2. External libraries
import { z } from "zod";
// 3. Local modules (use type imports when only importing types)
import type { AppContext } from "../../types";
import { device } from "./base";
```

**TypeScript strictness:**
- `strict: true` enabled
- `noUncheckedIndexedAccess: true`
- Use `type` for type aliases, `interface` for object shapes
- Prefer explicit return types on exported functions

**Naming conventions:**
- PascalCase: Components, Types, Classes (`Dashboard`, `DeviceList`, `AppContext`)
- camelCase: functions, variables, properties (`formatBytes`, `userId`)
- SCREAMING_SNAKE_CASE: constants, env vars (`CLERK_SECRET_KEY`)
- Descriptive names over abbreviations

### API Endpoints (Chanfana pattern)

```typescript
export class DeviceList extends OpenAPIRoute {
  schema = {
    tags: ["Fleet"],
    summary: "List all devices",
    operationId: "fleet-device-list",
    security: [{ bearerAuth: [] }],
    responses: { "200": { description: "List of devices", ...contentJson(z.object({
      success: z.boolean(), result: z.array(deviceSchema),
    })) } },
  };

  async handle(c: AppContext) {
    const userId = c.get("userId");
    return { success: true, result: results };
  }
}
```

### Test Patterns (Vitest)

```typescript
import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Feature Name", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should do something specific", async () => {
    const response = await SELF.fetch("http://local.test/endpoint", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "value" }),
    });
    expect(response.status).toBe(201);
    const body = await response.json<{ success: boolean; result: any }>();
    expect(body.success).toBe(true);
  });
});
```

### Vue / Astro Patterns

- Astro pages (`.astro`) for routing and static content
- Vue 3 components (`.vue`) for interactivity — use Composition API (`ref`, `computed`, `watch`)
- Utility `cn()` for conditional classes: `cn('base', condition && 'class')`
- Icons from `lucide-vue-next`

### Rust

- Follow Rust API Guidelines and rustfmt
- Address all clippy warnings (`cargo clippy --all-targets --all-features -- -D warnings`)
- Use `anyhow::Result` for application errors with `.context()`
- Use `tracing` for logging (`info!`, `error!`)
- No `unwrap()` in production code paths

## Error Handling

**TypeScript:**
- Return `{ success: false, errors: [{ code, message }] }` for API errors
- Use Zod for validation; Chanfana handles validation errors automatically
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found

**Rust:**
- Use `anyhow::Result<T>` for fallible functions
- Add context: `.context("Failed to load config")?`

### Error Codes

| Code             | HTTP Status | Description                     |
| ---------------- | ----------- | ------------------------------- |
| `UNAUTHORIZED`   | 401         | Invalid or expired token        |
| `FORBIDDEN`      | 403         | Insufficient permissions        |
| `NOT_FOUND`      | 404         | Resource not found              |
| `INVALID_CONFIG` | 400         | Configuration validation failed |
| `DEVICE_OFFLINE` | 503         | Router agent not connected      |
| `PLAN_LIMIT`     | 403         | Plan limit exceeded             |
| `RATE_LIMIT`     | 429         | Too many requests               |

### Rate Limits

| Endpoint pattern    | Limit        |
| ------------------- | ------------ |
| `/api/auth/*`       | 10/min       |
| `/api/traffic/logs` | 60/min       |
| `/api/*/stream`     | 5 concurrent |
| All other endpoints | 120/min      |

## Database (D1)

```bash
bun run db:migrate         # Apply migrations locally
bun run db:migrate:remote  # Apply migrations to production
```

Use prepared statements:
```typescript
const { results } = await db.prepare("SELECT * FROM devices WHERE owner_id = ?").bind(userId).all();
```

### D1 Tables

| Table               | Purpose                      |
| ------------------- | ---------------------------- |
| `users`             | User accounts                |
| `organizations`     | Business plan organizations  |
| `subscriptions`     | Billing subscriptions        |
| `invoices`          | Invoice records              |
| `devices`           | Registered routers           |
| `audit_log`         | Configuration change history |
| `ddns_configs`      | DDNS provider configurations |
| `vpn_client_profiles` | VPN client profiles        |

## Deployment

```bash
bun run deploy             # Deploy all packages
bun run deploy:schema      # Deploy schema API only
bun run deploy:portal      # Deploy portal only
```

---

## Router Agent RPC Protocol

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

### Message Types (Server to Agent)

| Type             | Description                    |
| ---------------- | ------------------------------ |
| `CONFIG_PUSH`    | Push new configuration section |
| `CONFIG_FULL`    | Push complete configuration    |
| `EXEC`           | Execute command                |
| `REBOOT`         | Reboot device                  |
| `UPGRADE`        | Start firmware upgrade         |
| `STATUS_REQUEST` | Request status update          |
| `PING`           | Keepalive ping                 |
| `MODE_UPDATE`    | Update agent operating mode    |

### Message Types (Agent to Server)

| Type          | Description              |
| ------------- | ------------------------ |
| `AUTH`        | Authentication request   |
| `AUTH_OK`     | Authentication successful |
| `AUTH_FAIL`   | Authentication failed    |
| `STATUS`      | Status update            |
| `STATUS_OK`   | Status acknowledged      |
| `CONFIG_ACK`  | Configuration applied    |
| `CONFIG_FAIL` | Configuration failed     |
| `EXEC_RESULT` | Command execution result |
| `LOG`         | Log message              |
| `ALERT`       | Security alert           |
| `METRICS`     | Performance metrics      |
| `PONG`        | Keepalive response       |
| `MODE_ACK`    | Mode change acknowledged |
| `ERROR`       | Error response           |

### Agent Modes

| Mode       | Description                                    |
| ---------- | ---------------------------------------------- |
| `observe`  | Read-only monitoring, no configuration changes |
| `shadow`   | Validate changes without applying them         |
| `takeover` | Full control — apply all configuration changes |

`ModeConfig` supports per-section overrides (e.g., `observe` globally but `takeover` for firewall).

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

## Configuration Schemas

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

## Plan Tiers

Pricing is feature-based, not limit-based. No per-plan caps on devices, users, VPN peers, or firewall rules. Plan IDs: `starter`, `pro`, `business`, `business_plus`. Prices stored in cents.

| | Starter | Pro | Business | Business Plus |
|---|---|---|---|---|
| **Monthly** | $25/mo | $49/mo | $99/mo | $199/mo |
| **Annual** | $240/yr | $468/yr | $948/yr | $1,908/yr |
| DNS filtering | 1 blocklist | 5 blocklists | Unlimited | Unlimited |
| DNS log retention | 24h | 7d | 30d | 90d |
| Traffic log retention | 24h | 7d | 30d | 90d |
| Audit log | 7d | 30d | 90d | 1yr |
| Config backups | 3 | 10 | 50 | Unlimited |
| VLANs | 2 | 8 | 32 | Unlimited |
| IDS/IPS | — | Yes | Yes | Yes |
| IDS/IPS custom rules | — | 10 | 100 | Unlimited |
| QoS | — | Yes | Yes | Yes |
| Dynamic DNS | — | Yes | Yes | Yes |
| Traffic streaming | — | Yes | Yes | Yes |
| Fleet management | — | — | Yes | Yes |
| API access | — | — | Yes | Yes |
| Webhooks | — | — | 5 | Unlimited |

## Webhooks

Business and Business Plus plan users can configure webhooks for these events:

| Event                | Description               |
| -------------------- | ------------------------- |
| `device.online`      | Router agent connected    |
| `device.offline`     | Router agent disconnected |
| `threat.detected`    | IDS alert triggered       |
| `config.changed`     | Configuration updated     |
| `firmware.available` | New firmware available    |
