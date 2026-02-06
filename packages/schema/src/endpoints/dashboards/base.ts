import { z } from "zod";

export const dashboardCategory = z.enum([
	"network-overview",
	"security-events",
	"dns-analytics",
	"wifi-performance",
	"wan-health",
	"vpn-metrics",
	"system-resources",
	"traffic-analysis",
	"firewall-rules",
	"qos-metrics",
]);

export const widgetType = z.enum([
	"line-chart",
	"bar-chart",
	"pie-chart",
	"gauge",
	"counter",
	"table",
	"heatmap",
	"map",
]);

export const widget = z.object({
	id: z.string(),
	type: widgetType,
	title: z.string(),
	data_source: z.string(),
	refresh_interval: z.number().int(),
	config: z.record(z.string(), z.any()),
});

export const dashboard = z.object({
	id: z.string(),
	category: dashboardCategory,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	default_view: z.boolean(),
	widgets: z.array(widget),
});

export const dashboardMetadata = dashboard.omit({ widgets: true });

export const DashboardModel = {
	tableName: "dashboards",
	primaryKeys: ["id"],
	schema: dashboard,
	serializer: (obj: Record<string, string | number | boolean>) => obj,
	serializerObject: dashboard,
};
