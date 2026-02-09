# NGFW.sh API E2E Test Plan

## Overview

This document outlines comprehensive end-to-end (E2E) tests for all Rust API routes in the NGFW.sh platform. Tests are designed to run in both QEMU VM and Docker container environments.

## Test Environment

### Target Environments
1. **Docker**: Fast, CI-friendly testing with mocked system binaries
2. **QEMU VM**: Full system emulation for integration testing

### Prerequisites
- Docker with BuildKit
- QEMU system aarch64 (for VM tests)
- Cross-compilation toolchain
- Test API server (WebSocket RPC server)

## API Route Inventory

### Total Routes: 97

| Category | Count | Routes |
|----------|-------|--------|
| System | 8 | status, interfaces, hardware, reboot, shutdown, metrics |
| WAN | 5 | config (get/put), renew, release, status |
| LAN | 5 | config (get/put), vlans (CRUD) |
| WiFi | 7 | radios (get/put), networks (CRUD), clients |
| DHCP | 6 | config (get/put), leases, reservations (CRUD) |
| Firewall | 9 | rules (CRUD), zones (get/put), policies (get/put) |
| NAT | 5 | rules (CRUD), upnp leases |
| Traffic | 5 | logs, stream, stats, top clients/destinations |
| DNS Filtering | 8 | config, blocklists, allowlist, queries, stats |
| IDS/IPS | 7 | config, categories, rules, alerts, stream |
| VPN Server | 6 | config, peers (CRUD), QR code, status |
| VPN Client | 6 | profiles (CRUD), connect, disconnect, status |
| QoS | 6 | config, classes (CRUD), device limits |
| DDNS | 4 | config, update, status |
| Firmware | 6 | current, available, download, install, upload, slots |
| Backup | 6 | list, create, download, restore, delete, factory reset |
| Fleet | 6 | devices (CRUD), status, command, templates |
| User | 4 | profile (get/put), password, 2FA |
| Sessions | 2 | list, revoke |
| Billing | 7 | plan, usage, payment methods, invoices |
| Agent | 1 | WebSocket endpoint |
| Health | 1 | Health check |

## Test Categories

### 1. Authentication Tests
- Valid JWT token acceptance
- Invalid token rejection
- Expired token rejection
- Missing token handling
- Device API key validation
- Clerk JWKS integration

### 2. Authorization Tests
- User device access control
- Plan-based feature gating (Starter vs Pro vs Business)
- Device limit enforcement
- Organization access control

### 3. Route-Specific Tests

#### System Routes

##### GET /api/system/status
```rust
Test: test_system_status_authorized
- Valid auth → 200 OK with system metrics
- Missing device ID header → 400
- Invalid device ID → 403
- Device not owned by user → 403
```

##### GET /api/system/interfaces
```rust
Test: test_system_interfaces_list
- Valid auth → 200 OK with interface list
- Verify interface structure (name, mac, ip, status)
```

##### GET /api/system/hardware
```rust
Test: test_system_hardware_info
- Valid auth → 200 OK with CPU, memory, temp data
- Verify hardware metrics structure
```

##### POST /api/system/reboot
```rust
Test: test_system_reboot_command
- Valid auth → 200 OK, command sent to device
- Device offline → 503 Service Unavailable
```

##### POST /api/system/shutdown
```rust
Test: test_system_shutdown_command
- Valid auth → 200 OK, command sent to device
- Device offline → 503 Service Unavailable
```

##### GET /api/metrics/latest
```rust
Test: test_metrics_latest_polling
- Valid auth → 200 OK with latest metrics
- Metrics include: cpu, memory, network stats, uptime
```

#### WAN Routes

##### GET /api/wan/config
```rust
Test: test_wan_config_read
- Valid auth → 200 OK with WAN config
- Config includes: mode (dhcp/static/pppoe), ip, gateway, dns
```

##### PUT /api/wan/config
```rust
Test: test_wan_config_update
- Valid config → 200 OK, config applied
- Invalid config → 400 Bad Request
- Validation: IP format, gateway reachability
```

##### POST /api/wan/renew
```rust
Test: test_wan_dhcp_renew
- DHCP mode → 200 OK, renew command sent
- Static mode → 400 Bad Request (not applicable)
```

