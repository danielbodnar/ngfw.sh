import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { wifiNetwork } from "./base";

export class WifiNetworksRead extends OpenAPIRoute {
	schema = {
		tags: ["WiFi"],
		summary: "Get WiFi network configuration",
		operationId: "wifi-networks-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "WiFi networks configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(wifiNetwork),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");

		// Mock data for now - in production, this would query the device via RPC
		const mockNetworks = [
			{
				id: 1,
				radio_id: 1,
				ssid: "MyNetwork",
				enabled: true,
				hidden: false,
				security_mode: "wpa2_wpa3" as const,
				password: "securepassword123",
				vlan_id: null,
				guest_network: false,
				max_clients: 50,
				created_at: Date.now() - 86400000,
				updated_at: Date.now(),
			},
			{
				id: 2,
				radio_id: 2,
				ssid: "MyNetwork-5G",
				enabled: true,
				hidden: false,
				security_mode: "wpa3" as const,
				password: "securepassword123",
				vlan_id: null,
				guest_network: false,
				max_clients: 50,
				created_at: Date.now() - 86400000,
				updated_at: Date.now(),
			},
			{
				id: 3,
				radio_id: 1,
				ssid: "Guest",
				enabled: true,
				hidden: false,
				security_mode: "open" as const,
				password: null,
				vlan_id: 100,
				guest_network: true,
				max_clients: 25,
				created_at: Date.now() - 172800000,
				updated_at: Date.now(),
			},
		];

		return {
			success: true,
			result: mockNetworks,
		};
	}
}
