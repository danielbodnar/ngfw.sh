//! Storage module for KV, D1, and R2 interactions
//!
//! This module provides a unified interface for all storage operations.

use crate::models::*;
use serde::{Serialize, de::DeserializeOwned};
use worker::*;

// ========== Generic Configuration Functions ==========

/// Get a configuration section for a device
pub async fn get_config<T: DeserializeOwned>(
    device_id: &str,
    section: &str,
    env: &Env,
) -> ApiResult<T> {
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access config store"))?;

    let key = format!("config:{}:{}", device_id, section);
    let data = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read config"))?
        .ok_or_else(|| ApiError::not_found("Configuration"))?;

    serde_json::from_str(&data).map_err(|_| ApiError::internal("Invalid config format"))
}

/// Update a configuration section for a device
pub async fn update_config<T: Serialize>(
    device_id: &str,
    section: &str,
    config: &T,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access config store"))?;

    let key = format!("config:{}:{}", device_id, section);
    let data = serde_json::to_string(config)
        .map_err(|_| ApiError::internal("Failed to serialize config"))?;

    kv.put(&key, &data)
        .map_err(|_| ApiError::internal("Failed to store config"))?
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to save config"))?;

    // Push config to device
    push_config_to_device(device_id, section, config, env).await?;

    Ok(serde_json::json!({ "status": "updated" }))
}

/// Push configuration update to connected device
async fn push_config_to_device<T: Serialize>(
    device_id: &str,
    section: &str,
    config: &T,
    env: &Env,
) -> ApiResult<()> {
    let namespace = env
        .durable_object("AGENT_CONNECTIONS")
        .map_err(|_| ApiError::internal("Failed to access agent connections"))?;

    let id = namespace
        .id_from_name(device_id)
        .map_err(|_| ApiError::internal("Failed to create DO ID"))?;

    let stub = id
        .get_stub()
        .map_err(|_| ApiError::internal("Failed to get DO stub"))?;

    let payload = serde_json::json!({
        "type": "CONFIG_PUSH",
        "payload": {
            "section": section,
            "config": config
        }
    });

    let request = Request::new_with_init(
        "http://internal/command",
        RequestInit::new()
            .with_method(Method::Post)
            .with_body(Some(payload.to_string().into())),
    )
    .map_err(|_| ApiError::internal("Failed to create request"))?;

    // Fire and forget - don't wait for device
    let _ = stub.fetch_with_request(request).await;

    Ok(())
}

/// Send a command to a device
pub async fn send_command(
    device_id: &str,
    command: &str,
    payload: Option<serde_json::Value>,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let namespace = env
        .durable_object("AGENT_CONNECTIONS")
        .map_err(|_| ApiError::internal("Failed to access agent connections"))?;

    let id = namespace
        .id_from_name(device_id)
        .map_err(|_| ApiError::internal("Failed to create DO ID"))?;

    let stub = id
        .get_stub()
        .map_err(|_| ApiError::internal("Failed to get DO stub"))?;

    let cmd = serde_json::json!({
        "type": command.to_uppercase(),
        "payload": payload
    });

    let request = Request::new_with_init(
        "http://internal/command",
        RequestInit::new()
            .with_method(Method::Post)
            .with_body(Some(cmd.to_string().into())),
    )
    .map_err(|_| ApiError::internal("Failed to create request"))?;

    let response = stub
        .fetch_with_request(request)
        .await
        .map_err(|_| ApiError::device_offline())?;

    if response.status_code() == 503 {
        return Err(ApiError::device_offline());
    }

    Ok(serde_json::json!({ "status": "sent" }))
}

// ========== System Functions ==========

pub async fn get_device_status(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access config store"))?;

    let key = format!("status:{}", device_id);
    let data = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read status"))?;

    match data {
        Some(json) => {
            serde_json::from_str(&json).map_err(|_| ApiError::internal("Invalid status format"))
        }
        None => Err(ApiError::device_offline()),
    }
}

pub async fn get_interfaces(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    let status = get_device_status(device_id, env).await?;
    status
        .get("interfaces")
        .cloned()
        .and_then(|v| serde_json::from_value(v).ok())
        .ok_or_else(|| ApiError::not_found("Interfaces"))
}

pub async fn get_hardware_info(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "hardware", env).await
}

pub async fn get_firmware_info(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "firmware", env).await
}

pub async fn get_available_updates(
    device_id: &str,
    env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    let kv = env
        .kv("CACHE")
        .map_err(|_| ApiError::internal("Failed to access cache"))?;

    let key = format!("updates:{}", device_id);
    let data = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read updates"))?
        .unwrap_or_else(|| "[]".to_string());

    serde_json::from_str(&data).map_err(|_| ApiError::internal("Invalid updates format"))
}

pub async fn get_boot_slots(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "boot_slots", env).await
}

pub async fn upload_firmware(
    device_id: &str,
    data: &[u8],
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let r2 = env
        .bucket("FIRMWARE")
        .map_err(|_| ApiError::internal("Failed to access firmware storage"))?;

    let key = format!(
        "{}/firmware-{}.bin",
        device_id,
        chrono::Utc::now().timestamp()
    );

    r2.put(&key, data.to_vec())
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to upload firmware"))?;

    Ok(serde_json::json!({
        "status": "uploaded",
        "key": key
    }))
}

// ========== Backup Functions ==========

pub async fn list_backups(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    let r2 = env
        .bucket("BACKUPS")
        .map_err(|_| ApiError::internal("Failed to access backup storage"))?;

    let list = r2
        .list()
        .prefix(format!("{}/", device_id))
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to list backups"))?;

    let backups: Vec<serde_json::Value> = list
        .objects()
        .iter()
        .map(|obj| {
            serde_json::json!({
                "id": obj.key().split('/').next_back().unwrap_or(""),
                "size_bytes": obj.size(),
                "created_at": obj.uploaded().as_millis() / 1000
            })
        })
        .collect();

    Ok(backups)
}

pub async fn create_backup(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    // Get current config
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access config store"))?;

    let config = kv
        .get(&format!("config:{}", device_id))
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read config"))?
        .unwrap_or_else(|| "{}".to_string());

    let backup_id = uuid::Uuid::new_v4().to_string();
    let key = format!("{}/{}.json", device_id, backup_id);

    let r2 = env
        .bucket("BACKUPS")
        .map_err(|_| ApiError::internal("Failed to access backup storage"))?;

    r2.put(&key, config.as_bytes().to_vec())
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to create backup"))?;

    Ok(serde_json::json!({
        "id": backup_id,
        "status": "created"
    }))
}

pub async fn download_backup(device_id: &str, backup_id: &str, env: &Env) -> ApiResult<Vec<u8>> {
    let r2 = env
        .bucket("BACKUPS")
        .map_err(|_| ApiError::internal("Failed to access backup storage"))?;

    let key = format!("{}/{}.json", device_id, backup_id);
    let obj = r2
        .get(&key)
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to read backup"))?
        .ok_or_else(|| ApiError::not_found("Backup"))?;

    obj.body()
        .ok_or_else(|| ApiError::internal("Empty backup"))?
        .bytes()
        .await
        .map_err(|_| ApiError::internal("Failed to read backup data"))
}

pub async fn restore_backup(
    device_id: &str,
    backup_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let data = download_backup(device_id, backup_id, env).await?;
    let config: serde_json::Value =
        serde_json::from_slice(&data).map_err(|_| ApiError::internal("Invalid backup format"))?;

    // Store as current config
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access config store"))?;

    kv.put(
        &format!("config:{}", device_id),
        serde_json::to_string(&config).unwrap(),
    )
    .map_err(|_| ApiError::internal("Failed to restore config"))?
    .execute()
    .await
    .map_err(|_| ApiError::internal("Failed to save config"))?;

    // Push to device
    send_command(device_id, "CONFIG_FULL", Some(config), env).await?;

    Ok(serde_json::json!({ "status": "restored" }))
}

pub async fn delete_backup(
    device_id: &str,
    backup_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let r2 = env
        .bucket("BACKUPS")
        .map_err(|_| ApiError::internal("Failed to access backup storage"))?;

    let key = format!("{}/{}.json", device_id, backup_id);
    r2.delete(&key)
        .await
        .map_err(|_| ApiError::internal("Failed to delete backup"))?;

    Ok(serde_json::json!({ "status": "deleted" }))
}

// ========== WAN Functions ==========

