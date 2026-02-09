import { z } from "zod";

/**
 * WAN connection type
 */
export const wanConnectionType = z.enum(["dhcp", "static", "pppoe", "lte"]);

/**
 * WAN configuration schema
 */
export const wanConfig = z.object({
	id: z.number().int(),
	interface: z.string().describe("WAN network interface (e.g., eth0, ppp0)"),
	connection_type: wanConnectionType,
	enabled: z.boolean().default(true),
	ipv4_address: z
		.string()
		.nullable()
		.describe("Static IPv4 address (null for DHCP)"),
	ipv4_netmask: z.string().nullable().describe("IPv4 netmask"),
	ipv4_gateway: z.string().nullable().describe("IPv4 gateway"),
	ipv6_enabled: z.boolean().default(false),
	ipv6_address: z.string().nullable().describe("Static IPv6 address"),
	ipv6_prefix_length: z.number().int().min(0).max(128).nullable(),
	ipv6_gateway: z.string().nullable(),
	dns_primary: z.string().nullable().describe("Primary DNS server"),
	dns_secondary: z.string().nullable().describe("Secondary DNS server"),
	mtu: z.number().int().min(576).max(9000).default(1500),
	pppoe_username: z.string().nullable().describe("PPPoE username"),
	pppoe_password: z.string().nullable().describe("PPPoE password"),
	updated_at: z.number().int(),
});

export const WanConfigModel = {
	tableName: "wan_config",
	primaryKeys: ["id"],
	schema: wanConfig,
	serializer: (obj: Record<string, string | number | boolean | null>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
			ipv6_enabled: Boolean(obj.ipv6_enabled),
			ipv4_address: obj.ipv4_address ?? null,
			ipv4_netmask: obj.ipv4_netmask ?? null,
			ipv4_gateway: obj.ipv4_gateway ?? null,
			ipv6_address: obj.ipv6_address ?? null,
			ipv6_prefix_length: obj.ipv6_prefix_length ?? null,
			ipv6_gateway: obj.ipv6_gateway ?? null,
			dns_primary: obj.dns_primary ?? null,
			dns_secondary: obj.dns_secondary ?? null,
			pppoe_username: obj.pppoe_username ?? null,
			pppoe_password: obj.pppoe_password ?? null,
		};
	},
	serializerObject: wanConfig,
};
