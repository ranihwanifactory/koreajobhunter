
import React, { useState, useEffect, useRef } from 'react';
import { BUSINESS_INFO } from '../constants';
import { auth, db } from '../services/firebase';
import { User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { AppNotification, WorkerProfile } from '../types';

interface HeaderProps {
  user: User | null;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
  isAdminView?: boolean;
  onLoginClick?: () => void;
  
  // Refactored props for unified navigation
  activeTab?: string;
  onTabChange?: (tab: string) => void;

  // Notification click handler
  onNotificationClick?: (notification: AppNotification) => void;
}

declare global {
  interface Window {
    deferredPrompt: any;
  }
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
  
  // Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // User settings (default: receive notifications)
  const [allowJobNotifications, setAllowJobNotifications] = useState(true);

  // State for In-App Toast Notification
  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; data?: AppNotification }>({
    visible: false,
    title: '',
    message: '',
    data: undefined
  });
  
  // Ref to track if it's the initial data load
  const isFirstLoad = useRef(true);

  // Install PWA Logic
  useEffect(() => {
    // Check if event was captured before component mount
    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      window.deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also check for 'appinstalled' event
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      window.deferredPrompt = null;
      console.log('PWA installed');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
        setInstallPrompt(null);
        window.deferredPrompt = null;
    }
  };

  // Load dismissed notifications from local storage
  useEffect(() => {
    if (user) {
      const key = `dismissed_notis_${user.uid}`;
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setDismissedIds(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load dismissed notifications", e);
      }
    } else {
      setDismissedIds([]);
    }
  }, [user]);

  const saveDismissedIds = (ids: string[]) => {
    if (!user) return;
    setDismissedIds(ids);
    localStorage.setItem(`dismissed_notis_${user.uid}`, JSON.stringify(ids));
  };

  // Listen to user profile for notification settings
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, 'workers', user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as WorkerProfile;
            if (data.notificationSettings?.jobPostings !== undefined) {
                setAllowJobNotifications(data.notificationSettings.jobPostings);
            } else {
                setAllowJobNotifications(true);
            }
        } else {
            setAllowJobNotifications(true);
        }
    });

    return () => unsub();
  }, [user]);

  // 알림 가져오기 및 실시간 리스너
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    isFirstLoad.current = true;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(list);

      // --- Push Notification Logic ---
      if (!isFirstLoad.current) {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const newNoti = change.doc.data() as AppNotification;
            
            if (newNoti.type === 'job' && !allowJobNotifications) {
                continue;
            }

            if ("Notification" in window && Notification.permission === "granted") {
              try {
                  const registration = await navigator.serviceWorker.ready;
                  if (registration) {
                      registration.showNotification(newNoti.title, {
                          body: newNoti.message,
                          icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                          badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                          vibrate: [200, 100, 200],
                          tag: 'job-alert',
                          data: { url: '/', linkId: newNoti.linkId } // Pass data for SW click handling if needed
                      } as any);
                  } else {
                       new Notification(newNoti.title, {
                          body: newNoti.message,
                          icon: '/vite.svg',
                      });
                  }
              } catch (e) {
                console.error("Notification trigger failed", e);
              }
            }

            setToast({
              visible: true,
              title: newNoti.title,
              message: newNoti.message,
              data: newNoti
            });

            setTimeout(() => {
              setToast(prev => ({ ...prev, visible: false }));
            }, 4000);
          }
        }
      } else {
        isFirstLoad.current = false;
      }

      const lastReadTime = localStorage.getItem('lastReadNotiTime');
      if (list.length > 0) {
        if (!lastReadTime || new Date(list[0].createdAt) > new Date(lastReadTime)) {
          setHasNew(true);
        }
      }
    });

    return () => unsubscribe();
  }, [user, allowJobNotifications]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setShowNoti(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id));

  const handleBellClick = () => {
    setShowNoti(!showNoti);
    if (!showNoti && notifications.length > 0) {
      setHasNew(false);
      localStorage.setItem('lastReadNotiTime', notifications[0].createdAt);
    }
  };

  const handleItemClick = (noti: AppNotification) => {
    if (onNotificationClick) {
      onNotificationClick(noti);
    }
    setShowNoti(false);
  };

  const handleDeleteNoti = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newIds = [...dismissedIds, id];
    saveDismissedIds(newIds);
  };

  const handleClearAll = () => {
    const currentIds = notifications.map(n => n.id);
    const uniqueIds = Array.from(new Set([...dismissedIds, ...currentIds]));
    saveDismissedIds(uniqueIds);
  };

  const handleShare = async () => {
    const shareData = {
      title: BUSINESS_INFO.name,
      text: `${BUSINESS_INFO.name} 인력 등록 앱입니다. 일자리가 필요하시면 지금 등록하세요! 연락처: ${BUSINESS_INFO.phone}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      alert('URL이 복사되었습니다: ' + window.location.href);
    }
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      auth.signOut();
      window.location.href = "/"; 
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (onTabChange) onTabChange('home');
  };

  const handleToastClick = () => {
    if (toast.data && onNotificationClick) {
      onNotificationClick(toast.data);
    }
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" onClick={handleLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-brand-200 shrink-0">
                젊
              </div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight hidden xs:block">{BUSINESS_INFO.name}</h1>
            </a>
            
            {isAdmin && (
               <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold border border-red-200 hidden sm:inline-block">
                 관리자
               </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            
            {/* Desktop Navigation (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-1 mr-2">
                <button
                    onClick={() => onTabChange?.('jobs')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    activeTab === 'jobs' ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    일자리
                </button>
                <button
                    onClick={() => onTabChange?.('gallery')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    activeTab === 'gallery' ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    갤러리
                </button>
                {user && (
                    <button
                        onClick={() => onTabChange?.('register')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        activeTab === 'register' ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        내정보
                    </button>
                )}
            </div>

             {isAdmin && (
              <button
                onClick={onToggleAdmin}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors hidden sm:block ${
                  isAdminView 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isAdminView ? '사용자모드' : '관리자모드'}
              </button>
            )}

            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-1 animate-pulse"
              >
                <i className="fas fa-download text-xs"></i>
                <span className="text-xs whitespace-nowrap">앱 설치</span>
              </button>
            )}
            
            <button 
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors shrink-0"
              aria-label="공유하기"
            >
              <i className="fas fa-share-alt"></i>
            </button>
            
            {user && (
              <div className="relative" ref={notiRef}>
                <button 
                  onClick={handleBellClick}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors relative shrink-0"
                  aria-label="알림"
                >
                  <i className={`fas fa-bell ${hasNew ? 'text-brand-600 animate-pulse' : ''}`}></i>
                  {hasNew && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </button>

                {showNoti && (
                  <div className="absolute top-12 right-0 w-80 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-gray-800">알림 센터</h3>
                      <div className="flex items-center gap-3">
                        <button 
                            onClick={handleClearAll}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                            모두 지우기
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {visibleNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">
                          새로운 알림이 없습니다.
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {visibleNotifications.map((noti) => (
                            <li 
                                key={noti.id} 
                                onClick={() => handleItemClick(noti)}
                                className="p-4 hover:bg-gray-50 transition-colors relative group cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${noti.type === 'job' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                  <i className={`fas ${noti.type === 'job' ? 'fa-briefcase' : 'fa-info-circle'} text-xs`}></i>
                                </div>
                                <div className="flex-1 pr-4">
                                  <h4 className="text-sm font-bold text-gray-800 mb-1">{noti.title}</h4>
                                  <p className="text-xs text-gray-600 leading-snug mb-1">{noti.message}</p>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(noti.createdAt).toLocaleDateString()} {new Date(noti.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteNoti(e, noti.id)}
                                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1 transition-colors"
                                >
                                    <i className="fas fa-times text-sm"></i>
                                </button>
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
              <button 
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-red-500 hover:bg-red-50 transition-colors shrink-0"
                aria-label="로그아웃"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-1.5 bg-brand-600 text-white text-sm font-bold rounded-full hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200 whitespace-nowrap"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* In-App Toast Notification */}
      {toast.visible && (
        <div 
          onClick={handleToastClick}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-brand-100 p-4 animate-fade-in-up flex items-start gap-4 ring-1 ring-brand-500/20 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
             <i className="fas fa-bell ring-4 ring-brand-50 rounded-full animate-pulse"></i>
          </div>
          <div className="flex-1">
             <h4 className="font-bold text-gray-900 text-sm mb-0.5">{toast.title}</h4>
             <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{toast.message}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setToast(prev => ({ ...prev, visible: false })); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </>
  );
};

export default Header;
