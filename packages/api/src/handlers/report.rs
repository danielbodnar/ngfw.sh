//! Report management handlers

use crate::middleware::authenticate;
use crate::models::report::*;
use crate::models::{ApiError, IntoApiResponse};
use crate::storage;
use worker::*;

/// GET /api/reports/
pub async fn list_reports(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let url = req.url()?;
    let query_pairs: Vec<(String, String)> = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();

    let device_id = query_pairs
        .iter()
        .find(|(k, _)| k == "device_id")
        .map(|(_, v)| v.clone());
    let report_type = query_pairs
        .iter()
        .find(|(k, _)| k == "type")
        .map(|(_, v)| v.clone());
    let status = query_pairs
        .iter()
        .find(|(k, _)| k == "status")
        .map(|(_, v)| v.clone());
    let limit = query_pairs
        .iter()
        .find(|(k, _)| k == "limit")
        .and_then(|(_, v)| v.parse::<u32>().ok())
        .unwrap_or(20);
    let offset = query_pairs
        .iter()
        .find(|(k, _)| k == "offset")
        .and_then(|(_, v)| v.parse::<u32>().ok())
        .unwrap_or(0);

    let query = ReportListQuery {
        device_id,
        report_type,
        status,
        limit: limit.min(100),
        offset,
    };

    let result = storage::list_reports(&auth.user_id, &query, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/reports/generate
pub async fn generate_report(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let body: GenerateReportRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;

    // Verify device ownership
    let device_check = storage::check_device_ownership(&body.device_id, &auth.user_id, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    if !device_check {
        return ApiError::not_found("Device not found or access denied").into_response();
    }

    let result = storage::create_report(&auth.user_id, &body, &ctx.env).await;

    match result {
        Ok(report) => {
            let json = serde_json::json!({
                "success": true,
                "result": report
            });
            Ok(Response::from_json(&json)?.with_status(201))
        }
        Err(e) => e.into_response(),
    }
}

/// GET /api/reports/:id
pub async fn get_report(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let report_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing report ID"))?;

    let result = storage::get_report(report_id, &auth.user_id, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/reports/:id
pub async fn delete_report(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let report_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing report ID"))?;

    let result = storage::delete_report(report_id, &auth.user_id, &ctx.env).await;
    result.into_api_response()
}
