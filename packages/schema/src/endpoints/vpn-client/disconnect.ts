import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class Disconnect extends OpenAPIRoute {
	schema = {
		tags: ["VPN Client"],
		summary: "Disconnect from a VPN client profile",
		operationId: "vpn-client-disconnect",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string() /* TODO: UUID validation */,
			}),
		},
		responses: {
			"200": {
				description: "Disconnection initiated successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.object({
							id: z.string() /* TODO: UUID validation */,
							status: z.enum(["disconnected"]),
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
				description: "Profile already disconnected",
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
				"SELECT id, name, type, status, owner_id FROM vpn_client_profiles WHERE id = ?  AND owner_id = ?",
			)
			.bind(id, userId)
			.first();

		if (!profile) {
			return c.json({ success: false, error: "VPN profile not found" }, 404);
		}

		if (profile.status === "disconnected") {
			return c.json(
				{ success: false, error: "Profile is already disconnected" },
				409,
			);
		}

		await db
			.prepare("UPDATE vpn_client_profiles SET status = ? WHERE id = ?")
			.bind("disconnected", id)
			.run();

		return {
			success: true,
			result: {
				id: profile.id as string,
				status: "disconnected" as const,
				message: `Disconnected from ${profile.name}`,
			},
		};
	}
}