pub async fn get_wan_status(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    let status = get_device_status(device_id, env).await?;
    Ok(serde_json::json!({
        "connected": status.get("wan_ip").is_some(),
        "ip": status.get("wan_ip"),
        "uptime": status.get("uptime")
    }))
}

// ========== VLAN Functions ==========

pub async fn get_vlans(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "vlans", env).await
}

pub async fn create_vlan(
    device_id: &str,
    vlan: &network::VlanConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut vlans: Vec<serde_json::Value> = get_vlans(device_id, env).await.unwrap_or_default();
    vlans.push(
        serde_json::to_value(vlan).map_err(|_| ApiError::internal("Failed to serialize VLAN"))?,
    );
    update_config(device_id, "vlans", &vlans, env).await?;
    Ok(serde_json::json!({ "id": vlan.id, "status": "created" }))
}

pub async fn update_vlan(
    device_id: &str,
    vlan_id: &str,
    vlan: &network::VlanConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut vlans: Vec<serde_json::Value> = get_vlans(device_id, env).await?;
    let id: u32 = vlan_id
        .parse()
        .map_err(|_| ApiError::bad_request("Invalid VLAN ID"))?;
    if let Some(v) = vlans
        .iter_mut()
        .find(|v| v.get("id").and_then(|x| x.as_u64()) == Some(id as u64))
    {
        *v = serde_json::to_value(vlan)
            .map_err(|_| ApiError::internal("Failed to serialize VLAN"))?;
    }
    update_config(device_id, "vlans", &vlans, env).await
}

pub async fn delete_vlan(
    device_id: &str,
    vlan_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut vlans: Vec<serde_json::Value> = get_vlans(device_id, env).await?;
    let id: u32 = vlan_id
        .parse()
        .map_err(|_| ApiError::bad_request("Invalid VLAN ID"))?;
    vlans.retain(|v| v.get("id").and_then(|x| x.as_u64()) != Some(id as u64));
    update_config(device_id, "vlans", &vlans, env).await?;
    Ok(serde_json::json!({ "status": "deleted" }))
}

// ========== WiFi Functions ==========

pub async fn get_wifi_radios(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "wifi_radios", env).await
}

pub async fn update_wifi_radio(
    device_id: &str,
    _radio_id: &str,
    radio: &network::WifiRadio,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut radios: Vec<serde_json::Value> = get_wifi_radios(device_id, env).await?;
    if let Some(r) = radios
        .iter_mut()
        .find(|r| r.get("id").and_then(|x| x.as_str()) == Some(&radio.id))
    {
        *r = serde_json::to_value(radio)
            .map_err(|_| ApiError::internal("Failed to serialize radio"))?;
    }
    update_config(device_id, "wifi_radios", &radios, env).await
}

pub async fn get_wifi_networks(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "wifi_networks", env).await
}

pub async fn create_wifi_network(
    device_id: &str,
    network_config: &network::WifiNetwork,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut networks: Vec<serde_json::Value> =
        get_wifi_networks(device_id, env).await.unwrap_or_default();
    networks.push(
        serde_json::to_value(network_config)
            .map_err(|_| ApiError::internal("Failed to serialize network"))?,
    );
    update_config(device_id, "wifi_networks", &networks, env).await?;
    Ok(serde_json::json!({ "id": network_config.id, "status": "created" }))
}

pub async fn update_wifi_network(
    device_id: &str,
    network_id: &str,
    network_config: &network::WifiNetwork,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut networks: Vec<serde_json::Value> = get_wifi_networks(device_id, env).await?;
    let id: u32 = network_id
        .parse()
        .map_err(|_| ApiError::bad_request("Invalid network ID"))?;
    if let Some(n) = networks
        .iter_mut()
        .find(|n| n.get("id").and_then(|x| x.as_u64()) == Some(id as u64))
    {
        *n = serde_json::to_value(network_config)
            .map_err(|_| ApiError::internal("Failed to serialize network"))?;
    }
    update_config(device_id, "wifi_networks", &networks, env).await
}

pub async fn delete_wifi_network(
    device_id: &str,
    network_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut networks: Vec<serde_json::Value> = get_wifi_networks(device_id, env).await?;
    let id: u32 = network_id
        .parse()
        .map_err(|_| ApiError::bad_request("Invalid network ID"))?;
    networks.retain(|n| n.get("id").and_then(|x| x.as_u64()) != Some(id as u64));
    update_config(device_id, "wifi_networks", &networks, env).await?;
    Ok(serde_json::json!({ "status": "deleted" }))
}

pub async fn get_wifi_clients(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    let kv = env
        .kv("CACHE")
        .map_err(|_| ApiError::internal("Failed to access cache"))?;

    let key = format!("wifi_clients:{}", device_id);
    let data = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read clients"))?
        .unwrap_or_else(|| "[]".to_string());

    serde_json::from_str(&data).map_err(|_| ApiError::internal("Invalid clients format"))
}

// ========== DHCP Functions ==========

pub async fn get_dhcp_leases(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    let kv = env
        .kv("CACHE")
        .map_err(|_| ApiError::internal("Failed to access cache"))?;

    let key = format!("dhcp_leases:{}", device_id);
    let data = kv
        .get(&key)
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read leases"))?
        .unwrap_or_else(|| "[]".to_string());

    serde_json::from_str(&data).map_err(|_| ApiError::internal("Invalid leases format"))
}

pub async fn revoke_dhcp_lease(
    device_id: &str,
    ip: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    send_command(
        device_id,
        "REVOKE_LEASE",
        Some(serde_json::json!({ "ip": ip })),
        env,
    )
    .await
}

pub async fn get_dhcp_reservations(
    device_id: &str,
    env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "dhcp_reservations", env).await
}

pub async fn create_dhcp_reservation(
    device_id: &str,
    reservation: &network::DhcpReservation,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut reservations: Vec<serde_json::Value> = get_dhcp_reservations(device_id, env)
        .await
        .unwrap_or_default();
    reservations.push(
        serde_json::to_value(reservation)
            .map_err(|_| ApiError::internal("Failed to serialize reservation"))?,
    );
    update_config(device_id, "dhcp_reservations", &reservations, env).await?;
    Ok(serde_json::json!({ "mac": reservation.mac, "status": "created" }))
}

pub async fn delete_dhcp_reservation(
    device_id: &str,
    mac: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut reservations: Vec<serde_json::Value> = get_dhcp_reservations(device_id, env).await?;
    reservations.retain(|r| r.get("mac").and_then(|x| x.as_str()) != Some(mac));
    update_config(device_id, "dhcp_reservations", &reservations, env).await?;
    Ok(serde_json::json!({ "status": "deleted" }))
}

// Routing
pub async fn get_routes(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "routes", env).await
}
pub async fn create_route(
    device_id: &str,
    route: &network::RouteRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut routes: Vec<serde_json::Value> = get_routes(device_id, env).await.unwrap_or_default();
    let new_id = routes.len() as u32 + 1;
    let mut route_json = serde_json::to_value(route).unwrap();
    route_json["id"] = serde_json::json!(new_id.to_string());
    routes.push(route_json);
    update_config(device_id, "routes", &routes, env).await?;
    Ok(serde_json::json!({ "id": new_id, "status": "created" }))
}
pub async fn update_route(
    device_id: &str,
    route_id: &str,
    route: &network::RouteRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut routes: Vec<serde_json::Value> = get_routes(device_id, env).await?;
    if let Some(r) = routes
        .iter_mut()
        .find(|r| r.get("id").and_then(|v| v.as_str()) == Some(route_id))
    {
        *r = serde_json::to_value(route).unwrap();
        r["id"] = serde_json::json!(route_id);
    }
    update_config(device_id, "routes", &routes, env).await
}
pub async fn delete_route(
    device_id: &str,
    route_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut routes: Vec<serde_json::Value> = get_routes(device_id, env).await?;
    routes.retain(|r| r.get("id").and_then(|v| v.as_str()) != Some(route_id));
    update_config(device_id, "routes", &routes, env).await?;
    Ok(serde_json::json!({ "status": "deleted" }))
}

// Firewall
pub async fn get_firewall_rules(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "firewall_rules", env).await
}

pub async fn create_firewall_rule(
    device_id: &str,
    rule: &security::FirewallRuleRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut rules: Vec<serde_json::Value> =
        get_firewall_rules(device_id, env).await.unwrap_or_default();
    let new_id = rules.len() as u32 + 1;
    let mut rule_json = serde_json::to_value(rule).unwrap();
    rule_json["id"] = serde_json::json!(new_id);
    rules.push(rule_json);
    update_config(device_id, "firewall_rules", &rules, env).await?;
    Ok(serde_json::json!({ "id": new_id, "status": "created" }))
}

