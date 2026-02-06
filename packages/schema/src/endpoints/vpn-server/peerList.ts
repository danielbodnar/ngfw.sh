import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { vpnServerPeer } from "./base";

export class VpnServerPeerList extends OpenAPIRoute {
	schema = {
		tags: ["VPN Server"],
		summary: "List all WireGuard VPN peers",
		operationId: "vpn-server-peer-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "List of VPN peers",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(vpnServerPeer),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");

		// Mock implementation - in production, this would fetch from D1
		const peers = [
			{
				id: "peer-1",
				name: "Phone",
				public_key: "mocked-peer-1-public-key-base64",
				preshared_key: "mocked-preshared-key-base64",
				allowed_ips: ["10.0.0.2/32"],
				persistent_keepalive: 25,
				enabled: true,
				created_at: Date.now() - 86400000,
				last_handshake: Date.now() - 300000,
				rx_bytes: 8374829123,
				tx_bytes: 5273948234,
			},
			{
				id: "peer-2",
				name: "Laptop",
				public_key: "mocked-peer-2-public-key-base64",
				allowed_ips: ["10.0.0.3/32"],
				persistent_keepalive: 25,
				enabled: true,
				created_at: Date.now() - 172800000,
				last_handshake: Date.now() - 600000,
				rx_bytes: 12847293847,
				tx_bytes: 9384729384,
			},
		];

		return {
			success: true,
			result: peers,
		};
	}
}
