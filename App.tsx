
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RegistrationForm from './components/RegistrationForm';
import HeroSection from './components/HeroSection';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import JobBoard from './components/JobBoard';
import WorkerTicker from './components/WorkerTicker';
import MyProfile from './components/MyProfile';
import Gallery from './components/Gallery';
import OfficeMap from './components/OfficeMap';
import BottomNav from './components/BottomNav';
import { BUSINESS_INFO, ADMIN_EMAIL } from './constants';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AppNotification } from './types';
import { requestFcmToken, onForegroundMessage } from './services/fcm';

type TabView = 'home' | 'jobs' | 'register' | 'gallery';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [targetJobId, setTargetJobId] = useState<string | null>(null);

  // URL 파라미터 감지 (알림 클릭 대응)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabView;
    const linkId = params.get('linkId');

    if (tab) setActiveTab(tab);
    if (linkId) {
      setTargetJobId(linkId);
      if (!tab || tab === 'home') setActiveTab('jobs');
    }
    
    // 주소창 깔끔하게 정리
    if (tab || linkId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminStatus = currentUser?.email === ADMIN_EMAIL;
      setIsAdmin(adminStatus);
      setLoading(false);

      if (currentUser) {
        setShowAuthModal(false);
        // 로그인 성공 시 푸시 토큰 등록
        requestFcmToken(currentUser.uid);
        onForegroundMessage();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleTabChange = (tab: string) => {
      setShowAdminDashboard(false);
      setActiveTab(tab as TabView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotificationClick = (noti: AppNotification) => {
      if (noti.type === 'job' && noti.linkId) {
          setActiveTab('jobs');
          setTargetJobId(noti.linkId);
      } else {
          setActiveTab('home');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderContent = () => {
    // 관리자 모드 활성화 시 대시보드만 출력
    if (showAdminDashboard && isAdmin) {
        return <div className="p-4 max-w-7xl mx-auto"><AdminDashboard /></div>;
    }

    switch (activeTab) {
        case 'home':
            return (
                <div className="flex flex-col gap-0 md:gap-8 pb-4">
                    <HeroSection />
                    <WorkerTicker user={user} />
                    <div className="px-4 md:px-0 space-y-6 max-w-7xl mx-auto w-full">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-briefcase text-brand-600"></i>
                                    최근 구인 공고
                                </h3>
                                <button onClick={() => setActiveTab('jobs')} className="text-xs text-brand-600 font-bold">전체보기</button>
                             </div>
                             <div className="h-48 relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-center">
                                <button 
                                    onClick={() => setActiveTab('jobs')}
                                    className="z-10 bg-brand-600 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                                >
                                    일자리 목록 확인하기
                                </button>
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <JobBoard user={user} />
                                </div>
                             </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-map-marked-alt text-brand-600"></i>
                                사무소 오시는 길
                            </h3>
                            <div className="aspect-video w-full mb-4 shadow-inner rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                                <OfficeMap address={BUSINESS_INFO.address} />
                            </div>
                             <a href={`tel:${BUSINESS_INFO.phone}`} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors">
                                <i className="fas fa-phone-alt"></i> 전화로 문의하기
                            </a>
                        </div>
                    </div>
                </div>
            );
        case 'jobs':
            return <div className="px-4 md:px-0 py-6 max-w-7xl mx-auto"><JobBoard user={user} targetJobId={targetJobId} onTargetJobConsumed={() => setTargetJobId(null)} onLoginRequest={() => setShowAuthModal(true)} /></div>;
        case 'gallery':
            return <div className="p-4 max-w-7xl mx-auto"><Gallery isAdmin={isAdmin} /></div>;
        case 'register':
            return (
                <div className="p-4 max-w-2xl mx-auto">
                    {user ? <MyProfile user={user} /> : (
                      <div className="space-y-6">
                        <RegistrationForm user={user as any} />
                        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <i className="fas fa-lock"></i>
                          </div>
                          <h3 className="font-bold text-lg mb-2">로그인이 필요합니다</h3>
                          <p className="text-gray-500 text-sm mb-6">회원으로 등록하시면 맞춤 일자리 알림을<br/>실시간으로 받아보실 수 있습니다.</p>
                          <button onClick={() => setShowAuthModal(true)} className="bg-brand-600 text-white px-10 py-3.5 rounded-xl font-bold shadow-lg shadow-brand-100">로그인 / 회원가입</button>
                        </div>
                      </div>
                    )}
                </div>
            );
        default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900 pb-20 md:pb-0">
      <Header 
        user={user} 
        isAdmin={isAdmin} 
        onToggleAdmin={() => setShowAdminDashboard(!showAdminDashboard)} 
        isAdminView={showAdminDashboard}
        onLoginClick={() => setShowAuthModal(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNotificationClick={handleNotificationClick}
      />
      
      <main className="flex-grow w-full">
        {renderContent()}
      </main>

      {!showAdminDashboard && <Footer />}
      
      {/* 모바일 하단바: showAdminDashboard가 아닐 때만 노출 */}
      {!showAdminDashboard && (
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
      )}

      {showAuthModal && <Auth onCancel={() => setShowAuthModal(false)} />}
      
      {!showAdminDashboard && (
        <div className="md:hidden fixed bottom-24 right-4 z-40">
          <a href={`tel:${BUSINESS_INFO.phone}`} className="w-14 h-14 bg-green-500 rounded-full text-white shadow-2xl flex items-center justify-center text-2xl animate-bounce hover:scale-110 transition-transform">
            <i className="fas fa-phone"></i>
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
