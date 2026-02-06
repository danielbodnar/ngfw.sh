import { z } from "zod";

/** Supported DDNS providers */
export const ddnsProviders = [
	"cloudflare",
	"duckdns",
	"noip",
	"dynu",
	"freedns",
] as const;

export const ddnsProvider = z.enum(ddnsProviders);

/** DDNS configuration schema */
export const ddnsConfig = z.object({
	id: z.string().uuid(),
	device_id: z.string().uuid(),
	enabled: z.boolean(),
	provider: ddnsProvider,
	hostname: z.string(),
	username: z.string().nullable(),
	password: z.string().nullable(),
	last_update: z.number().int().nullable(),
	current_ip: z.string().nullable(),
	created_at: z.number().int(),
	updated_at: z.number().int(),
});

/** Provider information schema */
export const ddnsProviderInfo = z.object({
	id: ddnsProvider,
	name: z.string(),
	url: z.string(),
	supports_ipv6: z.boolean(),
	requires_username: z.boolean(),
	requires_password: z.boolean(),
});

/** Provider list data */
export const DDNS_PROVIDERS: z.infer<typeof ddnsProviderInfo>[] = [
	{
		id: "cloudflare",
		name: "Cloudflare",
		url: "https://www.cloudflare.com",
		supports_ipv6: true,
		requires_username: false,
		requires_password: true,
	},
	{
		id: "duckdns",
		name: "DuckDNS",
		url: "https://www.duckdns.org",
		supports_ipv6: true,
		requires_username: false,
		requires_password: true,
	},
	{
		id: "noip",
		name: "No-IP",
		url: "https://www.noip.com",
		supports_ipv6: false,
		requires_username: true,
		requires_password: true,
	},
	{
		id: "dynu",
		name: "Dynu",
		url: "https://www.dynu.com",
		supports_ipv6: true,
		requires_username: true,
		requires_password: true,
	},
	{
		id: "freedns",
		name: "FreeDNS",
		url: "https://freedns.afraid.org",
		supports_ipv6: false,
		requires_username: false,
		requires_password: true,
	},
];

export const DdnsConfigModel = {
	tableName: "ddns_configs",
	primaryKeys: ["id"],
	schema: ddnsConfig,
	serializer: (obj: Record<string, unknown>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
		};
	},
	serializerObject: ddnsConfig,
};
