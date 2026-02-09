import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsRule } from "./base";

const createFields = ipsRule.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export class IpsRuleCreate extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "Create custom IPS rule",
		operationId: "ips-rule-create",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: createFields,
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Rule created",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: ipsRule,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const ruleData = data.body;
		const db = c.env.DB;

		const now = Math.floor(Date.now() / 1000);

		const result = await db
			.prepare(
				`INSERT INTO ips_rules (owner_id, name, description, enabled, rule, category, priority, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				userId,
				ruleData.name,
				ruleData.description || null,
				ruleData.enabled ? 1 : 0,
				ruleData.rule,
				ruleData.category || null,
				ruleData.priority || 5,
				now,
				now,
			)
			.run();

		const created = await db
			.prepare("SELECT * FROM ips_rules WHERE id = ?")
			.bind(result.meta.last_row_id)
			.first();

		return c.json(
			{
				success: true,
				result: {
					...created,
					enabled: Boolean(created?.enabled),
				},
			},
			201,
		);
	}
}
