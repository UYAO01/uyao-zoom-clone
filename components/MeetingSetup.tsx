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
    <div className='flex h-[100dvh] w-full flex-col items-center justify-center gap-2 sm:gap-3 text-white p-4 sm:p-6 overflow-hidden'>
        {/* UYAO Logo displayed at the top of the landing page */}
        <Image src="/icons/kkk.png" width={120} height={120} alt="UYAO Logo" className="rounded-full shadow-lg w-20 h-20 sm:w-28 sm:h-28 object-cover shrink-0" priority />
        <h1 className='text-2xl sm:text-3xl font-bold shrink-0 mb-1 sm:mb-2'>UYAO Meeting</h1>

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
                <div className="w-full max-w-md shrink flex items-center justify-center rounded-2xl overflow-hidden shadow-lg border border-gray-700/50 bg-gray-800/50">
                    <VideoPreview />
                </div>
                
                <div className='flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-2 sm:h-16 shrink-0'>
                    <label className='flex items-center justify-center gap-2 font-medium text-sm sm:text-base cursor-pointer'>
                        <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={isMicCamToggledOn}
                        onChange={(e) => setisMicCamToggledOn(e.target.checked)}
                        />
                        Join with mic & camera off
                    </label>
                    <DeviceSettings />
                </div>
                <button className='rounded-xl bg-blue-600 px-6 py-3 mt-2 font-bold text-white shadow-lg hover:bg-blue-700 transition-all w-full max-w-xs shrink-0' onClick={() => { call.join(); setIsSetupComplete(true); }}>
                    Join Meeting Now
                </button>
            </>
        )}
    </div>
  )
}

export default MeetingSetup