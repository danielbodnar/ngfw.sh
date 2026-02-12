/**
 * Auto-generated API client and Zod schemas
 *
 * This directory contains TypeScript types and Zod schemas generated from the
 * OpenAPI specification at /openapi.json from the ngfw.sh API.
 *
 * To regenerate:
 *   - Local:  bun run generate:api    (requires dev API at localhost:8788)
 *   - Remote: bun run generate:api:remote (uses https://api.ngfw.sh/openapi.json)
 *
 * Do not edit files in this directory manually - they will be overwritten.
 *
 * ## Type Comparison (generated vs manual types.ts)
 *
 * | Type               | Generated | Manual | Notes                                   |
 * |--------------------|-----------|--------|-----------------------------------------|
 * | Device             | ✅        | ✅     | Different shapes (Rust vs portal view)  |
 * | DeviceStatus       | ✅ (enum) | ✅ (interface) | Generated is enum, manual is object |
 * | DeviceRegistration | ✅        | ✅     | Different fields                        |
 * | Route              | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | NATRule            | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | IPSConfig          | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | VPNServerConfig    | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | QoSRule            | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | DDNSConfig         | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | Report             | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | LogEntry           | ❌        | ✅     | Not yet in OpenAPI spec                 |
 * | Dashboard          | ❌        | ✅     | Not yet in OpenAPI spec                 |
 *
 * Portal-specific types not yet in the OpenAPI spec are re-exported from
 * the manual types.ts file. As types are added to the Rust API's OpenAPI
 * spec and the client is regenerated, manual types will be replaced.
 */

// Re-export generated Zod schemas and inferred types
export { schemas } from './client'
export type {
	AgentMode,
	AgentInfo,
	AlertType,
	AlertSeverity,
	AlertMessage,
	ApplyTemplateRequest,
	AuditLogEntry,
	AuthRequest,
	AuthResponse,
	BackupInfo,
	BootSlot,
	CommandStatus,
	CommandResult,
	CommandType,
	ConfigSection,
	ConfigAck,
	ConfigPush,
	ConfigTemplate,
	ConnectionCounts,
	CpuInfo,
	CreateTemplateRequest,
	ModeConfig,
	DeviceStatus as GeneratedDeviceStatus,
	Device as GeneratedDevice,
	DeviceApplicationResult,
	DeviceCommand,
	DeviceRegistration as GeneratedDeviceRegistration,
	InterfaceStatus,
	DeviceStatusUpdate,
	DnsMetrics,
	ExecCommand,
	ExecResult,
	FanInfo,
	FirmwareChannel,
	FirmwareInfo,
	FirmwareUpdate,
	InterfaceHardware,
	MemoryInfo,
	StorageInfo,
	TemperatureSensor,
	HardwareInfo,
	InterfaceInfoStatus,
	InterfaceInfo,
	InterfaceMetrics,
	InterfaceRates,
	LogLevel,
	LogMessage,
	MessageType,
	MetricsPayload,
	ModeAckPayload,
	ModeUpdatePayload,
	RegisterDeviceRequest,
	RpcMessage,
	StatusPayload,
	SystemStatus,
	TemplateApplicationResult,
	UpgradeCommand,
	WebhookEvent,
	WebhookConfig,
} from './client'

// Re-export manual portal types not yet in the OpenAPI spec.
// These will be replaced once corresponding Rust types are added
// to the protocol crate and the client is regenerated.
export type {
	Device,
	DeviceRegistration,
	DeviceRegistrationResponse,
	DeviceStatus,
	Route,
	RouteCreate,
	RouteUpdate,
	NATRule,
	NATRuleCreate,
	NATRuleUpdate,
	IPSConfig,
	IPSRule,
	IPSAlert,
	VPNServerConfig,
	VPNServerPeer,
	VPNClientProfile,
	VPNClientStatus,
	QoSRule,
	QoSRuleCreate,
	QoSRuleUpdate,
	DDNSConfig,
	DDNSConfigCreate,
	DDNSConfigUpdate,
	Report,
	ReportCreate,
	LogEntry,
	LogQuery,
	Dashboard,
	DashboardWidget,
	DashboardCreate,
	DashboardUpdate,
} from '../types'

// Re-export the API client and its types
export { type ApiClient, createApiClient } from '../client'
