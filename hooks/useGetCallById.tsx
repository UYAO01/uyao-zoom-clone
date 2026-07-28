import { Call, useStreamVideoClient, useConnectedUser } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";

export const useGetCallById = (id: string) => {
 const [call, setCall] = useState<Call>();
 const [isCallLoading, setIsCallLoading] = useState(true);

 const client = useStreamVideoClient();
 const connectedUser = useConnectedUser();

 useEffect(() => {
     const loadCall = async () => {
       if (!client) return; // Type guard to ensure client is defined
        try {
            const { calls } = await client.queryCalls({
               filter_conditions: { id }
            });
    
            if (calls.length > 0) {
                setCall(calls[0]);
            }
        } catch (error) {
            console.error("Failed to load call:", error);
        } finally {
            setIsCallLoading(false);
        }
     }

    // Wait for both the client and a connected user before proceeding.
    if (!client || !connectedUser) {
      return;
    }
    
    // Adding a minimal delay to ensure the client's internal state is fully ready
    // after the user is connected. This is a robust way to prevent race conditions.
    const timer = setTimeout(() => {
        loadCall();
    }, 100);
    
    return () => clearTimeout(timer);
 }, [client, connectedUser, id]);

    return { call, isCallLoading };

}
