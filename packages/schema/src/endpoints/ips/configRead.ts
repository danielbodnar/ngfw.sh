import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsConfig } from "./base";

export class IpsConfigRead extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "Get IPS global configuration",
		operationId: "ips-config-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "IPS configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: ipsConfig,
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userId = c.get("userId");
		const configsKv = c.env.CONFIGS;

		const configRaw = await configsKv.get(`ips_config:${userId}`);

		const config = configRaw
			? JSON.parse(configRaw)
			: {
					enabled: false,
					mode: "detect",
					home_networks: ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],
					external_networks: ["!192.168.0.0/16", "!10.0.0.0/8", "!172.16.0.0/12"],
					excluded_networks: [],
					max_pending_packets: 1024,
					update_interval: 86400,
					last_update: null,
				};

		return {
			success: true,
			result: config,
		};
	}
}
