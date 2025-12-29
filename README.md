# NGFW.sh

Cloud-managed next-generation firewall and router administration platform.

## Overview

NGFW.sh replaces embedded router web interfaces with an edge-hosted management console. The platform runs on Cloudflare Workers and communicates with on-premises router hardware through an RPC agent.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers Edge                    │
│  ┌─────────────────┬─────────────────┬───────────────────┐  │
│  │   Web UI (SPA)  │   API Gateway   │   Config Store    │  │
│  └─────────────────┴─────────────────┴───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket / HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Router (On-Premises)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │   RPC Agent  ←→  nftables / dnsmasq / hostapd / WireGuard││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Tech stack

### Web UI

<!-- TODO: Define frontend framework -->

### API server

<!-- TODO: Define API framework -->

### Router agent

<!-- TODO: Define agent runtime -->

### Infrastructure

<!-- TODO: Define infrastructure components -->

## Features

### Authentication

| Feature                     | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| WorkOS AuthKit              | SSO, Google, GitHub, and email/password authentication |
| Session management          | Secure token-based sessions with refresh               |
| Multi-factor authentication | TOTP-based 2FA support                                 |
| Organization support        | Team-based access for business plans                   |

### Network configuration

#### WAN

- Connection types: DHCP, Static IP, PPPoE
- IPv6 configuration with prefix delegation
- Dual-WAN failover and load balancing
- VLAN tagging and MTU configuration
- MAC address cloning

#### LAN

- Subnet and gateway configuration
- VLAN management with tagged/untagged ports
- Bridge interface creation
- Guest network isolation
- Inter-VLAN routing control

#### WiFi

- Multi-SSID management (up to 8 per radio)
- Band steering between 2.4GHz and 5GHz
- Channel and width selection
- WPA2, WPA3, and WPA2/WPA3 mixed mode
- Hidden SSID support
- Per-SSID VLAN assignment
- Client isolation mode
- RADIUS authentication

#### DHCP

- IP pool configuration with ranges
- Lease time settings
- Static reservations by MAC address
- DHCP options: DNS, NTP, PXE boot, domain
- Active lease viewer with hostname resolution
- Vendor identification

### Security

#### Firewall rules

- Zone-based policy model (WAN, LAN, Guest, IoT, Custom)
- Rule matching: source/destination IP, port, protocol
- Actions: accept, drop, reject, limit, shape
- Rule scheduling with time-based activation
- Hit counters per rule
- Rule import/export (JSON format)
- Drag-and-drop rule ordering

#### NAT and port forwarding

- Destination NAT for inbound services
- 1:1 NAT for DMZ hosts
- Hairpin NAT for internal access to public services
- UPnP/NAT-PMP status and lease viewer

#### Intrusion detection and prevention

- Signature-based detection engine
- Category-based rule management
- Block or alert modes per category
- Custom rule creation
- Threat feed subscriptions
- Real-time alert stream

#### DNS filtering

- Blocklist management with multiple sources
- Per-client policy assignment
- Query logging with client attribution
- Allowlist overrides
- CNAME cloaking detection
- Cache statistics

Supported blocklists:

- AdGuard DNS Filter
- Steven Black Unified Hosts
- OISD (Basic, Big, NSFW)
- Phishing Army
- Custom URL imports

### Services

#### VPN server

- WireGuard with peer management
- Key generation and QR code export
- Per-peer allowed IPs configuration
- Connection status monitoring
- Traffic statistics per peer

#### VPN client

- Multi-provider profile support
- Kill switch configuration
- Split tunneling by IP or domain
- Auto-reconnect settings

#### QoS

- Traffic shaping with HTB and fq_codel
- Application classification via DPI
- Per-device bandwidth limits
- Priority queue assignment
- CAKE configuration for bufferbloat

#### Dynamic DNS

Supported providers:

- Cloudflare
- DuckDNS
- No-IP
- Dynu
- Custom HTTP API

### Monitoring

#### Dashboard

- System health: CPU, memory, temperature, load average
- Interface throughput with real-time graphs
- Active connection count
- Top clients by bandwidth
- Threat event summary
- WAN IP and uptime display

#### Traffic logs

- Real-time connection table
- 5-tuple display: source, destination, port, protocol, action
- TCP flag inspection
- Application identification
- GeoIP tagging
- Threat indicators
- Filtering by action, protocol, IP, application
- PCAP export

#### Grafana integration

- Configurable endpoint URL
- API token authentication
- Embedded dashboard iframe
- Pre-built dashboard templates

#### Loki integration

- LogQL query interface
- Log stream viewer
- Label and time filtering
- Saved query library

#### Reports

- Traffic analysis by application, host, geo
- Top talkers report
- Bandwidth trends over time
- Threat timeline
- Scheduled PDF export

### System administration

#### Firmware

- Current version display
- Update availability check
- Dual boot slot management
- Manual image upload with signature verification
- Rollback to previous slot

#### Backup and restore

- Configuration export (JSON)
- Optional AES encryption
- Restore with validation
- Configuration diff viewer
- Factory reset

#### System logs

- Kernel, daemon, authentication logs
- Severity filtering
- Log rotation configuration
- Remote syslog forwarding

#### Hardware information

- CPU, memory, storage details
- Interface specifications
- Temperature sensors
- Fan speed monitoring
- LED control

### Fleet management

#### Device registry

- Add and remove managed routers
- Connection status tracking
- Last seen timestamp
- Device grouping with tags

#### Fleet overview

- Grid view of all devices
- Health status indicators
- Batch configuration actions

#### Configuration templates

- Shareable configuration snippets
- Push to multiple devices
- Template versioning

### Account management

#### User profile

- Personal information editing
- Password change
- 2FA enrollment
- Connected account management (Google, GitHub)
- Notification preferences
- Active session management

#### Billing

- Plan selection and upgrade
- Monthly and annual billing cycles
- Payment method management
- Invoice history and download
- Usage meters: devices, DNS queries, VPN peers

### Subscription plans

| Plan     | Price   | Devices   | Key features                                         |
| -------- | ------- | --------- | ---------------------------------------------------- |
| Free     | $0      | 5         | Basic firewall, 24h logs                             |
| Home     | $12/mo  | 50        | DNS blocking, web filtering presets                  |
| Home+    | $24/mo  | 100       | Malware protection, VPN (5 peers), parental controls |
| Pro      | $60/mo  | Unlimited | IDS/IPS, application control, QoS, API, 3 sites      |
| Business | $120/mo | Unlimited | AD/LDAP, RADIUS, HA, compliance reports, SLA         |

### Hardware options

| Model           | Price | Specifications                                        |
| --------------- | ----- | ----------------------------------------------------- |
| NGFW.sh 100     | $149  | Dual-core 1GHz, 512MB RAM, 4x GbE                     |
| NGFW.sh 200     | $249  | Quad-core 1.5GHz, 1GB RAM, 5x GbE, WiFi 6             |
| NGFW.sh 400 Pro | $449  | Quad-core 2GHz, 4GB RAM, 8x 2.5GbE, WiFi 6E, 10G SFP+ |

## API

The API server exposes RESTful endpoints for all management operations. The router agent connects via WebSocket for real-time communication.

### Authentication

All API requests require a bearer token obtained through WorkOS AuthKit.

### Endpoints

See `AGENTS.md` for the complete API contract specification.

## Development

### Prerequisites

<!-- TODO: List prerequisites -->

### Local setup

<!-- TODO: Add setup instructions -->

### Deployment

<!-- TODO: Add deployment instructions -->

## License

<!-- TODO: Define license -->
