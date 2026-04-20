import { useUser } from "@clerk/nextjs";
import { Call, CallRecording, useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const useGetCalls = () => {
    const [allCalls, setAllCalls] = useState<Call[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const client = useStreamVideoClient();
    const { user } = useUser();
    const [recordings, setRecordings] = useState<CallRecording[]>([]);

    const refreshCalls = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const loadCalls = async () => {
            if (!client || !user?.id) return;
            setIsLoading(true);
            try {
                console.log("Fetching calls...");
                const { calls } = await client.queryCalls({
                    sort: [{ field: 'starts_at', direction: -1 }],
                    filter_conditions: {
                        $or: [
                            { created_by_user_id: user.id },
                            { members: { $in: [user.id] } },
                        ]
                    }
                });
                console.log("Fetched calls:", calls.length, calls);
                setAllCalls(calls);
            } catch (error) {
                console.error("Failed to load calls:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCalls();
    }, [client, user?.id, refreshTrigger]);

    const now = new Date();

    const endedCalls = allCalls.filter(({ state: { startsAt, endedAt } }) => {
        return (startsAt && new Date(startsAt) < now) || !!endedAt;
    });

    const upcomingCalls = allCalls.filter(({ state: { startsAt } }) => {
        return startsAt && new Date(startsAt) > now;
    });

    useEffect(() => {
        const fetchRecordings = async () => {
            try {
                if (!client) return;
        
                const endedCallsForRecordings = allCalls.filter(({ state: { startsAt, endedAt } }) => {
                    return (startsAt && new Date(startsAt) < new Date()) || !!endedAt;
                });

                const allRecordings: CallRecording[] = [];
                // Sequentially fetch recordings to avoid rate-limiting issues from Promise.all
                for (const call of endedCallsForRecordings) {
                    try {
                        // Use listRecordings instead of the deprecated queryRecordings
                        const { recordings: callRecordings } = await call.listRecordings();
                        const recordingsWithCid = callRecordings.map((r) => ({
                            ...r,
                            call_cid: call.cid,
                        }));
                        allRecordings.push(...recordingsWithCid);
                    } catch (error) {
                        console.error(`Failed fetching recordings for call ${call.id}`, error);
                        toast.error(`Failed to load recordings for call ${call.id}. Please try again later.`);
                    }
                }
                // Sort recordings by start time descending (newest first)
                allRecordings.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
                console.log("Total recordings fetched:", allRecordings.length);
                setRecordings(allRecordings);
            } catch (error) {
                console.error("Failed to fetch recordings:", error);
            }
        };
    
        fetchRecordings();
    }, [allCalls, client]);
    
    useEffect(() => {
        if (!client) return;

        const handleRecordingEvent = () => {
            // The recording has finished processing and is ready to view
            console.log('Recording is ready, refreshing recordings list...');
            toast.success('A new recording is now available!');
            refreshCalls();
        };

        // Listen for the event that indicates a recording is fully processed
        client.on('call.recording_ready', handleRecordingEvent);

        // Clean up the event listener when the component unmounts
        return () => client.off('call.recording_ready', handleRecordingEvent);
    }, [client]);

    const handleDeleteRecording = async (recordingToDelete: CallRecording) => {
        if (!client) {
            toast.error('Video client not available.');
            return;
        }

        try {
            toast.loading('Deleting recording...');

            // The property on a recording can be `call_cid` or `call_id`. We check both.
            // This identifier is the full Call ID (CID), e.g., "default:some-uuid-1234".
            const recordingCallId = (recordingToDelete as any).call_cid ?? (recordingToDelete as any).call_id;

            if (!recordingCallId || typeof recordingCallId !== 'string' || !recordingCallId.includes(':')) {
                throw new Error('Invalid call identifier on recording object.');
            }

            const [callType, callId] = recordingCallId.split(':');

            // Instead of searching through the `allCalls` state (which might not contain old calls),
            // we can instantiate a `Call` object directly using the client and the ID from the recording.
            const call = client.call(callType, callId);

            // The `deleteRecording` method requires the session_id and filename.
            const sessionId = (recordingToDelete as any).session_id;
            if (!sessionId) {
                throw new Error('Could not find session identifier on the recording object.');
            }

            await call.deleteRecording(sessionId, recordingToDelete.filename);

            toast.dismiss();
            toast.success('Recording deleted successfully!');

            setRecordings(prevRecordings => 
                prevRecordings.filter(rec => rec.filename !== recordingToDelete.filename)
            );
        } catch (error) {
            toast.dismiss();
            console.error('Failed to delete recording:', error);
            toast.error((error as Error).message || 'Failed to delete recording. Please try again.');
        }
    };

    return {
        endedCalls,
        upcomingCalls,
        Callrecordings: recordings,
        isLoading,
        refreshCalls,
        allCalls,
        handleDeleteRecording,
    };
};
