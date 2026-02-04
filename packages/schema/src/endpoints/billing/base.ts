import { z } from "zod";

export const planTier = z.enum(["starter", "pro", "business", "business_plus"]);

export const plan = z.object({
	id: planTier,
	name: z.string(),
	description: z.string(),
	price_monthly: z.number().int().describe("Monthly price in cents"),
	price_annual: z.number().int().describe("Annual price in cents"),
	sort_order: z.number().int(),
});

export const planLimit = z.object({
	plan_id: planTier,
	limit_key: z.string(),
	limit_value: z.number().int().describe("-1 means unlimited"),
});

export const planWithLimits = plan.extend({
	limits: z.record(z.string(), z.number().int()),
});

export const subscriptionStatus = z.enum([
	"active",
	"trialing",
	"past_due",
	"canceled",
	"unpaid",
]);

export const billingCycle = z.enum(["monthly", "annual"]);

export const subscription = z.object({
	id: z.number().int(),
	user_id: z.string(),
	plan_id: planTier,
	status: subscriptionStatus,
	billing_cycle: billingCycle,
	current_period_start: z.string().datetime(),
	current_period_end: z.string().datetime(),
	cancel_at: z.string().datetime().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});

export const PlanModel = {
	tableName: "plans",
	primaryKeys: ["id"],
	schema: plan,
	serializer: (obj: Record<string, string | number | boolean>) => obj,
	serializerObject: plan,
};

export const SubscriptionModel = {
	tableName: "subscriptions",
	primaryKeys: ["id"],
	schema: subscription,
	serializer: (obj: Record<string, string | number | boolean>) => obj,
	serializerObject: subscription,
};
