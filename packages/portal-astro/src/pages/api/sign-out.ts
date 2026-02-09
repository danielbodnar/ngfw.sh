import type { APIRoute } from "astro";

export const POST: APIRoute = async (context) => {
	const { userId } = context.locals.auth();

	if (!userId) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Clear Clerk session cookies
	context.cookies.delete("__session", { path: "/" });
	context.cookies.delete("__clerk_db_jwt", { path: "/" });

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
