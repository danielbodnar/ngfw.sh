//! Security handlers (Firewall, NAT, DNS, IDS, Traffic)

use crate::middleware::{authenticate, check_device_access, require_plan};
use crate::models::IntoApiResponse;
use crate::models::security::*;
use crate::storage;
use worker::*;

fn get_device_id(req: &Request) -> Result<String> {
    req.headers()
        .get("X-Device-ID")?
        .ok_or_else(|| Error::from("Missing X-Device-ID header"))
}

// ========== Firewall Handlers ==========

/// GET /api/firewall/rules
pub async fn get_firewall_rules(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rules = storage::get_firewall_rules(&device_id, &ctx.env).await;
    rules.into_api_response()
}

/// POST /api/firewall/rules
pub async fn create_firewall_rule(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule: FirewallRuleRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_firewall_rule(&device_id, &rule, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/firewall/rules/:id
pub async fn update_firewall_rule(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing rule ID"))?;
    let rule: FirewallRuleRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_firewall_rule(&device_id, rule_id, &rule, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/firewall/rules/:id
pub async fn delete_firewall_rule(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing rule ID"))?;
    let result = storage::delete_firewall_rule(&device_id, rule_id, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/firewall/rules/order
pub async fn reorder_rules(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let order: RuleOrderRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::reorder_firewall_rules(&device_id, &order.rule_ids, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/firewall/zones
pub async fn get_zones(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let zones = storage::get_firewall_zones(&device_id, &ctx.env).await;
    zones.into_api_response()
}

/// PUT /api/firewall/zones/:id
pub async fn update_zone(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let zone_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing zone ID"))?;
    let zone: ZoneConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_firewall_zone(&device_id, zone_id, &zone, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/firewall/policies
pub async fn get_policies(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let policies = storage::get_zone_policies(&device_id, &ctx.env).await;
    policies.into_api_response()
}

/// PUT /api/firewall/policies
pub async fn update_policies(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let policies: Vec<ZonePolicy> = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_zone_policies(&device_id, &policies, &ctx.env).await;
    result.into_api_response()
}

// ========== NAT Handlers ==========

/// GET /api/nat/rules
pub async fn get_nat_rules(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rules = storage::get_nat_rules(&device_id, &ctx.env).await;
    rules.into_api_response()
}

/// POST /api/nat/rules
pub async fn create_nat_rule(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule: NatRule = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_nat_rule(&device_id, &rule, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/nat/rules/:id
pub async fn update_nat_rule(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing rule ID"))?;
    let rule: NatRule = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_nat_rule(&device_id, rule_id, &rule, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/nat/rules/:id
pub async fn delete_nat_rule(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing rule ID"))?;
    let result = storage::delete_nat_rule(&device_id, rule_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/nat/upnp
pub async fn get_upnp_leases(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let leases = storage::get_upnp_leases(&device_id, &ctx.env).await;
    leases.into_api_response()
}

/// DELETE /api/nat/upnp/:id
pub async fn revoke_upnp_lease(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let lease_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing lease ID"))?;
    let result = storage::revoke_upnp_lease(&device_id, lease_id, &ctx.env).await;
    result.into_api_response()
}

// ========== Traffic Logs Handlers ==========

/// GET /api/traffic/logs
pub async fn get_traffic_logs(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let url = req.url()?;
    let logs = storage::get_traffic_logs(&device_id, url.query(), &ctx.env).await;
    logs.into_api_response()
}

/// GET /api/traffic/logs/stream (WebSocket)
pub async fn stream_traffic_logs(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    // Upgrade to WebSocket for real-time streaming
    let pair = WebSocketPair::new()?;
    let server = pair.server;
    let client = pair.client;

    server.accept()?;

    // TODO: Set up streaming from device's Durable Object
    // For now, send a placeholder message
    server.send_with_str("Connected to traffic log stream")?;

    Response::from_websocket(client)
}

/// GET /api/traffic/stats
pub async fn get_traffic_stats(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let stats = storage::get_traffic_stats(&device_id, &ctx.env).await;
    stats.into_api_response()
}

/// GET /api/traffic/top/clients
pub async fn get_top_clients(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let clients = storage::get_top_clients(&device_id, &ctx.env).await;
    clients.into_api_response()
}

/// GET /api/traffic/top/destinations
pub async fn get_top_destinations(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let destinations = storage::get_top_destinations(&device_id, &ctx.env).await;
    destinations.into_api_response()
}

// ========== DNS Filtering Handlers ==========

/// GET /api/dns/config
pub async fn get_dns_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_dns_config(&device_id, &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/dns/config
pub async fn update_dns_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config: DnsConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_dns_config(&device_id, &config, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/dns/blocklists
pub async fn get_blocklists(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["starter", "pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let blocklists = storage::get_dns_blocklists(&device_id, &ctx.env).await;
    blocklists.into_api_response()
}

/// POST /api/dns/blocklists
pub async fn add_blocklist(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["starter", "pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let blocklist: DnsBlocklist = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::add_dns_blocklist(&device_id, &blocklist, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/dns/blocklists/:id
pub async fn remove_blocklist(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let blocklist_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing blocklist ID"))?;
    let result = storage::remove_dns_blocklist(&device_id, blocklist_id, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/dns/blocklists/:id/update
pub async fn update_blocklist(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let blocklist_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing blocklist ID"))?;
    let result = storage::force_blocklist_update(&device_id, blocklist_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/dns/allowlist
pub async fn get_allowlist(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let allowlist = storage::get_dns_allowlist(&device_id, &ctx.env).await;
    allowlist.into_api_response()
}

/// POST /api/dns/allowlist
pub async fn add_to_allowlist(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let entry: DnsAllowlistEntry = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::add_to_dns_allowlist(&device_id, &entry, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/dns/allowlist/:domain
pub async fn remove_from_allowlist(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let domain = ctx
        .param("domain")
        .ok_or_else(|| Error::from("Missing domain"))?;
    let result = storage::remove_from_dns_allowlist(&device_id, domain, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/dns/queries
pub async fn get_dns_queries(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let url = req.url()?;
    let queries = storage::get_dns_queries(&device_id, url.query(), &ctx.env).await;
    queries.into_api_response()
}

/// GET /api/dns/stats
pub async fn get_dns_stats(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let stats = storage::get_dns_stats(&device_id, &ctx.env).await;
    stats.into_api_response()
}

// ========== IDS/IPS Handlers ==========

/// GET /api/ids/config
pub async fn get_ids_config(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config = storage::get_ids_config(&device_id, &ctx.env).await;
    config.into_api_response()
}

/// PUT /api/ids/config
pub async fn update_ids_config(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let config: IdsConfig = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_ids_config(&device_id, &config, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/ids/categories
pub async fn get_ids_categories(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let categories = storage::get_ids_categories(&device_id, &ctx.env).await;
    categories.into_api_response()
}

/// PUT /api/ids/categories/:id
pub async fn update_ids_category(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let category_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing category ID"))?;
    let category: IdsCategory = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_ids_category(&device_id, category_id, &category, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/ids/rules
pub async fn get_ids_rules(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rules = storage::get_ids_rules(&device_id, &ctx.env).await;
    rules.into_api_response()
}

/// POST /api/ids/rules
pub async fn create_ids_rule(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule: IdsRule = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_ids_rule(&device_id, &rule, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/ids/rules/:id
pub async fn delete_ids_rule(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let rule_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing rule ID"))?;
    let result = storage::delete_ids_rule(&device_id, rule_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/ids/alerts
pub async fn get_ids_alerts(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let url = req.url()?;
    let alerts = storage::get_ids_alerts(&device_id, url.query(), &ctx.env).await;
    alerts.into_api_response()
}

/// GET /api/ids/alerts/stream (WebSocket)
pub async fn stream_ids_alerts(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business", "business_plus"])
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let pair = WebSocketPair::new()?;
    let server = pair.server;
    let client = pair.client;

    server.accept()?;
    server.send_with_str("Connected to IDS alert stream")?;

    Response::from_websocket(client)
}
