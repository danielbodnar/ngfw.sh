//! User account and billing handlers

use crate::middleware::authenticate;
use crate::models::IntoApiResponse;
use crate::models::user::*;
use crate::storage;
use worker::*;

// ========== User Profile Handlers ==========

/// GET /api/user/profile
pub async fn get_profile(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let profile = storage::get_user_profile(&auth.user_id, &ctx.env).await;
    profile.into_api_response()
}

/// PUT /api/user/profile
pub async fn update_profile(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let update: UpdateProfileRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::update_user_profile(&auth.user_id, &update, &ctx.env).await;
    result.into_api_response()
}

/// PUT /api/user/password
pub async fn change_password(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let change: ChangePasswordRequest =
        req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::change_user_password(&auth.user_id, &change, &ctx.env).await;
    result.into_api_response()
}

// ========== 2FA Handlers ==========

/// GET /api/user/2fa
pub async fn get_2fa_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let status = storage::get_2fa_status(&auth.user_id, &ctx.env).await;
    status.into_api_response()
}

/// POST /api/user/2fa/enable
pub async fn enable_2fa(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let enable: Enable2faRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::enable_2fa(&auth.user_id, &enable, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/user/2fa
pub async fn disable_2fa(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let result = storage::disable_2fa(&auth.user_id, &ctx.env).await;
    result.into_api_response()
}

// ========== Session Handlers ==========

/// GET /api/user/sessions
pub async fn get_sessions(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let sessions = storage::get_user_sessions(&auth.user_id, &ctx.env).await;
    sessions.into_api_response()
}

/// DELETE /api/user/sessions/:id
pub async fn revoke_session(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let session_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing session ID"))?;
    let result = storage::revoke_user_session(&auth.user_id, session_id, &ctx.env).await;
    result.into_api_response()
}

// ========== Billing Handlers ==========

/// GET /api/billing/plan
pub async fn get_plan(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let plan = storage::get_subscription(&auth.user_id, &ctx.env).await;
    plan.into_api_response()
}

/// PUT /api/billing/plan
pub async fn change_plan(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let change: ChangePlanRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::change_subscription(&auth.user_id, &change, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/billing/usage
pub async fn get_usage(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let usage = storage::get_usage_meters(&auth.user_id, &ctx.env).await;
    usage.into_api_response()
}

/// GET /api/billing/payment-methods
pub async fn get_payment_methods(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let methods = storage::get_payment_methods(&auth.user_id, &ctx.env).await;
    methods.into_api_response()
}

/// POST /api/billing/payment-methods
pub async fn add_payment_method(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let add: AddPaymentMethodRequest = req.json().await.map_err(|_| Error::from("Invalid JSON"))?;
    let result = storage::add_payment_method(&auth.user_id, &add, &ctx.env).await;
    result.into_api_response()
}

/// DELETE /api/billing/payment-methods/:id
pub async fn remove_payment_method(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let method_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing payment method ID"))?;
    let result = storage::remove_payment_method(&auth.user_id, method_id, &ctx.env).await;
    result.into_api_response()
}

/// GET /api/billing/invoices
pub async fn get_invoices(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let invoices = storage::get_invoices(&auth.user_id, &ctx.env).await;
    invoices.into_api_response()
}

/// GET /api/billing/invoices/:id
pub async fn download_invoice(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth = authenticate(&req, &ctx.env)
        .await
        .map_err(|e| Error::from(e.error.message))?;
    let invoice_id = ctx
        .param("id")
        .ok_or_else(|| Error::from("Missing invoice ID"))?;

    let pdf = storage::get_invoice_pdf(&auth.user_id, invoice_id, &ctx.env).await;

    match pdf {
        Ok(data) => {
            let headers = Headers::new();
            headers.set("Content-Type", "application/pdf")?;
            headers.set(
                "Content-Disposition",
                &format!("attachment; filename=\"invoice-{}.pdf\"", invoice_id),
            )?;
            Ok(Response::from_bytes(data)?.with_headers(headers))
        }
        Err(e) => e.into_response(),
    }
}
