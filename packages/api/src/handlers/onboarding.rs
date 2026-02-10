//! Onboarding handlers for router purchase and setup flow
//!
//! These endpoints are PUBLIC (no auth required) to support
//! the initial onboarding experience before a user has an account.

use crate::models::onboarding::*;
use crate::models::IntoApiResponse;
use crate::storage;
use worker::*;

/// GET /api/onboarding/routers
/// List available router options for purchase (no auth required)
pub async fn list_routers(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let routers = storage::get_onboarding_routers();
    routers.into_api_response()
}

/// POST /api/onboarding/order
/// Create a new router order with device configuration
pub async fn create_order(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let order: OrderSubmission = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::create_onboarding_order(&order, &ctx.env).await;

    match result {
        Ok(response) => {
            let json = serde_json::json!({
                "success": true,
                "result": response
            });
            Ok(Response::from_json(&json)?.with_status(201))
        }
        Err(e) => e.into_response(),
    }
}

/// GET /api/onboarding/status
/// Get onboarding progress (no auth required)
pub async fn get_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let user_id = url
        .query_pairs()
        .find(|(k, _)| k == "user_id")
        .map(|(_, v)| v.into_owned());

    let status = storage::get_onboarding_status(user_id.as_deref(), &ctx.env).await;
    status.into_api_response()
}
