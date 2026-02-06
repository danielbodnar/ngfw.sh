import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { staticRoute, staticRouteUpdate } from "./base";

export class RouteUpdate extends OpenAPIRoute {
	schema = {
		tags: ["Routing"],
		summary: "Update a static route",
		operationId: "routing-route-update",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: contentJson(staticRouteUpdate),
		},
		responses: {
			"200": {
				description: "Route updated successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: staticRoute,
					}),
				),
			},
			"404": {
				description: "Route not found",
				...contentJson(
					z.object({
						success: z.boolean(),
						error: z.string(),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;
		const body = data.body;

		// Mock implementation - in production, this would send RPC to device
		const updatedRoute = {
			id,
			destination: body.destination ?? "192.168.100.0/24",
			gateway: body.gateway ?? "192.168.1.1",
			interface: body.interface ?? "eth1",
			metric: body.metric ?? 100,
			description: body.description ?? "Updated route",
			enabled: body.enabled ?? true,
			created_at: Date.now() - 86400000,
			updated_at: Date.now(),
		};

		return {
			success: true,
			result: updatedRoute,
		};
	}
}
