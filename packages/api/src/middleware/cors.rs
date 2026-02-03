//! CORS middleware

use worker::*;

/// CORS headers for API responses
pub struct CorsHeaders {
    pub allow_origin: String,
    pub allow_methods: String,
    pub allow_headers: String,
    pub max_age: u32,
}

impl Default for CorsHeaders {
    fn default() -> Self {
        Self {
            allow_origin: "*".to_string(),
            allow_methods: "GET, POST, PUT, DELETE, OPTIONS".to_string(),
            allow_headers: "Authorization, Content-Type, X-Device-ID".to_string(),
            max_age: 86400,
        }
    }
}

impl CorsHeaders {
    /// Create CORS headers for a specific origin
    pub fn for_origin(origin: &str) -> Self {
        Self {
            allow_origin: origin.to_string(),
            ..Default::default()
        }
    }

    /// Apply CORS headers to a response
    pub fn apply(&self, response: Response) -> Result<Response> {
        let mut headers = response.headers().clone();
        headers.set("Access-Control-Allow-Origin", &self.allow_origin)?;
        headers.set("Access-Control-Allow-Methods", &self.allow_methods)?;
        headers.set("Access-Control-Allow-Headers", &self.allow_headers)?;
        headers.set("Access-Control-Max-Age", &self.max_age.to_string())?;

        Ok(response.with_headers(headers))
    }

    /// Create a preflight response for OPTIONS requests
    pub fn preflight_response(&self) -> Result<Response> {
        let mut headers = Headers::new();
        headers.set("Access-Control-Allow-Origin", &self.allow_origin)?;
        headers.set("Access-Control-Allow-Methods", &self.allow_methods)?;
        headers.set("Access-Control-Allow-Headers", &self.allow_headers)?;
        headers.set("Access-Control-Max-Age", &self.max_age.to_string())?;

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
            .unwrap_or_else(|| "*".to_string());

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
        .unwrap_or_else(|| "*".to_string());

    CorsHeaders::for_origin(&origin).apply(response)
}
