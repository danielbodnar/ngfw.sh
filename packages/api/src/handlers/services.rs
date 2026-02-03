//! Service handlers (VPN, QoS, DDNS)

use crate::middleware::{authenticate, check_device_access, require_plan};
use crate::models::services::*;
use crate::models::{ApiError, IntoApiResponse};
use crate::storage;
use worker::*;

fn get_device_id(req: &Request) -> Result<String> {
    req.headers()
        .get("X-Device-ID")?
        .ok_or_else(|| Error::from("Missing X-Device-ID header"))
}

// ========== VPN Server Handlers ==========

/// GET /api/vpn/server/config
pub async fn get_vpn_server_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_vpn_server_config(&device_id, &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/vpn/server/config
pub async fn update_vpn_server_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let config: VpnServerConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_vpn_server_config(&device_id, &config, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/vpn/server/peers
pub async fn get_vpn_peers(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let peers = storage::get_vpn_peers(&device_id, &ctx.env).await;
    peers.into_api_response()
}

/// POST /api/vpn/server/peers
pub async fn create_vpn_peer(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let peer: VpnPeerRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_vpn_peer(&device_id, &peer, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/vpn/server/peers/:id
pub async fn update_vpn_peer(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let peer_id = ctx.param("id").ok_or_else(|| Error::from("Missing peer ID"))?;
    let peer: VpnPeerRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_vpn_peer(&device_id, peer_id, &peer, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/vpn/server/peers/:id
pub async fn delete_vpn_peer(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let peer_id = ctx.param("id").ok_or_else(|| Error::from("Missing peer ID"))?;
    let result = storage::delete_vpn_peer(&device_id, peer_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/vpn/server/peers/:id/qr
pub async fn get_vpn_peer_qr(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let peer_id = ctx.param("id").ok_or_else(|| Error::from("Missing peer ID"))?;
    let qr = storage::get_vpn_peer_qr(&device_id, peer_id, &ctx.env).await;
    qr.into_api_response()
}

/// GET /api/vpn/server/status
pub async fn get_vpn_server_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["homeplus", "pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let status = storage::get_vpn_server_status(&device_id, &ctx.env).await;
    status.into_api_response()
}

// ========== VPN Client Handlers ==========

/// GET /api/vpn/client/profiles
pub async fn get_vpn_profiles(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let profiles = storage::get_vpn_client_profiles(&device_id, &ctx.env).await;
    profiles.into_api_response()
}

/// POST /api/vpn/client/profiles
pub async fn create_vpn_profile(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let profile: VpnClientProfile = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_vpn_client_profile(&device_id, &profile, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/vpn/client/profiles/:id
pub async fn update_vpn_profile(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let profile_id = ctx.param("id").ok_or_else(|| Error::from("Missing profile ID"))?;
    let profile: VpnClientProfile = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_vpn_client_profile(&device_id, profile_id, &profile, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/vpn/client/profiles/:id
pub async fn delete_vpn_profile(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let profile_id = ctx.param("id").ok_or_else(|| Error::from("Missing profile ID"))?;
    let result = storage::delete_vpn_client_profile(&device_id, profile_id, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/vpn/client/profiles/:id/connect
pub async fn connect_vpn(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let profile_id = ctx.param("id").ok_or_else(|| Error::from("Missing profile ID"))?;
    let result = storage::connect_vpn_client(&device_id, profile_id, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/vpn/client/profiles/:id/disconnect
pub async fn disconnect_vpn(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let profile_id = ctx.param("id").ok_or_else(|| Error::from("Missing profile ID"))?;
    let result = storage::disconnect_vpn_client(&device_id, profile_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/vpn/client/status
pub async fn get_vpn_client_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let status = storage::get_vpn_client_status(&device_id, &ctx.env).await;
    status.into_api_response()
}

// ========== QoS Handlers ==========

/// GET /api/qos/config
pub async fn get_qos_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_qos_config(&device_id, &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/qos/config
pub async fn update_qos_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let config: QosConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_qos_config(&device_id, &config, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/qos/classes
pub async fn get_traffic_classes(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let classes = storage::get_traffic_classes(&device_id, &ctx.env).await;
    classes.into_api_response()
}

/// POST /api/qos/classes
pub async fn create_traffic_class(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let class: TrafficClass = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_traffic_class(&device_id, &class, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/qos/classes/:id
pub async fn update_traffic_class(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let class_id = ctx.param("id").ok_or_else(|| Error::from("Missing class ID"))?;
    let class: TrafficClass = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_traffic_class(&device_id, class_id, &class, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/qos/classes/:id
pub async fn delete_traffic_class(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let class_id = ctx.param("id").ok_or_else(|| Error::from("Missing class ID"))?;
    let result = storage::delete_traffic_class(&device_id, class_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/qos/device-limits
pub async fn get_device_limits(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let limits = storage::get_device_bandwidth_limits(&device_id, &ctx.env).await;
    limits.into_api_response()
}

/// PUT /api/qos/device-limits/:mac
pub async fn set_device_limit(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let mac = ctx.param("mac").ok_or_else(|| Error::from("Missing MAC address"))?;
    let limit: DeviceLimit = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::set_device_bandwidth_limit(&device_id, mac, &limit, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/qos/device-limits/:mac
pub async fn remove_device_limit(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let mac = ctx.param("mac").ok_or_else(|| Error::from("Missing MAC address"))?;
    let result = storage::remove_device_bandwidth_limit(&device_id, mac, &ctx.env).await;
    result.into_api_response()
}

// ========== DDNS Handlers ==========

/// GET /api/ddns/config
pub async fn get_ddns_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_ddns_config(&device_id, &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/ddns/config
pub async fn update_ddns_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let config: DdnsConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_ddns_config(&device_id, &config, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/ddns/update
pub async fn force_ddns_update(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let result = storage::force_ddns_update(&device_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/ddns/status
pub async fn get_ddns_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let status = storage::get_ddns_status(&device_id, &ctx.env).await;
    status.into_api_response()
}
