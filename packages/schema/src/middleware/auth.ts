import { verifyToken } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import type { AppBindings, AppVariables } from "../types";

/**
 * Clerk JWT authentication middleware for Hono.
 * Extracts the Bearer token from the Authorization header,
 * verifies it against Clerk, and sets `userId` on the context.
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

	try {
		const payload = await verifyToken(token, {
			secretKey: c.env.CLERK_SECRET_KEY,
		});

		c.set("userId", payload.sub);
	} catch {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
});
