import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsCategory, ipsModeEnum, IPS_CATEGORIES } from "./base";

export class IpsCategoryUpdate extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "Update IPS category mode (enable/disable/detect/prevent)",
		operationId: "ips-category-update",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							mode: ipsModeEnum,
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Category updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: ipsCategory,
					}),
				),
			},
			"404": {
				description: "Category not found",
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
		const { mode } = data.body;
		const configsKv = c.env.CONFIGS;

		const category = IPS_CATEGORIES.find((cat) => cat.id === id);
		if (!category) {
			return c.json({ success: false, error: "Category not found" }, 404);
		}

		const categoriesRaw = await configsKv.get(`ips_categories:${userId}`);
		const customSettings = categoriesRaw ? JSON.parse(categoriesRaw) : {};

		customSettings[id] = {
			...customSettings[id],
			mode,
		};

		await configsKv.put(`ips_categories:${userId}`, JSON.stringify(customSettings));

		return {
			success: true,
			result: {
				...category,
				mode,
			},
		};
	}
}
