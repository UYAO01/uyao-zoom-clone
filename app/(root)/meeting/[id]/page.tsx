"use client";
import { MobileFirstMeetingUI } from '@/components/MeetingRoom'; // BORESHO: Tumia component mpya
import MeetingSetup from '@/components/MeetingSetup';
import { useGetCallById } from '@/hooks/useGetCallById';
import { useUser } from '@clerk/nextjs';
import { StreamCall } from '@stream-io/video-react-sdk';

import { StreamTheme } from '@stream-io/video-react-sdk';



import Loader from '@/components/Loader';
import React, { useState } from 'react'

const Meeting = ({ params }: { params: { id: string } }) => {
  const { id } = params;

  const { isLoaded } = useUser();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { call, isCallLoading } = useGetCallById(id);

  if(!isLoaded || isCallLoading) return <Loader/>
  
  return (
    <div>
     <main className='h-screen w-full flex items-center justify-center'>
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <MeetingSetup  setIsSetupComplete={setIsSetupComplete} />
          ) : (
            <MobileFirstMeetingUI />
          )}
        </StreamTheme>
      </StreamCall>
     </main>
    </div>
  );
}

export default Meeting;