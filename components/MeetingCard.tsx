'use client';

import React, { useMemo } from 'react'
import Link from 'next/link';
import { Call, CallRecording } from '@stream-io/video-react-sdk';
import Image from 'next/image';

type MeetingLike = { 
  id?: string; 
  call_id?: string; // The full CID, e.g. 'default:...'
  call_cid?: string; // Some SDK versions use this instead of call_id
  state?: { 
    startsAt?: Date | string;
    startedAt?: Date | string;
    endedAt?: Date | string;
    custom?: { description?: string } 
  }; 
  url?: string;
  starts_at?: string;
  start_time?: string;
  file_size?: number;
};

const MeetingCard = ({ meeting, onDelete } : { meeting: Call | CallRecording, onDelete?: (meetingId: string) => void }) => {
  const m = meeting as unknown as MeetingLike;
  const isRecording = !!m.url;

  const id = useMemo(() => {
    if (isRecording) {
      // For recordings, the ID is part of the 'call_cid' or 'call_id'.
      // We need to extract the UUID part from the full CID (e.g., 'default:some-uuid').
      const cid = (m as Record<string, unknown>).call_cid ?? (m as Record<string, unknown>).call_id;
      if (cid && typeof cid === 'string' && cid.includes(':')) {
        return cid.split(':')[1];
      }
      return 'unknown';
    }
    // For regular 'Call' objects, the ID is a top-level property.
    return m.id ?? 'unknown';
  }, [m, isRecording]);

  const startAt = m.state?.startsAt ?? m.starts_at ?? m.start_time ?? null;
  const description = m.state?.custom?.description ?? (m.url ? 'Meeting Recording' : 'No Description');

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString();
  };

  // Helper to calculate meeting duration
  const getDuration = () => {
    const { startedAt: start, endedAt: end } = m.state || {};
    if (!start || !end) return null;
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(durationMs / 60000);
    return minutes > 0 ? `${minutes} mins` : 'Short Meeting';
  };

  // Helper to format file size from bytes
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return null;
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const duration = getDuration();
  const fileSize = formatFileSize(m.file_size);

  const meetingPath = `/meeting/${id}`;
  const meetingURL = useMemo(() => {
    if (typeof window === 'undefined') return meetingPath;
    return `${window.location.origin}${meetingPath}`;
  }, [meetingPath]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingURL);
      alert('Meeting link copied to clipboard!');
    } catch (err) {
      console.error('Copy failed', err);
      alert('Unable to copy link.');
    }
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent('Join my meeting');
    // Use a clear link in email body; most clients auto-link a URL, and HTML link is included for rich clients.
    const bodyText = `Please join the meeting by clicking the link below:\n${meetingURL}\n\n`;
    const htmlLink = `<a href=\"${meetingURL}\">Join meeting</a>`;
    const body = encodeURIComponent(`${bodyText}${htmlLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Join my meeting',
          text: 'Join my meeting at this link',
          url: meetingURL,
        })
        .catch((error) => console.error('Error sharing', error));
    } else {
      copyLink();
    }
  };

  const handleDelete = () => {
    const itemType = isRecording ? 'recording' : 'meeting';
    if (window.confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`)) {
      onDelete?.(id);
    }
  };

  return (
    <section className="flex min-h-[258px] w-full flex-col justify-between rounded-[14px] bg-card px-5 py-8 xl:max-w-[568px] border border-border shadow-xl text-foreground">
      <article className="flex flex-col gap-5">
        <Image src={isRecording ? "/icons/recordings.svg" : "/icons/previous.svg"} alt="icon" width={28} height={28} />
        <div className="flex justify-between w-full min-w-0">
          <div className="flex flex-col gap-2 w-full min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate w-full">
              {description}
            </h1>
            <p className="text-sm sm:text-base font-normal text-gray-300">
              {startAt ? formatDate(startAt) : 'No date set'}
            </p>
            {duration && (
              <p className="text-sm font-medium text-blue-400 flex items-center gap-1">
                <Image src="/icons/clock.svg" alt="duration" width={14} height={14} />
                Duration: {duration}
              </p>
            )}
            {fileSize && (
              <p className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                Size: {fileSize}
              </p>
            )}
          </div>
        </div>
      </article>
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-4 gap-3 w-full min-w-0">
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
           <span className="text-xs text-gray-500 font-mono px-2 py-2 sm:py-1 rounded bg-gray-800 truncate w-full sm:w-auto">
             Meeting ID: 
             <Link
               href={`/meeting/${id}`}
               className="ml-2 text-blue-200 hover:text-blue-400 underline"
             >
               {id}
             </Link>
           </span>
        </div>
        {isRecording && (
          <button 
            onClick={() => window.open(m.url, '_blank')}
              className="bg-blue-600 px-4 py-2 rounded text-sm font-semibold text-white hover:bg-blue-700 transition-all cursor-pointer w-full sm:w-auto text-center"
          >
            Download
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 w-full">
        <button
          onClick={copyLink}
          className="bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold px-4 py-2.5 sm:px-3 sm:py-1 rounded transition flex-1 sm:flex-none text-center whitespace-nowrap"
        >
          Copy link
        </button>
        <button
          onClick={shareLink}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 sm:px-3 sm:py-1 rounded transition flex-1 sm:flex-none text-center whitespace-nowrap"
        >
          Share link
        </button>
        <button
          onClick={shareByEmail}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 sm:px-3 sm:py-1 rounded transition flex-1 sm:flex-none text-center whitespace-nowrap"
        >
          Share by email
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2.5 sm:px-3 sm:py-1 rounded transition flex-1 sm:flex-none text-center whitespace-nowrap"
          >
            {isRecording ? 'Delete Recording' : 'Delete'}
          </button>
        )}
      </div>
    </section>
  )
}

export default MeetingCard