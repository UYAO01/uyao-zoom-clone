'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MobileNav from './MobileNav';
import { useRouter } from 'next/navigation';
import { ModeToggle } from '@/src/components/mode-toggle';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { Bell, Settings, X } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/components/ui/firebase';

type AppNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: string;
  link?: string;
};

const Navbar = () => {
  const { user } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0); 
  const [settingsCount] = useState(1); 
  
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedSound, setSelectedSound] = useState('/sounds/notification.mp3');
  const [isMuted, setIsMuted] = useState(false);
  const isFirstSnapshot = useRef(true);
  const soundRef = useRef(selectedSound);
  const isMutedRef = useRef(false);

  const playSound = (src: string) => {
    if (isMutedRef.current) return; // Kama imezimwa (muted), usipige sauti
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Audio play failed', e));
  };

  const handleSoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSound = e.target.value;
    setSelectedSound(newSound);
    soundRef.current = newSound; // Hakikisha ref inapata sauti mpya
    localStorage.setItem('customNotificationSound', newSound);
    playSound(newSound); 
  };

  const handleMuteToggle = () => {
    const newValue = !isMuted;
    setIsMuted(newValue);
    isMutedRef.current = newValue; // Update ref ili isomeke vizuri ndani ya onSnapshot
    localStorage.setItem('isNotificationMuted', String(newValue));
  };

  useEffect(() => {
    const saved = localStorage.getItem('customNotificationSound');
    if (saved) {
      setSelectedSound(saved);
      soundRef.current = saved;
    }
    const savedMute = localStorage.getItem('isNotificationMuted') === 'true';
    setIsMuted(savedMute);
    isMutedRef.current = savedMute;
  }, []);

  // Fetch real notifications for the current user
  useEffect(() => {
    if (!user?.id) return;
    // Hatutumii orderBy kuepuka hitaji la kutengeneza 'Composite Index' manually kwenye console
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach(doc => notifs.push({ id: doc.id, ...doc.data() } as AppNotification));
      
      // Sort kwa upande wa frontend
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(notifs);
      setNotificationCount(notifs.filter(n => !n.isRead).length);

      // Piga sauti kama kuna notification mpya inayoingia 
      // (Tunaruka 'snapshot' ya kwanza wakati page inaload ili zisilie zote)
      if (isFirstSnapshot.current) {
        isFirstSnapshot.current = false;
      } else {
        const hasNewUnread = snapshot.docChanges().some(change => change.type === 'added' && change.doc.data().isRead === false);
        if (hasNewUnread) {
          playSound(soundRef.current);
        }
      }
    });
    return () => unsub();
  }, [user?.id]);

  const handleMarkAsRead = async (id: string, link?: string) => {
     try { await updateDoc(doc(db, 'notifications', id), { isRead: true }); } catch (e) { console.error(e); }
     if (link) {
       router.push(link);
       setShowNotificationMenu(false); // Funga dropdown baada ya ku-click
     }
  };

  // Kufuta notifications zote
  const handleClearAll = async (e: React.MouseEvent) => {
     e.stopPropagation();
     try {
         const promises = notifications.map(n => deleteDoc(doc(db, 'notifications', n.id)));
         await Promise.all(promises);
     } catch (e) { console.error(e); }
  };

  // Kufuta notification moja tu
  const handleClearSingle = async (e: React.MouseEvent, id: string) => {
     e.stopPropagation();
     try {
         await deleteDoc(doc(db, 'notifications', id));
     } catch (e) { console.error(e); }
  };

  return (
    <nav className='flex flex-between fixed z-50 w-full bg-background px-6 py-4 lg:px-10'>
      <Link href="/" className='flex items-center gap-1'>
        <Image
          src="/icons/kkk.png"
          width={64}
          height={64 }
          alt="UYAO LOGO"
          className='max-sm:size-10'
        />
        <p className='text-[26px] font-extrabold text-white max-sm:hidden'>UYAO</p>
      </Link>
      <div className='flex-between gap-5 text-foreground'>
        
        {/* Menu ya Settings na Notification Icons */}
        <div className="flex items-center gap-4 sm:gap-6 mr-2 sm:mr-4">
          {/* SETTINGS ICON */}
          <div className="relative cursor-pointer group" onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowNotificationMenu(false); }}>
            <div className="p-2.5 rounded-full bg-gray-800 border border-gray-700 group-hover:bg-blue-900/40 transition-all duration-300">
              <Settings className="w-5 h-5 text-blue-400 group-hover:animate-[spin_3s_linear_infinite] group-hover:text-blue-300" />
            </div>
            {settingsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-[#1F2937] shadow-lg">
                {settingsCount}
              </span>
            )}

            {/* App Settings Menu */}
            {showSettingsMenu && (
              <div className="absolute sm:right-0 max-sm:fixed max-sm:top-20 max-sm:left-1/2 max-sm:-translate-x-1/2 mt-4 max-sm:mt-0 w-[95vw] sm:w-72 rounded-2xl bg-[#111827] border border-gray-700 p-4 sm:p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 cursor-default" onClick={(e) => e.stopPropagation()}>
                <h4 className="text-white font-bold mb-4 border-b border-gray-700 pb-3 flex items-center gap-2">
                  <Settings size={18} className="text-blue-400"/> App Settings
                </h4>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Select Alert Sound</label>
                  <select 
                    value={selectedSound} 
                    onChange={handleSoundChange}
                    className="w-full bg-gray-800 text-white text-sm rounded-xl p-3 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="/sounds/notification.mp3">🔔 Default Chime</option>
                    <option value="/sounds/apex.mp3.mpeg">🚀 Apex Alert</option>
                    <option value="/sounds/beacon.mpeg">📡 Beacon Signal</option>
                    <option value="/sounds/Yo!!.mp3.mpeg">🦉 Night Owl (Yo!!)</option>
                  </select>
                </div>
                <button 
                  onClick={() => playSound(selectedSound)}
                  className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 text-blue-400 font-semibold rounded-xl text-sm transition-colors"
                >
                  Test Sound
                </button>
                {/* Mute Button */}
                <div className="flex items-center justify-between mt-4 border-t border-gray-700 pt-4">
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Mute Notifications</span>
                  <button 
                    onClick={handleMuteToggle}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${isMuted ? 'bg-red-500' : 'bg-blue-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isMuted ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BELL NOTIFICATION ICON */}
          <div className="relative">
            <div 
              className="p-2.5 rounded-full bg-gray-800 border border-gray-700 hover:bg-yellow-900/40 transition-all duration-300 cursor-pointer group"
              onClick={() => {
                setShowNotificationMenu(!showNotificationMenu);
                setShowSettingsMenu(false);
              }}
            >
              <Bell className={`w-5 h-5 text-yellow-400 ${notificationCount > 0 ? 'animate-[bounce_1s_infinite]' : ''}`} />
            </div>
            
            {notificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-[#1F2937] shadow-lg animate-pulse">
                {notificationCount}
              </span>
            )}

            {showNotificationMenu && (
              <div className="absolute sm:right-0 max-sm:fixed max-sm:top-20 max-sm:left-1/2 max-sm:-translate-x-1/2 mt-4 max-sm:mt-0 w-[95vw] sm:w-80 rounded-2xl bg-[#111827] border border-gray-700 p-4 sm:p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 cursor-default" onClick={e => e.stopPropagation()}>
                <h4 className="text-white font-bold mb-4 border-b border-gray-700 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={18} className="text-yellow-400"/> Notifications
                  </div>
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-400/10 hover:bg-red-400/20 transition-colors">Clear All</button>
                  )}
                </h4>
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Huna notification yoyote kwa sasa.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => handleMarkAsRead(n.id, n.link)} className={`p-3 rounded-xl border ${n.isRead ? 'bg-gray-800/40 border-gray-700 opacity-75' : 'bg-red-500/10 border-red-500/30'} cursor-pointer hover:bg-gray-800 transition-colors`}>
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <p className="text-sm font-bold text-white flex-1">{n.title}</p>
                          <div className="flex items-center gap-2 shrink-0 mt-0.5">
                             {!n.isRead && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                             <button onClick={(e) => handleClearSingle(e, n.id)} className="text-gray-500 hover:text-red-400 transition-colors p-0.5" title="Futa"><X size={14}/></button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-500 mt-2">{new Date(n.createdAt).toLocaleString('sw-TZ')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <SignedIn>
          <UserButton />
        </SignedIn>
        
        <ModeToggle />
      </div>

      <MobileNav /> {/* Add this line */}
    </nav>
  );
}

export default Navbar;