pub async fn update_firewall_rule(
    device_id: &str,
    rule_id: &str,
    rule: &security::FirewallRuleRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut rules: Vec<serde_json::Value> = get_firewall_rules(device_id, env).await?;
    let id: u32 = rule_id
        .parse()
        .map_err(|_| ApiError::bad_request("Invalid rule ID"))?;
    if let Some(r) = rules
        .iter_mut()
        .find(|r| r.get("id").and_then(|v| v.as_u64()) == Some(id as u64))
    {
        *r = serde_json::to_value(rule).unwrap();
        r["id"] = serde_json::json!(id);
    }
    update_config(device_id, "firewall_rules", &rules, env).await
}

pub async fn delete_firewall_rule(
    device_id: &str,
    rule_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut rules: Vec<serde_json::Value> = get_firewall_rules(device_id, env).await?;
    let id: u32 = rule_id
        .parse()
        .map_err(|_| ApiError::bad_request("Invalid rule ID"))?;
    rules.retain(|r| r.get("id").and_then(|v| v.as_u64()) != Some(id as u64));
    update_config(device_id, "firewall_rules", &rules, env).await?;
    Ok(serde_json::json!({ "status": "deleted" }))
}

pub async fn reorder_firewall_rules(
    device_id: &str,
    order: &[u32],
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let rules: Vec<serde_json::Value> = get_firewall_rules(device_id, env).await?;
    let mut new_rules = Vec::new();
    for id in order {
        if let Some(rule) = rules
            .iter()
            .find(|r| r.get("id").and_then(|v| v.as_u64()) == Some(*id as u64))
        {
            new_rules.push(rule.clone());
        }
    }
    update_config(device_id, "firewall_rules", &new_rules, env).await
}

pub async fn get_firewall_zones(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "firewall_zones", env).await
}

pub async fn update_firewall_zone(
    device_id: &str,
    zone_id: &str,
    zone: &security::ZoneConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let mut zones: Vec<serde_json::Value> = get_firewall_zones(device_id, env).await?;
    if let Some(z) = zones
        .iter_mut()
        .find(|z| z.get("id").and_then(|x| x.as_str()) == Some(zone_id))
    {
        *z = serde_json::to_value(zone)
            .map_err(|_| ApiError::internal("Failed to serialize zone"))?;
    }
    update_config(device_id, "firewall_zones", &zones, env).await
}

pub async fn get_zone_policies(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "zone_policies", env).await
}

pub async fn update_zone_policies(
    device_id: &str,
    policies: &[security::ZonePolicy],
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let policies_vec: Vec<serde_json::Value> = policies
        .iter()
        .filter_map(|p| serde_json::to_value(p).ok())
        .collect();
    update_config(device_id, "zone_policies", &policies_vec, env).await
}

// NAT - similar pattern
pub async fn get_nat_rules(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "nat_rules", env).await
}
pub async fn create_nat_rule(
    device_id: &str,
    rule: &security::NatRule,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "nat_rules", rule, env).await
}
pub async fn update_nat_rule(
    device_id: &str,
    _rule_id: &str,
    rule: &security::NatRule,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "nat_rules", rule, env).await
}
pub async fn delete_nat_rule(
    _device_id: &str,
    _rule_id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "deleted"}))
}
pub async fn get_upnp_leases(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "upnp_leases", env).await
}
pub async fn revoke_upnp_lease(
    device_id: &str,
    lease_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    send_command(
        device_id,
        "REVOKE_UPNP",
        Some(serde_json::json!({"id": lease_id})),
        env,
    )
    .await
}

// Traffic
pub async fn get_traffic_logs(
    _device_id: &str,
    _query: Option<&str>,
    _env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}
pub async fn get_traffic_stats(_device_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({}))
}
pub async fn get_top_clients(_device_id: &str, _env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}
pub async fn get_top_destinations(
    _device_id: &str,
    _env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}

// DNS
pub async fn get_dns_config(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "dns", env).await
}
pub async fn update_dns_config(
    device_id: &str,
    config: &security::DnsConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "dns", config, env).await
}
pub async fn get_dns_blocklists(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "dns_blocklists", env).await
}
pub async fn add_dns_blocklist(
    device_id: &str,
    blocklist: &security::DnsBlocklist,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "dns_blocklists", blocklist, env).await
}
pub async fn remove_dns_blocklist(
    _device_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "removed"}))
}
pub async fn force_blocklist_update(
    device_id: &str,
    id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    send_command(
        device_id,
        "UPDATE_BLOCKLIST",
        Some(serde_json::json!({"id": id})),
        env,
    )
    .await
}
pub async fn get_dns_allowlist(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "dns_allowlist", env).await
}
pub async fn add_to_dns_allowlist(
    device_id: &str,
    entry: &security::DnsAllowlistEntry,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "dns_allowlist", entry, env).await
}
pub async fn remove_from_dns_allowlist(
    _device_id: &str,
    _domain: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "removed"}))
}
pub async fn get_dns_queries(
    _device_id: &str,
    _query: Option<&str>,
    _env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}
pub async fn get_dns_stats(_device_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({}))
}

// IDS
pub async fn get_ids_config(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "ids", env).await
}
pub async fn update_ids_config(
    device_id: &str,
    config: &security::IdsConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "ids", config, env).await
}
pub async fn get_ids_categories(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "ids_categories", env).await
}
pub async fn update_ids_category(
    device_id: &str,
    _id: &str,
    category: &security::IdsCategory,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "ids_categories", category, env).await
}
pub async fn get_ids_rules(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "ids_rules", env).await
}
pub async fn create_ids_rule(
    device_id: &str,
    rule: &security::IdsRule,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "ids_rules", rule, env).await
}
pub async fn delete_ids_rule(
    _device_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "deleted"}))
}
pub async fn get_ids_alerts(
    _device_id: &str,
    _query: Option<&str>,
    _env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}

// Dashboards
pub fn list_dashboards() -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![
        serde_json::json!({
            "id": "network-overview",
            "category": "network-overview",
            "name": "Network Overview",
            "description": "Real-time network status, connected devices, and bandwidth usage",
            "icon": "network",
            "default_view": true
        }),
        serde_json::json!({
            "id": "security-events",
            "category": "security-events",
            "name": "Security Events",
            "description": "IPS alerts, blocked threats, and security policy violations",
            "icon": "shield",
            "default_view": false
        }),
        serde_json::json!({
            "id": "dns-analytics",
            "category": "dns-analytics",
            "name": "DNS Analytics",
            "description": "DNS queries, top domains, blocked queries, and filtering statistics",
            "icon": "dns",
            "default_view": false
        }),
        serde_json::json!({
            "id": "wifi-performance",
            "category": "wifi-performance",
            "name": "WiFi Performance",
            "description": "WiFi signal strength, channel utilization, and client connections",
            "icon": "wifi",
            "default_view": false
        }),
        serde_json::json!({
            "id": "wan-health",
            "category": "wan-health",
            "name": "WAN Health",
            "description": "WAN uptime, latency, packet loss, and connection quality metrics",
            "icon": "globe",
            "default_view": false
        }),
        serde_json::json!({
            "id": "vpn-metrics",
            "category": "vpn-metrics",
            "name": "VPN Metrics",
            "description": "VPN tunnel status, throughput, connected clients, and data transfer",
            "icon": "vpn",
            "default_view": false
        }),
        serde_json::json!({
            "id": "system-resources",
            "category": "system-resources",
            "name": "System Resources",
            "description": "CPU usage, memory utilization, storage, and temperature monitoring",
            "icon": "cpu",
            "default_view": false
        }),
        serde_json::json!({
            "id": "traffic-analysis",
            "category": "traffic-analysis",
            "name": "Traffic Analysis",
            "description": "Protocol breakdown, application usage, and traffic patterns",
            "icon": "chart",
            "default_view": false
        }),
        serde_json::json!({
            "id": "firewall-rules",
            "category": "firewall-rules",
            "name": "Firewall Rules",
            "description": "Rule hit counts, blocked connections, and policy effectiveness",
            "icon": "firewall",
            "default_view": false
        }),
        serde_json::json!({
            "id": "qos-metrics",
            "category": "qos-metrics",
            "name": "QoS Metrics",
            "description": "Traffic shaping stats, bandwidth allocation, and queue performance",
            "icon": "priority",
            "default_view": false
        }),
    ])
}

