import type { MiddlewareHandler } from 'astro';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/sign-in', '/sign-up'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = new URL(context.request.url);

  // Check if route is public
  const isPublic = publicRoutes.some(route => pathname.startsWith(route));

  // TODO: Implement Clerk authentication check
  // For now, allow all routes in development
  // In production, this will verify JWT from Clerk

  if (!isPublic) {
    // Placeholder for auth check
    // const userId = await verifyClerkSession(context.request);
    // if (!userId) {
    //   return context.redirect('/sign-in');
    // }

    // Mock user for development
    context.locals.user = {
      userId: 'dev-user-id',
      sessionId: 'dev-session-id',
      email: 'dev@ngfw.sh',
    };
  } else {
    context.locals.user = null;
  }

  return next();
};
