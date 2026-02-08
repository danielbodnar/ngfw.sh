import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { wifiRadio } from "./base";

export class WifiRadiosRead extends OpenAPIRoute {
	schema = {
		tags: ["WiFi"],
		summary: "Get WiFi radio configuration",
		operationId: "wifi-radios-read",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "WiFi radios configuration",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(wifiRadio),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");

		// Mock data for now - in production, this would query the device via RPC
		const mockRadios = [
			{
				id: 1,
				interface: "radio0",
				band: "2.4ghz" as const,
				enabled: true,
				channel: 6,
				channel_width: "20" as const,
				tx_power: 20,
				country_code: "US",
				updated_at: Date.now(),
			},
			{
				id: 2,
				interface: "radio1",
				band: "5ghz" as const,
				enabled: true,
				channel: 36,
				channel_width: "80" as const,
				tx_power: 23,
				country_code: "US",
				updated_at: Date.now(),
			},
		];

		return {
			success: true,
			result: mockRadios,
		};
	}
}
