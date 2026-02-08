import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { billingRouter } from "./endpoints/billing/router";
import { fleetRouter } from "./endpoints/fleet/router";
import { routingRouter } from "./endpoints/routing/router";
import { natRouter } from "./endpoints/nat/router";
import { ipsRouter } from "./endpoints/ips/router";
import { vpnServerRouter } from "./endpoints/vpn-server/router";
import { vpnClientRouter } from "./endpoints/vpn-client/router";
import { qosRouter } from "./endpoints/qos/router";
import { ddnsRouter } from "./endpoints/ddns/router";
import { reportsRouter } from "./endpoints/reports/router";
import { logsRouter } from "./endpoints/logs/router";
import { onboardingRouter } from "./endpoints/onboarding/router";
import { dashboardsRouter } from "./endpoints/dashboards/router";
import { wanRouter } from "./endpoints/wan/router";
import { lanRouter } from "./endpoints/lan/router";
import { wifiRouter } from "./endpoints/wifi/router";
import { dhcpRouter } from "./endpoints/dhcp/router";
// import { tasksRouter } from "./endpoints/tasks/router"; // DISABLED: Template example causing OpenAPI generation errors
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API access
app.use("*", cors({
	origin: ["https://app.ngfw.sh", "https://ngfw.sh", "https://docs.ngfw.sh", "http://localhost:4321", "http://localhost:5173"],
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
			{ name: "Routing", description: "Static routes and policy-based routing" },
			{ name: "Firewall", description: "Firewall rules, zones, and policies" },
			{ name: "NAT", description: "NAT rules and UPnP management" },
			{ name: "Traffic", description: "Traffic logs and statistics" },
			{ name: "DNS", description: "DNS filtering and blocklists" },
			{ name: "IPS", description: "Intrusion prevention system configuration and alerts" },
			{ name: "VPN Server", description: "WireGuard VPN server configuration" },
			{ name: "VPN Client", description: "VPN client profiles and connections" },
			{ name: "QoS", description: "Quality of Service and traffic shaping" },
			{ name: "DDNS", description: "Dynamic DNS configuration" },
			{ name: "Firmware", description: "Firmware updates and boot slots" },
			{ name: "Backup", description: "Configuration backup and restore" },
			{ name: "Fleet", description: "Multi-device fleet management" },
			{ name: "User", description: "User profile and authentication" },
			{ name: "Billing", description: "Subscription plans and payments" },
			{ name: "Reports", description: "Report generation and management" },
			{ name: "Logs", description: "System and security log queries" },
			{ name: "Onboarding", description: "Router selection and initial setup" },
		],
	},
});

// Register Billing Sub router
openapi.route("/billing", billingRouter);

// Register Fleet Sub router (protected by Clerk JWT auth)
openapi.route("/fleet", fleetRouter);

// Register WAN Sub router (protected by Clerk JWT auth)
openapi.route("/wan", wanRouter);

// Register LAN Sub router (protected by Clerk JWT auth)
openapi.route("/lan", lanRouter);

// Register WiFi Sub router (protected by Clerk JWT auth)
openapi.route("/wifi", wifiRouter);

// Register DHCP Sub router (protected by Clerk JWT auth)
openapi.route("/dhcp", dhcpRouter);

// Register Routing Sub router (protected by Clerk JWT auth)
openapi.route("/routing", routingRouter);

// Register NAT Sub router (protected by Clerk JWT auth)
openapi.route("/nat", natRouter);

// Register IPS Sub router (protected by Clerk JWT auth)
openapi.route("/ips", ipsRouter);

// Register VPN Server Sub router (protected by Clerk JWT auth)
openapi.route("/vpn/server", vpnServerRouter);

// Register VPN Client Sub router (protected by Clerk JWT auth)
openapi.route("/vpn/client", vpnClientRouter);

// Register QoS Sub router (protected by Clerk JWT auth)
openapi.route("/qos", qosRouter);

// Register DDNS Sub router (protected by Clerk JWT auth)
openapi.route("/ddns", ddnsRouter);

// Register Reports Sub router (protected by Clerk JWT auth)
openapi.route("/reports", reportsRouter);

// Register Logs Sub router (protected by Clerk JWT auth)
openapi.route("/logs", logsRouter);

// Register Onboarding Sub router (protected by Clerk JWT auth)
openapi.route("/onboarding", onboardingRouter);

// Register Dashboards Sub router (protected by Clerk JWT auth)
openapi.route("/dashboards", dashboardsRouter);

// Export the Hono app
export default app;
