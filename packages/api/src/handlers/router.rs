//! Main API router

use crate::handlers::{agent, dashboard, fleet, logs, network, onboarding, report, security, services, system, user};
use crate::middleware::{AuthContext, cors};
use crate::models::ApiError;
use crate::openapi::ApiDoc;
use worker::*;

/// Build the main API router with all endpoints.
///
/// Routes are registered WITHOUT the `/api` prefix to match the frontend
/// client at portal-astro (which calls e.g. `/fleet/devices`, not
/// `/api/fleet/devices`). The domain `api.ngfw.sh` already implies API.
pub fn build_router() -> Router<'static, ()> {
    Router::new()
        // Health check (no auth required)
        .get("/health", |_, _| Response::ok("OK"))
        // ========== OpenAPI specification (no auth required) ==========
        .get("/openapi.json", |_, _| {
            Response::ok(ApiDoc::to_pretty_json())
                .map(|r| r.with_headers({
                    let headers = Headers::new();
                    let _ = headers.set("Content-Type", "application/json");
                    let _ = headers.set("Cache-Control", "public, max-age=3600");
                    headers
                }))
        })
        // ========== Onboarding endpoints (no auth required) ==========
        .get_async("/onboarding/routers", onboarding::list_routers)
        .post_async("/onboarding/order", onboarding::create_order)
        .get_async("/onboarding/status", onboarding::get_status)
        // ========== System endpoints ==========
        .get_async("/system/status", system::get_status)
        .get_async("/system/interfaces", system::get_interfaces)
        .get_async("/system/hardware", system::get_hardware)
        .post_async("/system/reboot", system::reboot)
        .post_async("/system/shutdown", system::shutdown)
        // ========== Metrics endpoints ==========
        .get_async("/metrics/latest", system::get_latest_metrics)
        // ========== WAN endpoints ==========
        .get_async("/wan/config", network::get_wan_config)
        .put_async("/wan/config", network::update_wan_config)
        .post_async("/wan/renew", network::renew_dhcp)
        .post_async("/wan/release", network::release_dhcp)
        .get_async("/wan/status", network::get_wan_status)
        // ========== LAN endpoints ==========
        .get_async("/lan/config", network::get_lan_config)
        .put_async("/lan/config", network::update_lan_config)
        .get_async("/lan/vlans", network::get_vlans)
        .post_async("/lan/vlans", network::create_vlan)
        .put_async("/lan/vlans/:id", network::update_vlan)
        .delete_async("/lan/vlans/:id", network::delete_vlan)
        // ========== WiFi endpoints ==========
        .get_async("/wifi/radios", network::get_wifi_radios)
        .put_async("/wifi/radios/:id", network::update_wifi_radio)
        .get_async("/wifi/networks", network::get_wifi_networks)
        .post_async("/wifi/networks", network::create_wifi_network)
        .put_async("/wifi/networks/:id", network::update_wifi_network)
        .delete_async("/wifi/networks/:id", network::delete_wifi_network)
        .get_async("/wifi/clients", network::get_wifi_clients)
        // ========== DHCP endpoints ==========
        .get_async("/dhcp/config", network::get_dhcp_config)
        .put_async("/dhcp/config", network::update_dhcp_config)
        .get_async("/dhcp/leases", network::get_dhcp_leases)
        .delete_async("/dhcp/leases/:ip", network::revoke_lease)
        .get_async("/dhcp/reservations", network::get_reservations)
        .post_async("/dhcp/reservations", network::create_reservation)
        .delete_async("/dhcp/reservations/:mac", network::delete_reservation)
        // ========== Routing endpoints (frontend calls /routing/routes) ==========
        .get_async("/routing/routes", network::get_routes)
        .post_async("/routing/routes", network::create_route)
        .put_async("/routing/routes/:id", network::update_route)
        .delete_async("/routing/routes/:id", network::delete_route)
        // ========== Firewall endpoints ==========
        .get_async("/firewall/rules", security::get_firewall_rules)
        .post_async("/firewall/rules", security::create_firewall_rule)
        .put_async("/firewall/rules/:id", security::update_firewall_rule)
        .delete_async("/firewall/rules/:id", security::delete_firewall_rule)
        .put_async("/firewall/rules/order", security::reorder_rules)
        .get_async("/firewall/zones", security::get_zones)
        .put_async("/firewall/zones/:id", security::update_zone)
        .get_async("/firewall/policies", security::get_policies)
        .put_async("/firewall/policies", security::update_policies)
        // ========== NAT endpoints ==========
        .get_async("/nat/rules", security::get_nat_rules)
        .post_async("/nat/rules", security::create_nat_rule)
        .put_async("/nat/rules/:id", security::update_nat_rule)
        .delete_async("/nat/rules/:id", security::delete_nat_rule)
        .get_async("/nat/upnp", security::get_upnp_leases)
        .delete_async("/nat/upnp/:id", security::revoke_upnp_lease)
        // ========== Traffic logs endpoints ==========
        .get_async("/traffic/logs", security::get_traffic_logs)
        .get_async("/traffic/logs/stream", security::stream_traffic_logs)
        .get_async("/traffic/stats", security::get_traffic_stats)
        .get_async("/traffic/top/clients", security::get_top_clients)
        .get_async("/traffic/top/destinations", security::get_top_destinations)
        // ========== DNS filtering endpoints ==========
        .get_async("/dns/config", security::get_dns_config)
        .put_async("/dns/config", security::update_dns_config)
        .get_async("/dns/blocklists", security::get_blocklists)
        .post_async("/dns/blocklists", security::add_blocklist)
        .delete_async("/dns/blocklists/:id", security::remove_blocklist)
        .post_async("/dns/blocklists/:id/update", security::update_blocklist)
        .get_async("/dns/allowlist", security::get_allowlist)
        .post_async("/dns/allowlist", security::add_to_allowlist)
        .delete_async("/dns/allowlist/:domain", security::remove_from_allowlist)
        .get_async("/dns/queries", security::get_dns_queries)
        .get_async("/dns/stats", security::get_dns_stats)
        // ========== IPS endpoints (frontend uses /ips, not /ids) ==========
        .get_async("/ips/config", security::get_ids_config)
        .put_async("/ips/config", security::update_ids_config)
        .get_async("/ips/categories", security::get_ids_categories)
        .put_async("/ips/categories/:id", security::update_ids_category)
        .get_async("/ips/rules", security::get_ids_rules)
        .post_async("/ips/rules", security::create_ids_rule)
        .delete_async("/ips/rules/:id", security::delete_ids_rule)
        .get_async("/ips/alerts", security::get_ids_alerts)
        .get_async("/ips/alerts/stream", security::stream_ids_alerts)
        // ========== VPN server endpoints ==========
        .get_async("/vpn/server/config", services::get_vpn_server_config)
        .put_async("/vpn/server/config", services::update_vpn_server_config)
        .get_async("/vpn/server/peers", services::get_vpn_peers)
        .post_async("/vpn/server/peers", services::create_vpn_peer)
        .put_async("/vpn/server/peers/:id", services::update_vpn_peer)
        .delete_async("/vpn/server/peers/:id", services::delete_vpn_peer)
        .get_async("/vpn/server/peers/:id/qr", services::get_vpn_peer_qr)
        .get_async("/vpn/server/status", services::get_vpn_server_status)
        // ========== VPN client endpoints ==========
        .get_async("/vpn/client/profiles", services::get_vpn_profiles)
        .post_async("/vpn/client/profiles", services::create_vpn_profile)
        .put_async("/vpn/client/profiles/:id", services::update_vpn_profile)
        .delete_async("/vpn/client/profiles/:id", services::delete_vpn_profile)
        .post_async("/vpn/client/profiles/:id/connect", services::connect_vpn)
        .post_async("/vpn/client/profiles/:id/disconnect", services::disconnect_vpn)
        .get_async("/vpn/client/status", services::get_vpn_client_status)
        // ========== QoS endpoints (frontend calls /qos/rules) ==========
        .get_async("/qos/config", services::get_qos_config)
        .put_async("/qos/config", services::update_qos_config)
        .get_async("/qos/rules", services::get_traffic_classes)
        .post_async("/qos/rules", services::create_traffic_class)
        .put_async("/qos/rules/:id", services::update_traffic_class)
        .delete_async("/qos/rules/:id", services::delete_traffic_class)
        .get_async("/qos/device-limits", services::get_device_limits)
        .put_async("/qos/device-limits/:mac", services::set_device_limit)
        .delete_async("/qos/device-limits/:mac", services::remove_device_limit)
        // ========== DDNS endpoints (frontend calls /ddns/configs) ==========
        .get_async("/ddns/configs", services::get_ddns_config)
        .post_async("/ddns/configs", services::update_ddns_config)
        .put_async("/ddns/configs/:id", services::update_ddns_config)
        .delete_async("/ddns/configs/:id", services::get_ddns_config)
        .post_async("/ddns/configs/:id/update", services::force_ddns_update)
        .get_async("/ddns/config", services::get_ddns_config)
        .put_async("/ddns/config", services::update_ddns_config)
        .post_async("/ddns/update", services::force_ddns_update)
        .get_async("/ddns/status", services::get_ddns_status)
        // ========== Firmware endpoints ==========
        .get_async("/firmware/current", system::get_current_firmware)
        .get_async("/firmware/available", system::get_available_updates)
        .post_async("/firmware/download", system::download_firmware)
        .post_async("/firmware/install", system::install_firmware)
        .post_async("/firmware/upload", system::upload_firmware)
        .get_async("/firmware/slots", system::get_boot_slots)
        .post_async("/firmware/slots/:id/activate", system::activate_boot_slot)
        // ========== Backup endpoints ==========
        .get_async("/backup/list", system::list_backups)
        .post_async("/backup/create", system::create_backup)
        .get_async("/backup/:id/download", system::download_backup)
        .post_async("/backup/restore", system::restore_backup)
        .delete_async("/backup/:id", system::delete_backup)
        .post_async("/backup/factory-reset", system::factory_reset)
        // ========== Logs endpoints ==========
        .get_async("/logs", logs::list_logs)
        .post_async("/logs/export", logs::export_logs)
        // ========== Reports endpoints ==========
        .get_async("/reports", report::list_reports)
        .post_async("/reports/generate", report::generate_report)
        .get_async("/reports/:id", report::get_report)
        .delete_async("/reports/:id", report::delete_report)
        // ========== Dashboard endpoints ==========
        .get_async("/dashboards", dashboard::list_dashboards)
        .get_async("/dashboards/:id", dashboard::get_dashboard)
        // ========== Fleet management endpoints ==========
        .get_async("/fleet/devices", fleet::get_devices)
        .post_async("/fleet/devices", fleet::register_device)
        .delete_async("/fleet/devices/:id", fleet::remove_device)
        .get_async("/fleet/devices/:id/status", fleet::get_device_status)
        .post_async("/fleet/devices/:id/command", fleet::send_command)
        .get_async("/fleet/templates", fleet::get_templates)
        .post_async("/fleet/templates", fleet::create_template)
        .post_async("/fleet/templates/:id/apply", fleet::apply_template)
        // ========== User account endpoints ==========
        .get_async("/user/profile", user::get_profile)
        .put_async("/user/profile", user::update_profile)
        .put_async("/user/password", user::change_password)
        .get_async("/user/2fa", user::get_2fa_status)
        .post_async("/user/2fa/enable", user::enable_2fa)
        .delete_async("/user/2fa", user::disable_2fa)
        .get_async("/user/sessions", user::get_sessions)
        .delete_async("/user/sessions/:id", user::revoke_session)
        // ========== Billing endpoints ==========
        .get_async("/billing/plan", user::get_plan)
        .put_async("/billing/plan", user::change_plan)
        .get_async("/billing/plans", user::get_plan)
        .get_async("/billing/plans/:id", user::get_plan)
        .get_async("/billing/usage", user::get_usage)
        .get_async("/billing/payment-methods", user::get_payment_methods)
        .post_async("/billing/payment-methods", user::add_payment_method)
        .delete_async("/billing/payment-methods/:id", user::remove_payment_method)
        .get_async("/billing/invoices", user::get_invoices)
        .get_async("/billing/invoices/:id", user::download_invoice)
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