pub fn get_dashboard(id: &str) -> ApiResult<serde_json::Value> {
    let dashboards = get_all_dashboards_with_widgets();
    dashboards
        .get(id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Dashboard"))
}

fn get_all_dashboards_with_widgets() -> std::collections::HashMap<&'static str, serde_json::Value> {
    let mut map = std::collections::HashMap::new();

    map.insert("network-overview", serde_json::json!({
        "id": "network-overview",
        "category": "network-overview",
        "name": "Network Overview",
        "description": "Real-time network status, connected devices, and bandwidth usage",
        "icon": "network",
        "default_view": true,
        "widgets": [
            {
                "id": "wan-status",
                "type": "gauge",
                "title": "WAN Status",
                "data_source": "/api/network/wan/status",
                "refresh_interval": 5000,
                "config": { "unit": "Mbps", "max": 1000 }
            },
            {
                "id": "connected-devices",
                "type": "counter",
                "title": "Connected Devices",
                "data_source": "/api/network/devices",
                "refresh_interval": 10000,
                "config": { "icon": "devices" }
            },
            {
                "id": "bandwidth-chart",
                "type": "line-chart",
                "title": "Bandwidth Usage (24h)",
                "data_source": "/api/network/bandwidth/history",
                "refresh_interval": 30000,
                "config": { "timeRange": "24h", "yAxisUnit": "Mbps" }
            },
            {
                "id": "top-talkers",
                "type": "table",
                "title": "Top Bandwidth Consumers",
                "data_source": "/api/network/top-talkers",
                "refresh_interval": 15000,
                "config": { "columns": ["device", "ip", "bandwidth"], "limit": 10 }
            }
        ]
    }));

    map.insert("security-events", serde_json::json!({
        "id": "security-events",
        "category": "security-events",
        "name": "Security Events",
        "description": "IPS alerts, blocked threats, and security policy violations",
        "icon": "shield",
        "default_view": false,
        "widgets": [
            {
                "id": "threat-counter",
                "type": "counter",
                "title": "Threats Blocked (24h)",
                "data_source": "/api/security/threats/count",
                "refresh_interval": 10000,
                "config": { "icon": "shield", "color": "red" }
            },
            {
                "id": "threat-types",
                "type": "pie-chart",
                "title": "Threat Types",
                "data_source": "/api/security/threats/by-type",
                "refresh_interval": 30000,
                "config": {}
            },
            {
                "id": "recent-events",
                "type": "table",
                "title": "Recent Security Events",
                "data_source": "/api/security/events/recent",
                "refresh_interval": 5000,
                "config": {
                    "columns": ["timestamp", "type", "source", "action"],
                    "limit": 20
                }
            },
            {
                "id": "attack-heatmap",
                "type": "heatmap",
                "title": "Attack Sources (Geo)",
                "data_source": "/api/security/attacks/geo",
                "refresh_interval": 60000,
                "config": {}
            }
        ]
    }));

    map.insert("dns-analytics", serde_json::json!({
        "id": "dns-analytics",
        "category": "dns-analytics",
        "name": "DNS Analytics",
        "description": "DNS queries, top domains, blocked queries, and filtering statistics",
        "icon": "dns",
        "default_view": false,
        "widgets": [
            {
                "id": "dns-queries",
                "type": "counter",
                "title": "DNS Queries (24h)",
                "data_source": "/api/dns/queries/count",
                "refresh_interval": 10000,
                "config": { "icon": "dns" }
            },
            {
                "id": "blocked-queries",
                "type": "counter",
                "title": "Blocked Queries",
                "data_source": "/api/dns/blocked/count",
                "refresh_interval": 10000,
                "config": { "icon": "block", "color": "red" }
            },
            {
                "id": "top-domains",
                "type": "bar-chart",
                "title": "Top Queried Domains",
                "data_source": "/api/dns/top-domains",
                "refresh_interval": 30000,
                "config": { "limit": 10 }
            },
            {
                "id": "query-types",
                "type": "pie-chart",
                "title": "Query Types",
                "data_source": "/api/dns/query-types",
                "refresh_interval": 30000,
                "config": {}
            }
        ]
    }));

    map.insert("wifi-performance", serde_json::json!({
        "id": "wifi-performance",
        "category": "wifi-performance",
        "name": "WiFi Performance",
        "description": "WiFi signal strength, channel utilization, and client connections",
        "icon": "wifi",
        "default_view": false,
        "widgets": [
            {
                "id": "wifi-clients",
                "type": "counter",
                "title": "Connected Clients",
                "data_source": "/api/wifi/clients/count",
                "refresh_interval": 5000,
                "config": { "icon": "wifi" }
            },
            {
                "id": "channel-util",
                "type": "gauge",
                "title": "Channel Utilization",
                "data_source": "/api/wifi/channel/utilization",
                "refresh_interval": 10000,
                "config": { "unit": "%", "max": 100 }
            },
            {
                "id": "signal-strength",
                "type": "bar-chart",
                "title": "Signal Strength Distribution",
                "data_source": "/api/wifi/signal/distribution",
                "refresh_interval": 30000,
                "config": {}
            },
            {
                "id": "client-table",
                "type": "table",
                "title": "WiFi Clients",
                "data_source": "/api/wifi/clients",
                "refresh_interval": 10000,
                "config": {
                    "columns": ["device", "mac", "signal", "bandwidth"],
                    "limit": 20
                }
            }
        ]
    }));

    map.insert("wan-health", serde_json::json!({
        "id": "wan-health",
        "category": "wan-health",
        "name": "WAN Health",
        "description": "WAN uptime, latency, packet loss, and connection quality metrics",
        "icon": "globe",
        "default_view": false,
        "widgets": [
            {
                "id": "wan-uptime",
                "type": "gauge",
                "title": "WAN Uptime",
                "data_source": "/api/wan/uptime",
                "refresh_interval": 30000,
                "config": { "unit": "%", "max": 100 }
            },
            {
                "id": "latency",
                "type": "line-chart",
                "title": "Latency (24h)",
                "data_source": "/api/wan/latency/history",
                "refresh_interval": 30000,
                "config": { "yAxisUnit": "ms" }
            },
            {
                "id": "packet-loss",
                "type": "line-chart",
                "title": "Packet Loss",
                "data_source": "/api/wan/packet-loss",
                "refresh_interval": 30000,
                "config": { "yAxisUnit": "%" }
            },
            {
                "id": "speed-test",
                "type": "gauge",
                "title": "Current Speed",
                "data_source": "/api/wan/speed",
                "refresh_interval": 60000,
                "config": { "unit": "Mbps", "max": 1000 }
            }
        ]
    }));

    map.insert("vpn-metrics", serde_json::json!({
        "id": "vpn-metrics",
        "category": "vpn-metrics",
        "name": "VPN Metrics",
        "description": "VPN tunnel status, throughput, connected clients, and data transfer",
        "icon": "vpn",
        "default_view": false,
        "widgets": [
            {
                "id": "vpn-clients",
                "type": "counter",
                "title": "Connected VPN Clients",
                "data_source": "/api/vpn/clients/count",
                "refresh_interval": 10000,
                "config": { "icon": "vpn" }
            },
            {
                "id": "vpn-throughput",
                "type": "line-chart",
                "title": "VPN Throughput",
                "data_source": "/api/vpn/throughput",
                "refresh_interval": 10000,
                "config": { "yAxisUnit": "Mbps" }
            },
            {
                "id": "vpn-clients-table",
                "type": "table",
                "title": "VPN Clients",
                "data_source": "/api/vpn/clients",
                "refresh_interval": 15000,
                "config": {
                    "columns": ["user", "ip", "connected_at", "data_sent", "data_received"],
                    "limit": 20
                }
            }
        ]
    }));

    map.insert("system-resources", serde_json::json!({
        "id": "system-resources",
        "category": "system-resources",
        "name": "System Resources",
        "description": "CPU usage, memory utilization, storage, and temperature monitoring",
        "icon": "cpu",
        "default_view": false,
        "widgets": [
            {
                "id": "cpu-usage",
                "type": "gauge",
                "title": "CPU Usage",
                "data_source": "/api/system/cpu",
                "refresh_interval": 5000,
                "config": { "unit": "%", "max": 100 }
            },
            {
                "id": "memory-usage",
                "type": "gauge",
                "title": "Memory Usage",
                "data_source": "/api/system/memory",
                "refresh_interval": 5000,
                "config": { "unit": "%", "max": 100 }
            },
            {
                "id": "temperature",
                "type": "gauge",
                "title": "Temperature",
                "data_source": "/api/system/temperature",
                "refresh_interval": 10000,
                "config": { "unit": "\u{00b0}C", "max": 100 }
            },
            {
                "id": "storage",
                "type": "gauge",
                "title": "Storage Usage",
                "data_source": "/api/system/storage",
                "refresh_interval": 60000,
                "config": { "unit": "%", "max": 100 }
            }
        ]
    }));

    map.insert("traffic-analysis", serde_json::json!({
        "id": "traffic-analysis",
        "category": "traffic-analysis",
        "name": "Traffic Analysis",
        "description": "Protocol breakdown, application usage, and traffic patterns",
        "icon": "chart",
        "default_view": false,
        "widgets": [
            {
                "id": "protocol-breakdown",
                "type": "pie-chart",
                "title": "Protocol Breakdown",
                "data_source": "/api/traffic/protocols",
                "refresh_interval": 30000,
                "config": {}
            },
            {
                "id": "app-usage",
                "type": "bar-chart",
                "title": "Top Applications",
                "data_source": "/api/traffic/applications",
                "refresh_interval": 30000,
                "config": { "limit": 10 }
            },
            {
                "id": "traffic-history",
                "type": "line-chart",
                "title": "Traffic History (7d)",
                "data_source": "/api/traffic/history",
                "refresh_interval": 60000,
                "config": { "timeRange": "7d", "yAxisUnit": "GB" }
            }
        ]
    }));

    map.insert("firewall-rules", serde_json::json!({
        "id": "firewall-rules",
        "category": "firewall-rules",
        "name": "Firewall Rules",
        "description": "Rule hit counts, blocked connections, and policy effectiveness",
        "icon": "firewall",
        "default_view": false,
        "widgets": [
            {
                "id": "blocked-connections",
                "type": "counter",
                "title": "Blocked Connections (24h)",
                "data_source": "/api/firewall/blocked/count",
                "refresh_interval": 10000,
                "config": { "icon": "block", "color": "red" }
            },
            {
                "id": "rule-hits",
                "type": "table",
                "title": "Top Firewall Rules",
                "data_source": "/api/firewall/rules/hits",
                "refresh_interval": 30000,
                "config": { "columns": ["rule", "hits", "action"], "limit": 20 }
            },
            {
                "id": "block-reasons",
                "type": "pie-chart",
                "title": "Block Reasons",
                "data_source": "/api/firewall/block-reasons",
                "refresh_interval": 30000,
                "config": {}
            }
        ]
    }));

    map.insert("qos-metrics", serde_json::json!({
        "id": "qos-metrics",
        "category": "qos-metrics",
        "name": "QoS Metrics",
        "description": "Traffic shaping stats, bandwidth allocation, and queue performance",
        "icon": "priority",
        "default_view": false,
        "widgets": [
            {
                "id": "bandwidth-allocation",
                "type": "pie-chart",
                "title": "Bandwidth Allocation",
                "data_source": "/api/qos/bandwidth",
                "refresh_interval": 10000,
                "config": {}
            },
            {
                "id": "queue-stats",
                "type": "bar-chart",
                "title": "Queue Statistics",
                "data_source": "/api/qos/queues",
                "refresh_interval": 10000,
                "config": {}
            },
            {
                "id": "priority-traffic",
                "type": "line-chart",
                "title": "Priority Traffic",
                "data_source": "/api/qos/priority",
                "refresh_interval": 15000,
                "config": { "yAxisUnit": "Mbps" }
            }
        ]
    }));

    map
}

