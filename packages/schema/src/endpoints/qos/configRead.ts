import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { qosConfig } from "./base";

export class QosConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["QoS"],
		summary: "Get QoS global configuration",
		operationId: "qos-config-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "QoS configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: qosConfig,
					}),
				),
			},
			"404": {
				description: "QoS configuration not found",
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
		const db = c.env.DB;

		const row = await db
			.prepare(
				"SELECT id, enabled, algorithm, wan_upload_kbps, wan_download_kbps, updated_at FROM qos_config WHERE id = 1",
			)
			.first();

		if (!row) {
			return c.json(
				{ success: false, error: "QoS configuration not found" },
				404,
			);
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