##### POST /api/wan/release
```rust
Test: test_wan_dhcp_release
- DHCP mode → 200 OK, release command sent
- Static mode → 400 Bad Request
```

##### GET /api/wan/status
```rust
Test: test_wan_status_info
- Valid auth → 200 OK with connection status
- Status includes: connected, ip, gateway, dns, uptime
```

#### LAN Routes

##### GET /api/lan/config
```rust
Test: test_lan_config_read
- Valid auth → 200 OK with LAN config
- Config includes: ip, netmask, gateway
```

##### PUT /api/lan/config
```rust
Test: test_lan_config_update
- Valid config → 200 OK, config applied
- IP conflict → 400 Bad Request
- Invalid subnet → 400 Bad Request
```

##### GET /api/lan/vlans
```rust
Test: test_lan_vlans_list
- Valid auth → 200 OK with VLAN list
- Empty list if no VLANs configured
```

##### POST /api/lan/vlans
```rust
Test: test_lan_vlan_create
- Valid VLAN (id: 10, subnet: 192.168.10.0/24) → 201 Created
- Duplicate VLAN ID → 409 Conflict
- Invalid VLAN ID (0, 4095+) → 400 Bad Request
```

##### PUT /api/lan/vlans/:id
```rust
Test: test_lan_vlan_update
- Valid update → 200 OK
- Non-existent VLAN → 404 Not Found
```

##### DELETE /api/lan/vlans/:id
```rust
Test: test_lan_vlan_delete
- Existing VLAN → 200 OK
- Non-existent VLAN → 404 Not Found
```

#### WiFi Routes

##### GET /api/wifi/radios
```rust
Test: test_wifi_radios_list
- Valid auth → 200 OK with radio list
- Radios include: band (2.4GHz, 5GHz), channel, power
```

##### PUT /api/wifi/radios/:id
```rust
Test: test_wifi_radio_update
- Valid settings (channel, power) → 200 OK
- Invalid channel → 400 Bad Request
- Radio ID not found → 404 Not Found
```

##### GET /api/wifi/networks
```rust
Test: test_wifi_networks_list
- Valid auth → 200 OK with network list
```

##### POST /api/wifi/networks
```rust
Test: test_wifi_network_create
- Valid network (ssid, password, security) → 201 Created
- Weak password → 400 Bad Request
- Duplicate SSID → 409 Conflict
```

##### PUT /api/wifi/networks/:id
```rust
Test: test_wifi_network_update
- Valid update → 200 OK
- Network not found → 404 Not Found
```

##### DELETE /api/wifi/networks/:id
```rust
Test: test_wifi_network_delete
- Existing network → 200 OK
- Network not found → 404 Not Found
```

##### GET /api/wifi/clients
```rust
Test: test_wifi_clients_list
- Valid auth → 200 OK with connected clients
- Clients include: mac, ip, signal, rx/tx bytes
```

#### DHCP Routes

##### GET /api/dhcp/config
```rust
Test: test_dhcp_config_read
- Valid auth → 200 OK with DHCP config
- Config includes: enabled, range start/end, lease time
```

##### PUT /api/dhcp/config
```rust
Test: test_dhcp_config_update
- Valid config → 200 OK
- Invalid IP range → 400 Bad Request
- Range conflict with gateway → 400 Bad Request
```

##### GET /api/dhcp/leases
```rust
Test: test_dhcp_leases_list
- Valid auth → 200 OK with active leases
- Leases include: ip, mac, hostname, expires
```

##### DELETE /api/dhcp/leases/:ip
```rust
Test: test_dhcp_lease_revoke
- Active lease → 200 OK
- Non-existent lease → 404 Not Found
```

##### GET /api/dhcp/reservations
```rust
Test: test_dhcp_reservations_list
- Valid auth → 200 OK with reservation list
```

##### POST /api/dhcp/reservations
```rust
Test: test_dhcp_reservation_create
- Valid reservation (mac, ip, hostname) → 201 Created
- Duplicate MAC → 409 Conflict
- IP outside DHCP range → 400 Bad Request
```

##### DELETE /api/dhcp/reservations/:mac
```rust
Test: test_dhcp_reservation_delete
- Existing reservation → 200 OK
- Non-existent reservation → 404 Not Found
```

#### Firewall Routes

