import { z } from "zod";

export const reportType = z.enum([
	"security",
	"traffic",
	"bandwidth",
	"firewall",
	"vpn",
	"dns",
	"device",
	"system",
]);

export const reportFormat = z.enum(["pdf", "csv", "json"]);

export const reportStatus = z.enum([
	"pending",
	"generating",
	"completed",
	"failed",
]);

export const report = z.object({
	id: z.string(),
	device_id: z.string(),
	owner_id: z.string(),
	type: reportType,
	format: reportFormat,
	status: reportStatus,
	title: z.string(),
	date_start: z.string().datetime(),
	date_end: z.string().datetime(),
	r2_key: z.string().nullable(),
	file_size: z.number().int().nullable(),
	created_at: z.string().datetime(),
	completed_at: z.string().datetime().nullable(),
	error_message: z.string().nullable(),
});

export const ReportModel = {
	tableName: "reports",
	primaryKeys: ["id"],
	schema: report,
	serializer: (obj: Record<string, string | number | boolean>) => obj,
	serializerObject: report,
};