// VPN Server
pub async fn get_vpn_server_config(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "vpn_server", env).await
}
pub async fn update_vpn_server_config(
    device_id: &str,
    config: &services::VpnServerConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "vpn_server", config, env).await
}
pub async fn get_vpn_peers(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "vpn_peers", env).await
}
pub async fn create_vpn_peer(
    device_id: &str,
    peer: &services::VpnPeerRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "vpn_peers", peer, env).await
}
pub async fn update_vpn_peer(
    device_id: &str,
    _id: &str,
    peer: &services::VpnPeerRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "vpn_peers", peer, env).await
}
pub async fn delete_vpn_peer(
    _device_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "deleted"}))
}
pub async fn get_vpn_peer_qr(
    _device_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({}))
}
pub async fn get_vpn_server_status(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_device_status(device_id, env).await
}

// VPN Client
pub async fn get_vpn_client_profiles(
    device_id: &str,
    env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "vpn_profiles", env).await
}
pub async fn create_vpn_client_profile(
    device_id: &str,
    profile: &services::VpnClientProfile,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "vpn_profiles", profile, env).await
}
pub async fn update_vpn_client_profile(
    device_id: &str,
    _id: &str,
    profile: &services::VpnClientProfile,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "vpn_profiles", profile, env).await
}
pub async fn delete_vpn_client_profile(
    _device_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "deleted"}))
}
pub async fn connect_vpn_client(
    device_id: &str,
    id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    send_command(
        device_id,
        "VPN_CONNECT",
        Some(serde_json::json!({"profile_id": id})),
        env,
    )
    .await
}
pub async fn disconnect_vpn_client(
    device_id: &str,
    id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    send_command(
        device_id,
        "VPN_DISCONNECT",
        Some(serde_json::json!({"profile_id": id})),
        env,
    )
    .await
}
pub async fn get_vpn_client_status(_device_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"connected": false}))
}

// QoS
pub async fn get_qos_config(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "qos", env).await
}
pub async fn update_qos_config(
    device_id: &str,
    config: &services::QosConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "qos", config, env).await
}
pub async fn get_traffic_classes(device_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "traffic_classes", env).await
}
pub async fn create_traffic_class(
    device_id: &str,
    class: &services::TrafficClass,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "traffic_classes", class, env).await
}
pub async fn update_traffic_class(
    device_id: &str,
    _id: &str,
    class: &services::TrafficClass,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "traffic_classes", class, env).await
}
pub async fn delete_traffic_class(
    _device_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "deleted"}))
}
pub async fn get_device_bandwidth_limits(
    device_id: &str,
    env: &Env,
) -> ApiResult<Vec<serde_json::Value>> {
    get_config(device_id, "device_limits", env).await
}
pub async fn set_device_bandwidth_limit(
    device_id: &str,
    _mac: &str,
    limit: &services::DeviceLimit,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "device_limits", limit, env).await
}
pub async fn remove_device_bandwidth_limit(
    _device_id: &str,
    _mac: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "removed"}))
}

// DDNS
pub async fn get_ddns_config(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    get_config(device_id, "ddns", env).await
}
pub async fn update_ddns_config(
    device_id: &str,
    config: &services::DdnsConfig,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    update_config(device_id, "ddns", config, env).await
}
pub async fn force_ddns_update(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    send_command(device_id, "DDNS_UPDATE", None, env).await
}
pub async fn get_ddns_status(_device_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "unknown"}))
}

// User
pub async fn get_user_profile(user_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    let kv = env
        .kv("SESSIONS")
        .map_err(|_| ApiError::internal("Failed to access sessions"))?;
    let data = kv
        .get(&format!("user:{}", user_id))
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read user"))?;
    data.map(|d| serde_json::from_str(&d).unwrap_or_default())
        .ok_or_else(|| ApiError::not_found("User"))
}
pub async fn update_user_profile(
    _user_id: &str,
    _update: &user::UpdateProfileRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "updated"}))
}
pub async fn change_user_password(
    _user_id: &str,
    _change: &user::ChangePasswordRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "updated"}))
}
pub async fn get_2fa_status(_user_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"enabled": false}))
}
pub async fn enable_2fa(
    _user_id: &str,
    _request: &user::Enable2faRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"backup_codes": []}))
}
pub async fn disable_2fa(_user_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "disabled"}))
}
pub async fn get_user_sessions(_user_id: &str, _env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}
pub async fn revoke_user_session(
    _user_id: &str,
    _session_id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "revoked"}))
}

// Billing
pub async fn get_subscription(_user_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"plan": "starter"}))
}
pub async fn change_subscription(
    _user_id: &str,
    _change: &user::ChangePlanRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "updated"}))
}
pub async fn get_usage_meters(_user_id: &str, _env: &Env) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({}))
}
pub async fn get_payment_methods(_user_id: &str, _env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}
pub async fn add_payment_method(
    _user_id: &str,
    _add: &user::AddPaymentMethodRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "added"}))
}
pub async fn remove_payment_method(
    _user_id: &str,
    _id: &str,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "removed"}))
}
pub async fn get_invoices(_user_id: &str, _env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    Ok(vec![])
}
pub async fn get_invoice_pdf(_user_id: &str, _id: &str, _env: &Env) -> ApiResult<Vec<u8>> {
    Ok(vec![])
}

