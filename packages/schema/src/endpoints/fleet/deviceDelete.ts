import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class DeviceDelete extends OpenAPIRoute {
	schema = {
		tags: ["Fleet"],
		summary: "Delete a device",
		operationId: "fleet-device-delete",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string() /* TODO: UUID validation */,
			}),
		},
		responses: {
			"200": {
				description: "Device deleted",
				...contentJson(
					z.object({
						success: z.boolean(),
					}),
				),
			},
			"404": {
				description: "Device not found or not owned by user",
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
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;
		const db = c.env.DB;
		const devicesKv = c.env.DEVICES;

		const row = await db
			.prepare("SELECT api_key FROM devices WHERE id = ? AND owner_id = ?")
			.bind(id, userId)
			.first<{ api_key: string }>();

		if (!row) {
			return c.json({ success: false, error: "Device not found" }, 404);
		}

		await db
			.prepare("DELETE FROM devices WHERE id = ? AND owner_id = ?")
			.bind(id, userId)
			.run();

		await Promise.all([
			devicesKv.delete(`device:${id}`),
			devicesKv.delete(`apikey:${row.api_key}`),
			devicesKv.delete(`owner:${userId}:${id}`),
		]);

		return { success: true };
	}
}
