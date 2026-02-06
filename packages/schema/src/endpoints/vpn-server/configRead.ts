import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { vpnServerConfigPublic } from "./base";

export class VpnServerConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["VPN Server"],
		summary: "Get WireGuard VPN server configuration",
		operationId: "vpn-server-config-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "VPN server configuration (private_key excluded)",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: vpnServerConfigPublic,
					}),
				),
			},
			"404": {
				description: "VPN server not configured",
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

		// Mock implementation - in production, this would fetch from D1 or KV
		const config = {
			enabled: true,
			listen_port: 51820,
			network: "10.0.0.0/24",
			public_key: "mocked-server-public-key-base64",
			dns: ["1.1.1.1", "1.0.0.1"],
			mtu: 1420,
			persistent_keepalive: 25,
		};

		return {
			success: true,
			result: config,
		};
	}
}
