import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export const onRequest = clerkMiddleware(async (auth, context, next) => {
	// Check if route is public
	if (!isPublicRoute(context.request)) {
		const { userId } = auth();

		// Redirect to sign-in if not authenticated
		if (!userId) {
			return context.redirect("/sign-in");
		}
	}

	return next();
});
