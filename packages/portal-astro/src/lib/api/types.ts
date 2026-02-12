/**
 * TypeScript interfaces for NGFW API.
 *
 * All types match the OpenAPI spec at api.ngfw.sh/openapi.json.
 *
 * @module lib/api/types
 */

// ---------------------------------------------------------------------------
// Fleet / Device Management
// ---------------------------------------------------------------------------

export interface Device {
	id: string;
	name: string;
	model: string | null;
	serial: string | null;
	owner_id: string;
	firmware_version: string | null;
	status: "provisioning" | "online" | "offline";
	created_at: number;
	last_seen: number | null;
}

export interface DeviceRegistration {
	name: string;
	model?: string;
}

export interface DeviceRegistrationResponse extends Device {
	/** Only returned once at registration time. */
	api_key: string;
	websocket_url: string;
}

export interface DeviceStatus {
	device: Device;
	connection: {
		online: boolean;
		last_seen: number | null;
	} | null;
	metrics: {
		uptime: number;
		cpu: number;
		memory: number;
		temperature: number | null;
		load: [number, number, number];
		connections: number;
	} | null;
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export interface Route {
	id: string;
	device_id: string;
	destination: string;
	gateway: string;
	interface: string;
	metric: number;
	type: "static" | "dynamic" | "policy";
	enabled: boolean;
	description: string | null;
	created_at: number;
	updated_at: number;
}

export interface RouteCreate {
	device_id: string;
	destination: string;
	gateway: string;
	interface: string;
	metric?: number;
	type?: "static" | "dynamic" | "policy";
	enabled?: boolean;
	description?: string;
}

export interface RouteUpdate {
	destination?: string;
	gateway?: string;
	interface?: string;
	metric?: number;
	type?: "static" | "dynamic" | "policy";
	enabled?: boolean;
	description?: string;
}

// ---------------------------------------------------------------------------
// NAT
// ---------------------------------------------------------------------------

export interface NATRule {
	id: string;
	device_id: string;
	name: string;
	type: "port_forward" | "source_nat" | "destination_nat";
	external_ip: string;
	external_port: number;
	internal_ip: string;
	internal_port: number;
	protocol: "tcp" | "udp" | "both";
	enabled: boolean;
	description: string | null;
	created_at: number;
	updated_at: number;
}

export interface NATRuleCreate {
	device_id: string;
	name: string;
	type: "port_forward" | "source_nat" | "destination_nat";
	external_ip: string;
	external_port: number;
	internal_ip: string;
	internal_port: number;
	protocol: "tcp" | "udp" | "both";
	enabled?: boolean;
	description?: string;
}

export interface NATRuleUpdate {
	name?: string;
	type?: "port_forward" | "source_nat" | "destination_nat";
	external_ip?: string;
	external_port?: number;
	internal_ip?: string;
	internal_port?: number;
	protocol?: "tcp" | "udp" | "both";
	enabled?: boolean;
	description?: string;
}

// ---------------------------------------------------------------------------
// IPS (Intrusion Prevention System)
// ---------------------------------------------------------------------------

export interface IPSConfig {
	id: string;
	device_id: string;
	enabled: boolean;
	mode: "detect" | "prevent";
	sensitivity: "low" | "medium" | "high";
	updated_at: number;
}

export interface IPSRule {
	id: string;
	device_id: string;
	signature_id: number;
	category: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	enabled: boolean;
	action: "alert" | "drop" | "reject";
	created_at: number;
}

export interface IPSAlert {
	id: string;
	device_id: string;
	signature_id: number;
	category: string;
	severity: "low" | "medium" | "high" | "critical";
	source_ip: string;
	destination_ip: string;
	protocol: string;
	timestamp: number;
	blocked: boolean;
}

// ---------------------------------------------------------------------------
// VPN Server
// ---------------------------------------------------------------------------

export interface VPNServerConfig {
	id: string;
	device_id: string;
	enabled: boolean;
	protocol: "wireguard" | "openvpn" | "ipsec";
	port: number;
	subnet: string;
	dns_servers: string[];
	updated_at: number;
}

export interface VPNServerPeer {
	id: string;
	device_id: string;
	name: string;
	public_key: string;
	allowed_ips: string[];
	endpoint: string | null;
	last_handshake: number | null;
	enabled: boolean;
	created_at: number;
}

// ---------------------------------------------------------------------------
// VPN Client
// ---------------------------------------------------------------------------

export interface VPNClientProfile {
	id: string;
	device_id: string;
	name: string;
	protocol: "wireguard" | "openvpn" | "ipsec";
	server: string;
	port: number;
	credentials: string;
	enabled: boolean;
	auto_connect: boolean;
	created_at: number;
	updated_at: number;
}

export interface VPNClientStatus {
	profile_id: string;
	connected: boolean;
	ip_address: string | null;
	connected_at: number | null;
	bytes_sent: number;
	bytes_received: number;
}

// ---------------------------------------------------------------------------
// QoS (Quality of Service)
// ---------------------------------------------------------------------------

export interface QoSRule {
	id: string;
	device_id: string;
	name: string;
	source_ip: string | null;
	destination_ip: string | null;
	source_port: number | null;
	destination_port: number | null;
	protocol: string | null;
	priority: "low" | "medium" | "high" | "critical";
	max_bandwidth: number | null;
	min_bandwidth: number | null;
	enabled: boolean;
	created_at: number;
	updated_at: number;
}

export interface QoSRuleCreate {
	device_id: string;
	name: string;
	source_ip?: string;
	destination_ip?: string;
	source_port?: number;
	destination_port?: number;
	protocol?: string;
	priority: "low" | "medium" | "high" | "critical";
	max_bandwidth?: number;
	min_bandwidth?: number;
	enabled?: boolean;
}

export interface QoSRuleUpdate {
	name?: string;
	source_ip?: string;
	destination_ip?: string;
	source_port?: number;
	destination_port?: number;
	protocol?: string;
	priority?: "low" | "medium" | "high" | "critical";
	max_bandwidth?: number;
	min_bandwidth?: number;
	enabled?: boolean;
}

// ---------------------------------------------------------------------------
// DDNS (Dynamic DNS)
// ---------------------------------------------------------------------------

export interface DDNSConfig {
	id: string;
	device_id: string;
	provider: string;
	hostname: string;
	username: string;
	password: string;
	enabled: boolean;
	last_update: number | null;
	last_ip: string | null;
	update_interval: number;
	created_at: number;
	updated_at: number;
}

export interface DDNSConfigCreate {
	device_id: string;
	provider: string;
	hostname: string;
	username: string;
	password: string;
	enabled?: boolean;
	update_interval?: number;
}

export interface DDNSConfigUpdate {
	provider?: string;
	hostname?: string;
	username?: string;
	password?: string;
	enabled?: boolean;
	update_interval?: number;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface Report {
	id: string;
	device_id: string;
	type: "traffic" | "security" | "performance" | "summary";
	format: "pdf" | "csv" | "json";
	period_start: number;
	period_end: number;
	status: "pending" | "generating" | "completed" | "failed";
	url: string | null;
	created_at: number;
	completed_at: number | null;
}

export interface ReportCreate {
	device_id: string;
	type: "traffic" | "security" | "performance" | "summary";
	format: "pdf" | "csv" | "json";
	period_start: number;
	period_end: number;
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export interface LogEntry {
	id: string;
	device_id: string;
	timestamp: number;
	level: "debug" | "info" | "warning" | "error" | "critical";
	category: string;
	message: string;
	source_ip: string | null;
	destination_ip: string | null;
	protocol: string | null;
	action: string | null;
}

export interface LogQuery {
	device_id?: string;
	level?: "debug" | "info" | "warning" | "error" | "critical";
	category?: string;
	start_time?: number;
	end_time?: number;
	limit?: number;
	offset?: number;
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export interface Dashboard {
	id: string;
	user_id: string;
	name: string;
	layout: DashboardWidget[];
	is_default: boolean;
	created_at: number;
	updated_at: number;
}

export interface DashboardWidget {
	id: string;
	type: "chart" | "table" | "metric" | "map";
	title: string;
	config: Record<string, unknown>;
	position: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
}

export interface DashboardCreate {
	name: string;
	layout: DashboardWidget[];
	is_default?: boolean;
}

export interface DashboardUpdate {
	name?: string;
	layout?: DashboardWidget[];
	is_default?: boolean;
}
