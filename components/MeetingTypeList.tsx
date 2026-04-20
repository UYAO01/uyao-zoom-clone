'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import HomeCards from './HomeCards';
import { useUser } from '@clerk/nextjs';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { toast } from 'sonner';
import MeetingModal from './MeetingModal';

import ReactDatePicker from 'react-datepicker';
import { sendEmail } from '../providers/actions/email.action';
import { Textarea } from '@/src/components/ui/textarea';


const MeetingTypeList = () => {
  const router = useRouter();
  const { user } = useUser();
  const client = useStreamVideoClient();

  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoinMeeting' | 'isInstantMeeting' | undefined
  >(undefined);

  const getInitialValues = () => ({
    dateTime: new Date(Date.now() + 60 * 60 * 1000), // Always fresh: 1 hour from now
    description: '',
    link: '',
  });

  const [values, setValues] = useState(getInitialValues());

  // Ensure values are fresh when modal opens
  useEffect(() => {
    if (meetingState === 'isScheduleMeeting') {
      const freshValues = getInitialValues();
      console.log('Modal opened - setting fresh values:', freshValues);
      setValues(freshValues);
      setDateError(''); // Clear any previous date errors
    }
  }, [meetingState]);

  const [callDetails, setCallDetails] = useState<Call>();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailBcc, setEmailBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState<'edit' | 'preview'>('edit');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [dateError, setDateError] = useState<string>('');


  const createMeeting = async () => {
    if (!client || !user) return;

    try {
      // For instant meetings, start immediately. For scheduled meetings, use selected time.
      const isInstantMeeting = meetingState === 'isInstantMeeting';
      const meetingDateTime = isInstantMeeting ? new Date() : values.dateTime;

      if (!isInstantMeeting && !meetingDateTime) {
        toast("Please select a date and time for the meeting");
        return;
      }

      // Validate that scheduled meeting date is in the future
      if (!isInstantMeeting && meetingDateTime <= new Date()) {
        const errorMsg = "Cannot schedule a meeting in the past. Please select a future date and time.";
        setDateError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Clear any previous date errors
      setDateError('');

      console.log('Creating meeting with values:', values);
      console.log('Meeting type:', isInstantMeeting ? 'instant' : 'scheduled');
      console.log('DateTime selected:', meetingDateTime);
      console.log('DateTime ISO:', meetingDateTime.toISOString());
      console.log('Is date in future?', meetingDateTime > new Date());

      const id = crypto.randomUUID();
      const call = client.call('default', id);
      if (!call) throw new Error('Failed to create call');

      const startsAt = meetingDateTime.toISOString();
      const description = values.description || (isInstantMeeting ? 'Instant meeting' : 'Scheduled meeting');

      console.log('Call data to create:', { starts_at: startsAt, custom: { description } });

      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          members: [{
            user_id: user.id,
            role: 'admin'
          }],
          custom: {
            description,
          },
        },
      });

      console.log('Meeting created successfully:', call.id);
      setCallDetails(call);

      // For instant meetings, navigate immediately. For scheduled, show share options.
      if (isInstantMeeting) {
        router.push(`/meeting/${call.id}`);
      }

      toast.success("Meeting created successfully");
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error("Failed to create meeting");
    }
  };

  // Dynamic URL detection to avoid port conflicts (3000 vs 3001)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  const meetingLink = `${baseUrl}/meeting/${callDetails?.id}`;

 const handleShareLink = async () => {
    if (!meetingLink) {
      toast.error('Meeting link is not available.');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UYAO Meeting Invitation',
          text: `Join this UYAO meeting: ${values.description || 'Instant Meeting'}`,
          url: meetingLink,
        });
        toast.success('Link shared successfully!');
      } catch (error) {
        console.error('Error sharing link:', error);
      }
    } else {
      toast.error('Sharing is not supported in this browser');
    }
  };

  const handleEmailShare = () => {
    if (!meetingLink) {
      toast.error('Meeting link is not available.');
      return;
    }

    const defaultBody =
      `You are invited to a UYAO meeting.\n\n` +
      `Topic: ${values.description || 'Instant Meeting'}\n` +
      `Join here: ${meetingLink}`;

    setEmailRecipients('');
    setEmailCc('');
    setEmailBcc('');
    setEmailBody(defaultBody);
    setEmailModalMode('edit');
    setShowCcBcc(false);
    setIsEmailModalOpen(true);
  };

  const validateEmails = (emailString: string) => {
    if (!emailString.trim()) return true;
    const emails = emailString.split(',').map((e) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every((email) => !email || emailRegex.test(email));
  };

  const handlePreviewEmail = () => {
    if (!validateEmails(emailRecipients)) {
      toast.error('Invalid email format in Recipients');
      return;
    }
    if (!validateEmails(emailCc)) {
      toast.error('Invalid email format in CC');
      return;
    }
    if (!validateEmails(emailBcc)) {
      toast.error('Invalid email format in BCC');
      return;
    }
    setEmailModalMode('preview');
  };

  const sendCustomEmail = async () => {
    if (!validateEmails(emailRecipients)) {
      toast.error('Invalid email format in Recipients');
      return;
    }
    if (!validateEmails(emailCc)) {
      toast.error('Invalid email format in CC');
      return;
    }
    if (!validateEmails(emailBcc)) {
      toast.error('Invalid email format in BCC');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await sendEmail(
        emailRecipients,
        emailCc,
        emailBcc,
        'UYAO Meeting Invitation',
        emailBody
      );

      if (!response.success) throw new Error(response.error || 'Failed to send email');
      toast.success('Email sent successfully');
      setIsEmailModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
   
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <HomeCards
          Img="/icons/personal.svg"
          title="New Meeting"
          description="Start an instant meeting"
          handleClick={() => setMeetingState('isInstantMeeting')}
          className="bg-orange-500"
        />
        <HomeCards
          Img="/icons/schedule.svg"
          title="Schedule Meeting"
          description="Plan your meeting"
          handleClick={() => {
            console.log('Opening schedule meeting modal');
            const freshInitialValues = getInitialValues();
            console.log('Fresh initial values:', freshInitialValues);
            setValues(freshInitialValues);
            setMeetingState('isScheduleMeeting');
          }}
          className="bg-blue-600"
        />
        <HomeCards
          Img="/icons/recordings.svg"
          title="View Recordings"
          description="Check out your recordings"
          handleClick={() => router.push('/recordings')}
          className="bg-purple-500"
        />
        <HomeCards
          Img="/icons/join-meeting.svg"
          title="Join Meeting"
          description="Via invitation link"
          handleClick={() => setMeetingState('isJoinMeeting')}
          className="bg-yellow-500"
        />
      
      {!callDetails ? (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => {
            setMeetingState(undefined);
            // Clear details so the next time we open it, we see the form
            setCallDetails(undefined);
            setValues(getInitialValues());
            setDateError(''); // Clear date error
          }}
          title="Create Meeting"
          handleClick={createMeeting}
          buttonText="Schedule Meeting">
        <div className='flex flex-col gap-2.5'>
          <label className='text-base text-normal leading-[22px]
           text-gray-300'>Add a description</label>
           <Textarea className='border-none bg-gray-800 text-white
           focus-visible:ring-0 focus-visible:ring-offset-0'
           onChange={(e) =>{
            setValues({...values, description: e.target.value})
           }}/>

        </div>
        <div className='flex w-full flex-col gap-2.5'>
           <label className='text-base text-normal leading-[22px]
           text-gray-300'>Select date and time</label>
          <ReactDatePicker
           key={values.dateTime?.toISOString()} // Force re-render when date changes
           selected={values.dateTime}
          onChange={(date) => {
            setValues({ ...values, dateTime: date! });
            // Clear error when user changes date
            if (dateError) setDateError('');
          }}
          showTimeSelect
          timeFormat='HH:mm'
          timeIntervals={15}
          timeCaption='time'
         dateFormat='MMMM d, yyyy h:mm aa'
          className={`w-full rounded bg-gray-800 text-white py-2 px-3 focus:outline-none cursor-pointer ${
            dateError ? 'border-2 border-red-500' : ''
          }`}
        />
        {dateError && (
          <p className="text-red-400 text-sm mt-1">{dateError}</p>
        )}
        </div>
        </MeetingModal>

      )  : (
        <MeetingModal
        isOpen={meetingState === 'isScheduleMeeting'}
        onClose={() => {
          setMeetingState(undefined);
          setCallDetails(undefined);
          setValues(getInitialValues());
        }}
        title="Meeting Created"
        className='text-center'
        image='/icons/checked.svg'
        buttonText="" // We are providing custom buttons below
      >
        <div className="flex flex-col gap-4">
          <button
            className="bg-blue-600 px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-blue-700"
            onClick={() => {
              navigator.clipboard.writeText(meetingLink);
              toast.success('Link Copied');
            }}
          >
            <Image src="/icons/copy.svg" alt="copy icon" width={15} height={15} />
            Copy Meeting Link
          </button>
          <button className="bg-yellow-500 px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-yellow-600" onClick={handleEmailShare}>
            <Image src="/icons/mail.svg" alt="email icon" width={15} height={15} />
            Send via Email
          </button>
          <button className="bg-green-500 px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-green-600" onClick={handleShareLink}>
            <Image src="/icons/share.svg" alt="share icon" width={15} height={15} />
            Share Link
          </button>
        </div>
      </MeetingModal>
      )}

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start an Instant Meeting"
        className='text-center'
        buttonText="Create Meeting"
        handleClick={createMeeting}
      />

      {/* New Modal for Email Customization */}
      <MeetingModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={emailModalMode === 'edit' ? "Customize and Send Email" : "Email Preview"}
        buttonText=""
        handleClick={() => {}}
      >
        {emailModalMode === 'edit' ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className='text-base text-normal leading-[22px] text-gray-300 mb-2 block'>Recipients</label>
              <input
                type="email"
                placeholder="Enter email addresses, separated by commas"
                className="w-full rounded bg-gray-700 text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
              />
            </div>
            <div className="flex justify-end -mt-2">
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {showCcBcc ? 'Hide CC/BCC' : 'Show CC/BCC'}
              </button>
            </div>
            {showCcBcc && (
              <>
                <div>
                  <label className='text-base text-normal leading-[22px] text-gray-300 mb-2 block'>CC</label>
                  <input
                    type="email"
                    placeholder="CC email addresses"
                    className="w-full rounded bg-gray-700 text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                  />
                </div>
                <div>
                  <label className='text-base text-normal leading-[22px] text-gray-300 mb-2 block'>BCC</label>
                  <input
                    type="email"
                    placeholder="BCC email addresses"
                    className="w-full rounded bg-gray-700 text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={emailBcc}
                    onChange={(e) => setEmailBcc(e.target.value)}
                  />
                </div>
              </>
            )}
            <Textarea
              className="border-none bg-gray-800 text-white focus-visible:ring-0 focus-visible:ring-offset-0 h-40"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
              <button onClick={handlePreviewEmail} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Preview Email</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-sm">
              <div className="mb-2"><span className="font-semibold text-gray-400">To: </span><span className="text-white">{emailRecipients || '(empty)'}</span></div>
              {emailCc && (<div className="mb-2"><span className="font-semibold text-gray-400">Cc: </span><span className="text-white">{emailCc}</span></div>)}
              {emailBcc && (<div className="mb-2"><span className="font-semibold text-gray-400">Bcc: </span><span className="text-white">{emailBcc}</span></div>)}
              <div className="mb-2"><span className="font-semibold text-gray-400">Subject: </span><span className="text-white">UYAO Meeting Invitation</span></div>
              <hr className="border-gray-600 my-2" />
              <div className="whitespace-pre-wrap text-white">{emailBody}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEmailModalMode('edit')} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Edit</button>
              <button 
                onClick={sendCustomEmail} 
                disabled={isSendingEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        )}
      </MeetingModal>
    </section>
  );
};


export default MeetingTypeList;
