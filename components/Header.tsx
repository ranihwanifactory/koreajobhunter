
import React, { useState, useEffect, useRef } from 'react';
import { BUSINESS_INFO } from '../constants';
import { auth, db } from '../services/firebase';
import { User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AppNotification } from '../types';

interface HeaderProps {
  user: User | null;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
  isAdminView?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, isAdmin, onToggleAdmin, isAdminView }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNoti, setShowNoti] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);

  // 알림 가져오기
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(list);

      // 읽지 않은 알림 체크
      const lastReadTime = localStorage.getItem('lastReadNotiTime');
      if (list.length > 0) {
        // 마지막으로 읽은 시간보다 최신 알림이 있으면 뱃지 표시
        if (!lastReadTime || new Date(list[0].createdAt) > new Date(lastReadTime)) {
          setHasNew(true);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleBellClick = () => {
    setShowNoti(!showNoti);
    if (!showNoti && notifications.length > 0) {
      setHasNew(false);
      localStorage.setItem('lastReadNotiTime', notifications[0].createdAt);
    }
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

  const handleInstallInfo = () => {
    alert('아이폰: 사파리 하단 공유 버튼 -> "홈 화면에 추가"\n안드로이드: 크롬 우측 상단 메뉴 -> "홈 화면에 추가" 또는 "앱 설치"');
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      auth.signOut();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            젊
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{BUSINESS_INFO.name}</h1>
          {isAdmin && (
             <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold border border-red-200">
               관리자
             </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
           {isAdmin && (
            <button
              onClick={onToggleAdmin}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isAdminView 
                ? 'bg-slate-800 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isAdminView ? '사용자모드' : '관리자모드'}
            </button>
          )}

          <button 
            onClick={handleShare}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            aria-label="공유하기"
          >
            <i className="fas fa-share-alt"></i>
          </button>
          
          {/* Notification Bell */}
          <div className="relative" ref={notiRef}>
            <button 
              onClick={handleBellClick}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors relative"
              aria-label="알림"
            >
              <i className={`fas fa-bell ${hasNew ? 'text-brand-600 animate-pulse' : ''}`}></i>
              {hasNew && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNoti && (
              <div className="absolute top-12 right-0 w-80 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-800">알림 센터</h3>
                  <span className="text-xs text-gray-500">최근 {notifications.length}개</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      새로운 알림이 없습니다.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notifications.map((noti) => (
                        <li key={noti.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${noti.type === 'job' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                              <i className={`fas ${noti.type === 'job' ? 'fa-briefcase' : 'fa-info-circle'} text-xs`}></i>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800 mb-1">{noti.title}</h4>
                              <p className="text-xs text-gray-600 leading-snug mb-1">{noti.message}</p>
                              <span className="text-[10px] text-gray-400">
                                {new Date(noti.createdAt).toLocaleDateString()} {new Date(noti.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
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

          {user && (
            <button 
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-red-500 hover:bg-red-50 transition-colors"
              aria-label="로그아웃"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
