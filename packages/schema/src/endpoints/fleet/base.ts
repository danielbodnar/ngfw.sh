import { z } from "zod";

/** Full device record (internal — includes api_key). */
export const deviceInternal = z.object({
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

/** Public device record — never exposes api_key. */
export const device = deviceInternal.omit({ api_key: true });

export const DeviceModel = {
	tableName: "devices",
	primaryKeys: ["id"],
	schema: deviceInternal,
	serializer: (obj: object) => obj,
	serializerObject: device,
};