##### GET /api/firewall/rules
```rust
Test: test_firewall_rules_list
- Valid auth → 200 OK with rules list
- Rules include: action, src/dst, protocol, ports
```

##### POST /api/firewall/rules
```rust
Test: test_firewall_rule_create
- Valid rule → 201 Created
- Invalid rule (bad IP format) → 400 Bad Request
```

##### PUT /api/firewall/rules/:id
```rust
Test: test_firewall_rule_update
- Valid update → 200 OK
- Rule not found → 404 Not Found
```

##### DELETE /api/firewall/rules/:id
```rust
Test: test_firewall_rule_delete
- Existing rule → 200 OK
- Rule not found → 404 Not Found
```

##### PUT /api/firewall/rules/order
```rust
Test: test_firewall_rules_reorder
- Valid rule ID order → 200 OK
- Invalid rule ID in list → 400 Bad Request
```

##### GET /api/firewall/zones
```rust
Test: test_firewall_zones_list
- Valid auth → 200 OK with zones (WAN, LAN, DMZ)
```

##### PUT /api/firewall/zones/:id
```rust
Test: test_firewall_zone_update
- Valid zone config → 200 OK
- Zone not found → 404 Not Found
```

##### GET /api/firewall/policies
```rust
Test: test_firewall_policies_list
- Valid auth → 200 OK with zone policies
```

##### PUT /api/firewall/policies
```rust
Test: test_firewall_policies_update
- Valid policies → 200 OK
- Invalid policy → 400 Bad Request
```

#### NAT Routes

##### GET /api/nat/rules
```rust
Test: test_nat_rules_list
- Valid auth → 200 OK with NAT rules
```

##### POST /api/nat/rules
```rust
Test: test_nat_rule_create
- Valid port forward (22 → 192.168.1.100:22) → 201 Created
- Port conflict → 409 Conflict
- Invalid port → 400 Bad Request
```

##### PUT /api/nat/rules/:id
```rust
Test: test_nat_rule_update
- Valid update → 200 OK
- Rule not found → 404 Not Found
```

##### DELETE /api/nat/rules/:id
```rust
Test: test_nat_rule_delete
- Existing rule → 200 OK
- Rule not found → 404 Not Found
```

##### GET /api/nat/upnp
```rust
Test: test_nat_upnp_leases_list
- Valid auth → 200 OK with UPnP leases
```

##### DELETE /api/nat/upnp/:id
```rust
Test: test_nat_upnp_lease_revoke
- Active lease → 200 OK
- Lease not found → 404 Not Found
```

#### Traffic Monitoring Routes

##### GET /api/traffic/logs
```rust
Test: test_traffic_logs_query
- Valid auth → 200 OK with traffic logs
- Query params: limit, offset, src, dst, protocol
```

##### GET /api/traffic/logs/stream
```rust
Test: test_traffic_logs_stream
- Valid auth → 200 OK, Server-Sent Events stream
- Continuous log updates
```

##### GET /api/traffic/stats
```rust
Test: test_traffic_stats_aggregate
- Valid auth → 200 OK with aggregate stats
- Stats include: total bytes, packets, sessions
```

##### GET /api/traffic/top/clients
```rust
Test: test_traffic_top_clients
- Valid auth → 200 OK with top clients by traffic
- Clients sorted by total bytes descending
```

##### GET /api/traffic/top/destinations
```rust
Test: test_traffic_top_destinations
- Valid auth → 200 OK with top destinations
- Destinations sorted by total bytes descending
```

#### DNS Filtering Routes

##### GET /api/dns/config
```rust
Test: test_dns_config_read
- Valid auth → 200 OK with DNS config
- Config includes: enabled, upstream servers
```

##### PUT /api/dns/config
```rust
Test: test_dns_config_update
- Valid config → 200 OK
- Invalid upstream server → 400 Bad Request
```

##### GET /api/dns/blocklists
```rust
Test: test_dns_blocklists_list
- Valid auth → 200 OK with blocklist URLs
```

##### POST /api/dns/blocklists
```rust
Test: test_dns_blocklist_add
- Valid URL → 201 Created
- Duplicate URL → 409 Conflict
- Invalid URL → 400 Bad Request
```

