import { z } from "zod";

const AgentMode = z.enum(["observe", "shadow", "takeover"]);
const AgentInfo = z
  .object({
    device_id: z.string(),
    firmware_version: z.string(),
    mode: AgentMode,
    model: z.string(),
    version: z.string(),
  })
  .passthrough();
const AlertType = z.enum([
  "intrusion_attempt",
  "malware_detected",
  "brute_force",
  "port_scan",
  "ddos_attempt",
  "policy_violation",
  "config_change",
  "system_anomaly",
]);
const AlertSeverity = z.enum(["low", "medium", "high", "critical"]);
const AlertMessage = z
  .object({
    alert_type: AlertType,
    description: z.string(),
    details: z.unknown().optional(),
    severity: AlertSeverity,
    source: z.string(),
    timestamp: z.number().int(),
  })
  .passthrough();
const ApplyTemplateRequest = z
  .object({ device_ids: z.array(z.string()), merge: z.boolean().optional() })
  .passthrough();
const AuditLogEntry = z
  .object({
    action: z.string(),
    changes: z.unknown().optional(),
    device_id: z.union([z.string(), z.null()]).optional(),
    id: z.string(),
    ip_address: z.string(),
    resource_id: z.string(),
    resource_type: z.string(),
    timestamp: z.number().int(),
    user_agent: z.string(),
    user_id: z.string(),
  })
  .passthrough();
const AuthRequest = z
  .object({
    api_key: z.string(),
    device_id: z.string(),
    firmware_version: z.string(),
  })
  .passthrough();
const AuthResponse = z
  .object({
    error: z.union([z.string(), z.null()]).optional(),
    server_time: z.union([z.number(), z.null()]).optional(),
    success: z.boolean(),
  })
  .passthrough();
const BackupInfo = z
  .object({
    created_at: z.number().int(),
    description: z.union([z.string(), z.null()]).optional(),
    encrypted: z.boolean(),
    firmware_version: z.string(),
    id: z.string(),
    size_bytes: z.number().int().gte(0),
  })
  .passthrough();
const BootSlot = z
  .object({
    active: z.boolean(),
    bootable: z.boolean(),
    firmware_version: z.union([z.string(), z.null()]).optional(),
    id: z.number().int().gte(0),
    install_date: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const CommandStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "timeout",
]);
const CommandResult = z
  .object({
    command_id: z.string(),
    completed_at: z.union([z.number(), z.null()]).optional(),
    error: z.union([z.string(), z.null()]).optional(),
    result: z.unknown().optional(),
    started_at: z.number().int(),
    status: CommandStatus,
  })
  .passthrough();
const CommandType = z.enum([
  "reboot",
  "shutdown",
  "refresh_status",
  "apply_config",
  "run_diagnostics",
  "clear_cache",
  "restart_service",
]);
const ConfigSection = z.enum([
  "wan",
  "lan",
  "wifi",
  "dhcp",
  "firewall",
  "nat",
  "dns",
  "ids",
  "vpn",
  "qos",
  "system",
  "full",
]);
const ConfigAck = z
  .object({
    error: z.union([z.string(), z.null()]).optional(),
    section: ConfigSection,
    success: z.boolean(),
    version: z.number().int().gte(0),
  })
  .passthrough();
const ConfigPush = z
  .object({
    config: z.unknown(),
    section: ConfigSection,
    version: z.number().int().gte(0),
  })
  .passthrough();
const ConfigTemplate = z
  .object({
    config: z.unknown(),
    created_at: z.number().int(),
    created_by: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    id: z.string(),
    name: z.string(),
    updated_at: z.number().int(),
    version: z.number().int().gte(0),
  })
  .passthrough();
const ConnectionCounts = z
  .object({
    tcp: z.number().int().gte(0),
    total: z.number().int().gte(0),
    udp: z.number().int().gte(0),
  })
  .passthrough();
const CpuInfo = z
  .object({
    cores: z.number().int().gte(0),
    frequency_mhz: z.number().int().gte(0),
    model: z.string(),
    usage_percent: z.number(),
  })
  .passthrough();
const CreateTemplateRequest = z
  .object({
    config: z.unknown(),
    description: z.union([z.string(), z.null()]).optional(),
    name: z.string(),
  })
  .passthrough();
const ModeConfig = z
  .object({
    mode: AgentMode,
    section_overrides: z.record(AgentMode).optional(),
  })
  .passthrough();
