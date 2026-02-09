import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class ReportDelete extends OpenAPIRoute {
	schema = {
		tags: ["Reports"],
		summary: "Delete a report",
		operationId: "report-delete",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Report deleted successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						message: z.string(),
					}),
				),
			},
			"404": {
				description: "Report not found",
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;

		const reportRecord = await c.env.DB.prepare(
			"SELECT * FROM reports WHERE id = ? AND owner_id = ?",
		)
			.bind(id, userId)
			.first();

		if (!reportRecord) {
			return new Response(
				JSON.stringify({
					success: false,
					errors: [{ code: 404, message: "Report not found" }],
				}),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		if (reportRecord.r2_key) {
			await c.env.REPORTS.delete(reportRecord.r2_key);
		}

		await c.env.DB.prepare("DELETE FROM reports WHERE id = ? AND owner_id = ?")
			.bind(id, userId)
			.run();

		return {
			success: true,
			message: "Report deleted successfully",
		};
	}
}
