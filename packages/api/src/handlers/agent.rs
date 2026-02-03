//! Router agent WebSocket handler

use crate::middleware::authenticate_device;
use worker::*;

/// GET /agent/ws - WebSocket endpoint for router agents
pub async fn websocket_handler(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    // Extract API key from query parameter or header
    let api_key = extract_api_key(&req)?;

    // Authenticate the device
    let device_auth = authenticate_device(&api_key, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    // Get or create the Durable Object for this device
    let namespace = ctx.env.durable_object("AGENT_CONNECTIONS")?;
    let id = namespace.id_from_name(&device_auth.device_id)?;
    let stub = id.get_stub()?;

    // Forward the WebSocket upgrade to the Durable Object
    let url = format!(
        "http://internal/websocket?device_id={}&owner_id={}",
        device_auth.device_id, device_auth.owner_id
    );

    let request = Request::new_with_init(
        &url,
        RequestInit::new()
            .with_headers(req.headers().clone())
            .with_method(Method::Get),
    )?;

    stub.fetch_with_request(request).await
}

fn extract_api_key(req: &Request) -> Result<String> {
    // Try Authorization header first
    if let Ok(Some(auth_header)) = req.headers().get("Authorization")
        && let Some(token) = auth_header.strip_prefix("Bearer ")
    {
        return Ok(token.to_string());
    }

    // Try X-API-Key header
    if let Ok(Some(api_key)) = req.headers().get("X-API-Key") {
        return Ok(api_key);
    }

    // Try query parameter
    if let Ok(url) = req.url()
        && let Some(key) = url.query_pairs().find(|(k, _)| k == "api_key")
    {
        return Ok(key.1.to_string());
    }

    Err(Error::from("Missing API key"))
}
