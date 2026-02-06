import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { RouterOptionSchema } from "./base";

/**
 * GET /onboarding/routers
 * List available router options for purchase
 */
export class OnboardingRouterList extends OpenAPIRoute {
	schema = {
		tags: ["Onboarding"],
		summary: "List available routers",
		description: "Get all available router options with specs, pricing, and availability",
		responses: {
			200: {
				description: "List of available routers",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							result: z.array(RouterOptionSchema),
						}),
					},
				},
			},
		},
	};

	async handle(c: any) {
		// Mock router data based on MANIFEST.md
		const routers = [
			{
				id: "asus-rt-ax92u",
				name: "RT-AX92U",
				manufacturer: "ASUS",
				firmware: "Merlin NG",
				price: 299,
				specs: {
					cpu: "Quad-core 1.8GHz",
					ram: "512MB",
					storage: "256MB NAND",
					wanPorts: "1x Gigabit",
					lanPorts: "4x Gigabit",
					wifi: "WiFi 6 (AX6100) Tri-band",
					maxDevices: 75,
				},
				features: [
					"WiFi 6 (802.11ax) tri-band",
					"AiMesh support for mesh networking",
					"AiProtection Pro security",
					"Advanced QoS and traffic management",
					"USB 3.0 port for network storage",
					"ASUSWRT-Merlin custom firmware",
				],
				image: "https://placehold.co/400x300/1e293b/60a5fa?text=ASUS+RT-AX92U",
				recommended: false,
				inStock: true,
			},
			{
				id: "gl-inet-flint-2",
				name: "Flint 2 (GL-MT6000)",
				manufacturer: "GL.iNet",
				firmware: "OpenWrt",
				price: 199,
				specs: {
					cpu: "Quad-core 2.0GHz ARM Cortex-A53",
					ram: "1GB DDR4",
					storage: "8GB eMMC + 128MB NAND",
					wanPorts: "1x 2.5Gb",
					lanPorts: "4x Gigabit",
					wifi: "WiFi 6 (AX6000) Dual-band",
					maxDevices: 100,
				},
				features: [
					"WiFi 6 dual-band with 160MHz support",
					"OpenWrt native for maximum flexibility",
					"2.5Gb WAN port for multi-gig connections",
					"Pre-configured VPN client support",
					"Open-source firmware with active community",
					"Best price-to-performance ratio",
				],
				image: "https://placehold.co/400x300/1e293b/10b981?text=GL.iNet+Flint+2",
				recommended: true,
				inStock: true,
			},
			{
				id: "linksys-wrt3200acm",
				name: "WRT3200ACM",
				manufacturer: "Linksys",
				firmware: "OpenWrt",
				price: 179,
				specs: {
					cpu: "Dual-core 1.8GHz ARM",
					ram: "512MB DDR3",
					storage: "256MB NAND",
					wanPorts: "1x Gigabit",
					lanPorts: "4x Gigabit",
					wifi: "AC3200 Tri-Stream",
					maxDevices: 60,
				},
				features: [
					"OpenWrt champion with excellent support",
					"Dual-core 1.8GHz for strong performance",
					"eSATA + USB 3.0 + USB 2.0 ports",
					"Proven reliability and stability",
					"Large community and documentation",
					"Budget-friendly OpenWrt option",
				],
				image: "https://placehold.co/400x300/1e293b/8b5cf6?text=Linksys+WRT3200ACM",
				recommended: false,
				inStock: true,
			},
			{
				id: "gl-inet-flint-3",
				name: "Flint 3",
				manufacturer: "GL.iNet",
				firmware: "OpenWrt",
				price: 299,
				specs: {
					cpu: "Quad-core 2.2GHz",
					ram: "2GB DDR4",
					storage: "8GB eMMC",
					wanPorts: "1x 2.5Gb",
					lanPorts: "4x 2.5Gb",
					wifi: "WiFi 7 (BE11000)",
					maxDevices: 150,
				},
				features: [
					"WiFi 7 (802.11be) cutting-edge",
					"5x 2.5Gb ports for multi-gig network",
					"2GB RAM for advanced workloads",
					"Built-in WireGuard and Tailscale",
					"Future-proof connectivity",
					"Premium OpenWrt experience",
				],
				image: "https://placehold.co/400x300/1e293b/f59e0b?text=GL.iNet+Flint+3",
				recommended: false,
				inStock: true,
			},
		];

		return c.json({
			success: true,
			result: routers,
		});
	}
}
