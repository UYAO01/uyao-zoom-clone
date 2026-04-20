import { NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    const apiSecret = process.env.STREAM_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Stream API keys are missing' }, { status: 500 });
    }

    const client = new StreamClient(apiKey, apiSecret);
    const call = client.video.call('default', callId);
    
    await call.delete();

    return NextResponse.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server error deleting meeting:', errorMessage);
    return NextResponse.json({ error: 'Failed to delete meeting on the server', details: errorMessage }, { status: 500 });
  }
}