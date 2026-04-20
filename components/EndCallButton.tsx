'use client';

import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Call } from '@stream-io/video-client'; // Import Call type
import { useRouter } from 'next/navigation';

import React from 'react'

const EndCallButton = () => {
  const call = useCall();
  const router = useRouter();

  const {useLocalParticipant} = useCallStateHooks();
  const LocalParticipant = useLocalParticipant();

  const isMeetingOwner = LocalParticipant && call?.state.createdBy
   && LocalParticipant.userId === call.state.createdBy.id;

   if(!isMeetingOwner) return null;
  return (
   <button onClick={async () => {
    const confirmEnd = window.confirm("Je, una uhakika unataka kusitisha kikao hiki kwa watu wote?");
    if (!confirmEnd) return;

    if (!call) return;
    await (call as Call).endCall(); // Type assertion here
    router.push('/');
   }} className='bg-red-500 flex items-center justify-center px-4 py-2 rounded-full hover:bg-blue-600 text-white cursor-pointer '>
    End Call for everyone
   </button>
  )
}

export default EndCallButton