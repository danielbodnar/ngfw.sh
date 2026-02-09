import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsAlert } from "./base";

export class IpsAlertList extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "List IPS alert history",
		operationId: "ips-alert-list",
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				category: z.string().optional(),
				severity: z.enum(["low", "medium", "high", "critical"]).optional(),
				src_ip: z.string().optional(),
				dst_ip: z.string().optional(),
				limit: z.string().transform(Number).optional(),
				offset: z.string().transform(Number).optional(),
			}),
		},
		responses: {
			"200": {
				description: "IPS alerts",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.object({
							alerts: z.array(ipsAlert),
							total: z.number().int(),
							limit: z.number().int(),
							offset: z.number().int(),
						}),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const {
			category,
			severity,
			src_ip,
			dst_ip,
			limit = 50,
			offset = 0,
		} = data.query;
		const db = c.env.DB;

		let query = "SELECT * FROM ips_alerts WHERE owner_id = ?";
		const params: (string | number)[] = [userId];

		if (category) {
			query += " AND category = ?";
			params.push(category);
		}

		if (severity) {
			query += " AND severity = ?";
			params.push(severity);
		}

		if (src_ip) {
			query += " AND src_ip = ?";
			params.push(src_ip);
		}

		if (dst_ip) {
			query += " AND dst_ip = ?";
			params.push(dst_ip);
		}

		const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
		const countResult = await db
			.prepare(countQuery)
			.bind(...params)
			.first();
		const total = (countResult?.count as number) || 0;

		query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
		params.push(Math.min(limit, 500), offset);

		const result = await db
			.prepare(query)
			.bind(...params)
			.all();

		return {
			success: true,
			result: {
				alerts: result.results,
				total,
				limit: Math.min(limit, 500),
				offset,
			},
		};
	}
}