// Fleet
pub async fn get_user_devices(user_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    let kv = env
        .kv("DEVICES")
        .map_err(|_| ApiError::internal("Failed to access devices"))?;
    let list = kv
        .list()
        .prefix(format!("owner:{}:", user_id))
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to list devices"))?;
    let mut devices = Vec::new();
    for key in list.keys {
        if let Some(data) = kv.get(&key.name).text().await.ok().flatten()
            && let Ok(device) = serde_json::from_str::<serde_json::Value>(&data)
        {
            devices.push(device);
        }
    }
    Ok(devices)
}

pub async fn count_user_devices(user_id: &str, env: &Env) -> ApiResult<u32> {
    let devices = get_user_devices(user_id, env).await?;
    Ok(devices.len() as u32)
}

pub async fn register_device(
    user_id: &str,
    request: &fleet::RegisterDeviceRequest,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let kv = env
        .kv("DEVICES")
        .map_err(|_| ApiError::internal("Failed to access devices"))?;
    let device_id = uuid::Uuid::new_v4().to_string();
    let api_key = uuid::Uuid::new_v4().to_string();

    let device = serde_json::json!({
        "id": device_id,
        "name": request.name,
        "owner_id": user_id,
        "status": "provisioning",
        "created_at": chrono::Utc::now().timestamp()
    });

    kv.put(
        &format!("device:{}", device_id),
        serde_json::to_string(&device).unwrap(),
    )
    .map_err(|_| ApiError::internal("Failed to store device"))?
    .execute()
    .await
    .map_err(|_| ApiError::internal("Failed to save device"))?;

    kv.put(&format!("apikey:{}", api_key), &device_id)
        .map_err(|_| ApiError::internal("Failed to store API key"))?
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to save API key"))?;

    kv.put(&format!("owner:{}:{}", user_id, device_id), &device_id)
        .map_err(|_| ApiError::internal("Failed to store owner mapping"))?
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to save owner mapping"))?;

    Ok(serde_json::json!({
        "device_id": device_id,
        "api_key": api_key,
        "websocket_url": "wss://api.ngfw.sh/agent/ws"
    }))
}

pub async fn remove_device(device_id: &str, env: &Env) -> ApiResult<serde_json::Value> {
    let kv = env
        .kv("DEVICES")
        .map_err(|_| ApiError::internal("Failed to access devices"))?;
    kv.delete(&format!("device:{}", device_id))
        .await
        .map_err(|_| ApiError::internal("Failed to delete device"))?;
    Ok(serde_json::json!({"status": "removed"}))
}

pub async fn get_config_templates(user_id: &str, env: &Env) -> ApiResult<Vec<serde_json::Value>> {
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access configs"))?;
    let data = kv
        .get(&format!("templates:{}", user_id))
        .text()
        .await
        .map_err(|_| ApiError::internal("Failed to read templates"))?;
    Ok(data
        .map(|d| serde_json::from_str(&d).unwrap_or_default())
        .unwrap_or_default())
}

pub async fn create_config_template(
    _user_id: &str,
    _template: &fleet::CreateTemplateRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"id": uuid::Uuid::new_v4().to_string(), "status": "created"}))
}

pub async fn apply_config_template(
    _template_id: &str,
    _apply: &fleet::ApplyTemplateRequest,
    _env: &Env,
) -> ApiResult<serde_json::Value> {
    Ok(serde_json::json!({"status": "applied"}))
}

// ========== Onboarding Functions ==========

/// Get the list of available routers for purchase
pub fn get_onboarding_routers() -> ApiResult<serde_json::Value> {
    let routers = vec![
        serde_json::json!({
            "id": "asus-rt-ax92u",
            "name": "RT-AX92U",
            "manufacturer": "ASUS",
            "firmware": "Merlin NG",
            "price": 299,
            "specs": {
                "cpu": "Quad-core 1.8GHz",
                "ram": "512MB",
                "storage": "256MB NAND",
                "wan_ports": "1x Gigabit",
                "lan_ports": "4x Gigabit",
                "wifi": "WiFi 6 (AX6100) Tri-band",
                "max_devices": 75
            },
            "features": [
                "WiFi 6 (802.11ax) tri-band",
                "AiMesh support for mesh networking",
                "AiProtection Pro security",
                "Advanced QoS and traffic management",
                "USB 3.0 port for network storage",
                "ASUSWRT-Merlin custom firmware"
            ],
            "image": "https://placehold.co/400x300/1e293b/60a5fa?text=ASUS+RT-AX92U",
            "recommended": false,
            "in_stock": true
        }),
        serde_json::json!({
            "id": "gl-inet-flint-2",
            "name": "Flint 2 (GL-MT6000)",
            "manufacturer": "GL.iNet",
            "firmware": "OpenWrt",
            "price": 199,
            "specs": {
                "cpu": "Quad-core 2.0GHz ARM Cortex-A53",
                "ram": "1GB DDR4",
                "storage": "8GB eMMC + 128MB NAND",
                "wan_ports": "1x 2.5Gb",
                "lan_ports": "4x Gigabit",
                "wifi": "WiFi 6 (AX6000) Dual-band",
                "max_devices": 100
            },
            "features": [
                "WiFi 6 dual-band with 160MHz support",
                "OpenWrt native for maximum flexibility",
                "2.5Gb WAN port for multi-gig connections",
                "Pre-configured VPN client support",
                "Open-source firmware with active community",
                "Best price-to-performance ratio"
            ],
            "image": "https://placehold.co/400x300/1e293b/10b981?text=GL.iNet+Flint+2",
            "recommended": true,
            "in_stock": true
        }),
        serde_json::json!({
            "id": "linksys-wrt3200acm",
            "name": "WRT3200ACM",
            "manufacturer": "Linksys",
            "firmware": "OpenWrt",
            "price": 179,
            "specs": {
                "cpu": "Dual-core 1.8GHz ARM",
                "ram": "512MB DDR3",
                "storage": "256MB NAND",
                "wan_ports": "1x Gigabit",
                "lan_ports": "4x Gigabit",
                "wifi": "AC3200 Tri-Stream",
                "max_devices": 60
            },
            "features": [
                "OpenWrt champion with excellent support",
                "Dual-core 1.8GHz for strong performance",
                "eSATA + USB 3.0 + USB 2.0 ports",
                "Proven reliability and stability",
                "Large community and documentation",
                "Budget-friendly OpenWrt option"
            ],
            "image": "https://placehold.co/400x300/1e293b/8b5cf6?text=Linksys+WRT3200ACM",
            "recommended": false,
            "in_stock": true
        }),
        serde_json::json!({
            "id": "gl-inet-flint-3",
            "name": "Flint 3",
            "manufacturer": "GL.iNet",
            "firmware": "OpenWrt",
            "price": 299,
            "specs": {
                "cpu": "Quad-core 2.2GHz",
                "ram": "2GB DDR4",
                "storage": "8GB eMMC",
                "wan_ports": "1x 2.5Gb",
                "lan_ports": "4x 2.5Gb",
                "wifi": "WiFi 7 (BE11000)",
                "max_devices": 150
            },
            "features": [
                "WiFi 7 (802.11be) cutting-edge",
                "5x 2.5Gb ports for multi-gig network",
                "2GB RAM for advanced workloads",
                "Built-in WireGuard and Tailscale",
                "Future-proof connectivity",
                "Premium OpenWrt experience"
            ],
            "image": "https://placehold.co/400x300/1e293b/f59e0b?text=GL.iNet+Flint+3",
            "recommended": false,
            "in_stock": true
        }),
    ];

    Ok(serde_json::json!({
        "success": true,
        "result": routers
    }))
}

