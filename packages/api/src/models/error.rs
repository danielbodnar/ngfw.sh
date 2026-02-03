//! Error types and handling for the NGFW.sh API

use serde::{Deserialize, Serialize};
use worker::*;

/// API Error codes matching the specification in AGENTS.md
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    Unauthorized,
    Forbidden,
    NotFound,
    InvalidConfig,
    DeviceOffline,
    PlanLimit,
    RateLimit,
    InternalError,
    BadRequest,
    Conflict,
}

impl ErrorCode {
    /// Returns the HTTP status code for this error
    pub fn status_code(&self) -> u16 {
        match self {
            ErrorCode::Unauthorized => 401,
            ErrorCode::Forbidden => 403,
            ErrorCode::NotFound => 404,
            ErrorCode::InvalidConfig => 400,
            ErrorCode::DeviceOffline => 503,
            ErrorCode::PlanLimit => 403,
            ErrorCode::RateLimit => 429,
            ErrorCode::InternalError => 500,
            ErrorCode::BadRequest => 400,
            ErrorCode::Conflict => 409,
        }
    }
}

/// Detailed error information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_errors: Option<Vec<ValidationError>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit_info: Option<LimitInfo>,
}

/// Validation error for specific fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<serde_json::Value>,
}

/// Rate/plan limit information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitInfo {
    pub limit: u64,
    pub current: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reset_at: Option<i64>,
}

/// API error response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub error: ApiErrorBody,
}

/// The body of an API error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiErrorBody {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<ErrorDetails>,
}

impl ApiError {
    /// Create a new API error
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            error: ApiErrorBody {
                code,
                message: message.into(),
                field: None,
                details: None,
            },
        }
    }

    /// Create an error with a field reference
    pub fn with_field(mut self, field: impl Into<String>) -> Self {
        self.error.field = Some(field.into());
        self
    }

    /// Create an error with details
    pub fn with_details(mut self, details: ErrorDetails) -> Self {
        self.error.details = Some(details);
        self
    }

    /// Convert to a Worker Response
    pub fn into_response(self) -> Result<Response> {
        let status = self.error.code.status_code();

        Ok(Response::from_json(&self)?.with_status(status))
    }
}

// Convenience constructors for common errors
impl ApiError {
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Unauthorized, message)
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Forbidden, message)
    }

    pub fn not_found(resource: impl Into<String>) -> Self {
        Self::new(
            ErrorCode::NotFound,
            format!("{} not found", resource.into()),
        )
    }

    pub fn invalid_config(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidConfig, message)
    }

    pub fn device_offline() -> Self {
        Self::new(ErrorCode::DeviceOffline, "Router agent not connected")
    }

    pub fn plan_limit(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::PlanLimit, message)
    }

    pub fn rate_limit(limit: u64, reset_at: i64) -> Self {
        Self::new(ErrorCode::RateLimit, "Too many requests").with_details(ErrorDetails {
            validation_errors: None,
            limit_info: Some(LimitInfo {
                limit,
                current: limit,
                reset_at: Some(reset_at),
            }),
        })
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InternalError, message)
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::BadRequest, message)
    }

    pub fn validation_failed(errors: Vec<ValidationError>) -> Self {
        Self::new(ErrorCode::InvalidConfig, "Validation failed").with_details(ErrorDetails {
            validation_errors: Some(errors),
            limit_info: None,
        })
    }
}

/// Result type for API operations
pub type ApiResult<T> = std::result::Result<T, ApiError>;

/// Helper trait for converting Results to API responses
pub trait IntoApiResponse {
    fn into_api_response(self) -> Result<Response>;
}

impl<T: Serialize> IntoApiResponse for ApiResult<T> {
    fn into_api_response(self) -> Result<Response> {
        match self {
            Ok(data) => Response::from_json(&data),
            Err(e) => e.into_response(),
        }
    }
}

/// Convert worker::Error to ApiError
impl From<worker::Error> for ApiError {
    fn from(err: worker::Error) -> Self {
        ApiError::internal(err.to_string())
    }
}

/// Convert serde_json::Error to ApiError
impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::bad_request(format!("JSON error: {}", err))
    }
}
