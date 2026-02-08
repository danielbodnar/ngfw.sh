import { z } from "zod";

/**
 * DHCP server configuration schema
 */
export const dhcpConfig = z.object({
	id: z.number().int(),
	interface: z.string().describe("Interface to run DHCP server on"),
	enabled: z.boolean().default(true),
	start_ip: z.string().describe("Start of DHCP range"),
	end_ip: z.string().describe("End of DHCP range"),
	subnet_mask: z.string().describe("Subnet mask for DHCP clients"),
	gateway: z.string().describe("Default gateway for DHCP clients"),
	dns_primary: z.string().describe("Primary DNS server"),
	dns_secondary: z.string().nullable().describe("Secondary DNS server"),
	lease_time: z.number().int().min(60).default(86400).describe("Lease time in seconds"),
	domain_name: z.string().nullable().describe("Domain name for DHCP clients"),
	updated_at: z.number().int(),
});

/**
 * DHCP lease schema
 */
export const dhcpLease = z.object({
	mac_address: z.string().describe("Client MAC address"),
	ip_address: z.string().describe("Assigned IP address"),
	hostname: z.string().nullable().describe("Client hostname"),
	expires_at: z.number().int().describe("Lease expiration timestamp"),
	interface: z.string().describe("Interface the lease is on"),
	vendor: z.string().nullable().describe("Vendor/device type"),
});

export const DhcpConfigModel = {
	tableName: "dhcp_config",
	primaryKeys: ["id"],
	schema: dhcpConfig,
	serializer: (obj: Record<string, string | number | boolean | null>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
			dns_secondary: obj.dns_secondary ?? null,
			domain_name: obj.domain_name ?? null,
		};
	},
	serializerObject: dhcpConfig,
};
