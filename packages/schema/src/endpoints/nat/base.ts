import { z } from "zod";

/** NAT rule types */
export const natRuleType = z.enum([
	"snat",
	"dnat",
	"masquerade",
	"port_forward",
]);

/** Protocol types for NAT rules */
export const natProtocol = z.enum(["tcp", "udp", "tcp_udp", "icmp", "all"]);

/** NAT rule record */
export const natRule = z.object({
	id: z.string() /* TODO: UUID validation */,
	name: z.string().min(1).max(255),
	type: natRuleType,
	enabled: z.boolean(),
	protocol: natProtocol,
	source_zone: z.string().min(1).max(50),
	source_address: z.string().min(1).max(255),
	destination_zone: z.string().min(1).max(50),
	destination_address: z.string().min(1).max(255),
	external_port: z.string().max(50).nullable(),
	internal_ip: z.string().max(50).nullable(),
	internal_port: z.string().max(50).nullable(),
	description: z.string().max(500).nullable(),
	owner_id: z.string(),
	device_id: z.string() /* TODO: UUID validation */,
	created_at: z.number().int(),
	updated_at: z.number().int(),
});

export const NatRuleModel = {
	tableName: "nat_rules",
	primaryKeys: ["id"],
	schema: natRule,
	serializer: (obj: object) => obj,
	serializerObject: natRule,
};

/** UPnP lease record */
export const upnpLease = z.object({
	id: z.string() /* TODO: UUID validation */,
	client_ip: z.string(), // TODO: Add IP validation with z.string().regex() in Zod 4
	external_port: z.number().int().min(1).max(65535),
	internal_port: z.number().int().min(1).max(65535),
	protocol: z.enum(["tcp", "udp"]),
	description: z.string().max(255).nullable(),
	device_id: z.string() /* TODO: UUID validation */,
	expires_at: z.number().int(),
	created_at: z.number().int(),
});

export const UpnpLeaseModel = {
	tableName: "upnp_leases",
	primaryKeys: ["id"],
	schema: upnpLease,
	serializer: (obj: object) => obj,
	serializerObject: upnpLease,
};
