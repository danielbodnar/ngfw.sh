import { z } from "zod";

/**
 * QoS algorithm types supported by the router
 */
export const qosAlgorithm = z.enum(["fq_codel", "cake", "htb"]);

/**
 * QoS global configuration schema
 */
export const qosConfig = z.object({
	id: z.number().int(),
	enabled: z.boolean(),
	algorithm: qosAlgorithm,
	wan_upload_kbps: z.number().int().min(0),
	wan_download_kbps: z.number().int().min(0),
	updated_at: z.number().int(),
});

/**
 * QoS rule schema for traffic shaping
 */
export const qosRule = z.object({
	id: z.number().int(),
	name: z.string().min(1).max(100),
	source_ip: z.string().ip().nullable(),
	protocol: z.string().nullable(),
	priority: z.number().int().min(0).max(7),
	bandwidth_limit: z.number().int().min(0).nullable(),
	enabled: z.boolean(),
	created_at: z.number().int(),
	updated_at: z.number().int(),
});

export const QosConfigModel = {
	tableName: "qos_config",
	primaryKeys: ["id"],
	schema: qosConfig,
	serializer: (obj: Record<string, string | number | boolean>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
		};
	},
	serializerObject: qosConfig,
};

export const QosRuleModel = {
	tableName: "qos_rules",
	primaryKeys: ["id"],
	schema: qosRule,
	serializer: (obj: Record<string, string | number | boolean | null>) => {
		return {
			...obj,
			enabled: Boolean(obj.enabled),
			source_ip: obj.source_ip ?? null,
			protocol: obj.protocol ?? null,
			bandwidth_limit: obj.bandwidth_limit ?? null,
		};
	},
	serializerObject: qosRule,
};
