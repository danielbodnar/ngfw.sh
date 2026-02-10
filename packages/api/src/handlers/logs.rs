//! Log handlers
//!
//! Implements:
//! - `GET /api/logs/` - List logs with filtering and pagination
//! - `POST /api/logs/export` - Export logs as an async job (JSON or CSV)

use crate::middleware::authenticate;
use crate::models::logs::*;
use crate::models::IntoApiResponse;
use crate::storage;
use worker::*;

/// GET /api/logs/
///
/// Query parameters: device_id, level, category, search, date_start, date_end,
/// limit (default 20), offset (default 0).
///
/// Authorization is enforced via the D1 query: logs are joined with the
/// `devices` table on `owner_id` so that only logs for devices owned by
/// the authenticated user are returned.
pub async fn list_logs(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    // Parse query parameters from the URL
    let url = req.url()?;
    let query = parse_log_list_query(&url);

    let result = storage::list_logs(&auth.user_id, &query, &ctx.env).await;
    result.into_api_response()
}

/// POST /api/logs/export
///
/// Accepts a JSON body with device_id, format (json|csv), optional level,
/// category, date_start, and date_end. Verifies device ownership via D1,
/// queries matching logs, writes the export file to R2 (REPORTS bucket),
/// and returns a 202 response with the export_id and download URL.
pub async fn export_logs(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;

    let export_req: LogExportRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;

    let result = storage::export_logs(&auth.user_id, &export_req, &ctx.env).await;

    match result {
        Ok(resp) => {
            // Return 202 Accepted
            Ok(Response::from_json(&resp)?.with_status(202))
        }
        Err(e) => e.into_response(),
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Parse `LogListQuery` from URL query parameters.
fn parse_log_list_query(url: &Url) -> LogListQuery {
    let pairs: Vec<(String, String)> = url.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect();

    let get = |name: &str| -> Option<String> {
        pairs.iter().find(|(k, _)| k == name).map(|(_, v)| v.clone())
    };

    LogListQuery {
        device_id: get("device_id"),
        level: get("level"),
        category: get("category"),
        search: get("search"),
        date_start: get("date_start"),
        date_end: get("date_end"),
        limit: get("limit").and_then(|v| v.parse().ok()),
        offset: get("offset").and_then(|v| v.parse().ok()),
    }
}
