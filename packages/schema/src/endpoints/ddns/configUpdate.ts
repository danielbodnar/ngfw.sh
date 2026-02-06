import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ddnsConfig, ddnsProvider } from "./base";

const ddnsConfigUpdateInput = z.object({
	enabled: z.boolean().optional(),
	provider: ddnsProvider.optional(),
	hostname: z.string().optional(),
	username: z.string().nullable().optional(),
	password: z.string().nullable().optional(),
});

export class DdnsConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["DDNS"],
		summary: "Update DDNS configuration for a device",
		operationId: "ddns-config-update",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				deviceId: z.string().uuid(),
			}),
			body: {
				...contentJson(ddnsConfigUpdateInput),
			},
		},
		responses: {
			"200": {
				description: "DDNS configuration updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: ddnsConfig,
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
		const updates = data.body;
		const db = c.env.DB;

		// Verify device ownership
		const device = await db
			.prepare("SELECT id FROM devices WHERE id = ? AND owner_id = ?")
			.bind(deviceId, userId)
			.first();

		if (!device) {
			return c.json({ success: false, error: "Device not found" }, 404);
		}

		// Check if configuration exists
		const existing = await db
			.prepare("SELECT id FROM ddns_configs WHERE device_id = ?")
			.bind(deviceId)
			.first();

		const now = Math.floor(Date.now() / 1000);

		if (existing) {
			// Update existing configuration
			const updateFields: string[] = [];
			const updateValues: (string | number | boolean | null)[] = [];

			if (updates.enabled !== undefined) {
				updateFields.push("enabled = ?");
				updateValues.push(updates.enabled ? 1 : 0);
			}
			if (updates.provider !== undefined) {
				updateFields.push("provider = ?");
				updateValues.push(updates.provider);
			}
			if (updates.hostname !== undefined) {
				updateFields.push("hostname = ?");
				updateValues.push(updates.hostname);
			}
			if (updates.username !== undefined) {
				updateFields.push("username = ?");
				updateValues.push(updates.username);
			}
			if (updates.password !== undefined) {
				updateFields.push("password = ?");
				updateValues.push(updates.password);
			}

			updateFields.push("updated_at = ?");
			updateValues.push(now);
			updateValues.push(deviceId);

			await db
				.prepare(`UPDATE ddns_configs SET ${updateFields.join(", ")} WHERE device_id = ?`)
				.bind(...updateValues)
				.run();
		} else {
			// Create new configuration
			const id = crypto.randomUUID();
			await db
				.prepare(
					"INSERT INTO ddns_configs (id, device_id, enabled, provider, hostname, username, password, last_update, current_ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)",
				)
				.bind(
					id,
					deviceId,
					(updates.enabled ?? false) ? 1 : 0,
					updates.provider ?? "cloudflare",
					updates.hostname ?? "",
					updates.username ?? null,
					updates.password ?? null,
					now,
					now,
				)
				.run();
		}

		// Fetch updated configuration
		const config = await db
			.prepare(
				"SELECT id, device_id, enabled, provider, hostname, username, password, last_update, current_ip, created_at, updated_at FROM ddns_configs WHERE device_id = ?",
			)
			.bind(deviceId)
			.first();

		return {
			success: true,
			result: config,
		};
	}
}
