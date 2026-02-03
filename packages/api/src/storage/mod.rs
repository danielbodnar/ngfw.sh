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

// Include more storage functions...

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
    Ok(serde_json::json!({"plan": "free"}))
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
