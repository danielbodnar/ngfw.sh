import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { ipsConfig } from "./base";

const updateFields = ipsConfig.omit({ last_update: true }).partial();

export class IpsConfigUpdate extends OpenAPIRoute {
	schema = {
		tags: ["IPS"],
		summary: "Update IPS global configuration",
		operationId: "ips-config-update",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: updateFields,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Configuration updated",
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
		const data = await this.getValidatedData<typeof this.schema>();
		const updates = data.body;
		const configsKv = c.env.CONFIGS;

		const configRaw = await configsKv.get(`ips_config:${userId}`);
		const current = configRaw
			? JSON.parse(configRaw)
			: {
					enabled: false,
					mode: "detect",
					home_networks: ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],
					external_networks: [
						"!192.168.0.0/16",
						"!10.0.0.0/8",
						"!172.16.0.0/12",
					],
					excluded_networks: [],
					max_pending_packets: 1024,
					update_interval: 86400,
					last_update: null,
				};

		const updated = {
			...current,
			...updates,
			last_update: Math.floor(Date.now() / 1000),
		};

		await configsKv.put(`ips_config:${userId}`, JSON.stringify(updated));

		return {
			success: true,
			result: updated,
		};
	}
}
