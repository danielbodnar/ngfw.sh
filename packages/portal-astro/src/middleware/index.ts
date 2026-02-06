import { defineMiddleware } from 'astro/middleware';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/sign-in', '/sign-up'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);

  // Check if route is public
  const isPublic = publicRoutes.some(route => pathname.startsWith(route));

  if (!isPublic) {
    // Mock user for development
    // TODO: Implement Clerk authentication
    context.locals.user = {
      userId: 'dev-user-id',
      sessionId: 'dev-session-id',
      email: 'dev@ngfw.sh',
    };
  } else {
    context.locals.user = null;
  }

  return next();
});
