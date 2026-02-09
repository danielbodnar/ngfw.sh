import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { dashboardMetadata } from "./base";

export class DashboardList extends OpenAPIRoute {
	schema = {
		tags: ["Dashboards"],
		summary: "List all available dashboard categories",
		operationId: "dashboard-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "List of dashboard categories",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(dashboardMetadata),
					}),
				),
			},
		},
	};

	async handle(_c: AppContext) {
		const dashboards = [
			{
				id: "network-overview",
				category: "network-overview",
				name: "Network Overview",
				description:
					"Real-time network status, connected devices, and bandwidth usage",
				icon: "network",
				default_view: true,
			},
			{
				id: "security-events",
				category: "security-events",
				name: "Security Events",
				description:
					"IPS alerts, blocked threats, and security policy violations",
				icon: "shield",
				default_view: false,
			},
			{
				id: "dns-analytics",
				category: "dns-analytics",
				name: "DNS Analytics",
				description:
					"DNS queries, top domains, blocked queries, and filtering statistics",
				icon: "dns",
				default_view: false,
			},
			{
				id: "wifi-performance",
				category: "wifi-performance",
				name: "WiFi Performance",
				description:
					"WiFi signal strength, channel utilization, and client connections",
				icon: "wifi",
				default_view: false,
			},
			{
				id: "wan-health",
				category: "wan-health",
				name: "WAN Health",
				description:
					"WAN uptime, latency, packet loss, and connection quality metrics",
				icon: "globe",
				default_view: false,
			},
			{
				id: "vpn-metrics",
				category: "vpn-metrics",
				name: "VPN Metrics",
				description:
					"VPN tunnel status, throughput, connected clients, and data transfer",
				icon: "vpn",
				default_view: false,
			},
			{
				id: "system-resources",
				category: "system-resources",
				name: "System Resources",
				description:
					"CPU usage, memory utilization, storage, and temperature monitoring",
				icon: "cpu",
				default_view: false,
			},
			{
				id: "traffic-analysis",
				category: "traffic-analysis",
				name: "Traffic Analysis",
				description:
					"Protocol breakdown, application usage, and traffic patterns",
				icon: "chart",
				default_view: false,
			},
			{
				id: "firewall-rules",
				category: "firewall-rules",
				name: "Firewall Rules",
				description:
					"Rule hit counts, blocked connections, and policy effectiveness",
				icon: "firewall",
				default_view: false,
			},
			{
				id: "qos-metrics",
				category: "qos-metrics",
				name: "QoS Metrics",
				description:
					"Traffic shaping stats, bandwidth allocation, and queue performance",
				icon: "priority",
				default_view: false,
			},
		];

		return {
			success: true,
			result: dashboards,
		};
	}
}
