import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Clerk publishable key (public, safe to commit)
const CLERK_PUBLISHABLE_KEY =
	"pk_test_dG91Z2gtdW5pY29ybi0yNS5jbGVyay5hY2NvdW50cy5kZXYk";

export default defineConfig({
	plugins: [react(), tailwindcss(), cloudflare()],
	define: {
		"import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(
			CLERK_PUBLISHABLE_KEY,
		),
	},
	build: {
		outDir: "dist",
	},
});
