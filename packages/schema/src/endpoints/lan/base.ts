import { z } from "zod";

/**
 * LAN configuration schema
 */
export const lanConfig = z.object({
	id: z.number().int(),
	interface: z.string().describe("LAN network interface (e.g., eth1, br-lan)"),
	enabled: z.boolean().default(true),
	ipv4_address: z.string().describe("LAN IPv4 address"),
	ipv4_netmask: z.string().describe("IPv4 netmask"),
	ipv6_enabled: z.boolean().default(false),
	ipv6_address: z.string().nullable().describe("LAN IPv6 address"),
	ipv6_prefix_length: z.number().int().min(0).max(128).nullable(),
	dhcp_enabled: z.boolean().default(true).describe("Enable DHCP server on this interface"),
	vlan_id: z.number().int().min(1).max(4094).nullable().describe("VLAN ID (null for untagged)"),
	bridge_interfaces: z.string().nullable().describe("Comma-separated list of bridged interfaces"),
	updated_at: z.number().int(),
});

export const LanConfigModel = {
	tableName: "lan_config",
	primaryKeys: ["id"],
	schema: lanConfig,
	serializer: (obj: Record<string, string | number | boolean | null>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
			ipv6_enabled: Boolean(obj.ipv6_enabled),
			dhcp_enabled: Boolean(obj.dhcp_enabled),
			ipv6_address: obj.ipv6_address ?? null,
			ipv6_prefix_length: obj.ipv6_prefix_length ?? null,
			vlan_id: obj.vlan_id ?? null,
			bridge_interfaces: obj.bridge_interfaces ?? null,
		};
	},
	serializerObject: lanConfig,
};
