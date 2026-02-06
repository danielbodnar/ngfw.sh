import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { vpnServerConfigPublic, vpnServerConfigUpdate } from "./base";

export class VpnServerConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["VPN Server"],
		summary: "Update WireGuard VPN server configuration",
		operationId: "vpn-server-config-update",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				...contentJson(vpnServerConfigUpdate),
			},
		},
		responses: {
			"200": {
				description: "VPN server configuration updated (private_key excluded)",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: vpnServerConfigPublic,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");
		const body = await this.getValidatedData<typeof this.schema>();

		// Mock implementation - in production, this would:
		// 1. Validate the configuration
		// 2. Send RPC to device to apply config
		// 3. Store in D1/KV
		const updatedConfig = {
			enabled: body.body.enabled ?? true,
			listen_port: body.body.listen_port ?? 51820,
			network: body.body.network ?? "10.0.0.0/24",
			public_key: body.body.public_key ?? "mocked-server-public-key-base64",
			dns: body.body.dns ?? ["1.1.1.1", "1.0.0.1"],
			mtu: body.body.mtu ?? 1420,
			persistent_keepalive: body.body.persistent_keepalive ?? 25,
		};

		return {
			success: true,
			result: updatedConfig,
		};
	}
}
