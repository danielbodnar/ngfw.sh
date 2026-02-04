import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { device } from "./base";

export class DeviceList extends OpenAPIRoute {
	schema = {
		tags: ["Fleet"],
		summary: "List all devices owned by the authenticated user",
		operationId: "fleet-device-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "List of devices",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(device),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const db = c.env.DB;

		const { results } = await db
			.prepare("SELECT * FROM devices WHERE owner_id = ?")
			.bind(userId)
			.all();

		return {
			success: true,
			result: results,
		};
	}
}