const DeviceStatus = z.enum([
  "online",
  "offline",
  "updating",
  "error",
  "provisioning",
]);
const Device = z
  .object({
    agent_mode: z.union([z.null(), ModeConfig]).optional(),
    created_at: z.number().int(),
    firmware_version: z.string(),
    id: z.string(),
    last_seen: z.union([z.number(), z.null()]).optional(),
    location: z.union([z.string(), z.null()]).optional(),
    model: z.string(),
    name: z.string(),
    notes: z.union([z.string(), z.null()]).optional(),
    serial: z.string(),
    status: DeviceStatus,
    tags: z.array(z.string()),
  })
  .passthrough();
const DeviceApplicationResult = z
  .object({
    device_id: z.string(),
    error: z.union([z.string(), z.null()]).optional(),
    success: z.boolean(),
  })
  .passthrough();
const DeviceCommand = z
  .object({ command: CommandType, payload: z.unknown().optional() })
  .passthrough();
const DeviceRegistration = z
  .object({
    api_key: z.string(),
    device_id: z.string(),
    websocket_url: z.string(),
  })
  .passthrough();
const InterfaceStatus = z
  .object({
    ip: z.union([z.string(), z.null()]).optional(),
    name: z.string(),
    rx_bytes: z.number().int().gte(0),
    rx_rate: z.number().int().gte(0),
    status: z.string(),
    tx_bytes: z.number().int().gte(0),
    tx_rate: z.number().int().gte(0),
  })
  .passthrough();
