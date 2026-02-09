import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { report, reportFormat, reportType } from "./base";

const generateBody = z.object({
	device_id: z.string(),
	type: reportType,
	format: reportFormat,
	title: z.string().min(1).max(255),
	date_start: z.string().datetime(),
	date_end: z.string().datetime(),
});

export class ReportGenerate extends OpenAPIRoute {
	schema = {
		tags: ["Reports"],
		summary: "Generate a new report",
		operationId: "report-generate",
		security: [{ bearerAuth: [] }],
		request: {
			body: contentJson(generateBody),
		},
		responses: {
			"201": {
				description: "Report generation started",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: report,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		const deviceCheck = await c.env.DB.prepare(
			"SELECT id FROM devices WHERE id = ? AND owner_id = ?",
		)
			.bind(body.device_id, userId)
			.first();

		if (!deviceCheck) {
			return new Response(
				JSON.stringify({
					success: false,
					errors: [{ code: 404, message: "Device not found or access denied" }],
				}),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		const reportRecord = {
			id,
			device_id: body.device_id,
			owner_id: userId,
			type: body.type,
			format: body.format,
			status: "pending",
			title: body.title,
			date_start: body.date_start,
			date_end: body.date_end,
			r2_key: null,
			file_size: null,
			created_at: now,
			completed_at: null,
			error_message: null,
		};

		await c.env.DB.prepare(
			"INSERT INTO reports (id, device_id, owner_id, type, format, status, title, date_start, date_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
			.bind(
				id,
				body.device_id,
				userId,
				body.type,
				body.format,
				"pending",
				body.title,
				body.date_start,
				body.date_end,
				now,
			)
			.run();

		return new Response(
			JSON.stringify({ success: true, result: reportRecord }),
			{
				status: 201,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
