import { z } from "zod";

/**
 * IPS mode enum - matches Suricata/Snort behavior.
 */
export const ipsModeEnum = z.enum(["disabled", "detect", "prevent"]);

/**
 * IPS category (Suricata/Snort-style).
 */
export const ipsCategory = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	mode: ipsModeEnum,
	rule_count: z.number().int(),
});

/**
 * IPS global configuration.
 */
export const ipsConfig = z.object({
	enabled: z.boolean(),
	mode: ipsModeEnum,
	home_networks: z.array(z.string()),
	external_networks: z.array(z.string()),
	excluded_networks: z.array(z.string()).optional(),
	max_pending_packets: z.number().int().min(1).max(65535).optional(),
	update_interval: z.number().int().min(3600).max(604800).optional(),
	last_update: z.number().int().nullable(),
});

/**
 * IPS custom rule.
 */
export const ipsRule = z.object({
	id: z.number().int(),
	name: z.string(),
	description: z.string().optional(),
	enabled: z.boolean(),
	rule: z.string(),
	category: z.string().optional(),
	priority: z.number().int().min(1).max(10).optional(),
	created_at: z.number().int(),
	updated_at: z.number().int(),
});

/**
 * IPS alert severity enum.
 */
export const alertSeverityEnum = z.enum(["low", "medium", "high", "critical"]);

/**
 * IPS alert record.
 */
export const ipsAlert = z.object({
	id: z.number().int(),
	timestamp: z.number().int(),
	signature_id: z.number().int(),
	signature_name: z.string(),
	category: z.string(),
	severity: alertSeverityEnum,
	protocol: z.string(),
	src_ip: z.string(),
	src_port: z.number().int().optional(),
	dst_ip: z.string(),
	dst_port: z.number().int().optional(),
	action: z.string(),
	payload: z.string().optional(),
});

/**
 * Standard IPS categories (Suricata/Snort-style).
 */
export const IPS_CATEGORIES = [
	{
		id: "malware",
		name: "Malware",
		description: "Malware, trojans, and malicious software",
		mode: "prevent" as const,
		rule_count: 0,
	},
	{
		id: "exploits",
		name: "Exploits",
		description: "Exploit attempts and vulnerability targeting",
		mode: "prevent" as const,
		rule_count: 0,
	},
	{
		id: "dos",
		name: "Denial of Service",
		description: "DoS and DDoS attack patterns",
		mode: "prevent" as const,
		rule_count: 0,
	},
	{
		id: "policy-violation",
		name: "Policy Violation",
		description: "Traffic violating configured policies",
		mode: "detect" as const,
		rule_count: 0,
	},
	{
		id: "suspicious",
		name: "Suspicious Activity",
		description: "Potentially suspicious or anomalous behavior",
		mode: "detect" as const,
		rule_count: 0,
	},
	{
		id: "web-attacks",
		name: "Web Attacks",
		description: "SQL injection, XSS, and other web attacks",
		mode: "prevent" as const,
		rule_count: 0,
	},
	{
		id: "reconnaissance",
		name: "Reconnaissance",
		description: "Port scans, network enumeration, and probing",
		mode: "detect" as const,
		rule_count: 0,
	},
	{
		id: "botnet",
		name: "Botnet",
		description: "Known botnet C&C communication",
		mode: "prevent" as const,
		rule_count: 0,
	},
] as const;
