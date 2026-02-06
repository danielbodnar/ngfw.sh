import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class RouteDelete extends OpenAPIRoute {
	schema = {
		tags: ["Routing"],
		summary: "Delete a static route",
		operationId: "routing-route-delete",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Route deleted successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
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
		const { id: _id } = data.params;

		// Mock implementation - in production, this would send RPC to device
		return {
			success: true,
		};
	}
}
