# NGFW.sh

Cloud-managed next-generation firewall and router administration platform. Replace the terrible web interface that shipped with your router with a beautiful, secure, cloud-hosted management console.

## The Problem

### 1. Consumer routers are a security disaster

99% of home users don't know how to log into their router, let alone update the firmware to patch critical security vulnerabilities. The management portals that ship with consumer hardware are practically malware themselves — bloated, outdated, and in many cases actively phoning home to foreign servers. The firmware update situation is even worse: most consumer routers ship with known CVEs and never get patched. This is a market ripe for disruption.

### 2. Network security is either non-existent or inaccessible

IDS/IPS systems, DNS filtering, traffic analytics, and VPN management available to consumers are either non-existent, prohibitively expensive, or entirely too complicated — requiring high technical competence to set up and configure, making it a non-starter for most people. The enterprise solutions (Meraki, Palo Alto, Fortinet) start at thousands per year. The prosumer solutions (OPNsense + ZenArmor, pfSense) require you to be a network engineer. There's nothing in between.

The challenge is being extremely selective about what we can and can't do. We're still dealing with consumer hardware — we can't promise features that require enterprise-grade silicon (like certain layers of deep packet inspection at multi-gigabit speeds). But we can deliver a thoughtfully curated security stack that covers the 90% case.

### 3. Beautiful dashboards, logs, and insights for $25-199/mo

Existing DNS filtering and network monitoring tools give you flat logs — raw query data with no way to group, report, search, or visualize what's actually happening on your network. No graphs, no charts, no actionable intelligence. Enterprise firewalls solve this but cost $10K+/year and require dedicated IT staff.

NGFW.sh closes that gap: real-time, beautiful, actionable network intelligence — threat detection, ad blocking analytics, traffic patterns, device fingerprinting — all from a cloud dashboard that works from anywhere, on any device, with sub-50ms latency globally. The kind of visibility that used to require a Meraki MX or Palo Alto deployment, available to anyone for $25/mo.

## How It Works

