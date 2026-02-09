//! System management handlers

use crate::middleware::{authenticate, check_device_access};
use crate::models::{ApiError, ApiResult, IntoApiResponse};
use crate::storage;
use worker::*;

/// GET /api/system/status
pub async fn get_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let status = storage::get_device_status(&device_id, &ctx.env).await;
    status.into_api_response()
}

/// GET /api/system/interfaces
pub async fn get_interfaces(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let interfaces = storage::get_interfaces(&device_id, &ctx.env).await;
    interfaces.into_api_response()
}

/// GET /api/system/hardware
pub async fn get_hardware(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let hardware = storage::get_hardware_info(&device_id, &ctx.env).await;
    hardware.into_api_response()
}

/// POST /api/system/reboot
pub async fn reboot(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    // Send reboot command to device via Durable Object
    let result = send_device_command(&device_id, "REBOOT", None, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/system/shutdown
pub async fn shutdown(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let result = send_device_command(&device_id, "SHUTDOWN", None, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/firmware/current
pub async fn get_current_firmware(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let firmware = storage::get_firmware_info(&device_id, &ctx.env).await;
    firmware.into_api_response()
}

/// GET /api/firmware/available
pub async fn get_available_updates(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let updates = storage::get_available_updates(&device_id, &ctx.env).await;
    updates.into_api_response()
}

/// POST /api/firmware/download
pub async fn download_firmware(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    // Trigger firmware download on the device
    let result = send_device_command(&device_id, "DOWNLOAD_FIRMWARE", None, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/firmware/install
pub async fn install_firmware(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let result = send_device_command(&device_id, "INSTALL_FIRMWARE", None, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/firmware/upload
pub async fn upload_firmware(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    // Handle multipart upload to R2
    let form = req.form_data().await?;
    let file = form
        .get("firmware")
        .ok_or_else(|| Error::from("Missing firmware file"))?;

    if let FormEntry::File(file) = file {
        let bytes = file.bytes().await?;
        let result = storage::upload_firmware(&device_id, &bytes, &ctx.env).await;
        return result.into_api_response();
    }

    ApiError::bad_request("Invalid file upload").into_response()
}

/// GET /api/firmware/slots
pub async fn get_boot_slots(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let slots = storage::get_boot_slots(&device_id, &ctx.env).await;
    slots.into_api_response()
}

/// POST /api/firmware/slots/:id/activate
pub async fn activate_boot_slot(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let slot_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing slot ID"))?;
    let payload = serde_json::json!({ "slot_id": slot_id });
    let result = send_device_command(&device_id, "ACTIVATE_SLOT", Some(payload), &ctx.env).await;
    result.into_api_response()
}

/// GET /api/backup/list
pub async fn list_backups(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let backups = storage::list_backups(&device_id, &ctx.env).await;
    backups.into_api_response()
}

/// POST /api/backup/create
pub async fn create_backup(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let backup = storage::create_backup(&device_id, &ctx.env).await;
    backup.into_api_response()
}

/// GET /api/backup/:id/download
pub async fn download_backup(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let backup_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing backup ID"))?;
    let backup_data = storage::download_backup(&device_id, backup_id, &ctx.env).await;

    match backup_data {
        Ok(data) => {
            let headers = Headers::new();
            headers.set("Content-Type", "application/json")?;
            headers.set(
                "Content-Disposition",
                &format!("attachment; filename=\"backup-{}.json\"", backup_id),
            )?;
            Ok(Response::from_bytes(data)?.with_headers(headers))
        }
        Err(e) => e.into_response(),
    }
}

/// POST /api/backup/restore
pub async fn restore_backup(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let body: serde_json::Value = req.json().await?;
    let backup_id = body.get("backup_id").and_then(|v| v.as_str());

    let result = if let Some(id) = backup_id {
        storage::restore_backup(&device_id, id, &ctx.env).await
    } else {
        Err(ApiError::bad_request("Missing backup_id"))
    };

    result.into_api_response()
}

/// DELETE /api/backup/:id
pub async fn delete_backup(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let backup_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing backup ID"))?;
    let result = storage::delete_backup(&device_id, backup_id, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/backup/factory-reset
pub async fn factory_reset(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let device_id = get_device_id(&req)?;
    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let result = send_device_command(&device_id, "FACTORY_RESET", None, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/metrics/latest
pub async fn get_latest_metrics(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let url = req.url()?;
    let device_id = url
        .query_pairs()
        .find(|(k, _)| k == "device_id")
        .map(|(_, v)| v.into_owned())
        .ok_or_else(|| Error::from("Missing device_id query parameter"))?;

    check_device_access(&auth, &device_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let kv = ctx.env.kv("CACHE")?;
    let prefix = format!("metrics:{}:", device_id);
    let list_response = kv.list().prefix(prefix).execute().await?;

    let latest_key = list_response.keys.iter().map(|k| k.name.clone()).max();

    match latest_key {
        Some(key) => match kv.get(&key).text().await? {
            Some(value) => {
                let json: serde_json::Value =
                    serde_json::from_str(&value).map_err(|e| Error::from(e.to_string()))?;
                Response::from_json(&json)
            }
            None => ApiError::not_found("Metrics").into_response(),
        },
        None => ApiError::not_found("Metrics").into_response(),
    }
}

// Helper functions

fn get_device_id(req: &Request) -> Result<String> {
    req.headers()
        .get("X-Device-ID")?
        .ok_or_else(|| Error::from("Missing X-Device-ID header"))
}

async fn send_device_command(
    device_id: &str,
    command: &str,
    payload: Option<serde_json::Value>,
    env: &Env,
) -> ApiResult<serde_json::Value> {
    // Get the Durable Object for this device
    let namespace = env
        .durable_object("AGENT_CONNECTIONS")
        .map_err(|_| ApiError::internal("Failed to access agent connections"))?;

    let id = namespace
        .id_from_name(device_id)
        .map_err(|_| ApiError::internal("Failed to create DO ID"))?;

    let stub = id
        .get_stub()
        .map_err(|_| ApiError::internal("Failed to get DO stub"))?;

    // Create command request
    let cmd = serde_json::json!({
        "type": command,
        "payload": payload,
    });

    let request = Request::new_with_init(
        "http://internal/command",
        RequestInit::new()
            .with_method(Method::Post)
            .with_body(Some(cmd.to_string().into())),
    )?;

    let response = stub
        .fetch_with_request(request)
        .await
        .map_err(|_| ApiError::device_offline())?;

    if response.status_code() == 503 {
        return Err(ApiError::device_offline());
    }

    Ok(serde_json::json!({ "status": "ok", "message": "Command sent" }))
}
