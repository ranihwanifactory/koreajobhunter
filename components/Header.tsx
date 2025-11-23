import React from 'react';
import { BUSINESS_INFO } from '../constants';
import { auth } from '../services/firebase';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
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
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleShare}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            aria-label="공유하기"
          >
            <i className="fas fa-share-alt"></i>
          </button>
          
          <button 
            onClick={handleInstallInfo}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            aria-label="앱 설치 안내"
          >
            <i className="fas fa-download text-sm"></i>
          </button>

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