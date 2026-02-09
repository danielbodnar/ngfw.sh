import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { report } from "./base";

export class ReportRead extends OpenAPIRoute {
	schema = {
		tags: ["Reports"],
		summary: "Get a specific report by ID",
		operationId: "report-read",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Report details",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: report.extend({
							download_url: z.string().nullable(),
						}),
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

		let downloadUrl = null;
		if (reportRecord.status === "completed" && reportRecord.r2_key) {
			downloadUrl = `https://reports.ngfw.sh/${reportRecord.r2_key}`;
		}

		return {
			success: true,
			result: {
				...reportRecord,
				download_url: downloadUrl,
			},
		};
	}
}
