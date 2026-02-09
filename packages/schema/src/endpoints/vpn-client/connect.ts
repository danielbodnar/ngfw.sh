import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class Connect extends OpenAPIRoute {
	schema = {
		tags: ["VPN Client"],
		summary: "Connect to a VPN client profile",
		operationId: "vpn-client-connect",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string() /* TODO: UUID validation */,
			}),
		},
		responses: {
			"200": {
				description: "Connection initiated successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.object({
							id: z.string() /* TODO: UUID validation */,
							status: z.enum(["connecting", "connected"]),
							message: z.string(),
						}),
					}),
				),
			},
			"404": {
				description: "Profile not found or not owned by user",
				...contentJson(
					z.object({
						success: z.boolean(),
						error: z.string(),
					}),
				),
			},
			"409": {
				description: "Profile already connected",
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
		const db = c.env.DB;

		const profile = await db
			.prepare(
				"SELECT id, name, type, status, owner_id FROM vpn_client_profiles WHERE id = ? AND owner_id = ?",
			)
			.bind(id, userId)
			.first();

		if (!profile) {
			return c.json({ success: false, error: "VPN profile not found" }, 404);
		}

		if (profile.status === "connected") {
			return c.json(
				{ success: false, error: "Profile is already connected" },
				409,
			);
		}

		await db
			.prepare(
				"UPDATE vpn_client_profiles SET status = ?, last_connected = ? WHERE id = ?",
			)
			.bind("connecting", Date.now(), id)
			.run();

		return {
			success: true,
			result: {
				id: profile.id as string,
				status: "connecting" as const,
				message: `Initiating connection to ${profile.name}`,
			},
		};
	}
}
