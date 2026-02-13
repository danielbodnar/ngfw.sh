import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
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

const endpoints = makeApi([]);

export const ngfwApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
