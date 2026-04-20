import { NextResponse } from 'next/server';
import { tokenProvider } from '../../../../providers/actions/stream.action';
import { currentUser } from '@clerk/nextjs/server'; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server route that returns a Stream token for the current authenticated user.
export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      console.error('Stream Token API: User is not authenticated (currentUser is null)');
      return NextResponse.json(
        { error: 'User is not authenticated' }, 
        { status: 401 }
      );
    }
    
    const token = await tokenProvider(user.id);
    
    return NextResponse.json({ token });
    
  } catch (err: unknown) {
    console.error('Stream Token API Error:', err);
    return NextResponse.json(
        { error: 'Internal Server Error' }, 
        { status: 500 }
    );
  }
}