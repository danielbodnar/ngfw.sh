import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { device } from "./base";

const registerBody = z.object({
	name: z.string().min(1).max(255),
	model: z.string().max(255).optional(),
});

export class DeviceRegister extends OpenAPIRoute {
	schema = {
		tags: ["Fleet"],
		summary: "Register a new device",
		operationId: "fleet-device-register",
		security: [{ bearerAuth: [] }],
		request: {
			body: contentJson(registerBody),
		},
		responses: {
			"201": {
				description:
					"Device registered successfully. The api_key is shown only once.",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: device,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;
		const db = c.env.DB;
		const devicesKv = c.env.DEVICES;

		const id = crypto.randomUUID();
		const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		const apiKey = `ngfw_${randomHex}`;
		const now = Math.floor(Date.now() / 1000);

		const deviceRecord = {
			id,
			name: body.name,
			model: body.model ?? null,
			serial: null,
			owner_id: userId,
			firmware_version: null,
			status: "provisioning",
			created_at: now,
			last_seen: null,
		};

		await db
			.prepare(
				"INSERT INTO devices (id, name, model, owner_id, api_key, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				id,
				body.name,
				body.model ?? null,
				userId,
				apiKey,
				"provisioning",
				now,
			)
			.run();

		await Promise.all([
			devicesKv.put(`device:${id}`, JSON.stringify(deviceRecord)),
			devicesKv.put(`apikey:${apiKey}`, id),
			devicesKv.put(`owner:${userId}:${id}`, "1"),
		]);

		return new Response(
			JSON.stringify({
				success: true,
				result: {
					...deviceRecord,
					api_key: apiKey,
					websocket_url: "wss://api.ngfw.sh/agent/ws",
				},
			}),
			{ status: 201, headers: { "Content-Type": "application/json" } },
		);
	}
}
