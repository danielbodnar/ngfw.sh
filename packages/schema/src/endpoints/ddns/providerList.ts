import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { DDNS_PROVIDERS, ddnsProviderInfo } from "./base";

export class DdnsProviderList extends OpenAPIRoute {
	schema = {
		tags: ["DDNS"],
		summary: "List supported DDNS providers",
		operationId: "ddns-provider-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "List of supported DDNS providers",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(ddnsProviderInfo),
					}),
				),
			},
		},
	};

	async handle(_c: AppContext) {
		return {
			success: true,
			result: DDNS_PROVIDERS,
		};
	}
}
