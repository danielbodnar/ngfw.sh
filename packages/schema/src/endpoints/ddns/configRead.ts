import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ddnsConfig } from "./base";

export class DdnsConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["DDNS"],
		summary: "Get DDNS configuration for a device",
		operationId: "ddns-config-read",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				deviceId: z.string().uuid(),
			}),
		},
		responses: {
			"200": {
				description: "DDNS configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: ddnsConfig.nullable(),
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
		const { deviceId } = data.params;
		const db = c.env.DB;

		// Verify device ownership
		const device = await db
			.prepare("SELECT id FROM devices WHERE id = ? AND owner_id = ?")
			.bind(deviceId, userId)
			.first();

		if (!device) {
			return c.json({ success: false, error: "Device not found" }, 404);
		}

		// Get DDNS configuration
		const config = await db
			.prepare(
				"SELECT id, device_id, enabled, provider, hostname, username, password, last_update, current_ip, created_at, updated_at FROM ddns_configs WHERE device_id = ?",
			)
			.bind(deviceId)
			.first();

		return {
			success: true,
			result: config || null,
		};
	}
}