/// Create a new router order with pre-configuration
pub async fn create_onboarding_order(
    order: &onboarding::OrderSubmission,
    env: &Env,
) -> ApiResult<onboarding::OrderResponse> {
    // Generate order ID
    let order_id = format!("ORD-{}", uuid::Uuid::new_v4().to_string().replace('-', "")[..12].to_uppercase());

    // Generate device ID (pre-provision)
    let device_id = format!("DEV-{}", uuid::Uuid::new_v4().to_string().replace('-', "")[..9].to_uppercase());

    // Calculate estimated delivery (9 days from now)
    let now = chrono::Utc::now();
    let estimated_delivery = now + chrono::Duration::days(9);

    let response = onboarding::OrderResponse {
        order_id: order_id.clone(),
        device_id: device_id.clone(),
        estimated_delivery: estimated_delivery.to_rfc3339(),
        tracking_url: None,
        setup_instructions: "https://docs.ngfw.sh/setup/quick-start".to_string(),
        status: onboarding::OrderStatus::Pending,
        created_at: now.to_rfc3339(),
    };

    // Store order in KV for later retrieval
    let kv = env
        .kv("CONFIGS")
        .map_err(|_| ApiError::internal("Failed to access config store"))?;

    let order_data = serde_json::json!({
        "order_id": order_id,
        "device_id": device_id,
        "router_id": order.router_id,
        "subscription_plan": order.subscription_plan,
        "status": "pending",
        "created_at": now.to_rfc3339()
    });

    kv.put(
        &format!("onboarding:order:{}", order_id),
        serde_json::to_string(&order_data)
            .map_err(|_| ApiError::internal("Failed to serialize order"))?,
    )
    .map_err(|_| ApiError::internal("Failed to store order"))?
    .execute()
    .await
    .map_err(|_| ApiError::internal("Failed to save order"))?;

    // Store device pre-provisioning record
    let device_data = serde_json::json!({
        "device_id": device_id,
        "order_id": order_id,
        "device_name": order.config.device_name,
        "status": "provisioning",
        "created_at": now.to_rfc3339()
    });

    kv.put(
        &format!("onboarding:device:{}", device_id),
        serde_json::to_string(&device_data)
            .map_err(|_| ApiError::internal("Failed to serialize device"))?,
    )
    .map_err(|_| ApiError::internal("Failed to store device"))?
    .execute()
    .await
    .map_err(|_| ApiError::internal("Failed to save device"))?;

    Ok(response)
}

/// Get the onboarding status for a user
pub async fn get_onboarding_status(
    user_id: Option<&str>,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let now = chrono::Utc::now().to_rfc3339();

    // If a user_id is provided, look up their onboarding state
    if let Some(uid) = user_id {
        let kv = env
            .kv("CONFIGS")
            .map_err(|_| ApiError::internal("Failed to access config store"))?;

        let key = format!("onboarding:status:{}", uid);
        if let Some(data) = kv
            .get(&key)
            .text()
            .await
            .map_err(|_| ApiError::internal("Failed to read onboarding status"))?
        {
            let status: serde_json::Value = serde_json::from_str(&data)
                .map_err(|_| ApiError::internal("Invalid onboarding status format"))?;
            return Ok(serde_json::json!({
                "success": true,
                "result": status
            }));
        }
    }

    // Default: not started
    Ok(serde_json::json!({
        "success": true,
        "result": {
            "completed": false,
            "current_step": "router_selection",
            "last_updated": now
        }
    }))
}

// ========== Report Functions ==========

/// Check if a device belongs to a specific owner via D1
pub async fn check_device_ownership(
    device_id: &str,
    owner_id: &str,
    env: &Env,
) -> ApiResult<bool> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access database"))?;

    let stmt = db
        .prepare("SELECT id FROM devices WHERE id = ? AND owner_id = ?")
        .bind(&[device_id.into(), owner_id.into()])
        .map_err(|_| ApiError::internal("Failed to prepare query"))?;

    let result = stmt
        .first::<serde_json::Value>(None)
        .await
        .map_err(|_| ApiError::internal("Failed to query devices"))?;

    Ok(result.is_some())
}

/// List reports for a user with optional filters
pub async fn list_reports(
    owner_id: &str,
    query: &report::ReportListQuery,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access database"))?;

    let mut sql = String::from("SELECT * FROM reports WHERE owner_id = ?");
    let mut params: Vec<wasm_bindgen::JsValue> = vec![owner_id.into()];

    if let Some(ref device_id) = query.device_id {
        sql.push_str(" AND device_id = ?");
        params.push(device_id.as_str().into());
    }
    if let Some(ref report_type) = query.report_type {
        sql.push_str(" AND type = ?");
        params.push(report_type.as_str().into());
    }
    if let Some(ref status) = query.status {
        sql.push_str(" AND status = ?");
        params.push(status.as_str().into());
    }

    // Count total before applying LIMIT/OFFSET
    let count_sql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
    let count_stmt = db
        .prepare(&count_sql)
        .bind(&params)
        .map_err(|_| ApiError::internal("Failed to prepare count query"))?;

    let count_result = count_stmt
        .first::<serde_json::Value>(None)
        .await
        .map_err(|_| ApiError::internal("Failed to count reports"))?;

    let total = count_result
        .and_then(|v| v.get("total").and_then(|t| t.as_i64()))
        .unwrap_or(0);

    sql.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.push((query.limit as f64).into());
    params.push((query.offset as f64).into());

    let stmt = db
        .prepare(&sql)
        .bind(&params)
        .map_err(|_| ApiError::internal("Failed to prepare query"))?;

    let results = stmt
        .all()
        .await
        .map_err(|_| ApiError::internal("Failed to list reports"))?;

    let rows = results
        .results::<serde_json::Value>()
        .map_err(|_| ApiError::internal("Failed to parse report rows"))?;

    Ok(serde_json::json!({
        "success": true,
        "result": rows,
        "total": total
    }))
}

/// Create a new report record in D1
pub async fn create_report(
    owner_id: &str,
    body: &report::GenerateReportRequest,
    env: &Env,
) -> ApiResult<report::Report> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access database"))?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let stmt = db
        .prepare(
            "INSERT INTO reports (id, device_id, owner_id, type, format, status, title, date_start, date_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&[
            id.as_str().into(),
            body.device_id.as_str().into(),
            owner_id.into(),
            body.report_type.as_str().into(),
            body.format.as_str().into(),
            "pending".into(),
            body.title.as_str().into(),
            body.date_start.as_str().into(),
            body.date_end.as_str().into(),
            now.as_str().into(),
        ])
        .map_err(|_| ApiError::internal("Failed to prepare insert"))?;

    stmt.run()
        .await
        .map_err(|_| ApiError::internal("Failed to insert report"))?;

    Ok(report::Report {
        id,
        device_id: body.device_id.clone(),
        owner_id: owner_id.to_string(),
        report_type: body.report_type.clone(),
        format: body.format.clone(),
        status: "pending".to_string(),
        title: body.title.clone(),
        date_start: body.date_start.clone(),
        date_end: body.date_end.clone(),
        r2_key: None,
        file_size: None,
        created_at: now,
        completed_at: None,
        error_message: None,
    })
}

/// Get a single report by ID, scoped to owner
pub async fn get_report(
    report_id: &str,
    owner_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access database"))?;

    let stmt = db
        .prepare("SELECT * FROM reports WHERE id = ? AND owner_id = ?")
        .bind(&[report_id.into(), owner_id.into()])
        .map_err(|_| ApiError::internal("Failed to prepare query"))?;

    let row = stmt
        .first::<serde_json::Value>(None)
        .await
        .map_err(|_| ApiError::internal("Failed to query report"))?
        .ok_or_else(|| ApiError::not_found("Report"))?;

    let download_url = if row.get("status").and_then(|s| s.as_str()) == Some("completed") {
        row.get("r2_key")
            .and_then(|k| k.as_str())
            .map(|k| format!("https://reports.ngfw.sh/{}", k))
    } else {
        None
    };

    let mut result = row.clone();
    if let Some(obj) = result.as_object_mut() {
        obj.insert(
            "download_url".to_string(),
            match download_url {
                Some(url) => serde_json::Value::String(url),
                None => serde_json::Value::Null,
            },
        );
    }

    Ok(serde_json::json!({
        "success": true,
        "result": result
    }))
}

