import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const protectedRoutes = createRouteMatcher([
  '/',
  '/upcoming',
  '/previous',
  '/recordings',
  '/personal-room',
  '/meeting(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (protectedRoutes(req) && !userId) {
    // Return 401 for API routes instead of redirecting to sign-in
    if (req.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const redirectUrl = new URL('/sign-in', req.url); // ✅ Absolute URL
    return NextResponse.redirect(redirectUrl);
  }
}, { clockSkewInMs: 30_000 }); // Allow 30 seconds of skew

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|cur|heic|heif|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
