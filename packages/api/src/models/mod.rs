//! Data models for the NGFW.sh API
//!
//! These models represent the core data structures used throughout the API.

pub mod dashboard;
pub mod error;
pub mod fleet;
pub mod logs;
pub mod network;
pub mod onboarding;
pub mod report;
pub mod rpc;
pub mod security;
pub mod services;
pub mod system;
pub mod user;

pub use error::*;