/// Delete a report by ID, scoped to owner. Also removes the R2 object if present.
pub async fn delete_report(
    report_id: &str,
    owner_id: &str,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access database"))?;

    // Fetch the report to get the r2_key before deleting
    let stmt = db
        .prepare("SELECT * FROM reports WHERE id = ? AND owner_id = ?")
        .bind(&[report_id.into(), owner_id.into()])
        .map_err(|_| ApiError::internal("Failed to prepare query"))?;

    let row = stmt
        .first::<serde_json::Value>(None)
        .await
        .map_err(|_| ApiError::internal("Failed to query report"))?
        .ok_or_else(|| ApiError::not_found("Report"))?;

    // Delete the R2 object if it exists
    if let Some(r2_key) = row.get("r2_key").and_then(|k| k.as_str()) {
        if !r2_key.is_empty() {
            let r2 = env
                .bucket("REPORTS")
                .map_err(|_| ApiError::internal("Failed to access report storage"))?;
            let _ = r2.delete(r2_key).await;
        }
    }

    // Delete from D1
    let delete_stmt = db
        .prepare("DELETE FROM reports WHERE id = ? AND owner_id = ?")
        .bind(&[report_id.into(), owner_id.into()])
        .map_err(|_| ApiError::internal("Failed to prepare delete"))?;

    delete_stmt
        .run()
        .await
        .map_err(|_| ApiError::internal("Failed to delete report"))?;

    Ok(serde_json::json!({
        "success": true,
        "message": "Report deleted successfully"
    }))
}

// ========== Log Functions (D1) ==========

/// List logs from D1, filtered by the authenticated user's devices.
///
/// The query joins `logs` with `devices` on `device_id` and filters
/// by `owner_id` so that only logs belonging to the caller's devices
/// are returned.  Uses the `idx_logs_device_id_timestamp` index for
/// efficient ordering.
pub async fn list_logs(
    user_id: &str,
    query: &logs::LogListQuery,
    env: &Env,
) -> ApiResult<logs::LogListResponse> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access D1 database"))?;

    let limit = query.limit.unwrap_or(20).min(1000);
    let offset = query.offset.unwrap_or(0);

    // -- Build the dynamic WHERE clause --
    // We accumulate owned Strings so that D1Type::Text can borrow them.
    let mut sql = String::from(
        "SELECT l.id, l.device_id, l.timestamp, l.level, l.category, \
         l.message, l.source, l.metadata \
         FROM logs l INNER JOIN devices d ON l.device_id = d.id \
         WHERE d.owner_id = ?",
    );
    let mut string_params: Vec<String> = vec![user_id.to_string()];

    if let Some(ref device_id) = query.device_id {
        sql.push_str(" AND l.device_id = ?");
        string_params.push(device_id.clone());
    }
    if let Some(ref level) = query.level {
        sql.push_str(" AND l.level = ?");
        string_params.push(level.clone());
    }
    if let Some(ref category) = query.category {
        sql.push_str(" AND l.category = ?");
        string_params.push(category.clone());
    }
    if let Some(ref search) = query.search {
        sql.push_str(" AND (l.message LIKE ? OR l.source LIKE ?)");
        let pattern = format!("%{}%", search);
        string_params.push(pattern.clone());
        string_params.push(pattern);
    }
    if let Some(ref date_start) = query.date_start {
        sql.push_str(" AND l.timestamp >= ?");
        string_params.push(date_start.clone());
    }
    if let Some(ref date_end) = query.date_end {
        sql.push_str(" AND l.timestamp <= ?");
        string_params.push(date_end.clone());
    }

    sql.push_str(" ORDER BY l.timestamp DESC LIMIT ? OFFSET ?");

    // Build params: text params first, then numeric limit/offset
    let mut params: Vec<wasm_bindgen::JsValue> = string_params
        .iter()
        .map(|s| s.as_str().into())
        .collect();
    params.push((limit as f64).into());
    params.push((offset as f64).into());

    let stmt = db
        .prepare(&sql)
        .bind(&params)
        .map_err(|_| ApiError::internal("Failed to bind log query parameters"))?;

    let result = stmt
        .all()
        .await
        .map_err(|e| ApiError::internal(format!("D1 query failed: {}", e)))?;

    let rows: Vec<logs::LogEntry> = result
        .results()
        .map_err(|e| ApiError::internal(format!("Failed to deserialize log rows: {}", e)))?;

    // -- Total count (for pagination) --
    let count_stmt = db
        .prepare(
            "SELECT COUNT(*) as total FROM logs l \
             INNER JOIN devices d ON l.device_id = d.id \
             WHERE d.owner_id = ?",
        )
        .bind(&[user_id.into()])
        .map_err(|_| ApiError::internal("Failed to bind count parameters"))?;

    #[derive(serde::Deserialize)]
    struct CountRow {
        total: u64,
    }

    let total = count_stmt
        .first::<CountRow>(None)
        .await
        .map_err(|e| ApiError::internal(format!("D1 count query failed: {}", e)))?
        .map(|r| r.total)
        .unwrap_or(0);

    Ok(logs::LogListResponse {
        success: true,
        result: rows,
        total,
    })
}

/// Export logs to R2 as a JSON or CSV file.
///
/// 1. Verify the requesting user owns the target device (via D1).
/// 2. Query matching log rows from D1.
/// 3. Format as JSON or CSV.
/// 4. Write to the REPORTS R2 bucket.
/// 5. Return a 202-style response with the export_id.
pub async fn export_logs(
    user_id: &str,
    req: &logs::LogExportRequest,
    env: &Env,
) -> ApiResult<logs::LogExportResponse> {
    let db = env
        .d1("DB")
        .map_err(|_| ApiError::internal("Failed to access D1 database"))?;

    // -- Verify device ownership --
    let check_stmt = db
        .prepare("SELECT id FROM devices WHERE id = ? AND owner_id = ?")
        .bind(&[req.device_id.as_str().into(), user_id.into()])
        .map_err(|_| ApiError::internal("Failed to bind device check parameters"))?;

    let device_check: Option<serde_json::Value> = check_stmt
        .first(None)
        .await
        .map_err(|e| ApiError::internal(format!("Device check failed: {}", e)))?;

    if device_check.is_none() {
        return Err(ApiError::not_found("Device not found or access denied"));
    }

    // -- Build export query --
    let mut sql = String::from("SELECT * FROM logs WHERE device_id = ?");
    let mut string_params: Vec<String> = vec![req.device_id.clone()];

    if let Some(ref level) = req.level {
        sql.push_str(" AND level = ?");
        string_params.push(level.clone());
    }
    if let Some(ref category) = req.category {
        sql.push_str(" AND category = ?");
        string_params.push(category.clone());
    }
    sql.push_str(" AND timestamp >= ?");
    string_params.push(req.date_start.clone());
    sql.push_str(" AND timestamp <= ?");
    string_params.push(req.date_end.clone());
    sql.push_str(" ORDER BY timestamp DESC");

    let params: Vec<wasm_bindgen::JsValue> = string_params
        .iter()
        .map(|s| s.as_str().into())
        .collect();

    let stmt = db
        .prepare(&sql)
        .bind(&params)
        .map_err(|_| ApiError::internal("Failed to bind export query parameters"))?;

    let result = stmt
        .all()
        .await
        .map_err(|e| ApiError::internal(format!("D1 export query failed: {}", e)))?;

    let rows: Vec<logs::LogEntry> = result
        .results()
        .map_err(|e| ApiError::internal(format!("Failed to deserialize export rows: {}", e)))?;

    // -- Format the export --
    let export_id = uuid::Uuid::new_v4().to_string();

    let (file_content, extension) = match req.format {
        logs::ExportFormat::Json => {
            let json = serde_json::to_string_pretty(&rows)
                .map_err(|_| ApiError::internal("Failed to serialize export JSON"))?;
            (json, "json")
        }
        logs::ExportFormat::Csv => {
            let headers = "id,device_id,timestamp,level,category,message,source";
            let mut csv = String::from(headers);
            for row in &rows {
                csv.push('\n');
                csv.push_str(&format!(
                    "{},{},{},{},{},{},{}",
                    csv_escape(&row.id),
                    csv_escape(&row.device_id),
                    csv_escape(&row.timestamp),
                    csv_escape(&row.level),
                    csv_escape(&row.category),
                    csv_escape(&row.message),
                    csv_escape(&row.source),
                ));
            }
            (csv, "csv")
        }
    };

    // -- Write to R2 --
    let r2 = env
        .bucket("REPORTS")
        .map_err(|_| ApiError::internal("Failed to access reports storage"))?;

    let r2_key = format!("logs/{}/{}.{}", user_id, export_id, extension);
    r2.put(&r2_key, file_content.as_bytes().to_vec())
        .execute()
        .await
        .map_err(|_| ApiError::internal("Failed to write export to R2"))?;

    Ok(logs::LogExportResponse {
        success: true,
        message: "Log export completed".to_string(),
        export_id,
        download_url: Some(format!("https://reports.ngfw.sh/{}", r2_key)),
    })
}

/// Escape a value for CSV output (wraps in double quotes, escaping inner quotes).
fn csv_escape(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
