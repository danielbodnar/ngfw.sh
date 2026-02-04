//! Main API router

use crate::handlers::{agent, fleet, network, security, services, system, user};
use crate::middleware::{AuthContext, cors};
use crate::models::ApiError;
use worker::*;

/// Build the main API router with all endpoints
pub fn build_router() -> Router<'static, ()> {
    Router::new()
        // Health check (no auth required)
        .get("/health", |_, _| Response::ok("OK"))
        // ========== System endpoints ==========
        .get_async("/api/system/status", system::get_status)
        .get_async("/api/system/interfaces", system::get_interfaces)
        .get_async("/api/system/hardware", system::get_hardware)
        .post_async("/api/system/reboot", system::reboot)
        .post_async("/api/system/shutdown", system::shutdown)
        // ========== Metrics endpoints ==========
        .get_async("/api/metrics/latest", system::get_latest_metrics)
        // ========== WAN endpoints ==========
        .get_async("/api/wan/config", network::get_wan_config)
        .put_async("/api/wan/config", network::update_wan_config)
        .post_async("/api/wan/renew", network::renew_dhcp)
        .post_async("/api/wan/release", network::release_dhcp)
        .get_async("/api/wan/status", network::get_wan_status)
        // ========== LAN endpoints ==========
        .get_async("/api/lan/config", network::get_lan_config)
        .put_async("/api/lan/config", network::update_lan_config)
        .get_async("/api/lan/vlans", network::get_vlans)
        .post_async("/api/lan/vlans", network::create_vlan)
        .put_async("/api/lan/vlans/:id", network::update_vlan)
        .delete_async("/api/lan/vlans/:id", network::delete_vlan)
        // ========== WiFi endpoints ==========
        .get_async("/api/wifi/radios", network::get_wifi_radios)
        .put_async("/api/wifi/radios/:id", network::update_wifi_radio)
        .get_async("/api/wifi/networks", network::get_wifi_networks)
        .post_async("/api/wifi/networks", network::create_wifi_network)
        .put_async("/api/wifi/networks/:id", network::update_wifi_network)
        .delete_async("/api/wifi/networks/:id", network::delete_wifi_network)
        .get_async("/api/wifi/clients", network::get_wifi_clients)
        // ========== DHCP endpoints ==========
        .get_async("/api/dhcp/config", network::get_dhcp_config)
        .put_async("/api/dhcp/config", network::update_dhcp_config)
        .get_async("/api/dhcp/leases", network::get_dhcp_leases)
        .delete_async("/api/dhcp/leases/:ip", network::revoke_lease)
        .get_async("/api/dhcp/reservations", network::get_reservations)
        .post_async("/api/dhcp/reservations", network::create_reservation)
        .delete_async("/api/dhcp/reservations/:mac", network::delete_reservation)
        // ========== Firewall endpoints ==========
        .get_async("/api/firewall/rules", security::get_firewall_rules)
        .post_async("/api/firewall/rules", security::create_firewall_rule)
        .put_async("/api/firewall/rules/:id", security::update_firewall_rule)
        .delete_async("/api/firewall/rules/:id", security::delete_firewall_rule)
        .put_async("/api/firewall/rules/order", security::reorder_rules)
        .get_async("/api/firewall/zones", security::get_zones)
        .put_async("/api/firewall/zones/:id", security::update_zone)
        .get_async("/api/firewall/policies", security::get_policies)
        .put_async("/api/firewall/policies", security::update_policies)
        // ========== NAT endpoints ==========
        .get_async("/api/nat/rules", security::get_nat_rules)
        .post_async("/api/nat/rules", security::create_nat_rule)
        .put_async("/api/nat/rules/:id", security::update_nat_rule)
        .delete_async("/api/nat/rules/:id", security::delete_nat_rule)
        .get_async("/api/nat/upnp", security::get_upnp_leases)
        .delete_async("/api/nat/upnp/:id", security::revoke_upnp_lease)
        // ========== Traffic logs endpoints ==========
        .get_async("/api/traffic/logs", security::get_traffic_logs)
        .get_async("/api/traffic/logs/stream", security::stream_traffic_logs)
        .get_async("/api/traffic/stats", security::get_traffic_stats)
        .get_async("/api/traffic/top/clients", security::get_top_clients)
        .get_async(
            "/api/traffic/top/destinations",
            security::get_top_destinations,
        )
        // ========== DNS filtering endpoints ==========
        .get_async("/api/dns/config", security::get_dns_config)
        .put_async("/api/dns/config", security::update_dns_config)
        .get_async("/api/dns/blocklists", security::get_blocklists)
        .post_async("/api/dns/blocklists", security::add_blocklist)
        .delete_async("/api/dns/blocklists/:id", security::remove_blocklist)
        .post_async("/api/dns/blocklists/:id/update", security::update_blocklist)
        .get_async("/api/dns/allowlist", security::get_allowlist)
        .post_async("/api/dns/allowlist", security::add_to_allowlist)
        .delete_async(
            "/api/dns/allowlist/:domain",
            security::remove_from_allowlist,
        )
        .get_async("/api/dns/queries", security::get_dns_queries)
        .get_async("/api/dns/stats", security::get_dns_stats)
        // ========== IDS/IPS endpoints ==========
        .get_async("/api/ids/config", security::get_ids_config)
        .put_async("/api/ids/config", security::update_ids_config)
        .get_async("/api/ids/categories", security::get_ids_categories)
        .put_async("/api/ids/categories/:id", security::update_ids_category)
        .get_async("/api/ids/rules", security::get_ids_rules)
        .post_async("/api/ids/rules", security::create_ids_rule)
        .delete_async("/api/ids/rules/:id", security::delete_ids_rule)
        .get_async("/api/ids/alerts", security::get_ids_alerts)
        .get_async("/api/ids/alerts/stream", security::stream_ids_alerts)
        // ========== VPN server endpoints ==========
        .get_async("/api/vpn/server/config", services::get_vpn_server_config)
        .put_async("/api/vpn/server/config", services::update_vpn_server_config)
        .get_async("/api/vpn/server/peers", services::get_vpn_peers)
        .post_async("/api/vpn/server/peers", services::create_vpn_peer)
        .put_async("/api/vpn/server/peers/:id", services::update_vpn_peer)
        .delete_async("/api/vpn/server/peers/:id", services::delete_vpn_peer)
        .get_async("/api/vpn/server/peers/:id/qr", services::get_vpn_peer_qr)
        .get_async("/api/vpn/server/status", services::get_vpn_server_status)
        // ========== VPN client endpoints ==========
        .get_async("/api/vpn/client/profiles", services::get_vpn_profiles)
        .post_async("/api/vpn/client/profiles", services::create_vpn_profile)
        .put_async("/api/vpn/client/profiles/:id", services::update_vpn_profile)
        .delete_async("/api/vpn/client/profiles/:id", services::delete_vpn_profile)
        .post_async(
            "/api/vpn/client/profiles/:id/connect",
            services::connect_vpn,
        )
        .post_async(
            "/api/vpn/client/profiles/:id/disconnect",
            services::disconnect_vpn,
        )
        .get_async("/api/vpn/client/status", services::get_vpn_client_status)
        // ========== QoS endpoints ==========
        .get_async("/api/qos/config", services::get_qos_config)
        .put_async("/api/qos/config", services::update_qos_config)
        .get_async("/api/qos/classes", services::get_traffic_classes)
        .post_async("/api/qos/classes", services::create_traffic_class)
        .put_async("/api/qos/classes/:id", services::update_traffic_class)
        .delete_async("/api/qos/classes/:id", services::delete_traffic_class)
        .get_async("/api/qos/device-limits", services::get_device_limits)
        .put_async("/api/qos/device-limits/:mac", services::set_device_limit)
        .delete_async("/api/qos/device-limits/:mac", services::remove_device_limit)
        // ========== DDNS endpoints ==========
        .get_async("/api/ddns/config", services::get_ddns_config)
        .put_async("/api/ddns/config", services::update_ddns_config)
        .post_async("/api/ddns/update", services::force_ddns_update)
        .get_async("/api/ddns/status", services::get_ddns_status)
        // ========== Firmware endpoints ==========
        .get_async("/api/firmware/current", system::get_current_firmware)
        .get_async("/api/firmware/available", system::get_available_updates)
        .post_async("/api/firmware/download", system::download_firmware)
        .post_async("/api/firmware/install", system::install_firmware)
        .post_async("/api/firmware/upload", system::upload_firmware)
        .get_async("/api/firmware/slots", system::get_boot_slots)
        .post_async(
            "/api/firmware/slots/:id/activate",
            system::activate_boot_slot,
        )
        // ========== Backup endpoints ==========
        .get_async("/api/backup/list", system::list_backups)
        .post_async("/api/backup/create", system::create_backup)
        .get_async("/api/backup/:id/download", system::download_backup)
        .post_async("/api/backup/restore", system::restore_backup)
        .delete_async("/api/backup/:id", system::delete_backup)
        .post_async("/api/backup/factory-reset", system::factory_reset)
        // ========== Fleet management endpoints ==========
        .get_async("/api/fleet/devices", fleet::get_devices)
        .post_async("/api/fleet/devices", fleet::register_device)
        .delete_async("/api/fleet/devices/:id", fleet::remove_device)
        .get_async("/api/fleet/devices/:id/status", fleet::get_device_status)
        .post_async("/api/fleet/devices/:id/command", fleet::send_command)
        .get_async("/api/fleet/templates", fleet::get_templates)
        .post_async("/api/fleet/templates", fleet::create_template)
        .post_async("/api/fleet/templates/:id/apply", fleet::apply_template)
        // ========== User account endpoints ==========
        .get_async("/api/user/profile", user::get_profile)
        .put_async("/api/user/profile", user::update_profile)
        .put_async("/api/user/password", user::change_password)
        .get_async("/api/user/2fa", user::get_2fa_status)
        .post_async("/api/user/2fa/enable", user::enable_2fa)
        .delete_async("/api/user/2fa", user::disable_2fa)
        .get_async("/api/user/sessions", user::get_sessions)
        .delete_async("/api/user/sessions/:id", user::revoke_session)
        // ========== Billing endpoints ==========
        .get_async("/api/billing/plan", user::get_plan)
        .put_async("/api/billing/plan", user::change_plan)
        .get_async("/api/billing/usage", user::get_usage)
        .get_async("/api/billing/payment-methods", user::get_payment_methods)
        .post_async("/api/billing/payment-methods", user::add_payment_method)
        .delete_async(
            "/api/billing/payment-methods/:id",
            user::remove_payment_method,
        )
        .get_async("/api/billing/invoices", user::get_invoices)
        .get_async("/api/billing/invoices/:id", user::download_invoice)
        // ========== Agent WebSocket endpoint ==========
        .get_async("/agent/ws", agent::websocket_handler)
        // Handle OPTIONS for CORS preflight
        .options("/*path", |req, _ctx| {
            cors::handle_preflight(&req).unwrap_or_else(Response::empty)
        })
        // 404 handler
        .or_else_any_method_async("/*path", |_req, _ctx| async move {
            ApiError::not_found("Endpoint").into_response()
        })
}

/// Helper to get authenticated context from request
#[allow(dead_code)]
pub async fn get_auth_context(req: &Request, env: &Env) -> Result<AuthContext> {
    crate::middleware::authenticate(req, env)
        .await
        .map_err(|e| Error::from(e.error.message))
}