const DeviceStatusUpdate = z
  .object({
    connections: z.number().int().gte(0),
    cpu: z.number(),
    firmware: z.string(),
    interfaces: z.array(InterfaceStatus),
    load: z.array(z.number()),
    memory: z.number(),
    temperature: z.union([z.number(), z.null()]).optional(),
    uptime: z.number().int().gte(0),
    wan_ip: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const DnsMetrics = z
  .object({
    blocked: z.number().int().gte(0),
    cached: z.number().int().gte(0),
    queries: z.number().int().gte(0),
  })
  .passthrough();
const ExecCommand = z
  .object({
    args: z.union([z.array(z.string()), z.null()]).optional(),
    command: z.string(),
    command_id: z.string(),
    timeout_secs: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough();
const ExecResult = z
  .object({
    command_id: z.string(),
    duration_ms: z.number().int().gte(0),
    exit_code: z.number().int(),
    stderr: z.union([z.string(), z.null()]).optional(),
    stdout: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const FanInfo = z
  .object({
    name: z.string(),
    percent: z.union([z.number(), z.null()]).optional(),
    rpm: z.number().int().gte(0),
  })
  .passthrough();
const FirmwareChannel = z.enum(["stable", "beta", "nightly"]);
const FirmwareInfo = z
  .object({
    build_date: z.string(),
    channel: FirmwareChannel,
    hash: z.string(),
    version: z.string(),
  })
  .passthrough();
const FirmwareUpdate = z
  .object({
    build_date: z.string(),
    changelog: z.string(),
    channel: FirmwareChannel,
    download_url: z.string(),
    signature: z.string(),
    size_bytes: z.number().int().gte(0),
    version: z.string(),
  })
  .passthrough();
const InterfaceHardware = z
  .object({
    driver: z.string(),
    duplex: z.union([z.string(), z.null()]).optional(),
    link: z.boolean(),
    name: z.string(),
    speed_mbps: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough();
const MemoryInfo = z
  .object({
    free_mb: z.number().int().gte(0),
    percent_used: z.number(),
    total_mb: z.number().int().gte(0),
    used_mb: z.number().int().gte(0),
  })
  .passthrough();
const StorageInfo = z
  .object({
    device: z.string(),
    filesystem: z.string(),
    mount_point: z.string(),
    percent_used: z.number(),
    total_mb: z.number().int().gte(0),
    used_mb: z.number().int().gte(0),
  })
  .passthrough();
const TemperatureSensor = z
  .object({
    critical_c: z.union([z.number(), z.null()]).optional(),
    name: z.string(),
    temperature_c: z.number(),
  })
  .passthrough();
const HardwareInfo = z
  .object({
    cpu: CpuInfo,
    fans: z.union([z.array(FanInfo), z.null()]).optional(),
    interfaces: z.array(InterfaceHardware),
    memory: MemoryInfo,
    storage: z.array(StorageInfo),
    temperature_sensors: z
      .union([z.array(TemperatureSensor), z.null()])
      .optional(),
  })
  .passthrough();
const InterfaceInfoStatus = z.enum(["up", "down", "unknown"]);
const InterfaceInfo = z
  .object({
    ip: z.union([z.string(), z.null()]).optional(),
    ip6: z.union([z.string(), z.null()]).optional(),
    mac: z.union([z.string(), z.null()]).optional(),
    mtu: z.number().int().gte(0),
    name: z.string(),
    rx_bytes: z.number().int().gte(0),
    rx_rate: z.number().int().gte(0),
    status: InterfaceInfoStatus,
    tx_bytes: z.number().int().gte(0),
    tx_rate: z.number().int().gte(0),
  })
  .passthrough();
const InterfaceMetrics = z
  .object({
    ip: z.union([z.string(), z.null()]).optional(),
    name: z.string(),
    rx_bytes: z.number().int().gte(0),
    rx_rate: z.number().int().gte(0),
    status: z.string(),
    tx_bytes: z.number().int().gte(0),
    tx_rate: z.number().int().gte(0),
  })
  .passthrough();
const InterfaceRates = z
  .object({
    rx_rate: z.number().int().gte(0),
    tx_rate: z.number().int().gte(0),
  })
  .passthrough();
const LogLevel = z.enum(["debug", "info", "warn", "error", "critical"]);
const LogMessage = z
  .object({
    component: z.string(),
    details: z.unknown().optional(),
    level: LogLevel,
    message: z.string(),
    timestamp: z.number().int(),
  })
  .passthrough();
const MessageType = z.enum([
  "CONFIG_PUSH",
  "CONFIG_FULL",
  "EXEC",
  "REBOOT",
  "UPGRADE",
  "STATUS_REQUEST",
  "PING",
  "MODE_UPDATE",
  "AUTH",
  "AUTH_OK",
  "AUTH_FAIL",
  "STATUS",
  "STATUS_OK",
  "CONFIG_ACK",
  "CONFIG_FAIL",
  "EXEC_RESULT",
  "LOG",
  "ALERT",
  "METRICS",
  "PONG",
  "MODE_ACK",
  "ERROR",
]);
const MetricsPayload = z
  .object({
    connections: ConnectionCounts,
    cpu: z.number(),
    dns: DnsMetrics,
    interfaces: z.record(InterfaceRates),
    memory: z.number(),
    temperature: z.union([z.number(), z.null()]).optional(),
    timestamp: z.number().int(),
  })
  .passthrough();
const ModeAckPayload = z
  .object({
    error: z.union([z.string(), z.null()]).optional(),
    mode_config: ModeConfig,
    success: z.boolean(),
  })
  .passthrough();
const ModeUpdatePayload = z.object({ mode_config: ModeConfig }).passthrough();
const RegisterDeviceRequest = z
  .object({
    activation_code: z.string(),
    location: z.union([z.string(), z.null()]).optional(),
    name: z.string(),
    notes: z.union([z.string(), z.null()]).optional(),
    tags: z.union([z.array(z.string()), z.null()]).optional(),
  })
  .passthrough();
const RpcMessage = z
  .object({ id: z.string(), payload: z.unknown(), type: MessageType })
  .passthrough();
const StatusPayload = z
  .object({
    connections: z.number().int().gte(0),
    cpu: z.number(),
    firmware: z.string(),
    interfaces: z.array(InterfaceMetrics),
    load: z.array(z.number()),
    memory: z.number(),
    temperature: z.union([z.number(), z.null()]).optional(),
    uptime: z.number().int().gte(0),
    wan_ip: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const SystemStatus = z
  .object({
    cpu_percent: z.number(),
    firmware_version: z.string(),
    load: z.array(z.number()),
    memory_percent: z.number(),
    model: z.string(),
    serial: z.string(),
    temperature: z.union([z.number(), z.null()]).optional(),
    uptime: z.number().int().gte(0),
  })
  .passthrough();
const TemplateApplicationResult = z
  .object({
    results: z.array(DeviceApplicationResult),
    template_id: z.string(),
  })
  .passthrough();
const UpgradeCommand = z
  .object({
    checksum: z.string(),
    download_url: z.string(),
    force: z.boolean().optional(),
    signature: z.string(),
    version: z.string(),
  })
  .passthrough();
const WebhookEvent = z.enum([
  "device_online",
  "device_offline",
  "threat_detected",
  "config_changed",
  "firmware_available",
]);
const WebhookConfig = z
  .object({
    created_at: z.number().int(),
    enabled: z.boolean(),
    events: z.array(WebhookEvent),
    id: z.string(),
    url: z.string(),
  })
  .passthrough();

export const schemas = {
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
  DeviceStatus,
  Device,
  DeviceApplicationResult,
  DeviceCommand,
  DeviceRegistration,
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
};

// Inferred TypeScript types from Zod schemas
export type AgentMode = z.infer<typeof AgentMode>;
export type AgentInfo = z.infer<typeof AgentInfo>;
export type AlertType = z.infer<typeof AlertType>;
export type AlertSeverity = z.infer<typeof AlertSeverity>;
export type AlertMessage = z.infer<typeof AlertMessage>;
export type ApplyTemplateRequest = z.infer<typeof ApplyTemplateRequest>;
export type AuditLogEntry = z.infer<typeof AuditLogEntry>;
export type AuthRequest = z.infer<typeof AuthRequest>;
export type AuthResponse = z.infer<typeof AuthResponse>;
export type BackupInfo = z.infer<typeof BackupInfo>;
export type BootSlot = z.infer<typeof BootSlot>;
export type CommandStatus = z.infer<typeof CommandStatus>;
export type CommandResult = z.infer<typeof CommandResult>;
export type CommandType = z.infer<typeof CommandType>;
export type ConfigSection = z.infer<typeof ConfigSection>;
export type ConfigAck = z.infer<typeof ConfigAck>;
export type ConfigPush = z.infer<typeof ConfigPush>;
export type ConfigTemplate = z.infer<typeof ConfigTemplate>;
export type ConnectionCounts = z.infer<typeof ConnectionCounts>;
export type CpuInfo = z.infer<typeof CpuInfo>;
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequest>;
export type ModeConfig = z.infer<typeof ModeConfig>;
export type DeviceStatus = z.infer<typeof DeviceStatus>;
export type Device = z.infer<typeof Device>;
export type DeviceApplicationResult = z.infer<typeof DeviceApplicationResult>;
export type DeviceCommand = z.infer<typeof DeviceCommand>;
export type DeviceRegistration = z.infer<typeof DeviceRegistration>;
export type InterfaceStatus = z.infer<typeof InterfaceStatus>;
export type DeviceStatusUpdate = z.infer<typeof DeviceStatusUpdate>;
export type DnsMetrics = z.infer<typeof DnsMetrics>;
export type ExecCommand = z.infer<typeof ExecCommand>;
export type ExecResult = z.infer<typeof ExecResult>;
export type FanInfo = z.infer<typeof FanInfo>;
export type FirmwareChannel = z.infer<typeof FirmwareChannel>;
export type FirmwareInfo = z.infer<typeof FirmwareInfo>;
export type FirmwareUpdate = z.infer<typeof FirmwareUpdate>;
export type InterfaceHardware = z.infer<typeof InterfaceHardware>;
export type MemoryInfo = z.infer<typeof MemoryInfo>;
export type StorageInfo = z.infer<typeof StorageInfo>;
export type TemperatureSensor = z.infer<typeof TemperatureSensor>;
export type HardwareInfo = z.infer<typeof HardwareInfo>;
export type InterfaceInfoStatus = z.infer<typeof InterfaceInfoStatus>;
export type InterfaceInfo = z.infer<typeof InterfaceInfo>;
export type InterfaceMetrics = z.infer<typeof InterfaceMetrics>;
export type InterfaceRates = z.infer<typeof InterfaceRates>;
export type LogLevel = z.infer<typeof LogLevel>;
export type LogMessage = z.infer<typeof LogMessage>;
export type MessageType = z.infer<typeof MessageType>;
export type MetricsPayload = z.infer<typeof MetricsPayload>;
export type ModeAckPayload = z.infer<typeof ModeAckPayload>;
export type ModeUpdatePayload = z.infer<typeof ModeUpdatePayload>;
export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequest>;
export type RpcMessage = z.infer<typeof RpcMessage>;
export type StatusPayload = z.infer<typeof StatusPayload>;
export type SystemStatus = z.infer<typeof SystemStatus>;
export type TemplateApplicationResult = z.infer<typeof TemplateApplicationResult>;
export type UpgradeCommand = z.infer<typeof UpgradeCommand>;
export type WebhookEvent = z.infer<typeof WebhookEvent>;
export type WebhookConfig = z.infer<typeof WebhookConfig>;
