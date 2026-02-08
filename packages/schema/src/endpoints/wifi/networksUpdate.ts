import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { wifiNetwork, wifiSecurityMode } from "./base";

const updateFields = z.object({
	networks: z.array(
		z.object({
			id: z.number().int(),
			radio_id: z.number().int().optional(),
			ssid: z.string().min(1).max(32).optional(),
			enabled: z.boolean().optional(),
			hidden: z.boolean().optional(),
			security_mode: wifiSecurityMode.optional(),
			password: z.string().nullable().optional(),
			vlan_id: z.number().int().min(1).max(4094).nullable().optional(),
			guest_network: z.boolean().optional(),
			max_clients: z.number().int().min(1).max(250).optional(),
		}),
	),
});

export class WifiNetworksUpdate extends OpenAPIRoute {
	schema = {
		tags: ["WiFi"],
		summary: "Update WiFi network configuration",
		operationId: "wifi-networks-update",
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
				description: "WiFi networks updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(wifiNetwork),
					}),
				),
			},
			"400": {
				description: "Invalid request",
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
		const data = await this.getValidatedData<typeof this.schema>();
		const _userId = c.get("userId");
		const updates = data.body;

		if (!updates.networks || updates.networks.length === 0) {
			return c.json({ success: false, error: "No networks to update" }, 400);
		}

		// Mock response - in production, this would update via RPC
		const mockNetworks = updates.networks.map((network) => ({
			id: network.id,
			radio_id: network.radio_id ?? 1,
			ssid: network.ssid ?? "MyNetwork",
			enabled: network.enabled ?? true,
			hidden: network.hidden ?? false,
			security_mode: network.security_mode ?? ("wpa2_wpa3" as const),
			password: network.password ?? null,
			vlan_id: network.vlan_id ?? null,
			guest_network: network.guest_network ?? false,
			max_clients: network.max_clients ?? 50,
			created_at: Date.now() - 86400000,
			updated_at: Date.now(),
		}));

		return {
			success: true,
			result: mockNetworks,
		};
	}
}