##### DELETE /api/dns/blocklists/:id
```rust
Test: test_dns_blocklist_remove
- Existing blocklist → 200 OK
- Blocklist not found → 404 Not Found
```

##### POST /api/dns/blocklists/:id/update
```rust
Test: test_dns_blocklist_refresh
- Valid blocklist ID → 200 OK, refresh triggered
- Blocklist not found → 404 Not Found
```

##### GET /api/dns/allowlist
```rust
Test: test_dns_allowlist_read
- Valid auth → 200 OK with allowed domains
```

##### POST /api/dns/allowlist
```rust
Test: test_dns_allowlist_add_domain
- Valid domain → 201 Created
- Duplicate domain → 409 Conflict
```

##### DELETE /api/dns/allowlist/:domain
```rust
Test: test_dns_allowlist_remove_domain
- Existing domain → 200 OK
- Domain not found → 404 Not Found
```

##### GET /api/dns/queries
```rust
Test: test_dns_queries_log
- Valid auth → 200 OK with query history
- Queries include: timestamp, domain, client, blocked
```

##### GET /api/dns/stats
```rust
Test: test_dns_stats_aggregate
- Valid auth → 200 OK with DNS stats
- Stats include: total queries, blocked, allowed
```

#### IDS/IPS Routes

##### GET /api/ids/config
```rust
Test: test_ids_config_read
- Valid auth → 200 OK with IDS config
- Config includes: enabled, mode (alert/block)
```

##### PUT /api/ids/config
```rust
Test: test_ids_config_update
- Valid config → 200 OK
- Invalid mode → 400 Bad Request
```

##### GET /api/ids/categories
```rust
Test: test_ids_categories_list
- Valid auth → 200 OK with threat categories
```

##### PUT /api/ids/categories/:id
```rust
Test: test_ids_category_update
- Valid update (enable/disable) → 200 OK
- Category not found → 404 Not Found
```

##### GET /api/ids/rules
```rust
Test: test_ids_rules_list
- Valid auth → 200 OK with custom rules
```

##### POST /api/ids/rules
```rust
Test: test_ids_rule_create
- Valid rule → 201 Created
- Invalid rule syntax → 400 Bad Request
```

##### DELETE /api/ids/rules/:id
```rust
Test: test_ids_rule_delete
- Existing rule → 200 OK
- Rule not found → 404 Not Found
```

##### GET /api/ids/alerts
```rust
Test: test_ids_alerts_query
- Valid auth → 200 OK with alert history
- Alerts include: timestamp, severity, signature, src/dst
```

##### GET /api/ids/alerts/stream
```rust
Test: test_ids_alerts_stream
- Valid auth → 200 OK, Server-Sent Events stream
- Real-time alert notifications
```

#### VPN Server Routes

##### GET /api/vpn/server/config
```rust
Test: test_vpn_server_config_read
- Valid auth + Pro plan → 200 OK
- Starter plan → 402 Payment Required
```

##### PUT /api/vpn/server/config
```rust
Test: test_vpn_server_config_update
- Valid config (port, subnet) → 200 OK
- Invalid subnet → 400 Bad Request
- Starter plan → 402 Payment Required
```

##### GET /api/vpn/server/peers
```rust
Test: test_vpn_server_peers_list
- Valid auth + Pro plan → 200 OK
```

##### POST /api/vpn/server/peers
```rust
Test: test_vpn_server_peer_create
- Valid peer (name, public_key) → 201 Created
- Duplicate public key → 409 Conflict
- Starter plan → 402 Payment Required
```

##### PUT /api/vpn/server/peers/:id
```rust
Test: test_vpn_server_peer_update
- Valid update → 200 OK
- Peer not found → 404 Not Found
```

##### DELETE /api/vpn/server/peers/:id
```rust
Test: test_vpn_server_peer_delete
- Existing peer → 200 OK
- Peer not found → 404 Not Found
```

##### GET /api/vpn/server/peers/:id/qr
```rust
Test: test_vpn_server_peer_qr_code
- Valid peer ID → 200 OK with QR code (PNG)
- Peer not found → 404 Not Found
```

##### GET /api/vpn/server/status
```rust
Test: test_vpn_server_status
- Valid auth + Pro plan → 200 OK with server status
- Status includes: running, connected peers
```

#### VPN Client Routes

