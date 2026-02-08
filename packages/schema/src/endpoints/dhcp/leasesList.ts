import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";
import { dhcpLease } from "./base";

export class DhcpLeasesList extends OpenAPIRoute {
	schema = {
		tags: ["DHCP"],
		summary: "Get active DHCP leases",
		operationId: "dhcp-leases-list",
		security: [{ bearerAuth: [] }],
		responses: {
			"200": {
				description: "List of active DHCP leases",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(dhcpLease),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const _userId = c.get("userId");

		// Mock data for now - in production, this would query the device via RPC
		const mockLeases = [
			{
				mac_address: "aa:bb:cc:dd:ee:01",
				ip_address: "192.168.1.101",
				hostname: "johns-laptop",
				expires_at: Date.now() + 43200000,
				interface: "br-lan",
				vendor: "Apple, Inc.",
			},
			{
				mac_address: "aa:bb:cc:dd:ee:02",
				ip_address: "192.168.1.102",
				hostname: "android-phone",
				expires_at: Date.now() + 86400000,
				interface: "br-lan",
				vendor: "Samsung Electronics",
			},
			{
				mac_address: "aa:bb:cc:dd:ee:03",
				ip_address: "192.168.1.103",
				hostname: null,
				expires_at: Date.now() + 21600000,
				interface: "br-lan",
				vendor: "Amazon Technologies Inc.",
			},
		];

		return {
			success: true,
			result: mockLeases,
		};
	}
}
