'use client';

import { useUser } from '@clerk/nextjs';
import { StreamVideoClient, StreamVideo } from '@stream-io/video-react-sdk';
import { ReactNode, useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;

// Client-side token provider: fetch a server route that uses server credentials to create a token.
const createClientToken = async (): Promise<string> => {
  const res = await fetch('/api/stream/token', { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to fetch stream token: ${res.status}`);
  }
  const json = await res.json();
  return json.token;
};

const StreamVideoProviderWrapper = ({ children }: { children: ReactNode }) => {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const initClient = async () => {
      if (!isLoaded || !user) return;

      if (!apiKey) {
        console.error('❌ Stream API Key is not defined');
        return;
      }

      try {
        const client = new StreamVideoClient({
          apiKey,
          user: {
            id: user.id,
            name: user.username || user.id,
            image: user.imageUrl,
          },
          tokenProvider: createClientToken,
        });

        setVideoClient(client);
        console.log('✅ StreamVideoClient initialized');
      } catch (err) {
        console.error('❌ Failed to initialize StreamVideoClient:', err);
      }
    };

    initClient();
  }, [isLoaded, user]);

  if (!videoClient) {
    return (
      <div className="flex justify-center items-center h-screen animate-pulse text-gray-500">
        <Loader size={48} />
        <span className="ml-4 text-sm">Initializing video client...</span>
      </div>
    );
  }

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
};

export default StreamVideoProviderWrapper;