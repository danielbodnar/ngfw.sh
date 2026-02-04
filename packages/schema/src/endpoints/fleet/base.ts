import { z } from "zod";

export const device = z.object({
	id: z.string(),
	name: z.string(),
	model: z.string().nullable(),
	serial: z.string().nullable(),
	owner_id: z.string(),
	firmware_version: z.string().nullable(),
	status: z.string(),
	api_key: z.string(),
	created_at: z.number().int(),
	last_seen: z.number().int().nullable(),
});

export const DeviceModel = {
	tableName: "devices",
	primaryKeys: ["id"],
	schema: device,
	serializer: (obj: object) => obj,
	serializerObject: device,
};
