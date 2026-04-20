'use client';

import { Call, CallRecording, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import { useGetCalls } from '../hooks/useGetCalls';
// useState not needed here
import MeetingCard from './MeetingCard';
import { useState } from 'react';
import { toast } from 'sonner';

const CallList = ({ type }: { type: 'ended' | 'upcoming' | 'recordings' }) => {
  const { endedCalls, upcomingCalls, Callrecordings, isLoading, refreshCalls, allCalls, handleDeleteRecording } = useGetCalls();
  const [showAllCalls, setShowAllCalls] = useState(false);
  const client = useStreamVideoClient();
  const { user } = useUser();

  const getCalls = () => {
    switch (type) {
      case 'ended':
        return endedCalls;
      case 'recordings':
        return Callrecordings;
      case 'upcoming':
        return showAllCalls ? allCalls : upcomingCalls;
        default:
          return [];
    }
  };

    const getNoCallsMessage = () => {
    switch (type) {
      case 'ended':
        return 'No previous meeting';
      case 'recordings':
        return 'No Recordings';
      case 'upcoming':
        return 'No upcoming Calls';
        default:
          return '';
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!client) {
      toast.error('Unable to delete meeting: client not available');
      return;
    }

    const call = client.call('default', meetingId);

    // First try to leave the call if we're in it
    try {
      await call.leave();
    } catch (leaveError) {
      console.log('Leave call failed or not in call:', leaveError);
    }

    // Try approach using server API directly to avoid client-side permission errors
    try {
      const response = await fetch(`/api/delete-call?callId=${meetingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Meeting deleted successfully');
        refreshCalls();
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        console.error(`API delete failed (${response.status}):`, errorData);
        toast.error('Failed to delete meeting');
      }
    } catch (apiError) {
      console.error('API delete failed:', apiError);
      toast.error('Failed to delete meeting. Please try again.');
    }
  };

  type MeetingLike = { id?: string; call_id?: string; state?: { startsAt?: string; createdBy?: { id: string } } };

  const calls = getCalls();
  const noCallsMessage = getNoCallsMessage();

  if (isLoading) return <div className="text-center py-8">Loading calls...</div>;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {calls && calls.length > 0 ? (
        calls.map((meeting: Call | CallRecording, idx: number) => {
          const isCreator = (meeting as MeetingLike).state?.createdBy?.id === user?.id;
          const isRecording = type === 'recordings';

          let finalOnDelete: ((id: string) => void) | undefined;

          if (isRecording && handleDeleteRecording) {
            // The `id` from MeetingCard is ignored, but we match the signature.
            finalOnDelete = () => handleDeleteRecording(meeting as CallRecording);
          } else if (isCreator) {
            finalOnDelete = handleDeleteMeeting;
          }

          return (
            <MeetingCard 
              key={(meeting as MeetingLike).id ?? (meeting as MeetingLike).call_id ?? idx} 
              meeting={meeting} 
              onDelete={finalOnDelete}
            />
          );
        })
      ) : (
        <div className="text-center col-span-full mt-10">
          <h1 className="text-2xl font-bold text-white mb-4">{noCallsMessage}</h1>
          {type === 'upcoming' && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 justify-center items-center w-full max-w-sm mx-auto">
              <button
                onClick={() => {
                  console.log('Manually refreshing calls...');
                  refreshCalls();
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 sm:py-2 px-4 rounded text-sm w-full sm:w-auto"
              >
                Refresh Calls
              </button>
              <button
                onClick={() => setShowAllCalls(!showAllCalls)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 sm:py-2 px-4 rounded text-sm w-full sm:w-auto"
              >
                {showAllCalls ? 'Show Upcoming Only' : 'Show All Calls'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CallList;
