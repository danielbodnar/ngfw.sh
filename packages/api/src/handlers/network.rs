//! Network configuration handlers (WAN, LAN, WiFi, DHCP)

use crate::middleware::{authenticate, check_device_access};
use crate::models::IntoApiResponse;
use crate::models::network::*;
use crate::storage;
use worker::*;

fn get_device_id(req: &Request) -> Result<String> {
    req.headers()
        .get("X-Device-ID")?
        .ok_or_else(|| Error::from("Missing X-Device-ID header"))
}

// ========== WAN Handlers ==========

/// GET /api/wan/config
pub async fn get_wan_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_config::<WanConfig>(&device_id, "wan", &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/wan/config
pub async fn update_wan_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config: WanConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_config(&device_id, "wan", &config, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/wan/renew
pub async fn renew_dhcp(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let result = storage::send_command(&device_id, "wan_renew", None, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/wan/release
pub async fn release_dhcp(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let result = storage::send_command(&device_id, "wan_release", None, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/wan/status
pub async fn get_wan_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let status = storage::get_wan_status(&device_id, &ctx.env).await;
    status.into_api_response()
}

// ========== LAN Handlers ==========

/// GET /api/lan/config
pub async fn get_lan_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_config::<LanConfig>(&device_id, "lan", &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/lan/config
pub async fn update_lan_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config: LanConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_config(&device_id, "lan", &config, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/lan/vlans
pub async fn get_vlans(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let vlans = storage::get_vlans(&device_id, &ctx.env).await;
    vlans.into_api_response()
}

/// POST /api/lan/vlans
pub async fn create_vlan(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let vlan: VlanConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_vlan(&device_id, &vlan, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/lan/vlans/:id
pub async fn update_vlan(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let vlan_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing VLAN ID"))?;
    let vlan: VlanConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_vlan(&device_id, vlan_id, &vlan, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/lan/vlans/:id
pub async fn delete_vlan(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let vlan_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing VLAN ID"))?;
    let result = storage::delete_vlan(&device_id, vlan_id, &ctx.env).await;
    result.into_api_response()
}

// ========== WiFi Handlers ==========

/// GET /api/wifi/radios
pub async fn get_wifi_radios(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let radios = storage::get_wifi_radios(&device_id, &ctx.env).await;
    radios.into_api_response()
}

/// PUT /api/wifi/radios/:id
pub async fn update_wifi_radio(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let radio_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing radio ID"))?;
    let radio: WifiRadio = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_wifi_radio(&device_id, radio_id, &radio, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/wifi/networks
pub async fn get_wifi_networks(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let networks = storage::get_wifi_networks(&device_id, &ctx.env).await;
    networks.into_api_response()
}

/// POST /api/wifi/networks
pub async fn create_wifi_network(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let network: WifiNetwork = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_wifi_network(&device_id, &network, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/wifi/networks/:id
pub async fn update_wifi_network(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let network_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing network ID"))?;
    let network: WifiNetwork = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_wifi_network(&device_id, network_id, &network, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/wifi/networks/:id
pub async fn delete_wifi_network(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let network_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing network ID"))?;
    let result = storage::delete_wifi_network(&device_id, network_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/wifi/clients
pub async fn get_wifi_clients(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let clients = storage::get_wifi_clients(&device_id, &ctx.env).await;
    clients.into_api_response()
}

// ========== DHCP Handlers ==========

/// GET /api/dhcp/config
pub async fn get_dhcp_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_config::<DhcpConfig>(&device_id, "dhcp", &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/dhcp/config
pub async fn update_dhcp_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config: DhcpConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_config(&device_id, "dhcp", &config, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/dhcp/leases
pub async fn get_dhcp_leases(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let leases = storage::get_dhcp_leases(&device_id, &ctx.env).await;
    leases.into_api_response()
}

/// DELETE /api/dhcp/leases/:ip
pub async fn revoke_lease(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let ip = ctx
        .param("ip")
        .ok_or_else(|| Error::from("Missing IP address"))?;
    let result = storage::revoke_dhcp_lease(&device_id, ip, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/dhcp/reservations
pub async fn get_reservations(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let reservations = storage::get_dhcp_reservations(&device_id, &ctx.env).await;
    reservations.into_api_response()
}

/// POST /api/dhcp/reservations
pub async fn create_reservation(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let reservation: DhcpReservation = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_dhcp_reservation(&device_id, &reservation, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/dhcp/reservations/:mac
pub async fn delete_reservation(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let mac = ctx
        .param("mac")
        .ok_or_else(|| Error::from("Missing MAC address"))?;
    let result = storage::delete_dhcp_reservation(&device_id, mac, &ctx.env).await;
    result.into_api_response()
}

// ========== Routing Handlers ==========

/// GET /routing/routes
pub async fn get_routes(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let routes = storage::get_routes(&device_id, &ctx.env).await;
    routes.into_api_response()
}

/// POST /routing/routes
pub async fn create_route(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let route: RouteRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_route(&device_id, &route, &ctx.env).await;
    result.into_api_response()
}

/// PUT /routing/routes/:id
pub async fn update_route(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let route_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing route ID"))?;
    let route: RouteRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_route(&device_id, route_id, &route, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /routing/routes/:id
pub async fn delete_route(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let route_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing route ID"))?;
    let result = storage::delete_route(&device_id, route_id, &ctx.env).await;
    result.into_api_response()
}