##### GET /api/vpn/client/profiles
```rust
Test: test_vpn_client_profiles_list
- Valid auth → 200 OK with profile list
```

##### POST /api/vpn/client/profiles
```rust
Test: test_vpn_client_profile_create
- Valid profile (name, config) → 201 Created
- Invalid config → 400 Bad Request
```

##### PUT /api/vpn/client/profiles/:id
```rust
Test: test_vpn_client_profile_update
- Valid update → 200 OK
- Profile not found → 404 Not Found
```

##### DELETE /api/vpn/client/profiles/:id
```rust
Test: test_vpn_client_profile_delete
- Existing profile → 200 OK
- Profile not found → 404 Not Found
```

##### POST /api/vpn/client/profiles/:id/connect
```rust
Test: test_vpn_client_connect
- Valid profile → 200 OK, connection initiated
- Already connected → 409 Conflict
- Profile not found → 404 Not Found
```

##### POST /api/vpn/client/profiles/:id/disconnect
```rust
Test: test_vpn_client_disconnect
- Connected profile → 200 OK, disconnection initiated
- Not connected → 400 Bad Request
```

##### GET /api/vpn/client/status
```rust
Test: test_vpn_client_status
- Valid auth → 200 OK with connection status
- Status includes: connected, profile, duration
```

#### QoS Routes

##### GET /api/qos/config
```rust
Test: test_qos_config_read
- Valid auth → 200 OK with QoS config
- Config includes: enabled, upload/download limits
```

##### PUT /api/qos/config
```rust
Test: test_qos_config_update
- Valid config → 200 OK
- Invalid bandwidth → 400 Bad Request
```

##### GET /api/qos/classes
```rust
Test: test_qos_traffic_classes_list
- Valid auth → 200 OK with class list
```

##### POST /api/qos/classes
```rust
Test: test_qos_traffic_class_create
- Valid class (name, priority, bandwidth) → 201 Created
- Invalid priority → 400 Bad Request
```

##### PUT /api/qos/classes/:id
```rust
Test: test_qos_traffic_class_update
- Valid update → 200 OK
- Class not found → 404 Not Found
```

##### DELETE /api/qos/classes/:id
```rust
Test: test_qos_traffic_class_delete
- Existing class → 200 OK
- Class not found → 404 Not Found
```

##### GET /api/qos/device-limits
```rust
Test: test_qos_device_limits_list
- Valid auth → 200 OK with per-device limits
```

##### PUT /api/qos/device-limits/:mac
```rust
Test: test_qos_device_limit_set
- Valid limit → 200 OK
- Invalid MAC → 400 Bad Request
```

##### DELETE /api/qos/device-limits/:mac
```rust
Test: test_qos_device_limit_remove
- Existing limit → 200 OK
- Limit not found → 404 Not Found
```

#### DDNS Routes

##### GET /api/ddns/config
```rust
Test: test_ddns_config_read
- Valid auth → 200 OK with DDNS config
```

##### PUT /api/ddns/config
```rust
Test: test_ddns_config_update
- Valid config (provider, hostname, credentials) → 200 OK
- Invalid provider → 400 Bad Request
```

##### POST /api/ddns/update
```rust
Test: test_ddns_force_update
- Valid config → 200 OK, update triggered
- No config → 400 Bad Request
```

##### GET /api/ddns/status
```rust
Test: test_ddns_status_check
- Valid auth → 200 OK with update status
- Status includes: last_update, current_ip, status
```

#### Firmware Routes

##### GET /api/firmware/current
```rust
Test: test_firmware_current_version
- Valid auth → 200 OK with current firmware info
- Info includes: version, build_date, checksum
```

##### GET /api/firmware/available
```rust
Test: test_firmware_available_updates
- Valid auth → 200 OK with available updates
- Update list includes: version, changelog, download_url
```

##### POST /api/firmware/download
```rust
Test: test_firmware_download_trigger
- Valid auth → 200 OK, download initiated
- No updates available → 404 Not Found
```

##### POST /api/firmware/install
```rust
Test: test_firmware_install_trigger
- Downloaded firmware → 200 OK, install initiated
- No downloaded firmware → 400 Bad Request
```

##### POST /api/firmware/upload
```rust
Test: test_firmware_custom_upload
- Valid firmware file → 200 OK, upload complete
- Invalid file → 400 Bad Request
- File too large → 413 Payload Too Large
```

