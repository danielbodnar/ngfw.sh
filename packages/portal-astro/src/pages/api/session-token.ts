import type { APIRoute } from "astro";

/**
 * Returns the current user's Clerk session JWT token.
 * This endpoint is used by the frontend to authenticate API requests.
 */
export const GET: APIRoute = async (context) => {
	const { userId, sessionId } = context.locals.auth();

	if (!userId || !sessionId) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		// Get the session token from Clerk
		const { getToken } = context.locals.auth();
		const token = await getToken();

		if (!token) {
			return new Response(
				JSON.stringify({ error: "Failed to get session token" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(JSON.stringify({ token }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error getting session token:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
