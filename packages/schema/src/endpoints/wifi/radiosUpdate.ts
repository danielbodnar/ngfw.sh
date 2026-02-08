import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { wifiRadio, wifiBand, wifiChannelWidth } from "./base";

const updateFields = z.object({
	radios: z.array(
		z.object({
			id: z.number().int(),
			interface: z.string().optional(),
			band: wifiBand.optional(),
			enabled: z.boolean().optional(),
			channel: z.number().int().min(1).max(196).optional(),
			channel_width: wifiChannelWidth.optional(),
			tx_power: z.number().int().min(1).max(30).optional(),
			country_code: z.string().length(2).optional(),
		}),
	),
});

export class WifiRadiosUpdate extends OpenAPIRoute {
	schema = {
		tags: ["WiFi"],
		summary: "Update WiFi radio configuration",
		operationId: "wifi-radios-update",
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
				description: "WiFi radios updated",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(wifiRadio),
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

		if (!updates.radios || updates.radios.length === 0) {
			return c.json({ success: false, error: "No radios to update" }, 400);
		}

		// Mock response - in production, this would update via RPC
		const mockRadios = updates.radios.map((radio) => ({
			id: radio.id,
			interface: radio.interface ?? `radio${radio.id - 1}`,
			band: radio.band ?? ("2.4ghz" as const),
			enabled: radio.enabled ?? true,
			channel: radio.channel ?? 6,
			channel_width: radio.channel_width ?? ("20" as const),
			tx_power: radio.tx_power ?? 20,
			country_code: radio.country_code ?? "US",
			updated_at: Date.now(),
		}));

		return {
			success: true,
			result: mockRadios,
		};
	}
}
