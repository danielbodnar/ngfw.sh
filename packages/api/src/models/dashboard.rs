//! Dashboard models (computed/aggregated views)

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Dashboard category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum DashboardCategory {
    NetworkOverview,
    SecurityEvents,
    DnsAnalytics,
    WifiPerformance,
    WanHealth,
    VpnMetrics,
    SystemResources,
    TrafficAnalysis,
    FirewallRules,
    QosMetrics,
}

/// Widget display type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum WidgetType {
    LineChart,
    BarChart,
    PieChart,
    Gauge,
    Counter,
    Table,
    Heatmap,
    Map,
}

/// A widget within a dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Widget {
    pub id: String,
    #[serde(rename = "type")]
    pub widget_type: WidgetType,
    pub title: String,
    pub data_source: String,
    pub refresh_interval: u32,
    pub config: HashMap<String, serde_json::Value>,
}

/// Full dashboard with widgets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dashboard {
    pub id: String,
    pub category: DashboardCategory,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub default_view: bool,
    pub widgets: Vec<Widget>,
}

/// Dashboard metadata (without widgets) used in list responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardMetadata {
    pub id: String,
    pub category: DashboardCategory,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub default_view: bool,
}
