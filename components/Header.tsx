
import React, { useState, useEffect, useRef } from 'react';
import { BUSINESS_INFO } from '../constants';
import { auth, db } from '../services/firebase';
// Fix: Use type-only import for User to resolve member export error
import { type User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { AppNotification, WorkerProfile } from '../types';

interface HeaderProps {
  user: User | null;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
  isAdminView?: boolean;
  onLoginClick?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  isAdmin, 
  onToggleAdmin, 
  isAdminView, 
  onLoginClick, 
  activeTab,
  onTabChange,
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNoti, setShowNoti] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const notiRef = useRef<HTMLDivElement>(null);
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [userSettings, setUserSettings] = useState({ jobPostings: true, notices: true });
  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; data?: AppNotification }>({
    visible: false,
    title: '',
    message: '',
    data: undefined
  });
  
  const isFirstLoad = useRef(true);

  // Install PWA Logic
  useEffect(() => {
    // Check iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if ((window as any).deferredPrompt) setInstallPrompt((window as any).deferredPrompt);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
        alert("아이폰은 브라우저 하단의 [공유] 버튼을 누른 뒤 '홈 화면에 추가'를 선택해 주세요.");
        return;
    }
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  // Load user settings
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'workers', user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as WorkerProfile;
            setUserSettings({
                jobPostings: data.notificationSettings?.jobPostings ?? true,
                notices: data.notificationSettings?.notices ?? true
            });
        }
    });
    return () => unsub();
  }, [user]);

  // Unified Notification Listener (Push + Toast)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(15));
    isFirstLoad.current = true;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(list);

      if (!isFirstLoad.current) {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const newNoti = { id: change.doc.id, ...change.doc.data() } as AppNotification;
            
            const isJobAllowed = newNoti.type === 'job' && userSettings.jobPostings;
            const isNoticeAllowed = newNoti.type === 'notice' && userSettings.notices;

            if (isJobAllowed || isNoticeAllowed) {
                // 앱이 포그라운드일 때만 토스트 노출 (백그라운드는 SW가 담당)
                if (document.visibilityState === 'visible') {
                    setToast({ visible: true, title: newNoti.title, message: newNoti.message, data: newNoti });
                    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 6000);
                }
                setHasNew(true);
            }
          }
        });
      } else {
        isFirstLoad.current = false;
        const lastReadTime = localStorage.getItem('lastReadNotiTime');
        if (list.length > 0 && (!lastReadTime || new Date(list[0].createdAt) > new Date(lastReadTime))) {
          setHasNew(true);
        }
      }
    });

    return () => unsubscribe();
  }, [user, userSettings]);

  const handleBellClick = () => {
    setShowNoti(!showNoti);
    if (!showNoti) {
      setHasNew(false);
      if (notifications.length > 0) localStorage.setItem('lastReadNotiTime', notifications[0].createdAt);
    }
  };

  const handleItemClick = (noti: AppNotification) => {
    if (onNotificationClick) onNotificationClick(noti);
    setShowNoti(false);
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id));

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" onClick={(e) => { e.preventDefault(); onTabChange?.('home'); }} className="flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">젊</div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight hidden xs:block">{BUSINESS_INFO.name}</h1>
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            {(installPrompt || isIOS) && (
              <button 
                onClick={handleInstallClick} 
                className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-full shadow-lg shadow-indigo-200 animate-bounce"
              >
                <i className="fas fa-mobile-alt mr-1"></i>앱 설치(알림받기)
              </button>
            )}

            {isAdmin && (
              <button onClick={onToggleAdmin} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors hidden sm:block ${isAdminView ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {isAdminView ? '사용자모드' : '관리자모드'}
              </button>
            )}
            
            {user && (
              <div className="relative" ref={notiRef}>
                <button onClick={handleBellClick} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 relative">
                  <i className={`fas fa-bell ${hasNew ? 'text-brand-600' : ''}`}></i>
                  {hasNew && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                </button>

                {showNoti && (
                  <div className="absolute top-12 right-0 w-80 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-gray-800">알림 센터</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {visibleNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">최근 알림이 없습니다.</div>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {visibleNotifications.map((noti) => (
                            <li key={noti.id} onClick={() => handleItemClick(noti)} className="p-4 hover:bg-gray-50 transition-colors relative group cursor-pointer">
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${noti.type === 'job' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                  <i className={`fas ${noti.type === 'job' ? 'fa-briefcase' : 'fa-bullhorn'} text-xs`}></i>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-gray-800 mb-1">{noti.title}</h4>
                                  <p className="text-xs text-gray-600 leading-snug line-clamp-2">{noti.message}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <button onClick={() => auth.signOut()} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-red-500"><i className="fas fa-sign-out-alt"></i></button>
            ) : (
              <button onClick={onLoginClick} className="px-4 py-1.5 bg-brand-600 text-white text-sm font-bold rounded-full">로그인</button>
            )}
          </div>
        </div>
      </header>
      
      {toast.visible && (
        <div onClick={() => toast.data && onNotificationClick?.(toast.data)} className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-brand-100 p-4 animate-fade-in-up flex items-start gap-4 ring-1 ring-brand-500/20 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
             <i className="fas fa-bell animate-pulse"></i>
          </div>
          <div className="flex-1">
             <h4 className="font-bold text-gray-900 text-sm mb-0.5">{toast.title}</h4>
             <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{toast.message}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setToast(prev => ({ ...prev, visible: false })); }} className="text-gray-400"><i className="fas fa-times"></i></button>
        </div>
      )}
    </>
  );
};

export default Header;
