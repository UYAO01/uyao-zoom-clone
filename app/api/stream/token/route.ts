import { NextResponse } from 'next/server';
import { tokenProvider } from '../../../../providers/actions/stream.action';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server route that returns a Stream token for the current authenticated user.
export async function GET(request: Request) {
  try {
    const { userId: clerkUserId } = await auth().catch(() => ({ userId: null }));
    const requestedUserId = new URL(request.url).searchParams.get('userId');
    const resolvedUserId = requestedUserId || clerkUserId;

    if (!resolvedUserId) {
      console.error('Stream Token API: User is not authenticated');
      return NextResponse.json({ error: 'User is not authenticated' }, { status: 401 });
    }

    if (requestedUserId && clerkUserId && requestedUserId !== clerkUserId) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    const token = await tokenProvider(resolvedUserId);
    return NextResponse.json({ token });
  } catch (err: unknown) {
    console.error('Stream Token API Error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}