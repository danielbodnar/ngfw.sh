import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { report } from "./base";

export class ReportList extends OpenAPIRoute {
	schema = {
		tags: ["Reports"],
		summary: "List all reports for the authenticated user",
		operationId: "report-list",
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				device_id: z.string().optional(),
				type: z.string().optional(),
				status: z.string().optional(),
				limit: z.coerce.number().int().min(1).max(100).default(50),
				offset: z.coerce.number().int().min(0).default(0),
			}),
		},
		responses: {
			"200": {
				description: "List of reports",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(report),
						total: z.number().int(),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { device_id, type, status, limit, offset } = data.query;

		let query = "SELECT * FROM reports WHERE owner_id = ?";
		const params: string[] = [userId];

		if (device_id) {
			query += " AND device_id = ?";
			params.push(device_id);
		}
		if (type) {
			query += " AND type = ?";
			params.push(type);
		}
		if (status) {
			query += " AND status = ?";
			params.push(status);
		}

		query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
		params.push(String(limit), String(offset));

		const { results } = await c.env.DB.prepare(query)
			.bind(...params)
			.all();

		const countQuery =
			"SELECT COUNT(*) as total FROM reports WHERE owner_id = ?";
		const countResult = await c.env.DB.prepare(countQuery)
			.bind(userId)
			.first<{ total: number }>();

		return {
			success: true,
			result: results,
			total: countResult?.total ?? 0,
		};
	}
}