1. **Sign up** at [app.ngfw.sh](https://app.ngfw.sh) and register your router
2. **Install the NGFW.sh agent** on your router (guided setup, under 5 minutes)
3. **Monitor and manage from the cloud** — real-time metrics, device status, and fleet management from anywhere

The router agent connects to our API via persistent WebSocket through Cloudflare Durable Objects for real-time metrics and status. The portal provides a centralized dashboard for device management, monitoring, and configuration. Advanced features (firewall rules, DNS filtering, VPN, IDS/IPS, traffic analytics, firmware updates) are rolling out progressively.

## Screenshots

> Video walkthrough: [walkthrough.webm](assets/screenshots/walkthrough.webm)

### Login & Authentication

Secure authentication via [Clerk.com](https://clerk.com) — email/password, phone, MFA, and passkeys.

<p align="center">
  <img src="assets/screenshots/01-login.png" alt="Login Page" width="400"/>
  <img src="assets/screenshots/02-signup.png" alt="Signup Page" width="400"/>
</p>

### Dashboard
![Dashboard](assets/screenshots/03-dashboard.png)

### Network Configuration
<p align="center">
  <img src="assets/screenshots/04-wan.png" alt="WAN Configuration" width="45%"/>
  <img src="assets/screenshots/08-wifi.png" alt="WiFi Configuration" width="45%"/>
</p>

### Security
<p align="center">
  <img src="assets/screenshots/05-firewall.png" alt="Firewall Rules" width="45%"/>
  <img src="assets/screenshots/06-dns-filtering.png" alt="DNS Filtering" width="45%"/>
</p>

### Billing & Plans
![Billing & Plans](assets/screenshots/07-billing.png)

## Feature Comparison

Pricing is **feature-based, not limit-based**. There are no artificial caps on devices, users, VPN peers, or firewall rules on any plan. You pay for features and capabilities, not for permission to connect your own devices.

### Pricing

| | Starter | Pro | Business | Business Plus |
|---|---|---|---|---|
| **Monthly** | $25/mo | $49/mo | $99/mo | $199/mo |
| **Annual** | $240/yr ($20/mo) | $468/yr ($39/mo) | $948/yr ($79/mo) | $1,908/yr ($159/mo) |
| **Annual savings** | 20% | 20% | 20% | 20% |
| **Managed routers** | 1 | Up to 3 | Up to 10 | Up to 25 |

### Cloud Management & Dashboard

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| Cloud-hosted management portal | Yes | Yes | Yes | Yes |
| Real-time system monitoring (CPU, RAM, temp, load) | Yes | Yes | Yes | Yes |
| Interface statistics & status | Yes | Yes | Yes | Yes |
| Automatic firmware updates | Yes | Yes | Yes | Yes |
| Dual boot slot management | Yes | Yes | Yes | Yes |
| Configuration backup & restore | 3 backups | 10 backups | 50 backups | Unlimited |
| Audit log | 7 days | 30 days | 90 days | 1 year |
| Email support | Yes | Yes | Yes | Yes |
| Priority support (4hr SLA) | - | - | - | Yes |
| Onboarding assistance | - | - | - | Yes |

### Networking

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| WAN configuration (DHCP, Static, PPPoE) | Yes | Yes | Yes | Yes |
| WAN status, DHCP lease renew/release | Yes | Yes | Yes | Yes |
| LAN / bridge configuration | Yes | Yes | Yes | Yes |
| VLANs | 2 | 8 | 32 | Unlimited |
| DHCP server & IP pools | Yes | Yes | Yes | Yes |
| DHCP static reservations | Yes | Yes | Yes | Yes |
| WiFi radio management | Yes | Yes | Yes | Yes |
| Multi-SSID configuration | Yes | Yes | Yes | Yes |
| WiFi client monitoring | Yes | Yes | Yes | Yes |
| NAT / port forwarding | Yes | Yes | Yes | Yes |
| UPnP management | Yes | Yes | Yes | Yes |
| QoS traffic shaping | - | Yes | Yes | Yes |
| Per-device bandwidth limits | - | Yes | Yes | Yes |
| Traffic class definitions | - | Yes | Yes | Yes |
| Dynamic DNS | - | Yes | Yes | Yes |

### Security

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| Stateful firewall (unlimited rules) | Yes | Yes | Yes | Yes |
| Zone-based policies | Yes | Yes | Yes | Yes |
| Rule ordering & hit counters | Yes | Yes | Yes | Yes |
| DNS filtering (ad & tracker blocking) | 1 blocklist | 5 blocklists | Unlimited | Unlimited |
| DNS allowlist / custom overrides | Yes | Yes | Yes | Yes |
| Force blocklist update | Yes | Yes | Yes | Yes |
| IDS (Intrusion Detection System) | - | Yes | Yes | Yes |
| IPS (Intrusion Prevention System) | - | Yes | Yes | Yes |
| IDS/IPS rule categories (enable/disable) | - | Yes | Yes | Yes |
| IDS/IPS custom rules | - | 10 | 100 | Unlimited |
| Real-time threat alerts (WebSocket) | - | Yes | Yes | Yes |

### VPN

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| WireGuard VPN server | Yes | Yes | Yes | Yes |
| VPN peer management (unlimited) | Yes | Yes | Yes | Yes |
| Peer QR code generation | Yes | Yes | Yes | Yes |
| VPN client profiles | Yes | Yes | Yes | Yes |
| Connect/disconnect from dashboard | Yes | Yes | Yes | Yes |
| VPN connection status monitoring | Yes | Yes | Yes | Yes |

### Logging & Analytics

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| DNS query log & statistics | 24 hours | 7 days | 30 days | 90 days |
| Traffic log with filtering (src, dst, port, proto, app, geo) | 24 hours | 7 days | 30 days | 90 days |
| Top clients by bandwidth | Yes | Yes | Yes | Yes |
| Top destinations | Yes | Yes | Yes | Yes |
| Aggregated traffic statistics | Yes | Yes | Yes | Yes |
| Real-time traffic stream (WebSocket) | - | Yes | Yes | Yes |

### Fleet Management & Integration

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| Fleet device management | - | - | Yes | Yes |
| Configuration templates | - | - | Yes | Yes |
| Apply template to multiple devices | - | - | Yes | Yes |
| Bulk device commands | - | - | Yes | Yes |
| REST API access | - | - | Yes | Yes |
| Webhook endpoints | - | - | 5 | Unlimited |

### User & Account

| Feature | Starter | Pro | Business | Business Plus |
|---|:---:|:---:|:---:|:---:|
| User profile management | Yes | Yes | Yes | Yes |
| Multi-factor authentication (MFA) | Yes | Yes | Yes | Yes |
| Passkey support | Yes | Yes | Yes | Yes |
| Session management | Yes | Yes | Yes | Yes |
| 14-day free trial | Yes | Yes | Yes | Yes |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers Edge                        │
│  ┌──────────────┬───────────────┬─────────────┬───────────────┐  │
│  │  Web Portal  │  Schema API   │  Rust API   │ Config Store  │  │
│  │ (React/Vite) │(Hono/Chanfana)│(workers-rs) │  (D1/KV/R2)  │  │
│  └──────────────┴───────────────┴─────────────┴───────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket / HTTPS
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Router (On-Premises)                           │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  RPC Agent  ←→  nftables / dnsmasq / hostapd / WireGuard│    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Routes

| Package | Domain | Purpose |
|---|---|---|
| `packages/portal` | app.ngfw.sh | Dashboard SPA |
| `packages/www` | ngfw.sh | Marketing site |
| `packages/schema` | specs.ngfw.sh | OpenAPI, CRUD, D1 |
| `packages/api` | api.ngfw.sh | WebSocket RPC, Durable Objects |
| `docs/` | docs.ngfw.sh | Documentation (Starlight) |

### Storage

| Type | Binding | Purpose |
|---|---|---|
| D1 | `DB` | Users, plans, subscriptions, configs |
| KV | `DEVICES` | Device registry & API keys |
| KV | `CONFIGS` | Device configurations |
| KV | `SESSIONS` | User sessions |
| KV | `CACHE` | Blocklist & threat feed cache |
| R2 | `FIRMWARE` | Firmware images |
| R2 | `BACKUPS` | Configuration backups |
| R2 | `REPORTS` | Generated reports |

## Tech Stack

| Component | Technology |
|---|---|
| Portal | React 19, Vite 7, Tailwind CSS 4 |
| Marketing | React 19, Vite 7, Tailwind CSS 4 |
| Schema API | Hono 4, Chanfana 3 (OpenAPI), Zod 4 |
| Rust API | workers-rs, Durable Objects, WebSocket |
| Docs | Astro 5, Starlight |
| Auth | Clerk.com |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Storage | Cloudflare R2 |

## Development

```bash
bun run setup          # Install all dependencies
bun run dev:portal     # Portal dev server
bun run dev:schema     # Schema API dev server
bun run dev:api        # Rust API dev server
bun run dev:www        # Marketing site
bun run dev:docs       # Documentation
bun run build          # Build all packages
bun run deploy         # Deploy all packages
bun run test           # Run tests
bun run lint           # Lint with oxlint
```

## Documentation

- **User Docs**: [docs.ngfw.sh](https://docs.ngfw.sh)
- **API Reference**: [specs.ngfw.sh](https://specs.ngfw.sh)
- **API Specification**: [AGENTS.md](./AGENTS.md)
- **Pricing Research**: [RESEARCH.md](./RESEARCH.md)

## License

MIT
