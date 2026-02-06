import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsCategory, IPS_CATEGORIES } from "./base";

export class IpsCategoryList extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "List IPS rule categories with current mode settings",
		operationId: "ips-category-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "IPS categories",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(ipsCategory),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const configsKv = c.env.CONFIGS;

		const categoriesRaw = await configsKv.get(`ips_categories:${userId}`);
		const customSettings = categoriesRaw ? JSON.parse(categoriesRaw) : {};

		const categories = IPS_CATEGORIES.map((cat) => ({
			...cat,
			mode: customSettings[cat.id]?.mode || cat.mode,
			rule_count: customSettings[cat.id]?.rule_count || cat.rule_count,
		}));

		return {
			success: true,
			result: categories,
		};
	}
}