##### GET /api/firmware/slots
```rust
Test: test_firmware_boot_slots_list
- Valid auth → 200 OK with dual-boot slots
- Slots include: slot_id, version, active
```

##### POST /api/firmware/slots/:id/activate
```rust
Test: test_firmware_boot_slot_activate
- Valid slot → 200 OK, slot activated
- Invalid slot → 404 Not Found
```

#### Backup Routes

##### GET /api/backup/list
```rust
Test: test_backup_list_all
- Valid auth → 200 OK with backup list
- Backups include: id, timestamp, size
```

##### POST /api/backup/create
```rust
Test: test_backup_create_new
- Valid auth → 201 Created, backup ID returned
- Backup in progress → 409 Conflict
```

##### GET /api/backup/:id/download
```rust
Test: test_backup_download_file
- Valid backup ID → 200 OK with file download
- Backup not found → 404 Not Found
```

##### POST /api/backup/restore
```rust
Test: test_backup_restore_config
- Valid backup file → 200 OK, restore initiated
- Invalid backup file → 400 Bad Request
```

##### DELETE /api/backup/:id
```rust
Test: test_backup_delete_existing
- Valid backup ID → 200 OK
- Backup not found → 404 Not Found
```

##### POST /api/backup/factory-reset
```rust
Test: test_backup_factory_reset
- Valid auth → 200 OK, factory reset initiated
- Requires confirmation parameter
```

#### Fleet Management Routes

##### GET /api/fleet/devices
```rust
Test: test_fleet_devices_list
- Valid auth → 200 OK with user's devices
- Empty list for new user
```

##### POST /api/fleet/devices
```rust
Test: test_fleet_device_register
- Valid registration → 201 Created with API key
- Device limit reached (Starter: 10) → 402 Payment Required
- Duplicate serial → 409 Conflict
```

##### DELETE /api/fleet/devices/:id
```rust
Test: test_fleet_device_remove
- Owned device → 200 OK
- Not owned device → 403 Forbidden
- Device not found → 404 Not Found
```

##### GET /api/fleet/devices/:id/status
```rust
Test: test_fleet_device_status
- Online device → 200 OK with live status
- Offline device → 200 OK with last_seen timestamp
- Device not found → 404 Not Found
```

##### POST /api/fleet/devices/:id/command
```rust
Test: test_fleet_device_command_send
- Online device → 200 OK, command sent
- Offline device → 503 Service Unavailable
- Invalid command → 400 Bad Request
```

##### GET /api/fleet/templates
```rust
Test: test_fleet_config_templates_list
- Business plan → 200 OK with templates
- Starter/Pro plan → 402 Payment Required
```

##### POST /api/fleet/templates
```rust
Test: test_fleet_config_template_create
- Business plan + valid template → 201 Created
- Non-business plan → 402 Payment Required
```

##### POST /api/fleet/templates/:id/apply
```rust
Test: test_fleet_config_template_apply
- Business plan + valid template + device list → 200 OK
- Template not found → 404 Not Found
- Non-owned device in list → 403 Forbidden
```

#### User Account Routes

##### GET /api/user/profile
```rust
Test: test_user_profile_read
- Valid auth → 200 OK with user profile
- Profile includes: email, name, created_at
```

##### PUT /api/user/profile
```rust
Test: test_user_profile_update
- Valid update → 200 OK
- Invalid email format → 400 Bad Request
```

##### PUT /api/user/password
```rust
Test: test_user_password_change
- Valid current + new password → 200 OK
- Wrong current password → 401 Unauthorized
- Weak new password → 400 Bad Request
```

##### GET /api/user/2fa
```rust
Test: test_user_2fa_status
- Valid auth → 200 OK with 2FA status
- Status includes: enabled, method (app/sms)
```

##### POST /api/user/2fa/enable
```rust
Test: test_user_2fa_enable
- Valid setup + code → 200 OK
- Invalid code → 400 Bad Request
```

##### DELETE /api/user/2fa
```rust
Test: test_user_2fa_disable
- Valid auth + confirmation → 200 OK
- 2FA not enabled → 400 Bad Request
```

#### Session Routes

