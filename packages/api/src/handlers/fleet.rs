//! Fleet management handlers

use crate::middleware::{authenticate, check_device_access, require_plan};
use crate::models::fleet::*;
use crate::models::{ApiError, IntoApiResponse};
use crate::storage;
use worker::*;

// ========== Device Management Handlers ==========

/// GET /api/fleet/devices
pub async fn get_devices(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let devices = storage::get_user_devices(&auth.user_id, &ctx.env).await;
    devices.into_api_response()
}

/// POST /api/fleet/devices
pub async fn register_device(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    // Check device limit based on plan
    let current_devices = storage::count_user_devices(&auth.user_id, &ctx.env).await
        .map_err(|e| Error::from(e.error.message))?;

    let limit = match auth.plan.as_str() {
        "free" => 5,
        "home" => 50,
        "homeplus" => 100,
        _ => u32::MAX, // unlimited for pro and business
    };

    if current_devices >= limit {
        return ApiError::plan_limit(format!(
            "Device limit reached ({}/{}). Upgrade your plan for more devices.",
            current_devices, limit
        ))
        .into_response();
    }

    let register: RegisterDeviceRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::register_device(&auth.user_id, &register, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/fleet/devices/:id
pub async fn remove_device(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = ctx.param("id").ok_or_else(|| Error::from("Missing device ID"))?;
    check_device_access(&auth, device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let result = storage::remove_device(device_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/fleet/devices/:id/status
pub async fn get_device_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = ctx.param("id").ok_or_else(|| Error::from("Missing device ID"))?;
    check_device_access(&auth, device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let status = storage::get_device_status(device_id, &ctx.env).await;
    status.into_api_response()
}

/// POST /api/fleet/devices/:id/command
pub async fn send_command(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    let device_id = ctx.param("id").ok_or_else(|| Error::from("Missing device ID"))?;
    check_device_access(&auth, device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;

    let command: DeviceCommand = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;

    // Get the Durable Object for this device
    let namespace = ctx.env.durable_object("AGENT_CONNECTIONS")
        .map_err(|_| Error::from("Failed to access agent connections"))?;

    let id = namespace.id_from_name(device_id)
        .map_err(|_| Error::from("Failed to create DO ID"))?;

    let stub = id.get_stub()
        .map_err(|_| Error::from("Failed to get DO stub"))?;

    // Send command to the device
    let cmd = serde_json::json!({
        "type": format!("{:?}", command.command),
        "payload": command.payload,
    });

    let request = Request::new_with_init(
        "http://internal/command",
        RequestInit::new()
            .with_method(Method::Post)
            .with_body(Some(cmd.to_string().into())),
    )?;

    let response = stub.fetch_with_request(request).await;

    match response {
        Ok(resp) if resp.status_code() == 200 => {
            Response::from_json(&serde_json::json!({
                "status": "sent",
                "message": "Command sent to device"
            }))
        }
        Ok(resp) if resp.status_code() == 503 => {
            ApiError::device_offline().into_response()
        }
        _ => {
            ApiError::internal("Failed to send command").into_response()
        }
    }
}

// ========== Template Handlers ==========

/// GET /api/fleet/templates
pub async fn get_templates(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;

    let templates = storage::get_config_templates(&auth.user_id, &ctx.env).await;
    templates.into_api_response()
}

/// POST /api/fleet/templates
pub async fn create_template(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;

    let template: CreateTemplateRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_config_template(&auth.user_id, &template, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/fleet/templates/:id/apply
pub async fn apply_template(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    require_plan(&auth, &["pro", "business"]).map_err(|e| Error::from(e.error.message))?;

    let template_id = ctx.param("id").ok_or_else(|| Error::from("Missing template ID"))?;
    let apply: ApplyTemplateRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;

    // Verify access to all devices
    for device_id in &apply.device_ids {
        check_device_access(&auth, device_id, &ctx.env).await.map_err(|e| Error::from(e.error.message))?;
    }

    let result = storage::apply_config_template(template_id, &apply, &ctx.env).await;
    result.into_api_response()
}
