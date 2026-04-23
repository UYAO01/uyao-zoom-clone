'use client';

import NextImage from 'next/image';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
// Firebase imports ni muhimu kwa kupakia picha za wagombea
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  CallStatsButton,
  PaginatedGridLayout,
  SpeakerLayout,
  DeviceSettings, // NEW: Import DeviceSettings
  useCallStateHooks,
  useCall,
  CallingState,
  ReactionsButton, // ADDED: Import ReactionsButton
} from '@stream-io/video-react-sdk';
import { Call } from '@stream-io/video-client'; // Import Call type
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  LayoutDashboard,
  ScreenShare,
  ScreenShareOff,
  Settings,
  Clipboard as WhiteboardIcon, // NEW: Icon for Whiteboard
  FileText, // ADDED: Missing import for FileText
  Users, // ADDED: Missing import for Users
  Hand,
  Paperclip,
  Smile,
  MessageCircle,
  X,
  CircleDot,
  StopCircle,
  BarChart, // ADDED: New icon for voting
  Vote, // ADDED: Icon yenye mandhari ya uchaguzi
  List,
  Image as ImageIcon, // ADDED: Icon kwa ajili ya image upload
  Upload,
  MoreVertical,
  RotateCw,
  Trash,
  Check, // ADDED: For message sent status
  Clock, // ADDED: For message sending status
  AlertCircle as AlertCircleIcon, // ADDED: For message failed status, aliased to avoid conflict
  Play,
  Pause,
  Bell,
  BellOff,
  Search,
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Fragment, useEffect, useRef, useCallback } from 'react';
import TranslationPanel from './TranslationPanel';
import EndCallButton from './EndCallButton';
import Loader from './Loader';
import { firebaseStorage } from './ui/firebase';
import { Whiteboard } from './Whiteboard'; // NEW: Import Whiteboard

// =========================================================================
// PDF Generation Utilities (Requires npm install jspdf html2canvas)
// =========================================================================

import html2canvas, { Options } from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';


/**
 * Utility function to generate a PDF from an HTML element and trigger a download.
 * This function is passed to the VotingBox component.
 * @param element The HTML element containing the content to capture.
 * @param fileName The name of the downloaded file.
 */
export const generatePDF = async (element: HTMLElement | null, fileName: string = 'voting-results-report.pdf') => {
  if (!element) {
    console.error('Element for PDF capture not found.');
    return;
  }

  // Temporarily bypass container scroll limits to capture FULL results without cutting off
  const scrollContainer = element.closest('.overflow-y-auto') as HTMLElement;
  let originalMaxHeight = '';
  let originalOverflow = '';
  if (scrollContainer) {
    originalMaxHeight = scrollContainer.style.maxHeight;
    originalOverflow = scrollContainer.style.overflow;
    scrollContainer.style.maxHeight = 'none';
    scrollContainer.style.overflow = 'visible';
  }
  
  // Wait for DOM to adjust
  await new Promise(resolve => setTimeout(resolve, 150));

  // 1. Convert the HTML element to a canvas (image)
  const canvas = await html2canvas(element, { 
    scale: 2,
    backgroundColor: '#FFFFFF', // Use white as the explicit background color for the PDF image
    useCORS: true,
    allowTaint: true,
    scrollY: -window.scrollY, // Avoid cutting off from scrolling
  } as unknown as Options); // FIX: Added 'as unknown' to resolve TypeScript error

  // Restore original styles
  if (scrollContainer) {
    scrollContainer.style.maxHeight = originalMaxHeight;
    scrollContainer.style.overflow = originalOverflow;
  }

  const imgData = canvas.toDataURL('image/png');
  // Initialize jsPDF: 'p' (portrait), 'mm' (units), 'a4' (paper size)
  const pdf = new jsPDF('p', 'mm', 'a4'); 

  // Calculate dimensions to fit the image on the PDF page while preserving the aspect ratio
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width; 

  // 2. Add the captured image to the PDF document
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); 

  // 3. Trigger the download
  pdf.save(fileName); 
};

// Helper to safely call sendCustomEvent on dynamic `call` objects
type CallLike = { sendCustomEvent?: (p: { type: string; data?: unknown }) => Promise<void> } | undefined;
const safeSendCustomEvent = async (callObj: unknown, payload: { type: string; data?: unknown }) => {
  try {

    const c = callObj as CallLike;
    if (c?.sendCustomEvent) await c.sendCustomEvent(payload);
  } catch (err) {
    console.error('sendCustomEvent failed', err);
  }
};

const DEFAULT_NOTIFICATION_SOUND = '/sounds/notification.mp3';

// ADDED: A list of predefined notification sounds for users to choose from.
const PREDEFINED_SOUNDS = [
  { name: 'Default', src: DEFAULT_NOTIFICATION_SOUND },
  { name: 'Apex', src: '/sounds/apex.mp3.mpeg' },
  { name: 'Beacon', src: '/sounds/beacon.mpeg' },
  { name: 'Gun', src: '/sounds/gun.mpeg' },
  { name: 'By The Seaside', src: '/sounds/haha.mp3.mpeg' },
  { name: 'Chimes', src: '/sounds/sound 25 gobo.mp3.mpeg' },
  { name: 'Circuit', src: '/sounds/vox bark with growl.mp3.mpeg' },
  { name: 'Constellation', src: '/sounds/vox devil.mp3.mpeg' },
  { name: 'Cosmic', src: '/sounds/vox f maj.mp3.mpeg' },
  { name: 'Hillside', src: '/sounds/vox run.mp3.mpeg' },
  { name: 'Illuminate', src: '/sounds/water drop.mp3.mpeg' },
  { name: 'Night Owl', src: '/sounds/Yo!!.mp3.mpeg' },
];

// A single audio instance to prevent sound overlap and a timeout to manage playback duration.
let notificationAudio: HTMLAudioElement | null = null;
let stopAudioTimeout: NodeJS.Timeout | null = null;

const playSound = (src: string, volume: number) => {
  if (!src) return;

  // If a timeout to stop a previous sound is pending, clear it.
  if (stopAudioTimeout) {
    clearTimeout(stopAudioTimeout);
  }

  // If a previous audio instance exists, stop it.
  if (notificationAudio) {
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
  }

  // Always create a new audio object to ensure the correct sound is played and avoid caching issues.
  try {
    notificationAudio = new Audio(src);
  } catch (error) {
    console.error('Failed to create audio element. The sound source might be invalid.', { src, error });
    // If creating the audio fails, we can't play anything.
    // We return here to prevent further errors. The user's sound setting is not reset.
    return;
  }

  const audio = notificationAudio; // Use a local reference for the closure.

  audio.volume = volume;

  audio.play().catch((err) => {
    console.warn('Failed to play sound:', src, err);
    // Even if playback fails, we don't reset the user's choice.
  });

  // Set a timeout to stop the sound after 1 second.
  stopAudioTimeout = setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
    stopAudioTimeout = null; // Reset the timeout reference.
  }, 10000); // 10000ms = 10 seconds
};

// =========================================================================
// INDEXEDDB HELPERS (For large audio files)
// =========================================================================

const DB_NAME = 'MeetingRoomDB';
const STORE_NAME = 'settings';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveSoundToDB = async (sound: string) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(sound, 'notificationSound');
  } catch (err) {
    console.error('Failed to save sound to IndexedDB:', err);
  }
};

const getSoundFromDB = async (): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('notificationSound');
      request.onsuccess = () => resolve(request.result as string || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get sound from IndexedDB:', err);
    return null;
  }
};

// =========================================================================
// TYPES & CONSTANTS
// =========================================================================

type CallLayoutType = 'speaker-left' | 'grid' | 'speaker-right';

// UPDATED: Poll type sasa inajumuisha 'imageUrl' kwa kila chaguo (option)
type Poll = {
  position?: string; // ADDED: Cheo kinachogombewa
  question: string;
  options: { id: number; text: string; votes: number; imageUrl: string | null }[]; // <--- IMAGE URL ADDED
  totalVotes: number;
  isActive: boolean;
  endTime: string | null; // <--- ADDED: ISO string for poll end time
};

// Define a type for custom events - UPDATED
type CustomEventType = {
  custom: {
    type: 'file-upload' | 'chat-message' | 'message-deleted' | 'raise-hand' | 'start-poll' | 'vote' | 'end-poll' | 'request-enable-mic' | 'typing-start' | 'typing-stop';
    data: unknown;
  };
  user: {
    name: string;
    id: string;
  };
};

// --- Type guard function to check if the event is a CustomEventType ---
function isCustomEventType(event: unknown): event is CustomEventType {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Record<string, unknown>;
  const customObj = e.custom as Record<string, unknown> | undefined;
  if (!customObj || typeof customObj.type !== 'string') return false;
  const t = String(customObj.type);
  const allowed = ['file-upload','chat-message','message-deleted','raise-hand','start-poll','vote','end-poll','request-enable-mic', 'typing-start', 'typing-stop', 'whiteboard-update'];
  if (!allowed.includes(t)) return false;
  const userObj = e.user as Record<string, unknown> | undefined;
  if (!userObj || typeof userObj.id !== 'string') return false;
  return true;
}

// =========================================================================
// CUSTOM COMPONENTS
// =========================================================================

// --- MODIFIED: Emoji Picker Component with Categories and More Emojis ---
const EMOJI_CATEGORIES: Record<string, Record<string, string>> = {
  'Faces & Emotions': {
    'grinning face': '😀', 'laughing': '😂', 'smiling eyes': '😊', 'in love': '😍', 'kissing face': '😘',
    'winking': '😉', 'pouting face': '😡', 'crying': '😭', 'sleepy': '😴', 'thinking': '🤔',
    'shush': '🤫', 'zipper mouth': '🤐', 'no mouth': '😶', 'exploding head': '🤯', 'star eyes': '🤩',
    'vomit face': '🤮', 'robot': '🤖', 'poop': '💩', 'angry face': '😠', 'sad face': '😞',
  },
  'Hand Gestures': {
    'thumbs up': '👍', 'thumbs down': '👎', 'clapping hands': '👏', 'handshake': '🤝', 'raise hand': '✋',
    'peace sign': '✌️', 'fist': '✊', 'ok hand': '👌', 'wave': '👋', 'pray': '🙏',
  },
  'People & Fantasy': {
    'person': '👤', 'man': '👨', 'woman': '👩', 'baby': '👶', 'police officer': '👮',
    'doctor': '🧑‍⚕️', 'superhero': '🦸', 'vampire': '🧛', 'ghost': '👻', 'alien': '👽',
  },
  'Food & Drink': {
    'pizza': '🍕', 'hamburger': '🍔', 'fries': '🍟', 'taco': '🌮', 'sushi': '🍣',
    'coffee': '☕', 'beer': '🍺', 'wine glass': '🍷', 'cocktail': '🍸', 'watermelon': '🍉',
  },
  'Animals & Nature': {
    'dog face': '🐶', 'cat face': '🐱', 'lion': '🦁', 'tiger': '🐅', 'bear': '🐻',
    'rose': '🌹', 'sun': '☀️', 'moon': '🌙', 'star': '⭐', 'fire': '🔥',
    'lightning': '⚡', 'cloud': '☁️', 'tree': '🌳', 'mushroom': '🍄', 'earth globe': '🌎',
  },
  'Objects & Tools': {
    'light bulb': '💡', 'bomb': '💣', 'key': '🔑', 'lock': '🔒', 'hammer': '🔨',
    'tools': '🛠️', 'money bag': '💰', 'briefcase': '💼', 'camera': '📷', 'microphone': '🎤',
    'laptop': '💻', 'mobile': '📱', 'bell': '🔔', 'alarm clock': '⏰', 'books': '📚',
  },
  'Symbols': {
    'heart': '❤️', 'broken heart': '💔', 'check mark': '✅', 'cross mark': '❌', 'exclamation': '❗',
    'question mark': '❓', '100': '💯', 'trophy': '🏆', 'target': '🎯', 'musical note': '🎵',
    'sparkles': '✨', 'glowing star': '🌟', 'chart up': '📈', 'chart down': '📉', 'bar chart': '📊',
    'warning sign': '⚠️', 'stop sign': '🛑', 'recycle': '♻️',
  },
};