##### GET /api/user/sessions
```rust
Test: test_user_sessions_list
- Valid auth → 200 OK with active sessions
- Sessions include: id, device, location, last_active
```

##### DELETE /api/user/sessions/:id
```rust
Test: test_user_session_revoke
- Valid session ID → 200 OK
- Own session → 200 OK (force logout)
- Session not found → 404 Not Found
```

#### Billing Routes

##### GET /api/billing/plan
```rust
Test: test_billing_plan_info
- Valid auth → 200 OK with current plan
- Plan includes: tier, device_limit, features
```

##### PUT /api/billing/plan
```rust
Test: test_billing_plan_change
- Valid plan upgrade → 200 OK
- Downgrade with device count violation → 400 Bad Request
- Invalid plan tier → 400 Bad Request
```

##### GET /api/billing/usage
```rust
Test: test_billing_usage_meters
- Valid auth → 200 OK with usage stats
- Usage includes: devices, bandwidth, storage
```

##### GET /api/billing/payment-methods
```rust
Test: test_billing_payment_methods_list
- Valid auth → 200 OK with payment methods
```

##### POST /api/billing/payment-methods
```rust
Test: test_billing_payment_method_add
- Valid payment method → 201 Created
- Invalid card → 400 Bad Request
```

##### DELETE /api/billing/payment-methods/:id
```rust
Test: test_billing_payment_method_remove
- Valid method ID → 200 OK
- Last payment method → 400 Bad Request (require at least one)
```

##### GET /api/billing/invoices
```rust
Test: test_billing_invoices_list
- Valid auth → 200 OK with invoice history
```

##### GET /api/billing/invoices/:id
```rust
Test: test_billing_invoice_download
- Valid invoice ID → 200 OK with PDF
- Invoice not found → 404 Not Found
```

#### Agent WebSocket Route

##### GET /agent/ws
```rust
Test: test_agent_websocket_handshake
- Valid API key → 101 Switching Protocols
- Invalid API key → 401 Unauthorized
- Missing API key → 400 Bad Request

Test: test_agent_websocket_message_flow
- Connect → send STATUS → receive CONFIG
- Send METRICS → receive ACK
- Connection heartbeat every 30s
```

#### Health Check

##### GET /health
```rust
Test: test_health_check
- No auth required → 200 OK
- Response body: "OK"
```

## Test Implementation Structure

### Directory Layout

```
tests/
├── e2e/
│   ├── common/
│   │   ├── mod.rs              # Shared test utilities
│   │   ├── auth.rs             # JWT token generation
│   │   ├── client.rs           # HTTP client wrapper
│   │   └── fixtures.rs         # Test data factories
│   ├── system_tests.rs         # System endpoint tests
│   ├── network_tests.rs        # WAN/LAN/WiFi/DHCP tests
│   ├── security_tests.rs       # Firewall/NAT/DNS/IDS tests
│   ├── services_tests.rs       # VPN/QoS/DDNS tests
│   ├── firmware_tests.rs       # Firmware management tests
│   ├── backup_tests.rs         # Backup/restore tests
│   ├── fleet_tests.rs          # Fleet management tests
│   ├── user_tests.rs           # User account tests
│   ├── billing_tests.rs        # Billing tests
│   ├── websocket_tests.rs      # WebSocket agent tests
│   └── integration_test.rs     # Main test orchestrator
└── fixtures/
    ├── valid_firmware.bin      # Test firmware file
    ├── test_backup.tar.gz      # Test backup archive
    └── test_config.json        # Test configuration
```

### Test Configuration

```rust
// tests/e2e/common/mod.rs

pub struct TestConfig {
    pub api_base_url: String,
    pub websocket_url: String,
    pub clerk_secret: String,
    pub test_user_id: String,
    pub test_device_id: String,
    pub test_api_key: String,
}

impl TestConfig {
    pub fn from_env() -> Self {
        Self {
            api_base_url: env::var("API_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8787".to_string()),
            websocket_url: env::var("WS_URL")
                .unwrap_or_else(|_| "ws://localhost:8787".to_string()),
            clerk_secret: env::var("CLERK_SECRET_KEY")
                .expect("CLERK_SECRET_KEY required"),
            test_user_id: env::var("TEST_USER_ID")
                .unwrap_or_else(|_| "test_user_123".to_string()),
            test_device_id: env::var("TEST_DEVICE_ID")
                .unwrap_or_else(|_| "test_device_456".to_string()),
            test_api_key: env::var("TEST_API_KEY")
                .unwrap_or_else(|_| "test_key_789".to_string()),
        }
    }
}
```

