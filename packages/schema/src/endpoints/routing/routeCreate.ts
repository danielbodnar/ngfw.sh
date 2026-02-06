import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { staticRoute, staticRouteCreate } from "./base";

export class RouteCreate extends OpenAPIRoute {
	schema = {
		tags: ["Routing"],
		summary: "Create a static route",
		operationId: "routing-route-create",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				...contentJson(staticRouteCreate),
			},
		},
		responses: {
			"201": {
				description: "Route created successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: staticRoute,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");
		const body = await this.getValidatedData<typeof this.schema>();

		// Mock implementation - in production, this would send RPC to device
		const newRoute = {
			id: `route-${Math.random().toString(36).substring(7)}`,
			...body.body,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		return c.json(
			{
				success: true,
				result: newRoute,
			},
			201,
		);
	}
}
