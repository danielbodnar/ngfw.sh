import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { dashboard } from "./base";

export class DashboardRead extends OpenAPIRoute {
	schema = {
		tags: ["Dashboards"],
		summary: "Get dashboard details with widgets",
		operationId: "dashboard-read",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
			query: z.object({
				device_id: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Dashboard details with widget data",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: dashboard,
					}),
				),
			},
			"404": {
				description: "Dashboard not found",
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;

		const dashboards: Record<string, z.infer<typeof dashboard>> = {
			"network-overview": {
				id: "network-overview",
				category: "network-overview",
				name: "Network Overview",
				description: "Real-time network status, connected devices, and bandwidth usage",
				icon: "network",
				default_view: true,
				widgets: [
					{
						id: "wan-status",
						type: "gauge",
						title: "WAN Status",
						data_source: "/api/network/wan/status",
						refresh_interval: 5000,
						config: { unit: "Mbps", max: 1000 },
					},
					{
						id: "connected-devices",
						type: "counter",
						title: "Connected Devices",
						data_source: "/api/network/devices",
						refresh_interval: 10000,
						config: { icon: "devices" },
					},
					{
						id: "bandwidth-chart",
						type: "line-chart",
						title: "Bandwidth Usage (24h)",
						data_source: "/api/network/bandwidth/history",
						refresh_interval: 30000,
						config: { timeRange: "24h", yAxisUnit: "Mbps" },
					},
					{
						id: "top-talkers",
						type: "table",
						title: "Top Bandwidth Consumers",
						data_source: "/api/network/top-talkers",
						refresh_interval: 15000,
						config: { columns: ["device", "ip", "bandwidth"], limit: 10 },
					},
				],
			},
			"security-events": {
				id: "security-events",
				category: "security-events",
				name: "Security Events",
				description: "IPS alerts, blocked threats, and security policy violations",
				icon: "shield",
				default_view: false,
				widgets: [
					{
						id: "threat-counter",
						type: "counter",
						title: "Threats Blocked (24h)",
						data_source: "/api/security/threats/count",
						refresh_interval: 10000,
						config: { icon: "shield", color: "red" },
					},
					{
						id: "threat-types",
						type: "pie-chart",
						title: "Threat Types",
						data_source: "/api/security/threats/by-type",
						refresh_interval: 30000,
						config: {},
					},
					{
						id: "recent-events",
						type: "table",
						title: "Recent Security Events",
						data_source: "/api/security/events/recent",
						refresh_interval: 5000,
						config: { columns: ["timestamp", "type", "source", "action"], limit: 20 },
					},
					{
						id: "attack-heatmap",
						type: "heatmap",
						title: "Attack Sources (Geo)",
						data_source: "/api/security/attacks/geo",
						refresh_interval: 60000,
						config: {},
					},
				],
			},
			"dns-analytics": {
				id: "dns-analytics",
				category: "dns-analytics",
				name: "DNS Analytics",
				description: "DNS queries, top domains, blocked queries, and filtering statistics",
				icon: "dns",
				default_view: false,
				widgets: [
					{
						id: "dns-queries",
						type: "counter",
						title: "DNS Queries (24h)",
						data_source: "/api/dns/queries/count",
						refresh_interval: 10000,
						config: { icon: "dns" },
					},
					{
						id: "blocked-queries",
						type: "counter",
						title: "Blocked Queries",
						data_source: "/api/dns/blocked/count",
						refresh_interval: 10000,
						config: { icon: "block", color: "red" },
					},
					{
						id: "top-domains",
						type: "bar-chart",
						title: "Top Queried Domains",
						data_source: "/api/dns/top-domains",
						refresh_interval: 30000,
						config: { limit: 10 },
					},
					{
						id: "query-types",
						type: "pie-chart",
						title: "Query Types",
						data_source: "/api/dns/query-types",
						refresh_interval: 30000,
						config: {},
					},
				],
			},
			"wifi-performance": {
				id: "wifi-performance",
				category: "wifi-performance",
				name: "WiFi Performance",
				description: "WiFi signal strength, channel utilization, and client connections",
				icon: "wifi",
				default_view: false,
				widgets: [
					{
						id: "wifi-clients",
						type: "counter",
						title: "Connected Clients",
						data_source: "/api/wifi/clients/count",
						refresh_interval: 5000,
						config: { icon: "wifi" },
					},
					{
						id: "channel-util",
						type: "gauge",
						title: "Channel Utilization",
						data_source: "/api/wifi/channel/utilization",
						refresh_interval: 10000,
						config: { unit: "%", max: 100 },
					},
					{
						id: "signal-strength",
						type: "bar-chart",
						title: "Signal Strength Distribution",
						data_source: "/api/wifi/signal/distribution",
						refresh_interval: 30000,
						config: {},
					},
					{
						id: "client-table",
						type: "table",
						title: "WiFi Clients",
						data_source: "/api/wifi/clients",
						refresh_interval: 10000,
						config: { columns: ["device", "mac", "signal", "bandwidth"], limit: 20 },
					},
				],
			},
			"wan-health": {
				id: "wan-health",
				category: "wan-health",
				name: "WAN Health",
				description: "WAN uptime, latency, packet loss, and connection quality metrics",
				icon: "globe",
				default_view: false,
				widgets: [
					{
						id: "wan-uptime",
						type: "gauge",
						title: "WAN Uptime",
						data_source: "/api/wan/uptime",
						refresh_interval: 30000,
						config: { unit: "%", max: 100 },
					},
					{
						id: "latency",
						type: "line-chart",
						title: "Latency (24h)",
						data_source: "/api/wan/latency/history",
						refresh_interval: 30000,
						config: { yAxisUnit: "ms" },
					},
					{
						id: "packet-loss",
						type: "line-chart",
						title: "Packet Loss",
						data_source: "/api/wan/packet-loss",
						refresh_interval: 30000,
						config: { yAxisUnit: "%" },
					},
					{
						id: "speed-test",
						type: "gauge",
						title: "Current Speed",
						data_source: "/api/wan/speed",
						refresh_interval: 60000,
						config: { unit: "Mbps", max: 1000 },
					},
				],
			},
			"vpn-metrics": {
				id: "vpn-metrics",
				category: "vpn-metrics",
				name: "VPN Metrics",
				description: "VPN tunnel status, throughput, connected clients, and data transfer",
				icon: "vpn",
				default_view: false,
				widgets: [
					{
						id: "vpn-clients",
						type: "counter",
						title: "Connected VPN Clients",
						data_source: "/api/vpn/clients/count",
						refresh_interval: 10000,
						config: { icon: "vpn" },
					},
					{
						id: "vpn-throughput",
						type: "line-chart",
						title: "VPN Throughput",
						data_source: "/api/vpn/throughput",
						refresh_interval: 10000,
						config: { yAxisUnit: "Mbps" },
					},
					{
						id: "vpn-clients-table",
						type: "table",
						title: "VPN Clients",
						data_source: "/api/vpn/clients",
						refresh_interval: 15000,
						config: { columns: ["user", "ip", "connected_at", "data_sent", "data_received"], limit: 20 },
					},
				],
			},
			"system-resources": {
				id: "system-resources",
				category: "system-resources",
				name: "System Resources",
				description: "CPU usage, memory utilization, storage, and temperature monitoring",
				icon: "cpu",
				default_view: false,
				widgets: [
					{
						id: "cpu-usage",
						type: "gauge",
						title: "CPU Usage",
						data_source: "/api/system/cpu",
						refresh_interval: 5000,
						config: { unit: "%", max: 100 },
					},
					{
						id: "memory-usage",
						type: "gauge",
						title: "Memory Usage",
						data_source: "/api/system/memory",
						refresh_interval: 5000,
						config: { unit: "%", max: 100 },
					},
					{
						id: "temperature",
						type: "gauge",
						title: "Temperature",
						data_source: "/api/system/temperature",
						refresh_interval: 10000,
						config: { unit: "°C", max: 100 },
					},
					{
						id: "storage",
						type: "gauge",
						title: "Storage Usage",
						data_source: "/api/system/storage",
						refresh_interval: 60000,
						config: { unit: "%", max: 100 },
					},
				],
			},
			"traffic-analysis": {
				id: "traffic-analysis",
				category: "traffic-analysis",
				name: "Traffic Analysis",
				description: "Protocol breakdown, application usage, and traffic patterns",
				icon: "chart",
				default_view: false,
				widgets: [
					{
						id: "protocol-breakdown",
						type: "pie-chart",
						title: "Protocol Breakdown",
						data_source: "/api/traffic/protocols",
						refresh_interval: 30000,
						config: {},
					},
					{
						id: "app-usage",
						type: "bar-chart",
						title: "Top Applications",
						data_source: "/api/traffic/applications",
						refresh_interval: 30000,
						config: { limit: 10 },
					},
					{
						id: "traffic-history",
						type: "line-chart",
						title: "Traffic History (7d)",
						data_source: "/api/traffic/history",
						refresh_interval: 60000,
						config: { timeRange: "7d", yAxisUnit: "GB" },
					},
				],
			},
			"firewall-rules": {
				id: "firewall-rules",
				category: "firewall-rules",
				name: "Firewall Rules",
				description: "Rule hit counts, blocked connections, and policy effectiveness",
				icon: "firewall",
				default_view: false,
				widgets: [
					{
						id: "blocked-connections",
						type: "counter",
						title: "Blocked Connections (24h)",
						data_source: "/api/firewall/blocked/count",
						refresh_interval: 10000,
						config: { icon: "block", color: "red" },
					},
					{
						id: "rule-hits",
						type: "table",
						title: "Top Firewall Rules",
						data_source: "/api/firewall/rules/hits",
						refresh_interval: 30000,
						config: { columns: ["rule", "hits", "action"], limit: 20 },
					},
					{
						id: "block-reasons",
						type: "pie-chart",
						title: "Block Reasons",
						data_source: "/api/firewall/block-reasons",
						refresh_interval: 30000,
						config: {},
					},
				],
			},
			"qos-metrics": {
				id: "qos-metrics",
				category: "qos-metrics",
				name: "QoS Metrics",
				description: "Traffic shaping stats, bandwidth allocation, and queue performance",
				icon: "priority",
				default_view: false,
				widgets: [
					{
						id: "bandwidth-allocation",
						type: "pie-chart",
						title: "Bandwidth Allocation",
						data_source: "/api/qos/bandwidth",
						refresh_interval: 10000,
						config: {},
					},
					{
						id: "queue-stats",
						type: "bar-chart",
						title: "Queue Statistics",
						data_source: "/api/qos/queues",
						refresh_interval: 10000,
						config: {},
					},
					{
						id: "priority-traffic",
						type: "line-chart",
						title: "Priority Traffic",
						data_source: "/api/qos/priority",
						refresh_interval: 15000,
						config: { yAxisUnit: "Mbps" },
					},
				],
			},
		};

		const dashboardData = dashboards[id];

		if (!dashboardData) {
			return new Response(
				JSON.stringify({
					success: false,
					errors: [{ code: 404, message: "Dashboard not found" }],
				}),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		return {
			success: true,
			result: dashboardData,
		};
	}
}
