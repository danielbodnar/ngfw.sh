import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { device } from "./base";

const deviceStatus = z.object({
	device: device,
	connection: z.unknown().nullable(),
	metrics: z.unknown().nullable(),
});

export class DeviceStatus extends OpenAPIRoute {
	schema = {
		tags: ["Fleet"],
		summary: "Get device status including connection and configuration state",
		operationId: "fleet-device-status",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string() /* TODO: UUID validation */,
			}),
		},
		responses: {
			"200": {
				description: "Device status",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: deviceStatus,
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
		const configsKv = c.env.CONFIGS;

		const row = await db
			.prepare("SELECT id, name, model, serial, owner_id, firmware_version, status, created_at, last_seen FROM devices WHERE id = ? AND owner_id = ?")
			.bind(id, userId)
			.first();

		if (!row) {
			return c.json({ success: false, error: "Device not found" }, 404);
		}

		const [connectionRaw, statusRaw] = await Promise.all([
			devicesKv.get(`device_status:${id}`),
			configsKv.get(`status:${id}`),
		]);

		const connection = connectionRaw ? JSON.parse(connectionRaw) : null;
		const metrics = statusRaw ? JSON.parse(statusRaw) : null;

		return {
			success: true,
			result: {
				device: row,
				connection,
				metrics,
			},
		};
	}
}
