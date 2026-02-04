//! CORS middleware with allowlist-based origin checking

#![allow(dead_code)]

use worker::*;

/// Allowed origins for CORS requests
const ALLOWED_ORIGINS: &[&str] = &[
    "https://app.ngfw.sh",
    "https://ngfw.sh",
    "https://www.ngfw.sh",
    "http://localhost:5173",
    "http://localhost:4321",
];

/// Check if an origin is in the allowlist
fn is_origin_allowed(origin: &str) -> bool {
    ALLOWED_ORIGINS.iter().any(|&allowed| allowed == origin)
}

/// CORS headers for API responses
pub struct CorsHeaders {
    pub allow_origin: Option<String>,
    pub allow_methods: String,
    pub allow_headers: String,
    pub allow_credentials: bool,
    pub max_age: u32,
}

impl Default for CorsHeaders {
    fn default() -> Self {
        Self {
            allow_origin: None,
            allow_methods: "GET, POST, PUT, DELETE, OPTIONS".to_string(),
            allow_headers: "Authorization, Content-Type, X-Device-ID".to_string(),
            allow_credentials: true,
            max_age: 86400,
        }
    }
}

impl CorsHeaders {
    /// Create CORS headers for a validated origin.
    /// Only sets the origin if it is in the allowlist.
    pub fn for_origin(origin: &str) -> Self {
        let allow_origin = if is_origin_allowed(origin) {
            Some(origin.to_string())
        } else {
            None
        };

        Self {
            allow_origin,
            ..Default::default()
        }
    }

    /// Apply CORS headers to a response
    pub fn apply(&self, response: Response) -> Result<Response> {
        let headers = response.headers().clone();

        if let Some(origin) = &self.allow_origin {
            headers.set("Access-Control-Allow-Origin", origin)?;
            headers.set("Access-Control-Allow-Methods", &self.allow_methods)?;
            headers.set("Access-Control-Allow-Headers", &self.allow_headers)?;
            headers.set("Access-Control-Max-Age", &self.max_age.to_string())?;
            headers.set("Vary", "Origin")?;
            if self.allow_credentials {
                headers.set("Access-Control-Allow-Credentials", "true")?;
            }
        }

        Ok(response.with_headers(headers))
    }

    /// Create a preflight response for OPTIONS requests
    pub fn preflight_response(&self) -> Result<Response> {
        let headers = Headers::new();

        if let Some(origin) = &self.allow_origin {
            headers.set("Access-Control-Allow-Origin", origin)?;
            headers.set("Access-Control-Allow-Methods", &self.allow_methods)?;
            headers.set("Access-Control-Allow-Headers", &self.allow_headers)?;
            headers.set("Access-Control-Max-Age", &self.max_age.to_string())?;
            headers.set("Vary", "Origin")?;
            if self.allow_credentials {
                headers.set("Access-Control-Allow-Credentials", "true")?;
            }
        }

        Ok(Response::empty()?.with_headers(headers).with_status(204))
    }
}

/// Handle CORS preflight requests
pub fn handle_preflight(req: &Request) -> Option<Result<Response>> {
    if req.method() == Method::Options {
        let origin = req
            .headers()
            .get("Origin")
            .ok()
            .flatten()
            .unwrap_or_default();

        Some(CorsHeaders::for_origin(&origin).preflight_response())
    } else {
        None
    }
}

/// Wrap a response with CORS headers
pub fn with_cors(response: Response, req: &Request) -> Result<Response> {
    let origin = req
        .headers()
        .get("Origin")
        .ok()
        .flatten()
        .unwrap_or_default();

    CorsHeaders::for_origin(&origin).apply(response)
}
