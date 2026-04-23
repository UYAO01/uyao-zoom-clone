"use client";
import Image from 'next/image';
import { DeviceSettings, useCall, VideoPreview, useStreamVideoClient } from '@stream-io/video-react-sdk';
import React, { useEffect, useState } from 'react'

const MeetingSetup = ({ setIsSetupComplete }: { setIsSetupComplete: (value: boolean) => void }) => {
    // Tumeibadilisha iwe 'true' kwa default ili izime camera na mic mwanzo (isikuombe ruhusa papo hapo)
    const [isMicCamToggledOn, setisMicCamToggledOn] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date());

    const call = useCall();
    const client = useStreamVideoClient();

    if (!call) {
        throw new Error('Call is not available');
    }

    // Logic to check if the meeting is in the future
    const startsAt = call.state.startsAt;
    const isMeetingUpcoming = startsAt && new Date(startsAt) > currentTime;

    // Update current time every second to automatically enable the join button
    useEffect(() => {
        if (!isMeetingUpcoming) return;
        
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isMeetingUpcoming]);

    useEffect(() => {
        // Increase the timeout to 15000ms (15 seconds) to avoid timeout errors
        if (client) {
            // @ts-expect-error - Property 'axiosInstance' does not exist on type 'StreamVideoClient'.
            if (client.axiosInstance) {
                // @ts-expect-error - Property 'defaults' does not exist on type 'AxiosInstance'.
                client.axiosInstance.defaults.timeout = 15000;
            }
        }

        // Kuzuia kuomba permission ya mic/camera kama kikao bado hakijaanza (waiting screen)
        if (isMeetingUpcoming) return;

        const setupDevices = async () => {
            try {
                if(isMicCamToggledOn){
                    await call?.camera?.disable();
                    await call?.microphone?.disable();
                }else{
                    await call?.camera?.enable();
                    await call?.microphone?.enable();
                }
            } catch (error) {
                console.error("Error toggling devices:", error);
            }
        };
        
        setupDevices();
    }, [isMicCamToggledOn, call, client, isMeetingUpcoming])
  return (
    <div className='flex h-screen w-full flex-col items-center justify-center gap-3 text-white'>
        {/* UYAO Logo displayed at the top of the landing page */}
        <Image src="/icons/kkk.png" width={120} height={120} alt="UYAO Logo" className="rounded-full mb-4 shadow-lg" priority />
        <h1 className='text-3xl font-bold'>UYAO Meeting</h1>

        {isMeetingUpcoming ? (
            // Waiting screen for meetings that haven't started yet
            <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-blue-600/20 p-6 rounded-2xl border border-blue-500/30">
                    <p className="text-xl text-yellow-500 font-semibold mb-2">This meeting hasn&apos;t started yet.</p>
                    <p className="text-lg text-gray-200">Scheduled for:</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {new Date(startsAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                </div>
                <p className="text-gray-400 max-w-[400px]">The &quot;Join&quot; button will become available once the scheduled time is reached. Please stay on this page.</p>
                <button onClick={() => window.location.reload()} className="text-blue-400 hover:underline text-sm mt-2">Refresh to check status</button>
            </div>
        ) : (
            // Standard setup screen once the time has arrived
            <>
                <VideoPreview />
                <div className='flex h-16 items-center justify-center gap-3'>
                    <label className='flex items-center justify-center gap-2 font-medium'>
                        <input
                        type="checkbox"
                        checked={isMicCamToggledOn}
                        onChange={(e) => setisMicCamToggledOn(e.target.checked)}
                        />
                        Join with mic and camera off
                    </label>
                    <DeviceSettings />
                </div>
                <button className='rounded-md bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-blue-700 transition-all' onClick={() => { call.join(); setIsSetupComplete(true); }}>
                    Join Meeting Now
                </button>
            </>
        )}
    </div>
  )
}

export default MeetingSetup