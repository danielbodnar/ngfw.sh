import { z } from "zod";

/** VPN profile type enumeration */
export const vpnProfileType = z.enum(["wireguard", "openvpn"]);

/** VPN profile connection status */
export const vpnProfileStatus = z.enum(["connected", "disconnected", "connecting", "error"]);

/** WireGuard-specific configuration */
export const wireguardConfig = z.object({
	private_key: z.string(),
	public_key: z.string(),
	address: z.string(),
	dns: z.array(z.string()).optional(),
	endpoint: z.string(),
	allowed_ips: z.array(z.string()),
	persistent_keepalive: z.number().int().min(0).max(65535).optional(),
	preshared_key: z.string().optional(),
	mtu: z.number().int().min(1280).max(1500).optional(),
});

/** OpenVPN-specific configuration */
export const openvpnConfig = z.object({
	config_file: z.string(),
	auth_user: z.string().optional(),
	auth_pass: z.string().optional(),
	ca_cert: z.string().optional(),
	client_cert: z.string().optional(),
	client_key: z.string().optional(),
	tls_auth: z.string().optional(),
	cipher: z.string().optional(),
	auth_digest: z.string().optional(),
	compress: z.enum(["lzo", "lz4", "none"]).optional(),
});

/** VPN profile configuration (discriminated union) */
export const vpnProfileConfig = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("wireguard"),
		wireguard: wireguardConfig,
	}),
	z.object({
		type: z.literal("openvpn"),
		openvpn: openvpnConfig,
	}),
]);

/** Full VPN client profile schema */
export const vpnClientProfile = z.object({
	id: z.string() /* TODO: UUID validation */,
	name: z.string().min(1).max(255),
	type: vpnProfileType,
	config: z.union([wireguardConfig, openvpnConfig]),
	status: vpnProfileStatus,
	auto_connect: z.boolean(),
	created_at: z.number().int(),
	updated_at: z.number().int(),
	last_connected: z.number().int().nullable(),
	owner_id: z.string(),
});

/** Profile creation input (without computed fields) */
export const vpnClientProfileCreate = vpnClientProfile.pick({
	name: true,
	type: true,
	config: true,
	auto_connect: true,
});

/** Profile update input (all fields optional except type constraints) */
export const vpnClientProfileUpdate = z.object({
	name: z.string().min(1).max(255).optional(),
	config: z.union([wireguardConfig, openvpnConfig]).optional(),
	auto_connect: z.boolean().optional(),
});

export const VpnClientProfileModel = {
	tableName: "vpn_client_profiles",
	primaryKeys: ["id"],
	schema: vpnClientProfile,
	serializer: (obj: Record<string, unknown>) => {
		return {
			...obj,
			auto_connect: Boolean(obj.auto_connect),
			config: typeof obj.config === "string" ? JSON.parse(obj.config as string) : obj.config,
		};
	},
	serializerObject: vpnClientProfile,
};
