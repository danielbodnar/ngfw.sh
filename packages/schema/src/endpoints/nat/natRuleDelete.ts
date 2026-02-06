import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class NatRuleDelete extends OpenAPIRoute {
	schema = {
		tags: ["NAT"],
		summary: "Delete a NAT rule",
		operationId: "nat-rule-delete",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string() /* TODO: UUID validation */,
			}),
		},
		responses: {
			"200": {
				description: "NAT rule deleted",
				...contentJson(
					z.object({
						success: z.boolean(),
					}),
				),
			},
			"404": {
				description: "NAT rule not found or not owned by user",
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
		const _userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { id: _id } = data.params;

		// TODO: Verify ownership and delete from D1 database
		// const db = c.env.DB;
		// const row = await db
		//   .prepare("SELECT id FROM nat_rules WHERE id = ? AND owner_id = ?")
		//   .bind(id, userId)
		//   .first();
		//
		// if (!row) {
		//   return c.json({ success: false, error: "NAT rule not found" }, 404);
		// }
		//
		// await db
		//   .prepare("DELETE FROM nat_rules WHERE id = ? AND owner_id = ?")
		//   .bind(id, userId)
		//   .run();

		return { success: true };
	}
}
