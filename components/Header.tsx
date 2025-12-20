
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
  const notiRef = useRef<HTMLDivElement>(null);
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handlePrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(list);
      // 신규 알림 체크 로직 (단순화)
      if (!snapshot.metadata.fromCache && snapshot.docChanges().some(c => c.type === 'added')) {
          setHasNew(true);
      }
    });
    return () => unsub();
  }, [user]);

  const handleInstall = async () => {
    if (isIOS) return alert("하단 [공유] -> '홈 화면에 추가'를 눌러주세요.");
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    }
  };

  const navLinks = [
    { id: 'home', label: '홈', icon: 'fa-home' },
    { id: 'jobs', label: '일자리', icon: 'fa-briefcase' },
    { id: 'gallery', label: '현장갤러리', icon: 'fa-images' },
    { id: 'register', label: user ? '마이페이지' : '인력등록', icon: user ? 'fa-user' : 'fa-user-plus' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" onClick={(e) => { e.preventDefault(); onTabChange?.('home'); }} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-black text-lg">젊</div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">{BUSINESS_INFO.name}</h1>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => onTabChange?.(link.id)}
                className={`text-sm font-bold transition-colors ${activeTab === link.id ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {(installPrompt || isIOS) && (
            <button onClick={handleInstall} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-full border border-brand-100 animate-pulse">
              <i className="fas fa-download"></i> 앱 설치
            </button>
          )}

          {isAdmin && (
            <button onClick={onToggleAdmin} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAdminView ? 'bg-slate-800 text-white shadow-inner' : 'bg-gray-100 text-gray-600'}`}>
              <i className={`fas ${isAdminView ? 'fa-user' : 'fa-cog'} mr-1`}></i>
              {isAdminView ? '사용자화면' : '관리도구'}
            </button>
          )}
          
          {user && (
            <div className="relative" ref={notiRef}>
              <button onClick={() => { setShowNoti(!showNoti); setHasNew(false); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 relative hover:bg-gray-100">
                <i className={`fas fa-bell ${hasNew ? 'text-brand-600' : ''}`}></i>
                {hasNew && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>}
              </button>

              {showNoti && (
                <div className="absolute top-12 right-0 w-72 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50 font-bold text-xs text-gray-500 uppercase tracking-wider">알림 센터</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">새로운 알림이 없습니다.</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map(n => (
                          <div key={n.id} onClick={() => { onNotificationClick?.(n); setShowNoti(false); }} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                            <h4 className="text-xs font-bold text-gray-800 mb-0.5">{n.title}</h4>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <button onClick={() => auth.signOut()} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          ) : (
            <button onClick={onLoginClick} className="px-5 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-100">로그인</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
