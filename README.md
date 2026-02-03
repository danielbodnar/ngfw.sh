# NGFW.sh

Cloud-managed next-generation firewall and router platform built on Cloudflare's Edge network. Provides enterprise-grade network security, parental controls, and centralized device management through an intuitive web interface accessible from anywhere. Ideal for families seeking professional-level protection without complexity.

## Overview

NGFW.sh replaces embedded router web interfaces with an edge-hosted management console. The platform runs on Cloudflare Workers and communicates with on-premises router hardware through an RPC agent.

## Screenshots

> 🎥 **Video Walkthrough**: See the portal in action - [walkthrough.webm](assets/screenshots/walkthrough.webm)

### Login & Authentication

The platform uses [Clerk.com](https://clerk.com) for authentication, providing secure email/password, OAuth (Google, GitHub), phone authentication, MFA, and passkey support.

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

## Project Structure

```
ngfw.sh/
├── packages/
│   ├── api/          # Rust API server with WebSocket RPC (api.ngfw.sh)
│   ├── portal/       # React web dashboard (app.ngfw.sh)
│   ├── schema/       # TypeScript API with OpenAPI spec (specs.ngfw.sh)
│   └── www/          # Marketing website (ngfw.sh)
├── docs/             # Astro Starlight documentation (docs.ngfw.sh)
└── AGENTS.md         # API specification
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Portal | React 19, Vite 7, Tailwind CSS 4 |
| Schema API | Hono, Chanfana (OpenAPI), Cloudflare Workers |
| Rust API | workers-rs, Durable Objects, WebSocket |
| Documentation | Astro 5, Starlight |
| Database | Cloudflare D1 (SQLite) |
| Key-Value Store | Cloudflare KV |
| Object Storage | Cloudflare R2 |
| Authentication | Clerk.com (Email, Password, Phone, MFA, Passkeys) |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- Cloudflare account

### Development

```bash
# Install all dependencies
bun run setup

# Start individual dev servers
bun run dev:www      # Marketing website
bun run dev:portal   # React dashboard
bun run dev:schema   # API server
bun run dev:docs     # Documentation
```

### Deployment

```bash
# Deploy everything
bun run deploy

# Or deploy individually
bun run deploy:www
bun run deploy:portal
bun run deploy:schema
bun run deploy:docs
```

## Features

### Network Configuration
- WAN: DHCP, Static IP, PPPoE, Dual-WAN failover
- LAN: VLANs, Bridge interfaces, Guest networks
- WiFi: Multi-SSID, WPA3, Band steering, RADIUS
- DHCP: IP pools, Static reservations, Lease management

### Security
- Zone-based firewall with rule scheduling
- NAT and port forwarding with UPnP management
- DNS filtering with customizable blocklists
- IDS/IPS with Suricata signatures

### Services
- WireGuard VPN server with QR provisioning
- VPN client with split tunneling
- QoS traffic shaping
- Dynamic DNS

### Monitoring
- Real-time traffic logs with geo-location
- Application detection and threat intelligence
- Grafana and Loki integration
- PDF report generation

### Fleet Management
- Multi-device dashboard
- Configuration templates
- Batch operations

## Subscription Plans

| Plan | Price | Devices | Key Features |
|------|-------|---------|--------------|
| Free | $0 | 5 | Basic firewall, 24h logs |
| Home | $12/mo | 50 | DNS blocking, web filtering |
| Home+ | $24/mo | 100 | VPN (5 peers), parental controls |
| Pro | $60/mo | Unlimited | IDS/IPS, QoS, API access |
| Business | $120/mo | Unlimited | AD/LDAP, HA, compliance |

## Documentation

- **User Docs**: [docs.ngfw.sh](https://docs.ngfw.sh)
- **API Reference**: [specs.ngfw.sh](https://specs.ngfw.sh)
- **API Specification**: [AGENTS.md](./AGENTS.md)

## License

MIT
