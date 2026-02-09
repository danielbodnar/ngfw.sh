import { z } from "zod";

/**
 * Router hardware specification schema
 */
export const RouterSpecSchema = z.object({
	cpu: z.string().describe("CPU model and speed"),
	ram: z.string().describe("RAM capacity"),
	storage: z.string().describe("Storage capacity"),
	wanPorts: z.string().describe("WAN port specifications"),
	lanPorts: z.string().describe("LAN port specifications"),
	wifi: z.string().describe("WiFi capabilities"),
	maxDevices: z.number().describe("Maximum recommended devices"),
});

/**
 * Router option schema for display in selector
 */
export const RouterOptionSchema = z.object({
	id: z.string().describe("Unique router identifier"),
	name: z.string().describe("Router model name"),
	manufacturer: z.string().describe("Manufacturer name"),
	firmware: z.string().describe("Compatible firmware (OpenWrt, Merlin, etc)"),
	price: z.number().describe("Price in USD"),
	specs: RouterSpecSchema.describe("Hardware specifications"),
	features: z.array(z.string()).describe("Key features list"),
	image: z.string().url().describe("Product image URL"),
	recommended: z
		.boolean()
		.optional()
		.describe("Whether this is a recommended option"),
	inStock: z.boolean().describe("Stock availability"),
});

/**
 * WAN connection type options
 */
export const WANTypeEnum = z
	.enum(["dhcp", "static", "pppoe", "lte"])
	.describe("WAN connection type");

/**
 * Security preset options
 */
export const SecurityPresetEnum = z
	.enum(["standard", "strict", "custom"])
	.describe("Security preset level");

/**
 * Onboarding configuration schema
 */
export const OnboardingConfigSchema = z.object({
	// Device identification
	deviceName: z.string().min(3).max(50).describe("Device friendly name"),

	// Shipping information
	shippingAddress: z
		.object({
			fullName: z.string().min(2).describe("Full name"),
			addressLine1: z.string().min(5).describe("Street address"),
			addressLine2: z.string().optional().describe("Apartment, suite, etc"),
			city: z.string().min(2).describe("City"),
			state: z.string().min(2).max(2).describe("State (2-letter code)"),
			zipCode: z.string().min(5).max(10).describe("ZIP or postal code"),
			country: z.string().default("US").describe("Country code"),
			phoneNumber: z.string().min(10).describe("Contact phone number"),
		})
		.describe("Shipping address"),

	// WiFi configuration
	wifiConfig: z
		.object({
			ssid: z.string().min(1).max(32).describe("WiFi network name (SSID)"),
			password: z.string().min(8).max(63).describe("WiFi password (WPA2/WPA3)"),
			hideSsid: z.boolean().default(false).describe("Hide SSID from broadcast"),
		})
		.describe("WiFi network configuration"),

	// WAN configuration
	wanType: WANTypeEnum,
	wanConfig: z
		.object({
			// For PPPoE
			username: z.string().optional().describe("PPPoE username"),
			password: z.string().optional().describe("PPPoE password"),
			// For static IP
			ipAddress: z.string().optional().describe("Static IP address"),
			subnet: z.string().optional().describe("Subnet mask"),
			gateway: z.string().optional().describe("Gateway IP"),
			dns1: z.string().optional().describe("Primary DNS"),
			dns2: z.string().optional().describe("Secondary DNS"),
		})
		.optional()
		.describe("WAN-specific configuration"),

	// Admin access
	adminPassword: z.string().min(8).describe("Router admin password"),

	// Security settings
	securityPreset: SecurityPresetEnum,
	enableIPS: z
		.boolean()
		.default(true)
		.describe("Enable Intrusion Prevention System"),
	enableDNSFilter: z.boolean().default(true).describe("Enable DNS filtering"),
	enableAutoUpdates: z
		.boolean()
		.default(true)
		.describe("Enable automatic firmware updates"),
});

/**
 * Order submission schema
 */
export const OrderSubmissionSchema = z.object({
	routerId: z.string().describe("Selected router ID"),
	config: OnboardingConfigSchema.describe("Device configuration"),
	subscriptionPlan: z
		.enum(["free", "pro", "enterprise"])
		.default("free")
		.describe("Selected subscription plan"),
});

/**
 * Order response schema
 */
export const OrderResponseSchema = z.object({
	orderId: z.string().describe("Unique order identifier"),
	deviceId: z.string().describe("Pre-provisioned device ID"),
	estimatedDelivery: z.string().describe("Estimated delivery date (ISO 8601)"),
	trackingUrl: z.string().url().optional().describe("Shipping tracking URL"),
	setupInstructions: z.string().url().describe("Setup instructions URL"),
	status: z
		.enum(["pending", "processing", "shipped", "delivered"])
		.describe("Order status"),
	createdAt: z.string().describe("Order creation timestamp"),
});

/**
 * Onboarding status schema
 */
export const OnboardingStatusSchema = z.object({
	completed: z.boolean().describe("Whether onboarding is complete"),
	orderId: z.string().optional().describe("Order ID if exists"),
	deviceId: z.string().optional().describe("Device ID if provisioned"),
	deviceOnline: z.boolean().optional().describe("Whether device is online"),
	currentStep: z
		.enum([
			"router_selection",
			"configuration",
			"order_placed",
			"device_shipped",
			"device_delivered",
			"device_connected",
			"complete",
		])
		.optional()
		.describe("Current onboarding step"),
	lastUpdated: z.string().describe("Last status update timestamp"),
});

export type RouterSpec = z.infer<typeof RouterSpecSchema>;
export type RouterOption = z.infer<typeof RouterOptionSchema>;
export type WANType = z.infer<typeof WANTypeEnum>;
export type SecurityPreset = z.infer<typeof SecurityPresetEnum>;
export type OnboardingConfig = z.infer<typeof OnboardingConfigSchema>;
export type OrderSubmission = z.infer<typeof OrderSubmissionSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
