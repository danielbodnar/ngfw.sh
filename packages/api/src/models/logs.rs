//! Log models for the NGFW.sh API
//!
//! Corresponds to the D1 `logs` table (migration 0007) and the
//! TypeScript schema at `packages/schema/src/endpoints/logs/`.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// Log severity level, matching the TypeScript `logLevel` enum.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
    Critical,
}

/// Log category, matching the TypeScript `logCategory` enum.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogCategory {
    System,
    Network,
    Firewall,
    Vpn,
    Dns,
    Dhcp,
    Security,
    Traffic,
    Auth,
    Api,
}

/// A single log entry from the D1 `logs` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub device_id: String,
    pub timestamp: String,
    pub level: String,
    pub category: String,
    pub message: String,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

/// Query parameters for `GET /api/logs/`.
#[derive(Debug, Clone, Deserialize)]
pub struct LogListQuery {
    pub device_id: Option<String>,
    pub level: Option<String>,
    pub category: Option<String>,
    pub search: Option<String>,
    pub date_start: Option<String>,
    pub date_end: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// Response for `GET /api/logs/`.
#[derive(Debug, Clone, Serialize)]
pub struct LogListResponse {
    pub success: bool,
    pub result: Vec<LogEntry>,
    pub total: u64,
}

/// Request body for `POST /api/logs/export`.
#[derive(Debug, Clone, Deserialize)]
pub struct LogExportRequest {
    pub device_id: String,
    pub format: ExportFormat,
    pub level: Option<String>,
    pub category: Option<String>,
    pub date_start: String,
    pub date_end: String,
}

/// Export file format.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
    Csv,
}

/// Response for `POST /api/logs/export`.
#[derive(Debug, Clone, Serialize)]
pub struct LogExportResponse {
    pub success: bool,
    pub message: String,
    pub export_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
}
