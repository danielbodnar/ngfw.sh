//! Generates the OpenAPI 3.1 specification from Rust types.
//!
//! Usage: cargo run --bin generate-openapi > openapi.json
//!
//! This binary extracts the OpenAPI spec at build time, enabling
//! downstream TypeScript client generation via openapi-zod-client.

use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::openapi::ServerBuilder;
use utoipa::{Modify, OpenApi};

/// OpenAPI 3.1 specification for the NGFW.sh API
///
/// This is a mirror of the ApiDoc in packages/api/src/openapi.rs,
/// but compilable natively (without WASM/worker dependencies).
#[derive(OpenApi)]
#[openapi(
    info(
        title = "NGFW.sh API",
        version = "1.0.0",
        description = "Cloud-managed next-generation firewall and router administration API.\n\nProvides RESTful endpoints for:\n- Fleet management (devices, templates, commands)\n- Network configuration (WAN, LAN, WiFi, DHCP, routing)\n- Security (firewall, NAT, DNS filtering, IPS)\n- Services (VPN, QoS, DDNS)\n- System management (firmware, backups, logs)",
        license(name = "MIT", url = "https://github.com/danielbodnar/ngfw.sh/blob/main/LICENSE"),
        contact(
            name = "NGFW.sh Support",
            url = "https://ngfw.sh/support",
            email = "support@ngfw.sh"
        )
    ),
    tags(
        (name = "fleet", description = "Fleet and device management"),
        (name = "onboarding", description = "Device onboarding and provisioning"),
        (name = "system", description = "System status, firmware, and backups"),
        (name = "network", description = "WAN, LAN, WiFi, DHCP, and routing configuration"),
        (name = "security", description = "Firewall, NAT, DNS filtering, and IPS"),
        (name = "services", description = "VPN, QoS, and DDNS services"),
        (name = "logs", description = "System and traffic logs"),
        (name = "reports", description = "Analytics and reports"),
        (name = "dashboard", description = "Dashboard widgets"),
        (name = "user", description = "User profile and billing")
    ),
    components(
        schemas(
            // Agent types
            ngfw_protocol::AgentMode,
            ngfw_protocol::ModeConfig,
            ngfw_protocol::ModeUpdatePayload,
            ngfw_protocol::ModeAckPayload,
            ngfw_protocol::AgentInfo,
            // Fleet types
            ngfw_protocol::Device,
            ngfw_protocol::DeviceStatus,
            ngfw_protocol::RegisterDeviceRequest,
            ngfw_protocol::DeviceRegistration,
            ngfw_protocol::DeviceStatusUpdate,
            ngfw_protocol::InterfaceStatus,
            ngfw_protocol::DeviceCommand,
            ngfw_protocol::CommandType,
            ngfw_protocol::CommandResult,
            ngfw_protocol::CommandStatus,
            ngfw_protocol::ConfigTemplate,
            ngfw_protocol::CreateTemplateRequest,
            ngfw_protocol::ApplyTemplateRequest,
            ngfw_protocol::TemplateApplicationResult,
            ngfw_protocol::DeviceApplicationResult,
            ngfw_protocol::WebhookConfig,
            ngfw_protocol::WebhookEvent,
            ngfw_protocol::AuditLogEntry,
            // RPC types
            ngfw_protocol::RpcMessage,
            ngfw_protocol::MessageType,
            ngfw_protocol::AuthRequest,
            ngfw_protocol::AuthResponse,
            ngfw_protocol::StatusPayload,
            ngfw_protocol::InterfaceMetrics,
            ngfw_protocol::MetricsPayload,
            ngfw_protocol::InterfaceRates,
            ngfw_protocol::ConnectionCounts,
            ngfw_protocol::DnsMetrics,
            ngfw_protocol::ConfigPush,
            ngfw_protocol::ConfigSection,
            ngfw_protocol::ConfigAck,
            ngfw_protocol::ExecCommand,
            ngfw_protocol::ExecResult,
            ngfw_protocol::LogMessage,
            ngfw_protocol::LogLevel,
            ngfw_protocol::AlertMessage,
            ngfw_protocol::AlertSeverity,
            ngfw_protocol::AlertType,
            ngfw_protocol::UpgradeCommand,
            // System types
            ngfw_protocol::SystemStatus,
            ngfw_protocol::InterfaceInfo,
            ngfw_protocol::InterfaceInfoStatus,
            ngfw_protocol::HardwareInfo,
            ngfw_protocol::CpuInfo,
            ngfw_protocol::MemoryInfo,
            ngfw_protocol::StorageInfo,
            ngfw_protocol::InterfaceHardware,
            ngfw_protocol::TemperatureSensor,
            ngfw_protocol::FanInfo,
            ngfw_protocol::FirmwareInfo,
            ngfw_protocol::FirmwareChannel,
            ngfw_protocol::FirmwareUpdate,
            ngfw_protocol::BootSlot,
            ngfw_protocol::BackupInfo,
        )
    ),
    modifiers(&SecurityAddon, &ServerAddon)
)]
struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "clerk_jwt",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some("Clerk JWT token from authentication"))
                        .build(),
                ),
            );
        }
    }
}

struct ServerAddon;

impl Modify for ServerAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        openapi.servers = Some(vec![
            ServerBuilder::new()
                .url("https://api.ngfw.sh")
                .description(Some("Production"))
                .build(),
            ServerBuilder::new()
                .url("http://localhost:8788")
                .description(Some("Local development"))
                .build(),
        ]);
    }
}

fn main() {
    let spec = ApiDoc::openapi()
        .to_pretty_json()
        .expect("OpenAPI JSON serialization should not fail");
    print!("{spec}");
}
