import { verifyToken } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import type { AppBindings, AppVariables } from "../types";

/** Cache TTL for validated JWT results (5 minutes) */
const JWT_CACHE_TTL = 300;

/**
 * Derives a cache key from a JWT by hashing it with SHA-256.
 * Returns a hex-encoded hash prefixed with "jwt:" for namespacing.
 */
async function tokenCacheKey(token: string): Promise<string> {
	const encoded = new TextEncoder().encode(token);
	const hash = await crypto.subtle.digest("SHA-256", encoded);
	const hex = [...new Uint8Array(hash)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `jwt:${hex}`;
}

/**
 * Clerk JWT authentication middleware for Hono.
 * Extracts the Bearer token from the Authorization header,
 * verifies it against Clerk, and sets `userId` on the context.
 *
 * Validated results are cached in the SESSIONS KV namespace
 * for 5 minutes to avoid repeated Clerk verification calls.
 */
export const clerkAuth = createMiddleware<{
	Bindings: AppBindings;
	Variables: AppVariables;
}>(async (c, next) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.slice(7);
	const cacheKey = await tokenCacheKey(token);

	// Try cached result first
	try {
		const cached = await c.env.SESSIONS.get(cacheKey);
		if (cached) {
			c.set("userId", cached);
			await next();
			return;
		}
	} catch {
		// KV failure is non-fatal; fall through to normal validation
	}

	// Cache miss — verify with Clerk
	try {
		const payload = await verifyToken(token, {
			secretKey: c.env.CLERK_SECRET_KEY,
		});

		c.set("userId", payload.sub);

		// Cache the result; fire-and-forget so it doesn't block the response
		c.executionCtx.waitUntil(
			c.env.SESSIONS.put(cacheKey, payload.sub, {
				expirationTtl: JWT_CACHE_TTL,
			}),
		);
	} catch {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
});
