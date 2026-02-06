import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { qosConfig, qosAlgorithm } from "./base";

const updateFields = z.object({
	enabled: z.boolean().optional(),
	algorithm: qosAlgorithm.optional(),
	wan_upload_kbps: z.number().int().min(0).optional(),
	wan_download_kbps: z.number().int().min(0).optional(),
});

export class QosConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["QoS"],
		summary: "Update QoS global configuration",
		operationId: "qos-config-update",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: updateFields,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "QoS configuration updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: qosConfig,
					}),
				),
			},
			"400": {
				description: "Invalid request",
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
		const data = await this.getValidatedData<typeof this.schema>();
		const db = c.env.DB;
		const updates = data.body;

		if (Object.keys(updates).length === 0) {
			return c.json({ success: false, error: "No fields to update" }, 400);
		}

		const setClauses: string[] = [];
		const values: (string | number | boolean)[] = [];

		if (updates.enabled !== undefined) {
			setClauses.push("enabled = ?");
			values.push(updates.enabled ? 1 : 0);
		}
		if (updates.algorithm !== undefined) {
			setClauses.push("algorithm = ?");
			values.push(updates.algorithm);
		}
		if (updates.wan_upload_kbps !== undefined) {
			setClauses.push("wan_upload_kbps = ?");
			values.push(updates.wan_upload_kbps);
		}
		if (updates.wan_download_kbps !== undefined) {
			setClauses.push("wan_download_kbps = ?");
			values.push(updates.wan_download_kbps);
		}

		setClauses.push("updated_at = ?");
		values.push(Math.floor(Date.now() / 1000));

		const sql = `UPDATE qos_config SET ${setClauses.join(", ")} WHERE id = 1`;
		await db.prepare(sql).bind(...values).run();

		const row = await db
			.prepare("SELECT id, enabled, algorithm, wan_upload_kbps, wan_download_kbps, updated_at FROM qos_config WHERE id = 1")
			.first();

		if (!row) {
			return c.json({ success: false, error: "QoS configuration not found after update" }, 500);
		}

		return {
			success: true,
			result: {
				...row,
				enabled: Boolean(row.enabled),
			},
		};
	}
}
