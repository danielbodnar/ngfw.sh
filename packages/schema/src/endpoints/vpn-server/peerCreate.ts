import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { vpnServerPeer, vpnServerPeerCreate } from "./base";

export class VpnServerPeerCreate extends OpenAPIRoute {
	schema = {
		tags: ["VPN Server"],
		summary: "Create a new WireGuard VPN peer",
		operationId: "vpn-server-peer-create",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				...contentJson(vpnServerPeerCreate),
			},
		},
		responses: {
			"201": {
				description: "Peer created successfully",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: vpnServerPeer,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");
		const body = await this.getValidatedData<typeof this.schema>();

		// Mock implementation - in production, this would:
		// 1. Validate the peer configuration
		// 2. Check for IP conflicts
		// 3. Send RPC to device to add peer
		// 4. Store in D1
		const newPeer = {
			id: `peer-${Math.random().toString(36).substring(7)}`,
			...body.body,
			created_at: Date.now(),
			last_handshake: null,
			rx_bytes: 0,
			tx_bytes: 0,
		};

		return c.json(
			{
				success: true,
				result: newPeer,
			},
			201,
		);
	}
}
