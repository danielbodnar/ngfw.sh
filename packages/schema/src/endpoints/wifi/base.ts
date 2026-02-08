import { z } from "zod";

/**
 * WiFi band enumeration
 */
export const wifiBand = z.enum(["2.4ghz", "5ghz", "6ghz"]);

/**
 * WiFi channel width
 */
export const wifiChannelWidth = z.enum(["20", "40", "80", "160"]);

/**
 * WiFi security mode
 */
export const wifiSecurityMode = z.enum(["open", "wpa2", "wpa3", "wpa2_wpa3"]);

/**
 * WiFi radio configuration schema
 */
export const wifiRadio = z.object({
	id: z.number().int(),
	interface: z.string().describe("WiFi radio interface (e.g., radio0, radio1)"),
	band: wifiBand,
	enabled: z.boolean().default(true),
	channel: z.number().int().min(1).max(196).describe("WiFi channel (auto = 0)"),
	channel_width: wifiChannelWidth,
	tx_power: z.number().int().min(1).max(30).default(20).describe("Transmit power in dBm"),
	country_code: z.string().length(2).default("US").describe("Two-letter country code"),
	updated_at: z.number().int(),
});

/**
 * WiFi network configuration schema
 */
export const wifiNetwork = z.object({
	id: z.number().int(),
	radio_id: z.number().int().describe("Associated radio ID"),
	ssid: z.string().min(1).max(32).describe("Network SSID"),
	enabled: z.boolean().default(true),
	hidden: z.boolean().default(false).describe("Hide SSID from broadcast"),
	security_mode: wifiSecurityMode,
	password: z.string().nullable().describe("WiFi password (null for open networks)"),
	vlan_id: z.number().int().min(1).max(4094).nullable().describe("VLAN ID (null for default)"),
	guest_network: z.boolean().default(false).describe("Isolate clients (guest mode)"),
	max_clients: z.number().int().min(1).max(250).default(50),
	created_at: z.number().int(),
	updated_at: z.number().int(),
});

export const WifiRadioModel = {
	tableName: "wifi_radios",
	primaryKeys: ["id"],
	schema: wifiRadio,
	serializer: (obj: Record<string, string | number | boolean>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
		};
	},
	serializerObject: wifiRadio,
};

export const WifiNetworkModel = {
	tableName: "wifi_networks",
	primaryKeys: ["id"],
	schema: wifiNetwork,
	serializer: (obj: Record<string, string | number | boolean | null>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
			hidden: Boolean(obj.hidden),
			guest_network: Boolean(obj.guest_network),
			password: obj.password ?? null,
			vlan_id: obj.vlan_id ?? null,
		};
	},
	serializerObject: wifiNetwork,
};
