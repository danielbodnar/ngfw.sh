import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { OrderSubmissionSchema, OrderResponseSchema } from "./base";

/**
 * POST /onboarding/order
 * Submit a new router order with configuration
 */
export class OnboardingOrderCreate extends OpenAPIRoute {
	schema = {
		tags: ["Onboarding"],
		summary: "Create router order",
		description: "Submit a new router order with device configuration and shipping information",
		request: {
			body: {
				content: {
					"application/json": {
						schema: OrderSubmissionSchema,
					},
				},
			},
		},
		responses: {
			201: {
				description: "Order created successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							result: OrderResponseSchema,
						}),
					},
				},
			},
			400: {
				description: "Invalid order data",
			},
		},
	};

	async handle(c: any) {
		const _data = await this.getValidatedData<typeof OrderSubmissionSchema>();

		// Generate order ID
		const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

		// Generate device ID (pre-provision)
		const deviceId = `DEV-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

		// Calculate estimated delivery (7-10 business days)
		const estimatedDelivery = new Date();
		estimatedDelivery.setDate(estimatedDelivery.getDate() + 9);

		// In production, this would:
		// 1. Store order in D1 database
		// 2. Create device record in DEVICES KV
		// 3. Pre-configure device in CONFIGS KV
		// 4. Send order to fulfillment system
		// 5. Send confirmation email
		// 6. Update user's onboarding status

		const order = {
			orderId,
			deviceId,
			estimatedDelivery: estimatedDelivery.toISOString(),
			trackingUrl: undefined,
			setupInstructions: "https://docs.ngfw.sh/setup/quick-start",
			status: "pending" as const,
			createdAt: new Date().toISOString(),
		};

		return c.json({
			success: true,
			result: order,
		}, 201);
	}
}
