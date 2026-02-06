import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { OnboardingStatusSchema } from "./base";

/**
 * GET /onboarding/status
 * Get current user's onboarding status
 */
export class OnboardingStatusRead extends OpenAPIRoute {
	schema = {
		tags: ["Onboarding"],
		summary: "Get onboarding status",
		description: "Retrieve current user's onboarding status and progress",
		responses: {
			200: {
				description: "Onboarding status",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							result: OnboardingStatusSchema,
						}),
					},
				},
			},
		},
	};

	async handle(c: any) {
		// In production, this would:
		// 1. Get user ID from JWT token
		// 2. Query D1 for user's onboarding status
		// 3. Check if they have any orders
		// 4. Check if device is online

		// For now, return mock status (not completed)
		const status = {
			completed: false,
			currentStep: "router_selection" as const,
			lastUpdated: new Date().toISOString(),
		};

		return c.json({
			success: true,
			result: status,
		});
	}
}
