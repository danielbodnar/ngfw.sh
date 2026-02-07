import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const GET: APIRoute = async (context) => {
  const { userId } = context.locals.auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const client = clerkClient(context);
    const user = await client.users.getUser(userId);

    return new Response(
      JSON.stringify({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        primaryEmailAddress: user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId),
        imageUrl: user.imageUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
