//! Report models

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// Report type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ReportType {
    Security,
    Traffic,
    Bandwidth,
    Firewall,
    Vpn,
    Dns,
    Device,
    System,
}

/// Report output format
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ReportFormat {
    Json,
    Pdf,
    Csv,
}

/// Report generation status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ReportStatus {
    Pending,
    Generating,
    Completed,
    Failed,
}

/// Report record stored in D1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub id: String,
    pub device_id: String,
    pub owner_id: String,
    #[serde(rename = "type")]
    pub report_type: String,
    pub format: String,
    pub status: String,
    pub title: String,
    pub date_start: String,
    pub date_end: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r2_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_size: Option<i64>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

/// Report with optional download URL (returned by the read endpoint)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportWithDownload {
    #[serde(flatten)]
    pub report: Report,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
}

/// Generate report request body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateReportRequest {
    pub device_id: String,
    #[serde(rename = "type")]
    pub report_type: String,
    pub format: String,
    pub title: String,
    pub date_start: String,
    pub date_end: String,
}

/// Report list query parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportListQuery {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub report_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    pub limit: u32,
    pub offset: u32,
}
