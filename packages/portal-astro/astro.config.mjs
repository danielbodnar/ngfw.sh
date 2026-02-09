import cloudflare from "@astrojs/cloudflare";
import vue from "@astrojs/vue";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: cloudflare({
		imageService: "cloudflare",
		platformProxy: {
			enabled: true,
		},
	}),
	integrations: [
		clerk(),
		vue({
			appEntrypoint: "/src/pages/_app",
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
	site: "https://app.ngfw.sh",
});
