import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { tasksRouter } from "./endpoints/tasks/router";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API access
app.use("*", cors({
	origin: ["https://ngfw.sh", "https://docs.ngfw.sh", "http://localhost:4321", "http://localhost:5173"],
	allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
}));

app.onError((err, c) => {
	if (err instanceof ApiException) {
		// If it's a Chanfana ApiException, let Chanfana handle the response
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err);

	// For other errors, return a generic 500 response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
	redoc_url: "/redoc",
	openapi_url: "/openapi.json",
	schema: {
		info: {
			title: "NGFW.sh API",
			version: "1.0.0",
			description: "Next-generation firewall management API for router configuration, monitoring, and fleet management.",
			contact: {
				name: "NGFW.sh Support",
				url: "https://ngfw.sh",
			},
			license: {
				name: "MIT",
				url: "https://opensource.org/licenses/MIT",
			},
		},
		servers: [
			{ url: "https://api.ngfw.sh", description: "Production API" },
			{ url: "http://localhost:8787", description: "Local development" },
		],
		security: [{ bearerAuth: [] }],
		tags: [
			{ name: "System", description: "System health, hardware info, and power management" },
			{ name: "WAN", description: "WAN connection configuration and status" },
			{ name: "LAN", description: "LAN and VLAN configuration" },
			{ name: "WiFi", description: "Wireless network and radio configuration" },
			{ name: "DHCP", description: "DHCP server, leases, and reservations" },
			{ name: "Firewall", description: "Firewall rules, zones, and policies" },
			{ name: "NAT", description: "NAT rules and UPnP management" },
			{ name: "Traffic", description: "Traffic logs and statistics" },
			{ name: "DNS", description: "DNS filtering and blocklists" },
			{ name: "IDS", description: "Intrusion detection and prevention" },
			{ name: "VPN Server", description: "WireGuard VPN server configuration" },
			{ name: "VPN Client", description: "VPN client profiles and connections" },
			{ name: "QoS", description: "Quality of Service and traffic shaping" },
			{ name: "DDNS", description: "Dynamic DNS configuration" },
			{ name: "Firmware", description: "Firmware updates and boot slots" },
			{ name: "Backup", description: "Configuration backup and restore" },
			{ name: "Fleet", description: "Multi-device fleet management" },
			{ name: "User", description: "User profile and authentication" },
			{ name: "Billing", description: "Subscription plans and payments" },
		],
	},
});

// Register Tasks Sub router (example endpoints from template)
openapi.route("/tasks", tasksRouter);

// Export the Hono app
export default app;
