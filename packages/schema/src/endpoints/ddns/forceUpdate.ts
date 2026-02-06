import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class DdnsForceUpdate extends OpenAPIRoute {
	schema = {
		tags: ["DDNS"],
		summary: "Force DDNS IP update for a device",
		operationId: "ddns-force-update",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				deviceId: z.string() /* TODO: UUID validation */,
			}),
		},
		responses: {
			"200": {
				description: "DDNS update triggered successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.object({
							message: z.string(),
							timestamp: z.number().int(),
						}),
					}),
				),
			},
			"404": {
				description: "Device not found or DDNS not configured",
				...contentJson(
					z.object({
						success: z.boolean(),
						error: z.string(),
					}),
				),
			},
			"400": {
				description: "DDNS is disabled for this device",
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
			.prepare("SELECT id, enabled FROM ddns_configs WHERE device_id = ?")
			.bind(deviceId)
			.first();

		if (!config) {
			return c.json({ success: false, error: "DDNS not configured for this device" }, 404);
		}

		if (!config.enabled) {
			return c.json({ success: false, error: "DDNS is disabled for this device" }, 400);
		}

		// Store update request in KV for agent to pick up
		const updateRequest = {
			deviceId,
			timestamp: Math.floor(Date.now() / 1000),
			action: "force_update",
		};

		await c.env.CONFIGS.put(
			`ddns_update:${deviceId}`,
			JSON.stringify(updateRequest),
			{
				expirationTtl: 300, // 5 minutes
			},
		);

		return {
			success: true,
			result: {
				message: "DDNS update request sent to device",
				timestamp: updateRequest.timestamp,
			},
		};
	}
}
