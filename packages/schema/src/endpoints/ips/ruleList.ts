import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsRule } from "./base";

export class IpsRuleList extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "List custom IPS rules",
		operationId: "ips-rule-list",
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				category: z.string().optional(),
				enabled: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Custom IPS rules",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(ipsRule),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { category, enabled } = data.query;
		const db = c.env.DB;

		let query = "SELECT * FROM ips_rules WHERE owner_id = ?";
		const params: (string | number)[] = [userId];

		if (category) {
			query += " AND category = ?";
			params.push(category);
		}

		if (enabled !== undefined) {
			query += " AND enabled = ?";
			params.push(enabled === "true" ? 1 : 0);
		}

		query += " ORDER BY priority DESC, id DESC";

		const result = await db.prepare(query).bind(...params).all();

		const rules = result.results.map((row) => ({
			...row,
			enabled: Boolean(row.enabled),
		}));

		return {
			success: true,
			result: rules,
		};
	}
}
