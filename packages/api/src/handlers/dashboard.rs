//! Dashboard handlers (computed/aggregated views)

use crate::middleware::authenticate;
use crate::models::IntoApiResponse;
use crate::storage;
use worker::*;

/// GET /api/dashboards/
pub async fn list_dashboards(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let dashboards = storage::list_dashboards();
    dashboards.into_api_response()
}

/// GET /api/dashboards/:id
pub async fn get_dashboard(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let dashboard_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing dashboard ID"))?;

    // Extract optional device_id query parameter
    let url = req.url()?;
    let _device_id: Option<String> = url
        .query_pairs()
        .find(|(key, _)| key == "device_id")
        .map(|(_, value)| value.into_owned());

    let dashboard = storage::get_dashboard(dashboard_id);
    dashboard.into_api_response()
}
