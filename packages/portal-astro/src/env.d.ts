/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />
/// <reference types="@clerk/astro/env" />

interface ImportMetaEnv {
	readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
	readonly CLERK_SECRET_KEY: string;
	readonly VITE_API_BASE_URL: string;
	readonly VITE_WS_API_URL: string;
	readonly VITE_ENVIRONMENT: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
	interface Locals extends Runtime {}
}

interface Env {
	DB: D1Database;
	DEVICES: KVNamespace;
	CONFIGS: KVNamespace;
	SESSIONS: KVNamespace;
	CACHE: KVNamespace;
	FIRMWARE: R2Bucket;
	BACKUPS: R2Bucket;
	REPORTS: R2Bucket;
}
