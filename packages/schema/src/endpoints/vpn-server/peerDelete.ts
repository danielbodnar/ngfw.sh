import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class VpnServerPeerDelete extends OpenAPIRoute {
	schema = {
		tags: ["VPN Server"],
		summary: "Delete a WireGuard VPN peer",
		operationId: "vpn-server-peer-delete",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Peer deleted successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
					}),
				),
			},
			"404": {
				description: "Peer not found",
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
		const _userId = c.get("userId");
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;

		// Mock implementation - in production, this would:
		// 1. Verify peer exists and belongs to user's device
		// 2. Send RPC to device to remove peer
		// 3. Delete from D1

		// Simulate peer not found for specific ID
		if (id === "peer-not-found") {
			return c.json({ success: false, error: "Peer not found" }, 404);
		}

		return {
			success: true,
		};
	}
}