### HTTP Client Helper

```rust
// tests/e2e/common/client.rs

use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};

pub struct ApiClient {
    client: Client,
    base_url: String,
    jwt_token: String,
    device_id: String,
}

impl ApiClient {
    pub fn new(base_url: String, jwt_token: String, device_id: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            jwt_token,
            device_id,
        }
    }

    pub async fn get(&self, path: &str) -> Result<Response, reqwest::Error> {
        self.client
            .get(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.jwt_token))
            .header("X-Device-ID", &self.device_id)
            .send()
            .await
    }

    pub async fn post<T: Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, reqwest::Error> {
        self.client
            .post(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.jwt_token))
            .header("X-Device-ID", &self.device_id)
            .json(body)
            .send()
            .await
    }

    pub async fn put<T: Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, reqwest::Error> {
        self.client
            .put(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.jwt_token))
            .header("X-Device-ID", &self.device_id)
            .json(body)
            .send()
            .await
    }

    pub async fn delete(&self, path: &str) -> Result<Response, reqwest::Error> {
        self.client
            .delete(format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.jwt_token))
            .header("X-Device-ID", &self.device_id)
            .send()
            .await
    }
}
```

## Test Execution

### Running Tests Locally

```bash
# Docker environment
bun run test:e2e:docker

# QEMU VM environment
bun run test:e2e:qemu

# Run specific test category
cargo test --test system_tests
cargo test --test network_tests
cargo test --test security_tests
```

### CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Run E2E tests (Docker)
        run: bun run test:e2e:docker
        env:
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}

  e2e-qemu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install QEMU
        run: sudo apt-get install -y qemu-system-aarch64 edk2-aarch64
      - name: Run E2E tests (QEMU)
        run: bun run test:e2e:qemu
        env:
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
```

## Coverage Goals

### Minimum Coverage Targets

| Category | Target |
|----------|--------|
| Route Coverage | 100% (all 97 routes) |
| HTTP Method Coverage | 100% (GET, POST, PUT, DELETE) |
| Status Code Coverage | 90% (200, 201, 400, 401, 403, 404, 409, 413, 500, 503) |
| Auth Scenarios | 100% (valid, invalid, missing, expired) |
| Plan Gate Coverage | 100% (Starter, Pro, Business) |

### Test Metrics

- Total test cases: ~300
- Expected execution time (Docker): ~5 minutes
- Expected execution time (QEMU): ~15 minutes
- Parallelization: Up to 10 concurrent tests

## Gap Analysis

### Current Gaps

1. **Storage Layer Tests**: Need mock KV/D1/R2 implementations for offline testing
2. **WebSocket Tests**: Requires WebSocket test client
3. **Plan Enforcement**: Needs test users with different plan tiers
4. **Rate Limiting**: Need to test rate limit boundaries
5. **CORS**: Need to test CORS headers on all routes

### Future Enhancements

1. **Performance Tests**: Load testing for WebSocket connections
2. **Chaos Tests**: Network failure scenarios, service degradation
3. **Security Tests**: Penetration testing, vulnerability scanning
4. **Compliance Tests**: GDPR, SOC2 audit trails

## Documentation

Each test file includes:
- Test purpose and scope
- Prerequisites and setup
- Expected outcomes
- Teardown and cleanup

## Maintenance

### Test Data Management
- Test fixtures in `tests/fixtures/`
- Factory functions for generating test data
- Cleanup after each test run

### Continuous Updates
- Update tests when API routes change
- Maintain test documentation
- Review and refactor tests quarterly

---

## Summary

This E2E test plan provides comprehensive coverage of all 97 API routes in the NGFW.sh Rust API. Tests are designed to validate:

1. **Functional correctness**: Each route behaves as specified
2. **Authorization**: Proper auth checks on all protected routes
3. **Plan enforcement**: Feature gating based on subscription tier
4. **Error handling**: Appropriate error responses
5. **Integration**: End-to-end flows work correctly

The tests run in both Docker and QEMU environments to ensure compatibility across deployment targets.
