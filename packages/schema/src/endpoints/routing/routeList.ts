import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { staticRoute, routeEntry } from "./base";

export class RouteList extends OpenAPIRoute {
	schema = {
		tags: ["Routing"],
		summary: "List all routing table entries",
		description: "Returns both static routes and kernel routing table entries",
		operationId: "routing-route-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "List of routes",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.object({
							static_routes: z.array(staticRoute),
							kernel_routes: z.array(routeEntry),
						}),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");

		// Mock data for now - in production, this would query the device via RPC
		const staticRoutes = [
			{
				id: "route-1",
				destination: "192.168.100.0/24",
				gateway: "192.168.1.1",
				interface: "eth1",
				metric: 100,
				description: "Guest network route",
				enabled: true,
				created_at: Date.now() - 86400000,
				updated_at: Date.now() - 86400000,
			},
			{
				id: "route-2",
				destination: "10.0.0.0/8",
				gateway: "192.168.1.254",
				interface: "wg0",
				metric: 200,
				description: "VPN route",
				enabled: true,
				created_at: Date.now() - 172800000,
				updated_at: Date.now() - 172800000,
			},
		];

		const kernelRoutes = [
			{
				destination: "0.0.0.0",
				gateway: "203.0.113.1",
				genmask: "0.0.0.0",
				flags: "UG",
				metric: 100,
				interface: "eth0",
				type: "default" as const,
			},
			{
				destination: "192.168.1.0",
				gateway: "0.0.0.0",
				genmask: "255.255.255.0",
				flags: "U",
				metric: 0,
				interface: "eth1",
				type: "connected" as const,
			},
		];

		return {
			success: true,
			result: {
				static_routes: staticRoutes,
				kernel_routes: kernelRoutes,
			},
		};
	}
}
