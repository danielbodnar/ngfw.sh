import { z } from "zod";

/**
 * Static routing rule
 */
export const staticRoute = z.object({
	id: z.string(),
	destination: z.string().describe("Destination network in CIDR notation (e.g., 10.0.0.0/24)"),
	gateway: z.string().describe("Gateway IP address"), // TODO: Add IP validation with z.string().regex() in Zod 4
	interface: z.string().describe("Network interface (e.g., eth0, wlan0)"),
	metric: z.number().int().min(0).max(1000).default(100).describe("Route priority (lower is higher priority)"),
	description: z.string().optional().describe("Optional description of the route"),
	enabled: z.boolean().default(true),
	created_at: z.number().int(),
	updated_at: z.number().int(),
});

/**
 * Policy-based routing rule
 */
export const policyRoute = z.object({
	id: z.string(),
	name: z.string().describe("Rule name"),
	source: z.string().describe("Source IP or network in CIDR notation"),
	destination: z.string().optional().describe("Destination IP or network"),
	protocol: z.enum(["tcp", "udp", "icmp", "all"]).default("all"),
	port: z.string().optional().describe("Port or port range (e.g., 80, 443, 1000-2000)"),
	gateway: z.string().describe("Gateway to route through"), // TODO: Add IP validation with z.string().regex() in Zod 4
	table: z.string().optional().describe("Routing table ID"),
	priority: z.number().int().min(0).max(1000).default(100),
	enabled: z.boolean().default(true),
	created_at: z.number().int(),
});

/**
 * Routing table entry (kernel route)
 */
export const routeEntry = z.object({
	destination: z.string(),
	gateway: z.string(),
	genmask: z.string(),
	flags: z.string(),
	metric: z.number().int(),
	interface: z.string(),
	type: z.enum(["static", "connected", "kernel", "default"]),
});

/**
 * Request schema for creating a static route
 */
export const staticRouteCreate = staticRoute.omit({ id: true, created_at: true, updated_at: true });

/**
 * Request schema for updating a static route
 */
export const staticRouteUpdate = staticRoute.omit({ id: true, created_at: true, updated_at: true }).partial();

/**
 * Request schema for creating a policy route
 */
export const policyRouteCreate = policyRoute.omit({ id: true, created_at: true });

export const RoutingModel = {
	tableName: "static_routes",
	primaryKeys: ["id"],
	schema: staticRoute,
};
