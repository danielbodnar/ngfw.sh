import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class IpsRuleDelete extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "Delete custom IPS rule",
		operationId: "ips-rule-delete",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string().transform(Number),
			}),
		},
		responses: {
			"200": {
				description: "Rule deleted",
				...contentJson(
					z.object({
						success: z.boolean(),
					}),
				),
			},
			"404": {
				description: "Rule not found or not owned by user",
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

		const existing = await db
			.prepare("SELECT id FROM ips_rules WHERE id = ? AND owner_id = ?")
			.bind(id, userId)
			.first();

		if (!existing) {
			return c.json({ success: false, error: "Rule not found" }, 404);
		}

		await db.prepare("DELETE FROM ips_rules WHERE id = ? AND owner_id = ?").bind(id, userId).run();

		return {
			success: true,
		};
	}
}
