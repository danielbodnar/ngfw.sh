/**
 * MSW (Mock Service Worker) handlers for API mocking.
 *
 * These handlers intercept HTTP requests and return mock responses
 * for testing without a real backend.
 */

import { HttpResponse, http } from "msw";
import {
	dashboards,
	ddnsConfigs,
	deviceRegistration,
	deviceStatus,
	devices,
	ipsAlerts,
	ipsConfig,
	ipsRules,
	logEntries,
	mockToken,
	mockUser,
	natRules,
	qosRules,
	reports,
	routes,
	vpnClientProfiles,
	vpnClientStatus,
	vpnServerConfig,
	vpnServerPeers,
} from "../fixtures";

const API_BASE = "https://api.ngfw.sh";

export const handlers = [
	// ---------------------------------------------------------------------------
	// Authentication
	// ---------------------------------------------------------------------------
	http.get("/api/user", () => {
		return HttpResponse.json(mockUser);
	}),

	http.get("/api/session-token", () => {
		return HttpResponse.json({ token: mockToken });
	}),

	http.post("/api/sign-out", () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// Fleet / Devices
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/fleet/devices`, () => {
		return HttpResponse.json(devices);
	}),

	http.post(`${API_BASE}/fleet/devices`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json(deviceRegistration, { status: 201 });
	}),

	http.get(`${API_BASE}/fleet/devices/:deviceId/status`, ({ params }) => {
		return HttpResponse.json(deviceStatus);
	}),

	http.delete(`${API_BASE}/fleet/devices/:deviceId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// Routing
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/routing/routes`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(routes);
	}),

	http.post(`${API_BASE}/routing/routes`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...routes[0], ...body }, { status: 201 });
	}),

	http.put(
		`${API_BASE}/routing/routes/:routeId`,
		async ({ params, request }) => {
			const body = await request.json();
			return HttpResponse.json({ ...routes[0], ...body });
		},
	),

	http.delete(`${API_BASE}/routing/routes/:routeId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// NAT
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/nat/rules`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(natRules);
	}),

	http.post(`${API_BASE}/nat/rules`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...natRules[0], ...body }, { status: 201 });
	}),

	http.put(`${API_BASE}/nat/rules/:ruleId`, async ({ params, request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...natRules[0], ...body });
	}),

	http.delete(`${API_BASE}/nat/rules/:ruleId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// IPS
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/ips/config`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(ipsConfig);
	}),

	http.put(`${API_BASE}/ips/config`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...ipsConfig, ...body });
	}),

	http.get(`${API_BASE}/ips/rules`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(ipsRules);
	}),

	http.get(`${API_BASE}/ips/alerts`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(ipsAlerts);
	}),

	// ---------------------------------------------------------------------------
	// VPN Server
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/vpn/server/config`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(vpnServerConfig);
	}),

	http.put(`${API_BASE}/vpn/server/config`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...vpnServerConfig, ...body });
	}),

	http.get(`${API_BASE}/vpn/server/peers`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(vpnServerPeers);
	}),

	http.post(`${API_BASE}/vpn/server/peers`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json(
			{ ...vpnServerPeers[0], ...body },
			{ status: 201 },
		);
	}),

	http.delete(`${API_BASE}/vpn/server/peers/:peerId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// VPN Client
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/vpn/client/profiles`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(vpnClientProfiles);
	}),

	http.post(`${API_BASE}/vpn/client/profiles`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json(
			{ ...vpnClientProfiles[0], ...body },
			{ status: 201 },
		);
	}),

	http.put(
		`${API_BASE}/vpn/client/profiles/:profileId`,
		async ({ params, request }) => {
			const body = await request.json();
			return HttpResponse.json({ ...vpnClientProfiles[0], ...body });
		},
	),

	http.delete(`${API_BASE}/vpn/client/profiles/:profileId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	http.get(
		`${API_BASE}/vpn/client/profiles/:profileId/status`,
		({ params }) => {
			return HttpResponse.json(vpnClientStatus);
		},
	),

	http.post(`${API_BASE}/vpn/client/profiles/:profileId/connect`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	http.post(`${API_BASE}/vpn/client/profiles/:profileId/disconnect`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// QoS
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/qos/rules`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(qosRules);
	}),

	http.post(`${API_BASE}/qos/rules`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...qosRules[0], ...body }, { status: 201 });
	}),

	http.put(`${API_BASE}/qos/rules/:ruleId`, async ({ params, request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...qosRules[0], ...body });
	}),

	http.delete(`${API_BASE}/qos/rules/:ruleId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// DDNS
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/ddns/configs`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(ddnsConfigs);
	}),

	http.post(`${API_BASE}/ddns/configs`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...ddnsConfigs[0], ...body }, { status: 201 });
	}),

	http.put(
		`${API_BASE}/ddns/configs/:configId`,
		async ({ params, request }) => {
			const body = await request.json();
			return HttpResponse.json({ ...ddnsConfigs[0], ...body });
		},
	),

	http.delete(`${API_BASE}/ddns/configs/:configId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	http.post(`${API_BASE}/ddns/configs/:configId/update`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// Reports
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/reports`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		return HttpResponse.json(reports);
	}),

	http.post(`${API_BASE}/reports`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json(
			{ ...reports[0], ...body, status: "pending" },
			{ status: 201 },
		);
	}),

	http.get(`${API_BASE}/reports/:reportId`, ({ params }) => {
		return HttpResponse.json(reports[0]);
	}),

	http.delete(`${API_BASE}/reports/:reportId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// ---------------------------------------------------------------------------
	// Logs
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/logs`, ({ request }) => {
		const url = new URL(request.url);
		const deviceId = url.searchParams.get("device_id");
		const level = url.searchParams.get("level");
		const category = url.searchParams.get("category");

		let filteredLogs = [...logEntries];

		if (level) {
			filteredLogs = filteredLogs.filter((log) => log.level === level);
		}

		if (category) {
			filteredLogs = filteredLogs.filter((log) => log.category === category);
		}

		return HttpResponse.json(filteredLogs);
	}),

	// ---------------------------------------------------------------------------
	// Dashboards
	// ---------------------------------------------------------------------------
	http.get(`${API_BASE}/dashboards`, () => {
		return HttpResponse.json(dashboards);
	}),

	http.post(`${API_BASE}/dashboards`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ ...dashboards[0], ...body }, { status: 201 });
	}),

	http.put(
		`${API_BASE}/dashboards/:dashboardId`,
		async ({ params, request }) => {
			const body = await request.json();
			return HttpResponse.json({ ...dashboards[0], ...body });
		},
	),

	http.delete(`${API_BASE}/dashboards/:dashboardId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),
];

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = {
	unauthorized: http.get(`${API_BASE}/*`, () => {
		return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
	}),

	serverError: http.get(`${API_BASE}/*`, () => {
		return HttpResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}),

	networkError: http.get(`${API_BASE}/*`, () => {
		return HttpResponse.error();
	}),

	timeout: http.get(`${API_BASE}/*`, async () => {
		await new Promise((resolve) => setTimeout(resolve, 30000));
		return HttpResponse.json({});
	}),
};