const EmojiPicker = ({ onEmojiSelect, onClose }: { onEmojiSelect: (emoji: string) => void; onClose: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Flatten and filter the emojis based on the search term
  const allFilteredEmojis = Object.entries(EMOJI_CATEGORIES).flatMap(([category, keywordsMap]) => {
    return Object.entries(keywordsMap)
      .filter(([keyword]) => 
        searchTerm.trim() === '' || 
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      )
  .map(([keyword, emoji]) => ({ emoji, keyword, category })); // Keep category for potential use
  });

  // Filtered categories for categorized view (only used when search is empty)
  const filteredCategories = Object.entries(EMOJI_CATEGORIES)
      .map(([category, keywordsMap]) => {
      const filtered = Object.entries(keywordsMap)
        .filter(([keyword]) => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
  .map(([keyword, emoji]) => ({ emoji, keyword }));
          return { category, emojis: filtered };
      })
      .filter(item => item.emojis.length > 0);

  // Determine if we should show a flat list (when searching) or categorized list (when not searching)
  const isSearching = searchTerm.trim() !== '';

  const renderEmojiButtons = (emojis: { emoji: string; keyword: string }[]) => (
    <div className="grid grid-cols-6 gap-1">
      {emojis.map(({ emoji, keyword }) => (
        <button
          key={emoji}
          onClick={() => {
            onEmojiSelect(emoji);
            onClose();
          }}
          className="text-2xl hover:bg-gray-700 p-2 rounded-lg transition-colors flex items-center justify-center"
          aria-label={keyword}
        >
          {emoji}
        </button>
      ))}
    </div>
  );


  return (
    // Increased width and height for the larger selection
    <Dialog.Content className="p-4 bg-gray-900 rounded-lg shadow-2xl w-96 z-[9999] flex flex-col" style={{ maxHeight: '60vh' }}> 
      <Dialog.Title className="text-white font-semibold text-lg">Select an emoji</Dialog.Title>
      
      {/* Search Input Area */}
      <div className="flex items-center justify-between mb-3 mt-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Search emoji by keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow rounded bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
        />
        <Dialog.Close asChild>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white flex-shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </Dialog.Close>
      </div>

      {/* MODIFIED: Scrollable Area for Emojis */}
      <div className="flex-grow overflow-y-auto pr-2">
        {isSearching ? (
          // --- Flat Search Results ---
          <>
            {allFilteredEmojis.length > 0 ? (
                renderEmojiButtons(allFilteredEmojis)
            ) : (
                <p className="text-center text-gray-500 mt-4 text-sm">No emojis found for &quot;{searchTerm}&quot;.</p>
            )}
          </>
        ) : (
          // --- Categorized View ---
          filteredCategories.map(({ category, emojis }) => (
            <Fragment key={category}>
              <h4 className="text-sm font-semibold text-gray-400 mt-3 mb-1 sticky top-0 bg-gray-900 pt-1 z-10">
                {category}
              </h4>
              {renderEmojiButtons(emojis)}
            </Fragment>
          ))
        )}
      </div>
    </Dialog.Content>
  );
};

// --- Chat Panel Component (omitted for brevity, unchanged) ---
type ChatMessage = {
  id?: string;
  user: string;
  text: string;
  timestamp: string;
  replyTo?: { user: string; text: string } | null;
  deleted?: boolean;
  deletedAt?: string;
  status?: 'sending' | 'sent' | 'failed'; // ADDED: Message status
};
type UploadedFile = {
  id?: string;
  user: string;
  name: string;
  url: string;
  publicId?: string;
  timestamp: string;
  deleted?: boolean;
  deletedAt?: string;
  status?: 'sending' | 'sent' | 'failed'; // ADDED: File status
};

function ChatPanel({
  call,
  localParticipant,
  messages,
  setMessages,
  uploadedFiles,
  setUploadedFiles,
  setLastReadMessageTime,
  onClose,
  typingUsers, // ADDED: Prop for typing users
}: {
  call: unknown;
  localParticipant?: { name?: string; userId?: string } | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setLastReadMessageTime: React.Dispatch<React.SetStateAction<string | null>>;
  typingUsers: Set<string>; // ADDED: Type for typing users
  onClose: () => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [swipeMessage, setSwipeMessage] = useState<{ id: string; direction: 'left' | 'right' | null } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ADDED: Ref for typing timeout

  // When chat panel is opened, mark all as read
  useEffect(() => {
    if (messages.length > 0) {
      setLastReadMessageTime(messages[messages.length - 1].timestamp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, id: string) => {
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    setSwipeStartX(clientX);
    setSwipeMessage({ id, direction: null });
    if (!('touches' in e)) {
      setIsMouseDown(true);
    }
  };

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent, id: string) => {
    // For mouse events, only process if mouse is down
    if (!('touches' in e) && !isMouseDown) return;
    
    if (!swipeMessage || swipeMessage.id !== id) return;
    const currentX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = swipeStartX - currentX;
    const absDiff = Math.abs(diff);
    
    console.log('Swipe diff:', diff, 'Abs diff:', absDiff, 'Current X:', currentX, 'Start X:', swipeStartX);
    
    // Swipe threshold: 40px minimum
    const SWIPE_THRESHOLD = 40;
    
    // Left swipe (delete) - swipe left (diff becomes positive)
    if (diff > SWIPE_THRESHOLD) {
      setSwipeMessage({ id, direction: 'left' });
    }
    // Right swipe (reply) - swipe right (diff becomes negative)
    else if (diff < -SWIPE_THRESHOLD) {
      setSwipeMessage({ id, direction: 'right' });
    } else {
      setSwipeMessage({ id, direction: null });
    }
  };

  const handleSwipeEnd = (id: string) => {
    console.log('Swipe end:', swipeMessage);
    setIsMouseDown(false);
    if (!swipeMessage) return;
    
    if (swipeMessage.direction === 'left') {
      // Show delete confirmation dialog
      setDeleteConfirmId(id);
    } else if (swipeMessage.direction === 'right') {
      // Reply to message
      const msg = messages.find(m => (m.id || `${m.timestamp}-${m.user}`) === id);
      if (msg) {
        setReplyingTo(msg);
      } else {
        // Check files for reply
        const file = uploadedFiles.find(f => (f.id || f.url) === id);
        if (file) {
          setReplyingTo({
            id: file.id,
            user: file.user,
            text: `📁 ${file.name}`,
            timestamp: file.timestamp
          });
        }
      }
    }
    setSwipeMessage(null);
  };

  const handleDeleteForMe = (id: string) => {
    // Delete only for this user
    setMessages((prev) => prev.filter((m) => (m.id || `${m.timestamp}-${m.user}`) !== id));
    setUploadedFiles((prev) => prev.filter((f) => (f.id || f.url) !== id));
    setDeleteConfirmId(null);
  };

  const handleDeleteForEveryone = async (id: string) => {
    // Delete for everyone
    const msg = messages.find(m => (m.id || `${m.timestamp}-${m.user}`) === id);
    
    if (msg) {
      const messageId = msg.id || `${msg.timestamp}-${msg.user}`;

      // Update local state by matching messageId (safer than index)
      setMessages((prev) => {
        return prev.map(m => {
          const mid = m.id || `${m.timestamp}-${m.user}`;
          if (mid === messageId) {
            return {
              ...m,
              deleted: true,
              deletedAt: new Date().toISOString(),
            };
          }
          return m; 
        });
      });

      // Broadcast delete event to all participants using message ID instead of index
      console.log('Sending delete for everyone event for message ID:', messageId);
      try {
        await safeSendCustomEvent(call, {
          type: 'message-deleted',
          data: {
            messageId: messageId,
            messageText: msg.text || '',
            deletedBy: localParticipant?.name || localParticipant?.userId || 'Anonymous',
            deletedAt: new Date().toISOString(),
          },
        });
        console.log('Delete-for-everyone event sent successfully for', messageId);
      } catch (err) {
        console.error('Failed to send delete-for-everyone event', err);
      }
    } else {
      // Handle File Deletion
      const file = uploadedFiles.find(f => (f.id || f.url) === id);
      if (file) {
        const fileId = file.id || file.url;
        setUploadedFiles((prev) => {
          return prev.map(f => {
            const fid = f.id || f.url;
            if (fid === fileId) {
              return {
                ...f,
                deleted: true,
                deletedAt: new Date().toISOString(),
              };
            }
            return f;
          });
        });

        try {
          await safeSendCustomEvent(call, {
            type: 'message-deleted', // Reusing message-deleted for files
            data: {
              messageId: fileId,
              messageText: `File: ${file.name}`,
              deletedBy: localParticipant?.name || localParticipant?.userId || 'Anonymous',
              deletedAt: new Date().toISOString(),
              isFile: true
            },
          });
        } catch (err) {
          console.error('Failed to send file delete event', err);
        }
      }
    }

    setDeleteConfirmId(null);
  };

  // ADDED: Handle input change to send typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!call) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      safeSendCustomEvent(call, { type: 'typing-start', data: {} });
    }

    typingTimeoutRef.current = setTimeout(() => {
      safeSendCustomEvent(call, { type: 'typing-stop', data: {} });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const sendMessage = async () => {
    if (!call || newMessage.trim() === '') return;
    const messageId = `${new Date().toISOString()}-${localParticipant?.userId || 'anon'}`;
    const timestamp = new Date().toISOString();
    const messageData: ChatMessage = {
      id: messageId,
      user: localParticipant?.name || localParticipant?.userId || 'Anonymous',
      text: newMessage,
      timestamp: timestamp,
      replyTo: replyingTo ? { user: replyingTo.user, text: replyingTo.text } : null,
      status: 'sending',
    };
    setMessages((prev) => [...prev, messageData]);
    try {
      await safeSendCustomEvent(call, { type: 'chat-message', data: messageData });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
    // Clear typing status immediately when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      safeSendCustomEvent(call, { type: 'typing-stop', data: {} });
    }
    setNewMessage('');
    setReplyingTo(null);
  };

  const sendEmoji = async (emoji: string) => {
    if (!call) return;
    const messageId = `${new Date().toISOString()}-${localParticipant?.userId || 'anon'}`;
    const timestamp = new Date().toISOString();
    const messageData: ChatMessage = {
      id: messageId,
      user: localParticipant?.name || localParticipant?.userId || 'Anonymous',
      text: emoji,
      timestamp: timestamp,
      replyTo: null,
      status: 'sending',
    };
    setMessages((prev) => [...prev, messageData]);
    try {
      await safeSendCustomEvent(call, { type: 'chat-message', data: messageData });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      );
    } catch (error) {
      console.error('Failed to send emoji:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !call) return;

    console.log(`Selected file: ${selectedFile.name} (${selectedFile.size} bytes)`);

    try {
      const data = new FormData();
      data.append('file', selectedFile);

      console.log('Uploading to server...');
      
      const res = await fetch('/api/upload-simple', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed with status: ${res.status}`);
      }

      const { url, name, publicId } = await res.json();

      console.log(`Upload successful: ${url}`);

      const fileId = `${new Date().toISOString()}-${localParticipant?.userId || 'anon'}-file`;

      const newFile: UploadedFile = {
        id: fileId,
        user: localParticipant?.name || localParticipant?.userId || 'Anonymous',
        name: name,
        url,
        publicId,
        timestamp: new Date().toISOString(),
        status: 'sending', // ADDED: Initial status
      };

      setUploadedFiles((prev) => [...prev, newFile]);

      try {
        await safeSendCustomEvent(call, { type: 'file-upload', data: newFile });
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: 'sent' } : f))
        );
      } catch (err) {
        console.error('Failed to broadcast file upload:', err);
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: 'failed' } : f))
        );
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setUploadedFiles([]);
    setShowClearDialog(false);
  };

  const combinedLogs = [
    ...messages.map(m => ({ type: 'message' as const, data: m, timestamp: new Date(m.timestamp).getTime(), id: m.id || `${m.timestamp}-${m.user}` })),
    ...uploadedFiles.map(f => ({ type: 'file' as const, data: f, timestamp: new Date(f.timestamp).getTime(), id: f.id || f.url }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div
      className="fixed bottom-[110px] sm:bottom-[130px] left-2 sm:left-6 z-[70] w-80 max-w-[95vw] flex flex-col pointer-events-none"
    >
      {/* Header with Three-Dot Menu */} 
      <div className="flex items-center justify-between bg-card/80 rounded-t-2xl p-3 border-b border-border pointer-events-auto text-foreground">
        <h4 className="text-white font-semibold text-sm">Messages</h4>
        <div className="flex items-center gap-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-[#ffffff1a] text-white transition-colors"
                title="Chat options" 
              >
                <MoreVertical size={18} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[140px] bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 z-[9999]"
                sideOffset={5}
              >
                <DropdownMenu.Item asChild>
                  <button
                    type="button"
                    onClick={() => setShowClearDialog(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  >
                    <RotateCw size={14} />
                    Clear chat
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root> 
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-muted text-foreground transition-colors" title="Close chat">
            <X size={18} />
          </button>
        </div>
      </div>

 
      {/* Messages Container */}
      <div
        // FIX: Ensuring explicit, supported colors are used for backgrounds and borders
        className="flex flex-col-reverse gap-2 overflow-y-auto max-h-[40dvh] sm:max-h-[50vh] min-h-0 bg-[#00000066] p-3 backdrop-blur-md pointer-events-auto shadow-lg border-l border-r border-b border-[#ffffff1a]"
      >
        {combinedLogs.slice(-20).reverse().map((item) => {
          if (item.type === 'message') {
            const msg = item.data;
            const id = item.id;
            const isSwipeLeft = swipeMessage?.id === id && swipeMessage?.direction === 'left';
            const isSwipeRight = swipeMessage?.id === id && swipeMessage?.direction === 'right';
            
            return (
              <div
                key={id}
                className="relative flex items-center gap-1 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={(e) => handleSwipeStart(e, id)}
                onMouseMove={(e) => handleSwipeMove(e, id)}
                onMouseUp={() => handleSwipeEnd(id)}
                onMouseLeave={() => setSwipeMessage(null)}
                onTouchStart={(e) => handleSwipeStart(e, id)}
                onTouchMove={(e) => handleSwipeMove(e, id)}
                onTouchEnd={() => handleSwipeEnd(id)}
              >
                {/* Swipe indicators */}
                {isSwipeLeft && (
                  <div className="absolute left-0 text-red-500 text-xs font-bold flex items-center gap-1 pl-2">
                    <Trash size={14} /> Delete
                  </div>
                )}
                {isSwipeRight && (
                  <div className="absolute right-0 text-green-500 text-xs font-bold flex items-center gap-1 pr-2">
                    <MessageCircle size={14} /> Reply
                  </div>
                )}

                {/* Message */}
                <div
                  className={cn(
                    "flex items-end gap-2 w-full transition-opacity duration-200",
                    msg.user === (localParticipant?.name || localParticipant?.userId)
                      ? "justify-end"
                      : "justify-start",
                    (isSwipeLeft || isSwipeRight) ? "opacity-50" : "opacity-100"
                  )}
                >
                  {/* ADDED: Message Status Indicator */}
                  {msg.user === (localParticipant?.name || localParticipant?.userId) && !msg.deleted && (
                    <div className="self-end mb-1 pr-1">
                      {msg.status === 'sending' && <Clock size={12} className="text-gray-400" />}
                      {msg.status === 'sent' && <Check size={12} className="text-green-400" />}
                      {msg.status === 'failed' && <AlertCircleIcon size={12} className="text-red-500" />}
                    </div>
                  )}

                  {msg.deleted ? (
                    // Deleted message placeholder (like WhatsApp)
                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl text-sm italic text-gray-500",
                        msg.user === (localParticipant?.name || localParticipant?.userId) 
                          ? "bg-primary/20 text-primary-foreground/80 rounded-br-md" 
                          : "bg-muted/20 text-muted-foreground rounded-bl-md" 
                      )} 
                    >
                      <Trash size={14} className="inline mr-1" />
                      Message deleted
                    </div>
                  ) : (
                    // Normal message
                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl text-sm max-w-[70%] break-words shadow",
                        // FIX: Use explicit hex colors
                        msg.user === (localParticipant?.name || localParticipant?.userId) 
                          ? "bg-primary text-primary-foreground rounded-br-md" 
                          : "bg-secondary text-secondary-foreground rounded-bl-md" 
                      )}
                    >
                      {/* Quoted Reply Block */}
                      {msg.replyTo && (
                        <div className={cn(
                          "mb-2 pb-2 border-l-2 pl-2 text-xs italic",
                          msg.user === (localParticipant?.name || localParticipant?.userId)
                            ? "border-[#60A5FA] text-blue-100"
                            : "border-gray-400 text-gray-700"
                        )}>
                          <div className="font-semibold">{msg.replyTo.user}</div>
                          <div className="truncate">{msg.replyTo.text}</div>
                        </div>
                      )}
                      <span className="font-semibold mr-1">{msg.user}:</span>
                      <span>{msg.text}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            const file = item.data;
            const id = item.id;
            const isSwipeLeft = swipeMessage?.id === id && swipeMessage?.direction === 'left';
            const isSwipeRight = swipeMessage?.id === id && swipeMessage?.direction === 'right';

            return (
              <div
                key={id}
                className="relative flex items-center gap-1 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={(e) => handleSwipeStart(e, id)}
                onMouseMove={(e) => handleSwipeMove(e, id)}
                onMouseUp={() => handleSwipeEnd(id)}
                onMouseLeave={() => setSwipeMessage(null)}
                onTouchStart={(e) => handleSwipeStart(e, id)}
                onTouchMove={(e) => handleSwipeMove(e, id)}
                onTouchEnd={() => handleSwipeEnd(id)}
              >
                {/* Swipe indicators */}
                {isSwipeLeft && (
                  <div className="absolute left-0 text-red-500 text-xs font-bold flex items-center gap-1 pl-2 z-10">
                    <Trash size={14} /> Delete
                  </div>
                )}
                {isSwipeRight && (
                  <div className="absolute right-0 text-green-500 text-xs font-bold flex items-center gap-1 pr-2 z-10">
                    <MessageCircle size={14} /> Reply
                  </div>
                )}

                <div className={cn(
                  "flex items-end gap-2 w-full transition-opacity duration-200",
                  file.user === (localParticipant?.name || localParticipant?.userId) ? "justify-end" : "justify-start",
                  (isSwipeLeft || isSwipeRight) ? "opacity-50" : "opacity-100"
                )}>
                  {/* ADDED: File Status Indicator */}
                  {file.user === (localParticipant?.name || localParticipant?.userId) && !file.deleted && (
                    <div className="self-end mb-1 pr-1">
                      {file.status === 'sending' && <Clock size={12} className="text-gray-400" />}
                      {file.status === 'sent' && <Check size={12} className="text-green-400" />}
                      {file.status === 'failed' && <AlertCircleIcon size={12} className="text-red-500" />}
                    </div>
                  )}

                  {file.deleted ? (
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm italic text-gray-500",
                      file.user === (localParticipant?.name || localParticipant?.userId)
                        ? "bg-primary/20 rounded-br-md" : "bg-muted/20 rounded-bl-md"
                    )}>
                      <Trash size={14} className="inline mr-1" />
                      File deleted
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded max-w-[85%]",
                      file.user === (localParticipant?.name || localParticipant?.userId) 
                        ? "bg-primary/20 rounded-br-md" 
                        : "bg-secondary/20 rounded-bl-md" 
                    )}>
                      <span className="font-bold text-green-400 text-xs">{file.user}:</span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex-grow text-sm truncate"
                        title="View file in new tab"
                      >
                        {file.name}
                      </a>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            if (!file.publicId) {
                              alert('File information incomplete');
                              return;
                            }
                            const downloadUrl = `/api/download-file?fileName=${encodeURIComponent(file.publicId)}&originalName=${encodeURIComponent(file.name)}`;
                            window.location.href = downloadUrl;
                          } catch (error) {
                            console.error('Download failed:', error);
                          }
                        }}
                        className="ml-2 px-2 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer"
                        title="Download file"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-card border-l-4 border-primary px-3 py-2 text-xs text-muted-foreground flex items-center justify-between pointer-events-auto">
          <div>
            <div className="font-semibold text-blue-400">Replying to {replyingTo.user}:</div>
            <div className="text-gray-400 truncate">{replyingTo.text}</div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="ml-2 text-gray-500 hover:text-white"
            aria-label="Cancel reply"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ADDED: Typing Indicator */}
      {typingUsers.size > 0 && (
          <div className="flex items-center gap-3 bg-muted rounded-2xl rounded-bl-none px-4 py-2 w-fit shadow-md border border-border text-muted-foreground">
             <div className="flex gap-1 h-3 items-center">
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
             </div>
             <span className="text-xs text-gray-300 italic">
               {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
             </span>
          </div>
      )}

      {/* Input bar */}
      <div className="flex items-center mt-0 pointer-events-auto">
        {/* FIX: Ensuring explicit, supported colors are used for backgrounds and borders */}
        <div className="flex items-center bg-card/80 border border-border rounded-b-2xl rounded-t-none px-3 py-2 w-full gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange} // UPDATED: Use handleInputChange
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Send a message..."
            className="flex-grow bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground"
          />
          <Dialog.Root open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-gray-700 text-white"
                tabIndex={-1}
                aria-label="Choose emoji" 
              >
                <Smile size={20} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-background/50 z-[9998] flex items-center justify-center">
                <EmojiPicker onEmojiSelect={sendEmoji} onClose={() => setShowEmojiPicker(false)} />
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog.Root>
          <label className="p-1 rounded-full hover:bg-blue-600 text-white cursor-pointer">
            <Paperclip size={20} />
            <input type="file" onChange={handleFileUpload} className="hidden" accept="*" aria-label="Upload file" />
          </label>
          <button
            onClick={sendMessage}
            className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            type="button"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" width={18} height={18}>
              <path d="M4 20L20 12L4 4V10L16 12L4 14V20Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog.Root open={showClearDialog} onOpenChange={setShowClearDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-background/50 z-[9998]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-[9999]">
            <Dialog.Title className="text-lg font-bold text-white mb-2">
              Clear Chat?
            </Dialog.Title>
            <p className="text-gray-300 text-sm mb-6">
              This will delete all messages. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearDialog(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Message Confirmation Dialog */}
      <Dialog.Root open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-background/50 z-[9998]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-[9999]">
            <Dialog.Title className="text-lg font-bold text-white mb-2">
              Delete Message?
            </Dialog.Title>
            <p className="text-gray-300 text-sm mb-6">
              Choose how to delete this message.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => deleteConfirmId !== null && handleDeleteForMe(deleteConfirmId)}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Delete for Me
              </button>
              <button
                onClick={() => deleteConfirmId !== null && handleDeleteForEveryone(deleteConfirmId)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete for Everyone
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


// NEW FUNCTION: Kazi ya kupunguza (compress) ukubwa wa picha kabla ya kupakia
const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file); // Usipunguze faili ambazo sio picha
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Punguza upana upeo
                const MAX_HEIGHT = 800; // Punguza urefu upeo
                let width = img.width;
                let height = img.height;

                // Punguza vipimo
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Convert canvas to a compressed Blob (JPEG 70% quality)
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Unda File mpya kutoka kwenye Blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file); // Rudisha faili asili ikiwa compression imeshindwa
                    }
                }, 'image/jpeg', 0.7); // <-- Ubora umepunguzwa hadi 0.7 (70%)
            };

            img.onerror = () => resolve(file); // Rudisha faili asili ikiwa kuna shida
        };

        reader.onerror = () => resolve(file); // Rudisha faili asili ikiwa kuna shida
    });
};

// NEW FUNCTION: Kazi ya kufomati muda wa sekunde kwenda (M:SS)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};


// ADDED: --- Voting Box Component ---
function VotingBox({
  call,
  isCreator,
  currentPoll,
  setCurrentPoll,
  onDownloadPDF, 
  onClose,
}: {
  call: unknown;
  isCreator: boolean;
  currentPoll: Poll | null;
  setCurrentPoll: React.Dispatch<React.SetStateAction<Poll | null>>;
  onDownloadPDF: (element: HTMLElement | null, fileName: string) => void; 
  onClose: () => void;
}) {
  const [pollPosition, setPollPosition] = useState(''); // NEW: Cheo
  const [newQuestion, setNewQuestion] = useState('');
  // UPDATED: Sasa inahifadhi text na file kabla ya kupakia
  const [newOptions, setNewOptions] = useState<
    { text: string; file: File | null }[]
  >([
    { text: '', file: null },
    { text: '', file: null },
  ]);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null); // NEW: Chaguo lake
  const [voteAttemptCount, setVoteAttemptCount] = useState(0); // NEW: Kuhesabu majaribio ya kurudia
  // NEW: Kufuatilia hali ya kupakia picha
  const [isUploading, setIsUploading] = useState(false); 
  // NEW STATE: Hifadhi muda wa dakika kwa kura mpya
  const [pollDurationMins, setPollDurationMins] = useState<number>(5); 
  // NEW STATE: Kufuatilia muda uliobaki kwenye kura
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); 
  const [candidateSearch, setCandidateSearch] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const zoomModal = zoomedImage && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}>
       <div className="relative max-w-full max-h-full flex flex-col items-center">
          <img src={zoomedImage} alt="Zoomed Candidate" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-[0_0_40px_rgba(255,255,255,0.2)] border border-gray-700" onClick={(e) => e.stopPropagation()} />
          <button className="absolute -top-4 -right-4 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}>
            <X size={20} />
          </button>
       </div>
    </div>
  );

  
  const resultsRef = useRef<HTMLDivElement>(null);

  // Define endPoll before effects that may call it to avoid temporal-dead-zone issues
  const endPoll = useCallback(async () => {
    if (!call || !currentPoll) return;
    const finalPoll = { ...currentPoll, isActive: false };
    try {
      // Send the final poll results to all participants
      await safeSendCustomEvent(call, { type: 'end-poll', data: finalPoll });
    } catch {
      console.error('Failed to end poll');
    }
  }, [call, currentPoll]);

  // Effect to reset hasVoted when a new poll starts
  useEffect(() => {
    if (currentPoll && currentPoll.isActive) {
     setHasVoted(false);
     setSelectedOptionId(null);
     setVoteAttemptCount(0);
     setCandidateSearch('');
    }
  }, [currentPoll]);
  
  // NEW EFFECT: Timer for active poll
  useEffect(() => {
    if (!currentPoll || !currentPoll.isActive || !currentPoll.endTime) {
      setTimeRemaining(null);
      return;
    }

    const endTime = new Date(currentPoll.endTime).getTime();

    const calculateTimeRemaining = () => {
      const now = Date.now();
      const difference = endTime - now;
      const seconds = Math.max(0, Math.floor(difference / 1000));
      setTimeRemaining(seconds);

        // Kazi ya Creator: Kura inaisha wakati muda unaisha
        if (isCreator && seconds === 0) {
          // Tuma tukio la kumaliza kura
          endPoll();
        }
    };

    calculateTimeRemaining(); // Run immediately

    const intervalId = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(intervalId);
  }, [currentPoll, isCreator, endPoll]); // include endPoll because it's called inside the effect


  // NEW: Handle file selection for a specific option
  const handleFileSelect = (index: number, file: File | null) => {
    const updatedOptions = [...newOptions];
    updatedOptions[index] = { ...updatedOptions[index], file: file };
    setNewOptions(updatedOptions);
  };
  
  // Update text
  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newOptions];
    updatedOptions[index] = { ...updatedOptions[index], text: value };
    setNewOptions(updatedOptions);
  };

  const addOption = () => {
    setNewOptions([...newOptions, { text: '', file: null }]);
  };

  const removeOption = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };


  const startPoll = async () => {
    // Angalia kama kuna swali na chaguo angalau mbili zenye text
    if (
      !call ||
      newQuestion.trim() === '' ||
      newOptions.filter(o => o.text.trim() !== '').length < 2
    )
      return;

    setIsUploading(true); // Anza hali ya kupakia picha

    try {
      // 1. Pakia picha zote kwanza na pata URLs
      const optionsWithUrls = await Promise.all(
        newOptions.map(async (option, index) => {
          let imageUrl: string | null = null;

          if (option.file) {
            // NEW: Punguza (Compress) picha kwanza
            const compressedFile = await compressImage(option.file); 
            
            // Tuma faili ILIYOPUNGUA ukubwa kwenye Firebase Storage
            const storageRef = ref(
              firebaseStorage,
              `poll_images/${Date.now()}_${compressedFile.name}`
            );
            await uploadBytes(storageRef, compressedFile);
            imageUrl = await getDownloadURL(storageRef);
          }

          return {
            id: index,
            text: option.text.trim(),
            votes: 0,
            imageUrl: imageUrl, // Hifadhi URL kwenye data ya kura
          };
        })
      );
      
      // Calculate end time based on the set duration (duration in minutes * 60,000 milliseconds)
      const calculatedEndTime = new Date(Date.now() + pollDurationMins * 60000).toISOString();


      // 2. Tayarisha data ya mwisho ya kura
      const pollData: Poll = {
        position: pollPosition.trim() || 'Nafasi Haijabainishwa',
        question: newQuestion,
        options: optionsWithUrls,
        totalVotes: 0,
        isActive: true,
        endTime: calculatedEndTime, // <--- SET END TIME
      };

      // 3. Tuma tukio kwa washiriki wote
  await safeSendCustomEvent(call, { type: 'start-poll', data: pollData });
      setPollPosition('');
      setNewQuestion('');
      setNewOptions([
        { text: '', file: null },
        { text: '', file: null },
      ]);
      setPollDurationMins(5); // Reset duration
    } catch {
      console.error('Failed to start poll or upload image');
      alert('Failed to start poll or upload image. Check console for details.');
    } finally {
      setIsUploading(false); // Maliza hali ya kupakia picha
    }
  };

  

  const castVote = async (optionId: number) => {
    // Check if voting is possible
    if (!call || !currentPoll || !currentPoll.isActive || timeRemaining === 0) return;

    // Zuia kupiga kura mara mbili na toa onyo/adhabu
    if (hasVoted) {
      const newAttempts = voteAttemptCount + 1;
      setVoteAttemptCount(newAttempts);
      
      if (newAttempts === 1) {
        toast.error("ONYO ⚠️: Umeshapiga kura tayari! Ni kosa la kinidhamu kurudia. Ukijaribu tena utatolewa kwenye kikao automatically.");
      } else if (newAttempts >= 2) {
        // Kick the user out and broadcast message
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const systemMsg: any = {
          id: `${Date.now()}-system`,
          user: "MFUMO (UYAO SECURITY)",
          text: `🚨 Mshiriki ametolewa kwenye kikao kwa kujaribu kupiga kura zaidi ya mara moja kwa nguvu, kinyume na kanuni.`,
          timestamp: new Date().toISOString(),
        };
        safeSendCustomEvent(call, { type: 'chat-message', data: systemMsg }).catch(() => {});
        
        toast.error("Umetolewa kwenye kikao kwa kukiuka kanuni za uchaguzi!");
        setTimeout(async () => {
          await (call as Call).leave();
          window.location.href = '/';
        }, 1500);
      }
      return;
    }

    setHasVoted(true); 
    setSelectedOptionId(optionId);

    // 3. Send vote event to others
    try {
      await safeSendCustomEvent(call, { type: 'vote', data: { optionId } });
    } catch {
      console.error('Failed to cast vote');
      // Revert hasVoted flag if sending fails 
      setHasVoted(false);
    }
  };


  // Render Poll Creation (Creator Only)
  if (isCreator && (!currentPoll || !currentPoll.isActive)) {
      const poll = currentPoll;
      if (poll && !poll.isActive) {
          // Poll is ended, show results and an option to clear
          return (
              <>
              <div className="p-5 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-2xl w-80 max-w-[90vw] transition-all duration-300 pointer-events-auto border border-gray-700 max-h-[60dvh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><Vote size={20} className="text-blue-400"/> Matokeo (Results)</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close" title="Close"><X size={18} /></button>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 bg-gray-800 p-2 rounded-lg border border-gray-700">Kura zilizopigwa: <span className="text-white font-bold">{poll.totalVotes}</span></p>
                  
                  <div 
                      ref={resultsRef} 
                      className="pb-6 pt-4 px-5 bg-white rounded-xl shadow-inner text-black mb-4"
                      style={{ width: '100%', minHeight: '300px', position: 'relative' }}
                  >
                      {/* Header ya PDF (Inaonekana nzuri kwenye print) */}
                      <div className="text-center mb-6 border-b-2 border-blue-600 pb-4">
                        <h2 className="text-xl font-black uppercase tracking-widest text-gray-800">Matokeo Rasmi</h2>
                        <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">{poll.position || 'Uchaguzi'}</p>
                        <p className="text-xs text-gray-500 mt-1 italic">{poll.question}</p>
                      </div>

                      {(() => {
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#eab308', '#14b8a6'];
                          const radius = 25;
                          const circumference = 2 * Math.PI * radius;
                          let cumulativePercent = 0;

                          return (
                              <div className="flex flex-col items-center gap-6 relative z-10">
                                  {/* The Pie Chart (SVG for html2canvas support) */}
                                  <svg viewBox="0 0 100 100" className="w-48 h-48 rounded-full shadow-lg transform -rotate-90 bg-gray-200 border-4 border-white">
                                      {poll.totalVotes > 0 && poll.options.map((opt, i) => {
                                          const pct = opt.votes / poll.totalVotes;
                                          const strokeLength = pct * circumference;
                                          const offset = -cumulativePercent * circumference;
                                          
                                          const startAngle = cumulativePercent * 360;
                                          const sliceAngle = pct * 360;
                                          const midAngle = startAngle + (sliceAngle / 2);
                                          const midAngleRad = midAngle * (Math.PI / 180);
                                          const textRadius = 15; 
                                          const textX = 50 + textRadius * Math.cos(midAngleRad);
                                          const textY = 50 + textRadius * Math.sin(midAngleRad);

                                          cumulativePercent += pct;
                                          if (pct === 0) return null;
                                          return (
                                              <g key={opt.id}>
                                                  <circle r={radius} cx="50" cy="50" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="50" strokeDasharray={`${strokeLength} ${circumference}`} strokeDashoffset={offset} className="transition-all duration-1000" />
                                                  {pct > 0.04 && (
                                                      <text x={textX} y={textY} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="central" transform={`rotate(90, ${textX}, ${textY})`}>
                                                          {Math.round(pct * 100)}%
                                                      </text>
                                                  )}
                                              </g>
                                          );
                                      })}
                                  </svg>

                                  {/* The Legend */}
                                  <div className="w-full flex flex-col gap-3">
                                      {poll.options.map((option, index) => {
                                          const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                                          const color = colors[index % colors.length];
                                          return (
                                              <div key={option.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: color }}></div>
                                                      {option.imageUrl && <img src={option.imageUrl} alt={option.text} crossOrigin="anonymous" className="w-8 h-8 rounded-full object-cover border border-gray-300 cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); setZoomedImage(option.imageUrl); }} />}
                                                      <span className="font-bold text-sm text-gray-800 uppercase">{option.text}</span>
                                                  </div>
                                                  <div className="flex flex-col items-end">
                                                      <span className="font-black text-sm" style={{ color }}>{percentage.toFixed(1)}%</span>
                                                      <span className="text-[10px] text-gray-500 font-semibold">{option.votes} Kura</span>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })()}
                      {/* Watermark Logo/Text chini ya PDF */}
                      <div className="absolute bottom-2 left-0 w-full text-center opacity-30">
                        <span className="text-[10px] font-black tracking-[0.3em] text-gray-400">UYAO ELECTION SYSTEM</span>
                      </div>
                  </div>

                  <button
                      type="button"
                      onClick={() => onDownloadPDF(resultsRef.current, `Poll-Results-${new Date().toISOString()}.pdf`)}
                      className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
                  >
                      <FileText size={18}/> Download Results PDF
                  </button>

                  <button
                      type="button"
                      onClick={() => setCurrentPoll(null)}
                      className="w-full mt-3 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
                  >
                      Clear Results & Start New Poll
                  </button>
              </div>
                      {zoomModal}
                      </>
          );
      }
    
    // Poll Creation UI
    return (
      <>
      <div className="p-5 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-2xl w-80 max-w-[90vw] pointer-events-auto border border-gray-700 max-h-[60dvh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
          <h3 className="text-white font-bold flex items-center gap-2"><Vote size={18} className="text-blue-400"/> Andaa Uchaguzi (Poll)</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close" title="Close"><X size={18} /></button>
        </div>
        
        <div className="mb-3 flex flex-col gap-3">
            <div>
              <label className="text-gray-300 text-xs font-bold block mb-1 uppercase tracking-wider">Cheo (Position) <span className="text-red-400">*</span></label>
              <input
                  type="text"
                  placeholder="Mf. Mwenyekiti, Katibu..."
                  value={pollPosition}
                  onChange={(e) => setPollPosition(e.target.value)}
                  className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="poll-question" className="text-gray-300 text-xs font-bold block mb-1 uppercase tracking-wider">Swali (Question)</label>
            <input
                id="poll-question"
                type="text"
                placeholder="Mf. Nani anafaa kuwa kiongozi?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            </div>
        </div>
        
        {/* NEW: Input kwa ajili ya kuweka muda wa kura (Duration) */}
        <div className="mb-3">
            <label htmlFor="pollDuration" className="text-gray-300 text-xs font-bold block mb-1 uppercase tracking-wider">Muda (Dakika)</label>
            <input
                id="pollDuration"
                type="number"
                min="1"
                max="60"
                value={pollDurationMins}
                onChange={(e) => setPollDurationMins(Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Time to end the vote" // Added placeholder for clarity
            />
        </div>
        
        <div className="mt-4 mb-2">
           <label className="text-gray-300 text-xs font-bold block mb-2 uppercase tracking-wider border-b border-gray-700 pb-1">Wagombea (Candidates)</label>
        </div>
        {newOptions.map((option, index) => (
          <div key={index} className="flex flex-col mb-3 p-3 border border-gray-700 bg-gray-800/50 rounded-xl relative group">
            <div className="flex items-center mb-2">
                <input
                  type="text"
                  placeholder={`Jina la Mgombea ${index + 1}`}
                  value={option.text}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-grow rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {newOptions.length > 2 && (
                  <button type="button" onClick={() => removeOption(index)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md" aria-label="Remove option">
                    <X size={12} strokeWidth={3}/>
                  </button>
                )}
            </div>
            
            {/* INPUT KWA AJILI YA PICHA YA MGOMBEA */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs cursor-pointer border border-dashed border-gray-500 transition-colors">
                <div className="flex items-center gap-2">
                    {option.file ? (
                        <span className="text-green-400 font-bold flex items-center gap-1 truncate max-w-[200px]">
                            <Check size={14} /> Picha Imewekwa
                        </span>
                    ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                            <Upload size={14} /> Weka Picha (Hiari)
                        </span>
                    )}
                </div>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileSelect(index, e.target.files?.[0] || null)} 
                    className="hidden" 
                    aria-label="Upload candidate image"
                />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="w-full mb-4 text-blue-400 font-bold border border-dashed border-blue-500/50 rounded-xl py-2.5 text-sm hover:bg-blue-900/30 transition-colors flex justify-center items-center gap-2"
        >
          <Users size={16}/> Ongeza Mgombea
        </button>
        <button
          type="button"
          onClick={startPoll}
          disabled={!pollPosition.trim() || newOptions.filter(o => o.text.trim() !== '').length < 2 || isUploading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black uppercase tracking-wider disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:shadow-none transition-all flex justify-center items-center gap-2"
        >
          {isUploading ? <Loader /> : 'Anzisha Uchaguzi'}
        </button>
        {isUploading && (
            <p className="mt-3 text-center text-yellow-400 text-xs font-bold animate-pulse">Tafadhali subiri, picha zinapakiwa...</p>
        )}
      </div>
      </>
    );
  }

  // Render Active Poll (All Participants)
  if (currentPoll && currentPoll.isActive) {
    const poll = currentPoll;
    return (
      <>
      <div className="p-5 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-2xl w-80 max-w-[90vw] transition-all duration-300 pointer-events-auto border border-gray-700 max-h-[60dvh] overflow-y-auto">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-blue-400 font-black text-sm uppercase tracking-widest bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-500/30">{poll.position || 'Uchaguzi'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close" title="Close"><X size={18} /></button>
        </div>
        <h4 className="text-white font-bold text-base mb-3 leading-snug">{poll.question}</h4>
        
        {/* NEW: Display Timer/Time Remaining */}
        <div className="flex justify-between items-center mb-4 bg-gray-900 px-3 py-2 rounded-lg border border-gray-700">
             <p className="text-xs font-bold text-gray-400">{poll.totalVotes} Kura</p>
             {timeRemaining !== null && (
                <p className={cn("font-black text-sm flex items-center gap-1", {
                    "text-red-500 animate-pulse": timeRemaining <= 60, // Muda unakaribia kuisha
                    "text-yellow-400": timeRemaining > 60,
                })}>
                    <Clock size={14}/> {formatTime(timeRemaining)}
                </p>
             )}
        </div>

        {/* NEW: Input kwa ajili ya kutafuta wagombea */}
        <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
                type="text"
                placeholder="Tafuta mgombea..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
        </div>
        
        {(() => {
            const filteredOptions = poll.options.filter(opt => opt.text.toLowerCase().includes(candidateSearch.toLowerCase()));
            
            if (filteredOptions.length === 0) {
                return <p className="text-center text-gray-400 text-sm py-4">Hakuna mgombea aliyepatikana.</p>;
            }

            return filteredOptions.map((option) => {
              const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
              const isSelected = hasVoted && selectedOptionId === option.id;
              
              return (
                <div key={option.id} className="mb-3">
                  <button
                    type="button"
                    onClick={() => castVote(option.id)}
                    disabled={timeRemaining === 0}
                    className={cn(
                      "w-full p-3 rounded-xl text-left text-sm relative overflow-hidden transition-all duration-300 flex items-center gap-3 border",
                      {
                        "bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500 cursor-pointer shadow-sm": !hasVoted && timeRemaining !== 0,
                        "bg-blue-900/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-blue-500": isSelected,
                        "bg-gray-800/50 border-gray-700 opacity-60": hasVoted && !isSelected,
                        "bg-gray-800 border-gray-700 opacity-40 cursor-not-allowed": timeRemaining === 0,
                      }
                    )}
                  >
                    {/* Visual bar for results (shows up after voting, or if not yet voted and poll is active) */}
                    {(hasVoted || !poll.isActive || timeRemaining === 0) && (
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 opacity-20"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    )}
                    
                    {/* Picha ya Mgombea inayoonekana wakati wa kupiga kura */}
                    {option.imageUrl && (
                        <img src={option.imageUrl} alt={option.text} crossOrigin="anonymous" className={cn("relative z-10 w-10 h-10 rounded-full object-cover border-2 shadow-sm transition-transform cursor-pointer", isSelected ? "border-blue-400 scale-110" : "border-gray-500 hover:scale-110")} onClick={(e) => { e.stopPropagation(); setZoomedImage(option.imageUrl); }} />
                    )}
                    
                    <span className={cn("relative z-10 font-bold uppercase tracking-wide", isSelected ? "text-white" : "text-gray-200")}>{option.text}</span>
                    
                    {(hasVoted || !poll.isActive || timeRemaining === 0) && poll.totalVotes > 0 && (
                      <span className="relative z-10 ml-auto text-xs font-black bg-gray-900/50 px-2 py-1 rounded-lg">{Math.round(percentage)}%</span>
                    )}
                  </button>
                </div>
              );
            });
        })()}
        
        <p className="text-center text-xs mt-4 font-bold bg-gray-900 py-2 rounded-lg border border-gray-700">
          {timeRemaining === 0 
            ? <span className="text-red-400">Uchaguzi umefungwa. Tunasubiri matokeo...</span>
            : hasVoted ? <span className="text-green-400 flex items-center justify-center gap-1"><Check size={14}/> Umeshapiga kura kikamilifu!</span> : <span className="text-yellow-400">Tafadhali chagua mgombea mmoja.</span>
          }
        </p>

        {isCreator && (
          <button
            type="button"
            onClick={endPoll}
            disabled={timeRemaining === 0}
            className="w-full mt-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:bg-gray-700 disabled:text-gray-500 transition-colors shadow-lg"
          >
            End Poll (Funga Kura)
          </button>
        )}
      </div>
      {zoomModal}
      </>
    );
  }

  // Render when no poll is active (Non-Creator)
  return (
    <>
    <div className="p-4 bg-gray-900 rounded-lg shadow-xl w-72 max-w-[90vw] text-center pointer-events-auto max-h-[60dvh] overflow-y-auto">
      <div className="flex justify-end mb-2"><button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close" title="Close"><X size={18} /></button></div>
      {isCreator ? (
        <button 
          type="button"
          onClick={() => setCurrentPoll(null)}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
          title="Start New Poll"
          aria-label="Start New Poll"
        >
          Start New Poll
        </button>
      ) : (
        <p className="text-white text-sm">No active poll.</p>
      )}
    </div>
            {zoomModal}
            </>
  );
}


// --- Main MeetingRoom Component ---
export default function MeetingRoom() {
  const useSearchParam = useSearchParams();
  const isPersonalRoom = !!useSearchParam.get('personal');
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false); // NEW: State for whiteboard
  const [showVotingBox, setShowVotingBox] = useState(false); 
  const [showTranslationPanel, setShowTranslationPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  
  // FIX: Explicitly typed the state as Set<string>
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set()); 
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [lastReadMessageTime, setLastReadMessageTime] = useState<string | null>(null);
  const [showEnableMicPrompt, setShowEnableMicPrompt] = useState(false);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null); // Poll state
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set()); // ADDED: State for typing users
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveCallDialog, setShowLeaveCallDialog] = useState(false);
  const [notificationSound, setNotificationSound] = useState<string>(DEFAULT_NOTIFICATION_SOUND);
  const [notificationVolume, setNotificationVolume] = useState(0.5);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingOwner, setIsRecordingOwner] = useState(false);
  const [showStopRecordingDialog, setShowStopRecordingDialog] = useState(false);

  // ADDED: Refs for stable callbacks to prevent infinite re-renders & flickering
  const soundSettingsRef = useRef({ sound: DEFAULT_NOTIFICATION_SOUND, volume: 0.5, muted: false });

  useEffect(() => {
    soundSettingsRef.current = { sound: notificationSound, volume: notificationVolume, muted: isSoundMuted };
  }, [notificationSound, notificationVolume, isSoundMuted]);

  // Load settings from local storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedVolume = localStorage.getItem('notificationVolume');
      if (savedVolume) setNotificationVolume(parseFloat(savedVolume));

      // Try loading from IndexedDB first (supports large files)
      const dbSound = await getSoundFromDB();
      if (dbSound) {
        setNotificationSound(dbSound);
      } else {
        // Fallback to localStorage for backward compatibility
        const savedSound = localStorage.getItem('notificationSound');
        if (savedSound) setNotificationSound(savedSound);
      }
    };
    loadSettings();
  }, []);

  // Correctly destructuring `useLocalParticipant` from `useCallStateHooks`
  const { useParticipants, useCallCallingState, useLocalParticipant, useIsCallRecordingInProgress } = useCallStateHooks();
  const participants = useParticipants() ?? [];
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant(); // Correctly calling the hook
  const isRecording = useIsCallRecordingInProgress();

  const call = useCall();
  const router = useRouter();

  const currentUserId = call?.currentUserId;
  const createdById = call?.state?.createdBy?.id;
  const isCreator = currentUserId === createdById;

  // Check if this user started the recording (survives page reloads)
  useEffect(() => {
    if (call?.id) {
      const storedOwner = sessionStorage.getItem(`recordingOwner_${call.id}`);
      if (storedOwner === 'true') {
        setIsRecordingOwner(true);
      }
    }
  }, [call?.id]);

  const playNotificationSound = useCallback((overrideSound?: string) => {
      const { sound, volume, muted } = soundSettingsRef.current;
      if (!muted) playSound(overrideSound || sound, volume);
  }, []);

  // ADDED: Sound effect helper

  useEffect(() => {
    if (!call) return;

    const handleCallEnded = () => {
      router.push('/');
    };

  const handleRaiseHandEvent = (event: unknown) => {
      // Use the type guard to safely check the event type
      if (!isCustomEventType(event)) {
        console.warn('Received a custom event with an unexpected format:', event);
        return;
      }
    
      // Check if the event is from the current user (the sender), and ignore it if so.
      // This is a common pattern to avoid processing your own message twice.
      if (event.user.id === call.currentUserId) {
        return;
      }

  const ev = event as CustomEventType;
  const data = ev.custom.data as Record<string, unknown> | undefined;
  if (ev.custom.type === 'raise-hand' && data?.userId) {
        // Since raisedHands is now typed as Set<string>, this function signature is correct
        setRaisedHands((prev) => { 
          const newSet = new Set(prev);
          const userId = event.user.id; // Use the sender's ID from the event
          if (newSet.has(userId)) {
            newSet.delete(userId);
          } else {
            newSet.add(userId);
          }
          return newSet;
        });
      }
    };

    // CRITICAL: Handle Voting Events, ensuring self-sent events are ignored for state integrity
    // This handler is now the single source of truth for all poll state updates.
    const handleVotingEvent = (event: unknown) => {
      if (!isCustomEventType(event)) return;
      // CRITICAL: We DO NOT ignore self-sent events here. Since we removed the local setCurrentPoll
      // calls in VotingBox, the sender must rely on the network event coming back to update their state.

      const ev = event as CustomEventType;
      if (ev.custom.type === 'start-poll') {
        setCurrentPoll(ev.custom.data as Poll);
        // ADDED: Play sound for new poll (if not created by self)
        if (ev.user.id !== call.currentUserId) {
          playNotificationSound(notificationSound);
        }
      } else if (ev.custom.type === 'vote') {
        // Vote received, update poll state for all clients (including the sender of the vote)
        setCurrentPoll(prevPoll => {
          if (!prevPoll || !prevPoll.isActive) return null;

          const data = ev.custom.data as Record<string, unknown> | undefined;
          const optionId = data?.optionId as number | undefined;
          const updatedOptions = prevPoll.options.map((opt) =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          );

          return {
            ...prevPoll,
            options: updatedOptions,
            totalVotes: prevPoll.totalVotes + 1,
          };
        });
      } else if (event.custom.type === 'end-poll') {
        // Poll ended by creator, update state to show results
        setCurrentPoll(event.custom.data as Poll);
      }
    };
    
    call.on('call.ended', handleCallEnded);
    call.on('custom', handleRaiseHandEvent);
    call.on('custom', handleVotingEvent); // LISTENING FOR VOTING EVENTS

    return () => {
      call.off('call.ended', handleCallEnded);
      call.off('custom', handleRaiseHandEvent);
      call.off('custom', handleVotingEvent);
    };
  }, [call, router, playNotificationSound]);

  // ... (Other useEffects for mic/chat)

  // New effect to handle mic enable requests
  useEffect(() => {
    if (!call) return;
    const handler = (event: unknown) => {
      if (!isCustomEventType(event)) return;
  const ev = event as CustomEventType;
  const data = ev.custom.data as Record<string, unknown> | undefined;
  if (ev.custom.type === 'request-enable-mic' && data?.userId === call.currentUserId) {
        // Show a prompt or notification to the user
        setShowEnableMicPrompt(true);
      }
    };
    call.on('custom', handler);
    return () => call.off('custom', handler);
  }, [call]);

  // New effect to track recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // New effect for handling custom events (chat-message, file-upload)
  useEffect(() => {
    if (!call) return;

    const handleCustomEvent = (event: unknown) => {
      if (!isCustomEventType(event)) return;

      // Narrow to the known custom event type for safe property access
      const ev = event as CustomEventType;

      // For message-deleted events, process even from self (to sync deletions)
      // Also process typing events from others
      const isDeleteEvent = ev.custom.type === 'message-deleted';


      // Ignore self-sent messages (already added locally) - but NOT delete events
      if (ev.user.id === call.currentUserId && !isDeleteEvent) return;

      if (ev.custom.type === 'chat-message') {
        // Ensure we capture the sender-provided unique id when available so delete-for-everyone can match
        const data = ev.custom.data as { id?: string; text?: string; timestamp?: string; replyTo?: { user: string; text: string } | null };
        const messagePayload: ChatMessage = {
          id: data.id ?? `${data.timestamp ?? new Date().toISOString()}-${ev.user.name || 'Anonymous'}`,
          user: ev.user.name || 'Anonymous',
          text: data.text ?? '',
          timestamp: data.timestamp ?? new Date().toISOString(),
          replyTo: data.replyTo ?? null,
        };
        setMessages(prev => [...prev, messagePayload]);
        playNotificationSound(); // ADDED: Play sound for new message
      } else if (ev.custom.type === 'message-deleted') {
        const data = ev.custom.data as { messageId?: string; deletedAt?: string };
        if (data.messageId) {
          console.log('Received delete event for message ID:', data.messageId);
          setMessages(prev => {
            return prev.map(msg => {
              const msgId = msg.id || `${msg.timestamp}-${msg.user}`;
              if (msgId === data.messageId) {
                return {
                  ...msg,
                  deleted: true,
                  deletedAt: data.deletedAt || new Date().toISOString(),
                };
              }
              return msg;
            });
          });
          // Update files
          setUploadedFiles(prev => prev.map(f => {
            const fId = f.id || f.url;
            if (fId === data.messageId) {
              return { ...f, deleted: true, deletedAt: data.deletedAt || new Date().toISOString() };
            }
            return f;
          }));
        }
      } else if (ev.custom.type === 'file-upload') {
        const data = ev.custom.data as { id?: string; name?: string; url?: string; publicId?: string; timestamp?: string };
        const filePayload: UploadedFile = {
          id: data.id ?? `${data.timestamp ?? new Date().toISOString()}-${ev.user.name || 'Anonymous'}-file`,
          user: ev.user.name || 'Anonymous',
          name: data.name ?? 'file',
          url: data.url ?? '',
          publicId: data.publicId,
          timestamp: data.timestamp ?? new Date().toISOString(),
        };
        setUploadedFiles(prev => [...prev, filePayload]);
        playNotificationSound(); // ADDED: Play sound for new file
      } else if (ev.custom.type === 'typing-start') { // ADDED: Handle typing start
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(ev.user.name || ev.user.id);
          return newSet;
        });
      } else if (ev.custom.type === 'typing-stop') { // ADDED: Handle typing stop
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(ev.user.name || ev.user.id);
          return newSet;
        });
      }
    };

    call.on('custom', handleCustomEvent);
    return () => {
      call.off('custom', handleCustomEvent);
    };
  }, [call, playNotificationSound]);
  
  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ... (Other functions like renderCallLayout, raiseHand, renderVideoControls)

  // Zuia 'Loader' isitokee mara kwa mara kama mtandao unayumba kidogo na kujaribu kujiunga upya
  if (callingState !== CallingState.JOINED && callingState !== CallingState.RECONNECTING) return <Loader />;

  function renderCallLayout() {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
      return <SpeakerLayout participantsBarPosition="left" />;
      case 'speaker-left':
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  }

  const filteredParticipants = participants.filter((p) =>
    (p.name || p.userId)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleScreenShare = async () => {
    if (!call) return;
    if (isSharingScreen) {
      await call.screenShare.disable();
    } else {
      await call.screenShare.enable();
    }
    setIsSharingScreen(!isSharingScreen);
  };

  const raiseHand = async () => {
      if (!call) return;
      const userId = call.currentUserId;
      if (!userId) return;
  
      // Since raisedHands is now typed as Set<string>, this function signature is correct
      setRaisedHands((prev) => { 
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
  
      await safeSendCustomEvent(call, {
        type: 'raise-hand',
        data: { userId },
      });
  };

  const renderVideoControls = () => {
    // UPDATED: Calculate total notifications including files and polls
    const unreadFilesCount = !showChat && lastReadMessageTime
      ? uploadedFiles.filter(
          f =>
            f.timestamp > lastReadMessageTime &&
            f.user !== (localParticipant?.name || localParticipant?.userId)
        ).length
      : 0;
    
    const activePollCount = currentPoll && currentPoll.isActive ? 1 : 0;
    const totalNotificationCount = unreadCount + unreadFilesCount + raisedHands.size + activePollCount;

    const toggleMic = async () => {
      if (!call) return;
      if (isMicMuted) {
        await call.microphone.enable();
      } else {
        await call.microphone.disable();
      }
      setIsMicMuted(!isMicMuted);
    };

    const toggleCamera = async () => {
      if (!call) return;
      if (isCameraMuted) {
        await call.camera.enable();
      } else {
        await call.camera.disable();
      }
      setIsCameraMuted(!isCameraMuted);
    };

    const toggleSoundMute = () => {
        setIsSoundMuted(!isSoundMuted);
    };

    return (
      <div className="flex items-center justify-center w-full">
        {/* Kundi la Vitufe vya Kawaida vilivyotenganishwa na Kukata Simu */}
        <div className="flex items-center gap-2 sm:gap-4 pr-4 sm:pr-6 border-r border-gray-600/50">
        <button
          type="button"
          onClick={toggleMic}
          className={cn(
            'flex flex-col items-center justify-center p-2.5 rounded-full text-foreground transition-all',
            isMicMuted ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white' : 'bg-[#2d2d2d] hover:bg-gray-700'
          )}
        >
          {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={cn(
            'flex flex-col items-center justify-center p-2.5 rounded-full text-foreground transition-all',
            isCameraMuted ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white' : 'bg-[#2d2d2d] hover:bg-gray-700'
          )}
        >
          {isCameraMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button
          type="button"
          onClick={toggleSoundMute}
          className={cn( 
            'flex flex-col items-center justify-center p-2.5 rounded-full text-foreground transition-all',
            isSoundMuted ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white' : 'bg-[#2d2d2d] hover:bg-gray-700'
          )}
          title={isSoundMuted ? 'Unmute Notifications' : 'Mute Notifications'}
        >
          {isSoundMuted ? <BellOff size={20} /> : <Bell size={20} />}
        </button>

        {/* ADDED: Reactions Button (Desktop) */}
        <div className="hidden md:block">
          <ReactionsButton />
        </div>

        {/* Mobile Only: More Options Button */}
        <div className="md:hidden">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="flex flex-col items-center justify-center p-2.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground relative">
                <MoreVertical size={20} />
                {totalNotificationCount > 0 && (
                  <span className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {totalNotificationCount}
                  </span>
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content 
              className="w-64 bg-card border border-border rounded-lg shadow-xl p-2 mb-16 z-[60] text-foreground max-h-[70vh] overflow-y-auto" 
              side="top" 
              align="end" 
              sideOffset={10}
            >
              <DropdownMenu.Label className="text-xs font-bold text-gray-400 px-2 py-1 uppercase">Layout</DropdownMenu.Label>
              <DropdownMenu.Item onClick={() => setLayout('speaker-left')} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <LayoutDashboard size={16} /> Speaker Left
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setLayout('speaker-right')} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <LayoutDashboard size={16} /> Speaker Right
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setLayout('grid')} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <LayoutDashboard size={16} /> Grid
              </DropdownMenu.Item>
              
              <DropdownMenu.Separator className="h-px bg-gray-700 my-1" />
              
              <DropdownMenu.Label className="text-xs font-bold text-gray-400 px-2 py-1 uppercase">Controls</DropdownMenu.Label>

              <DropdownMenu.Item onClick={() => setShowParticipants((prev) => !prev)} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <List size={16} /> Participants ({participants.length})
              </DropdownMenu.Item>

              <DropdownMenu.Item onClick={handleShowChat} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <MessageCircle size={16} /> Chat
                {(unreadCount + unreadFilesCount) > 0 && <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-1.5">{unreadCount + unreadFilesCount}</span>}
              </DropdownMenu.Item> 

              <DropdownMenu.Item onClick={() => setShowTranslationPanel((p) => !p)} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <span>🌐</span> Translation
              </DropdownMenu.Item>

              <DropdownMenu.Item onClick={raiseHand} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <Hand size={16} className={raisedHands.has(currentUserId ?? '') ? 'text-yellow-400' : ''} /> Raise Hand
                {raisedHands.size > 0 && <span className="ml-2 bg-[#DC2626] text-white text-xs font-bold rounded-full px-1.5">{raisedHands.size}</span>}
                {raisedHands.size > 0 && <span className="ml-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-1.5">{raisedHands.size}</span>}
              </DropdownMenu.Item>

              <DropdownMenu.Item onClick={toggleScreenShare} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                {isSharingScreen ? <ScreenShareOff size={16} /> : <ScreenShare size={16} />} {isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
              </DropdownMenu.Item>

              <DropdownMenu.Item onClick={handleShowVotingBox} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <Vote size={16} /> Voting Box 
                {activePollCount > 0 && <span className="bg-green-600 text-white text-xs font-bold rounded-full px-1.5">{activePollCount}</span>}
              </DropdownMenu.Item>

              {/* NEW: Whiteboard button for mobile */}
              <DropdownMenu.Item onClick={() => setShowWhiteboard(p => !p)} className={cn("flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none", { "bg-blue-600": showWhiteboard })}>
                <WhiteboardIcon size={16} /> Whiteboard
              </DropdownMenu.Item>

              {/* NEW: Clear Whiteboard button for mobile */}
              {showWhiteboard && (
                <DropdownMenu.Item onClick={handleClearWhiteboard} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/20 rounded cursor-pointer text-sm outline-none">
                  <Trash size={16} /> Clear Whiteboard
                </DropdownMenu.Item>
              )}
                            
              <DropdownMenu.Item onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                <Settings size={16} /> Settings
              </DropdownMenu.Item>

              <DropdownMenu.Item onClick={isRecording ? handleStopRecordingClick : startRecording} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm outline-none">
                {isRecording ? <StopCircle size={16} className="text-red-500" /> : <CircleDot size={16} />} {isRecording ? 'Stop Recording' : 'Start Recording'}
              </DropdownMenu.Item>

              {!isPersonalRoom && (
                  <div className="px-2 py-1">
                      <EndCallButton />
                  </div>
              )}
              
              {isCreator && (
                  <div className="px-2 py-1">
                      <CallStatsButton />
                  </div>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        {/* REC INDICATOR - Imehamishiwa hapa baada ya doti tatu za control */}
        {isRecording && (
          <>
            {/* Desktop REC Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/30 ml-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider whitespace-nowrap">
                REC {formatRecordingTime(recordingDuration)} {isRecordingOwner ? '(You)' : ''}
              </span>
            </div>
            {/* Mobile REC Indicator (More Compact) */}
            <div className="flex md:hidden items-center gap-1 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/30 ml-1">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 uppercase">
                REC {formatRecordingTime(recordingDuration)}
              </span>
            </div>
          </>
        )}

        </div>

        {/* Kitufe cha Kukata Simu kilichotengwa ili kisiguswe kwa bahati mbaya */}
        <div className="pl-4 sm:pl-6">
          <button
            type="button"
            onClick={() => setShowLeaveCallDialog(true)}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all hover:scale-105"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderParticipantList = ({ onClose }: { onClose: () => void }) => (
    // FIX: Using explicit bg-gray-900 (which is supported)
    <div className="p-4 h-full flex flex-col bg-card text-foreground">
      <header className="flex justify-between items-center mb-4 text-foreground">
        <h2 className="text-lg font-semibold">
          Participants ({participants.length})
        </h2>
        <button
          onClick={onClose}
          className="text-sm text-red-400 hover:text-red-600"
        >
          Close
        </button>
      </header>

      <input
        type="text"
        placeholder="Search participants..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        // FIX: Explicit hex color for bg-gray-800
        className="mb-4 rounded bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
      />

      <ul className="space-y-3 overflow-y-auto flex-grow">
        {filteredParticipants.map((participant) => (
          <li key={participant.userId} className="flex items-center gap-3">
            <NextImage
              src={
                participant.image ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  participant.name ?? participant.userId
                )}&background=random`
              }
              alt="Avatar"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium">
              {participant.name ?? 'Unnamed'}
            </span>
            {/* Since raisedHands is now typed as Set<string>, this call is correct */}
            {raisedHands.has(participant.userId ?? '') && ( 
              <Hand size={16} className="text-yellow-400" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  // --- Recording handlers ---
  const startRecording = async () => {
    if (!call) return;
    try {
      await call.startRecording();
      setIsRecordingOwner(true);
      sessionStorage.setItem(`recordingOwner_${call.id}`, 'true');

      const systemMsg: ChatMessage = {
        id: `${Date.now()}-system-start`,
        user: "MFUMO (SYSTEM)",
        text: `🔴 Rekodi imeanza (Recording started).`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, systemMsg]);
      await safeSendCustomEvent(call, { type: 'chat-message', data: systemMsg });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!call) return;
    try {
      await call.stopRecording();
      setIsRecordingOwner(false);
      sessionStorage.removeItem(`recordingOwner_${call.id}`);

      const systemMsg: ChatMessage = {
        id: `${Date.now()}-system-stop`,
        user: "MFUMO (SYSTEM)",
        text: `⏹️ Rekodi imesimama (Recording stopped).`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, systemMsg]);
      await safeSendCustomEvent(call, { type: 'chat-message', data: systemMsg });
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handleStopRecordingClick = () => {
    if (isRecordingOwner) {
      stopRecording();
    } else {
      setShowStopRecordingDialog(true);
    }
  };

  const endCall = async () => {
    if (!call) return;
    await (call as Call).leave();
    router.push('/');
  };

  // UPDATED: Calculate unread count to include files for the Chat button badge
  const unreadFilesCount = !showChat && lastReadMessageTime
    ? uploadedFiles.filter(
        f =>
          f.timestamp > lastReadMessageTime &&
          f.user !== (localParticipant?.name || localParticipant?.userId)
      ).length
    : 0;
  const unreadCount = !showChat && lastReadMessageTime
    ? messages.filter(
        msg =>
          msg.timestamp > lastReadMessageTime &&
          msg.user !== (localParticipant?.name || localParticipant?.userId)
      ).length
    : 0;

  const handleShowChat = () => {
    setShowChat((prev) => {
      if (!prev) {
        // Chat is being opened, mark all as read
        if (messages.length > 0) {
          setLastReadMessageTime(messages[messages.length - 1].timestamp);
        }
      }
      return !prev;
    });
  };
  
  // Toggle Voting Box handler
  const handleShowVotingBox = () => {
    setShowVotingBox(prev => !prev);
  }

  const handleClearWhiteboard = async () => {
    if (window.confirm('Are you sure you want to clear the whiteboard for everyone? This cannot be undone.')) {
      if (!call) return;
      await safeSendCustomEvent(call, { type: 'whiteboard-clear', data: {} });
    }
  };

  return (
    <section className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* NEW: Render Whiteboard overlay if active */}
      {showWhiteboard && <Whiteboard onClose={() => setShowWhiteboard(false)} />}

      {/* CSS Maalumu kwa ajili ya kurekebisha video ijae vizuri kwenye box la blue (active speaker) hasa kwenye simu */}
      <style dangerouslySetInnerHTML={{__html: `
        .str-video__participant-view {
            border-radius: 12px !important;
          overflow: hidden !important;
        }
        .str-video__participant-view--active.str-video__participant-view--speaking {
          box-shadow: 0 0 0 3px #2563eb !important; /* Rangi nzuri ya blue inayoonekana mtu akiongea */
        }
      `}} />

      <div className="relative flex-1 w-full flex flex-row items-center justify-center px-2 sm:px-4 pt-2 sm:pt-4 pb-2 min-h-0">
        <div className="w-full max-w-[1200px] h-full overflow-hidden rounded-2xl">
          {renderCallLayout()}
        </div>
      </div>

      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-[300px] shadow-lg transition-transform duration-300 ease-in-out z-[55]',
          {
            'translate-x-0': showParticipants,
            'translate-x-full': !showParticipants,
          }
        )}
      >
        {renderParticipantList({ onClose: () => setShowParticipants(false) })}
      </aside>

      <footer className="w-full z-50 p-3 sm:p-4 flex flex-col items-center gap-3 sm:gap-4 shrink-0 bg-background/95 backdrop-blur-md border-t border-border/50">
        {renderVideoControls()}
        
        {/* FIX: Explicit hex color for bg-gray-800 */}
        <div className="hidden md:flex bg-card p-3 rounded-xl shadow-lg gap-3 items-center justify-center flex-wrap border border-border/50">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              {/* FIX: Explicit hex color for bg-gray-900 */}
              <button type="button" aria-label="Change layout" className="flex items-center gap-2 px-4 py-2 rounded bg-secondary hover:bg-secondary/80 text-sm">
                <LayoutDashboard size={16} />
                <span></span>
              </button>
            </DropdownMenu.Trigger>
            {/* FIX: Explicit hex color for bg-gray-900 */}
            <DropdownMenu.Content className="bg-card text-foreground rounded shadow-lg p-2">
              <DropdownMenu.Item
                onClick={() => setLayout('speaker-left')}
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm"
              >
                Speaker Left
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => setLayout('speaker-right')}
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm"
              >
                Speaker Right
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => setLayout('grid')}
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm"
              >
                Grid
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <button
            type="button"
            onClick={() => setShowParticipants((prev) => !prev)}
            // FIX: Explicit hex color for bg-gray-900
            className="flex items-center gap-2 px-4 py-2 rounded bg-secondary hover:bg-secondary/80 text-foreground text-sm cursor-pointer"
          >
            <List size={16} />
            <span>({participants.length})</span>
          </button>

          <button
            type="button"
            onClick={handleShowChat}
            className="relative flex items-center gap-2 px-4 py-2 rounded bg-secondary hover:bg-secondary/80 text-foreground text-sm cursor-pointer"
            aria-label="Chat"
          >
            <MessageCircle size={16} />
            <span></span>
            {(unreadCount + unreadFilesCount) > 0 && (
              // FIX: Explicit hex color for bg-red-600
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">
                {unreadCount + unreadFilesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowTranslationPanel((p) => !p)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded text-white text-sm cursor-pointer transition-colors',
              showTranslationPanel
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-[#111827] hover:bg-gray-700'
            )}
            title="Real-time translation (Microsoft Translator)"
            aria-label="Translation"
          >
            <span>🌐</span>
            <span></span>
          </button>
          
          <button
            type="button"
            onClick={raiseHand}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm cursor-pointer relative',
              // FIX: Explicit hex color for bg-gray-900 and bg-yellow-500
              raisedHands.has(currentUserId ?? '') ? 'bg-[#F59E0B] hover:bg-[#D97706]' : 'bg-[#111827] hover:bg-gray-700'
            )}
            aria-label="Raise hand"
          >
            <Hand size={16} />
            <span></span>
            {raisedHands.size > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#DC2626] text-white text-xs font-bold rounded-full px-2 py-0.5">
                {raisedHands.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleScreenShare}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm cursor-pointer',
              // FIX: Explicit hex color for bg-gray-900 and bg-blue-600
              isSharingScreen ? 'bg-primary hover:bg-primary/80' : 'bg-secondary hover:bg-secondary/80'
            )}
          >
            {isSharingScreen ? <ScreenShareOff size={16} /> : <ScreenShare size={16} />}
            <span>{isSharingScreen ? 'Stop Sharing' : 'Share Screen'}</span>
          </button>
          
          {/* --- Voting Box Button --- */}
          <button
            type="button"
            onClick={handleShowVotingBox}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm cursor-pointer',
              // FIX: Explicit hex color for bg-gray-900 and bg-indigo-600
              showVotingBox ? 'bg-primary hover:bg-primary/80' : 'bg-secondary hover:bg-secondary/80'
            )}
          >
            <Vote size={16} />
            <span>Voting Box</span>
            {currentPoll && currentPoll.isActive && (
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold rounded-full px-2 py-0.5">
                1
              </span>
            )}
          </button>

          {/* NEW: Whiteboard Button (Desktop) */}
          <button
            type="button"
            onClick={() => setShowWhiteboard(p => !p)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm cursor-pointer', showWhiteboard ? 'bg-primary hover:bg-primary/80' : 'bg-secondary hover:bg-secondary/80')}
          >
            <WhiteboardIcon size={16} />
            <span>Whiteboard</span>
          </button>

          {/* NEW: Clear Whiteboard Button (Desktop) */}
          {showWhiteboard && (
            <button
              type="button"
              onClick={handleClearWhiteboard}
              className='flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm cursor-pointer bg-destructive hover:bg-destructive/80'
              title="Clear whiteboard for everyone"
            >
              <Trash size={16} />
              <span>Clear</span>
            </button>
          )}

          {/* --- Settings Button (Desktop) --- */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-foreground text-sm cursor-pointer bg-secondary hover:bg-secondary/80"
            title="Settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>


          {/* --- Recording Button --- */}
          <button
            type="button"
            onClick={isRecording ? handleStopRecordingClick : startRecording}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm cursor-pointer',
              // FIX: Explicit hex color for bg-gray-900 and bg-red-600
              isRecording ? 'bg-destructive hover:bg-destructive/80' : 'bg-secondary hover:bg-secondary/80'
            )}
          >
            {isRecording ? <StopCircle size={16} /> : <CircleDot size={16} />}
            <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          </button>

          {!isPersonalRoom && <EndCallButton />}
          {isCreator && <CallStatsButton />}
        </div>
      </footer>

      {/* --- Enable Mic Prompt (New) --- */}
      {showEnableMicPrompt && (
        // FIX: Explicit hex color for bg-gray-800 and bg-blue-600
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[60] bg-card p-4 rounded-lg shadow-lg w-80 text-center text-foreground">
          <p className="text-sm mb-2">
            To enable your microphone, please allow access in the browser prompt.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowEnableMicPrompt(false)}
              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Stop Recording Confirmation Dialog */}
      <Dialog.Root open={showStopRecordingDialog} onOpenChange={setShowStopRecordingDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-background/50 z-[9998]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-[9999]">
            <Dialog.Title className="text-lg font-bold text-white mb-2">
              Stop Recording?
            </Dialog.Title>
            <p className="text-gray-300 text-sm mb-6">
              You didn&apos;t start this recording. Are you sure you want to stop it for everyone?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowStopRecordingDialog(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowStopRecordingDialog(false);
                  stopRecording();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Stop Recording
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Leave Call Confirmation Dialog */}
      <Dialog.Root open={showLeaveCallDialog} onOpenChange={setShowLeaveCallDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-background/50 z-[9998]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-[9999]">
            <Dialog.Title className="text-lg font-bold text-white mb-2">
              Ondoka Kwenye Kikao?
            </Dialog.Title>
            <p className="text-gray-300 text-sm mb-6">
              Je, una uhakika unataka kukata simu na kuondoka kwenye kikao hiki?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowLeaveCallDialog(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Ghairi (Cancel)
              </button>
              <button
                onClick={() => {
                  setShowLeaveCallDialog(false);
                  endCall();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Ndio, Kata Simu
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

          {/* Settings Modal */}
        <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-background/50 z-[9998]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-[9999]">
                    <Dialog.Title className="text-lg font-bold text-white mb-4">
                        Settings
                    </Dialog.Title>

                    {/* Notification Sound Settings */}
                    <div className="mb-2">
                        <label htmlFor="notificationSoundSelect" className="block text-sm font-medium text-gray-300 mb-1">
                            Notification Sound
                        </label>
                        <select
                            id="notificationSoundSelect"
                            value={notificationSound}
                            onChange={(e) => {
                                const newSound = e.target.value;
                                setNotificationSound(newSound);
                                saveSoundToDB(newSound);
                                playNotificationSound(newSound); // Play a preview
                            }}
                            className="w-full rounded bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {PREDEFINED_SOUNDS.map(sound => (
                                <option key={sound.src} value={sound.src}>{sound.name}</option>
                            ))}
                            {/* Add an option for custom sound if a custom sound is currently set */}
                            {!PREDEFINED_SOUNDS.some(s => s.src === notificationSound) && (
                                <option value={notificationSound}>Custom Sound</option>
                            )}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="notificationSoundUpload" className="block text-xs font-medium text-gray-400 mb-1">
                            Or upload custom sound
                        </label>
                        <input
                            type="file"
                            id="notificationSoundUpload"
                            accept="audio/*"
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-700 cursor-pointer"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        const result = event.target?.result as string;
                                        setNotificationSound(result);
                                        saveSoundToDB(result);
                                        localStorage.removeItem('notificationSound');
                                        playNotificationSound(result);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>
                    {/* Notification Volume Slider */}
                    <div className="mb-4">
                        <label htmlFor="notificationVolume" className="block text-sm font-medium text-gray-300 mb-1">
                            Notification Volume ({Math.round(notificationVolume * 100)}%)
                        </label>
                        <input
                            id="notificationVolume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={notificationVolume}
                            onChange={(e) => {
                                const vol = parseFloat(e.target.value);
                                setNotificationVolume(vol);
                                localStorage.setItem('notificationVolume', vol.toString());
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="mb-4 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => playNotificationSound(notificationSound)}
                            className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium"
                        >
                            Test Sound
                        </button>
                        <button
                            type="button"
                            onClick={() => playNotificationSound(DEFAULT_NOTIFICATION_SOUND)}
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium"
                        >
                            Preview Default
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setNotificationSound(DEFAULT_NOTIFICATION_SOUND);
                                // Stop any currently playing custom sound.
                                if (notificationAudio) {
                                    notificationAudio.pause();
                                    notificationAudio.currentTime = 0;
                                }
                                saveSoundToDB(DEFAULT_NOTIFICATION_SOUND);
                                localStorage.removeItem('notificationSound');
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                        >
                            Reset Sound
                        </button>
                    </div>

                    {/* Device Settings (Kamera na Maikrofoni) */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="text-md font-bold text-white mb-2">
                            Mipangilio ya Vifaa (Kamera / Sauti)
                        </h4>
                        <p className="text-xs text-gray-400 mb-3">
                            Chagua kamera (Mbele au Nyuma) na maikrofoni unayotaka kutumia.
                        </p>
                        {/* The DeviceSettings component from Stream handles the UI and logic */}
                        <div className="bg-gray-900 p-2 rounded-lg">
                           <DeviceSettings />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowSettings(false)}
                            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
                        >
                            Close
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>


      {showChat && (
        <ChatPanel
          call={call}
          localParticipant={localParticipant}
          messages={messages}
          setMessages={setMessages}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          setLastReadMessageTime={setLastReadMessageTime}
          onClose={() => setShowChat(false)}
          typingUsers={typingUsers} // ADDED: Pass typingUsers
        />
      )}

      {/* Translation Panel (floating) */}
      {showTranslationPanel && (
        <div className="fixed bottom-[110px] sm:bottom-[130px] right-2 sm:right-6 z-[70] flex flex-col pointer-events-none">
          <div className="pointer-events-auto">
            <TranslationPanel
              messages={messages}
              onClose={() => setShowTranslationPanel(false)}
            />
          </div>
        </div>
      )}

      {/* --- Voting Box Render (Updated to pass PDF function) --- */}
      {showVotingBox && (
        <div className="fixed bottom-[110px] sm:bottom-[130px] right-2 sm:right-6 z-[70] flex flex-col pointer-events-none">
          <VotingBox
            call={call}
            isCreator={isCreator}
            currentPoll={currentPoll}
            setCurrentPoll={setCurrentPoll}
            onDownloadPDF={generatePDF} // <-- ADDED PROP
            onClose={() => setShowVotingBox(false)}
          />
        </div>
      )}
    </section>
  );
};                              localStorage.removeItem('notificationSound');
                         