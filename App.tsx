
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

  // Deep linking logic (from notifications)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabView;
    const linkId = params.get('linkId');

    if (tab) setActiveTab(tab);
    if (linkId) {
      setTargetJobId(linkId);
      if (!tab || tab === 'home') setActiveTab('jobs');
    }
    
    if (tab || linkId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminStatus = currentUser?.email === ADMIN_EMAIL;
      setIsAdmin(adminStatus);
      
      // 관리자라도 처음엔 홈 화면을 보여줌 (필요할 때만 대시보드 전환)
      if (adminStatus && !showAdminDashboard && activeTab === 'home') {
          // 필요시 자동 전환 로직 추가 가능
      }
      
      setLoading(false);

      if (currentUser) {
        setShowAuthModal(false);
        // 푸시 토큰 등록 시도
        requestFcmToken(currentUser.uid);
        onForegroundMessage();
      }
    });

    return () => unsubscribe();
  }, [activeTab, showAdminDashboard]);

  const handleCall = () => {
    window.location.href = `tel:${BUSINESS_INFO.phone}`;
  };

  const handleTabChange = (tab: string) => {
      setShowAdminDashboard(false);
      setActiveTab(tab as TabView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotificationClick = (noti: AppNotification) => {
      if (noti.type === 'job' && noti.linkId) {
          setActiveTab('jobs');
          setTargetJobId(noti.linkId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          setActiveTab('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showAuthModal) {
    return <Auth onCancel={() => setShowAuthModal(false)} />;
  }

  const renderContent = () => {
    if (showAdminDashboard && isAdmin) {
        return <div className="p-4 max-w-7xl mx-auto"><AdminDashboard /></div>;
    }

    switch (activeTab) {
        case 'home':
            return (
                <div className="flex flex-col gap-0 md:gap-8 pb-4">
                    <div className="px-4 md:px-0 pt-6 md:pt-0">
                        <HeroSection />
                    </div>
                    <WorkerTicker user={user} />
                    <div className="px-4 md:px-0 space-y-6">
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-briefcase text-brand-600"></i>
                                    최근 일자리
                                </h3>
                                <button onClick={() => setActiveTab('jobs')} className="text-xs text-gray-500 font-medium hover:text-brand-600">더보기</button>
                             </div>
                             <div className="h-40 relative overflow-hidden rounded-xl border border-gray-50 bg-gray-50/30 flex items-center justify-center">
                                <button 
                                    onClick={() => setActiveTab('jobs')}
                                    className="z-10 bg-brand-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform"
                                >
                                    실시간 일자리 목록 보기
                                </button>
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                    <JobBoard user={user} />
                                </div>
                             </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <i className="fas fa-map-marked-alt text-brand-600"></i>
                                사무소 위치
                            </h3>
                            <div className="aspect-video w-full mb-4 shadow-inner rounded-xl overflow-hidden border border-gray-200">
                                <OfficeMap address={BUSINESS_INFO.address} />
                            </div>
                             <button onClick={handleCall} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-shadow">
                                <i className="fas fa-phone-alt"></i> 전화 문의하기
                            </button>
                        </div>
                    </div>
                </div>
            );
        case 'jobs':
            return <div className="px-4 md:px-0 py-6"><JobBoard user={user} targetJobId={targetJobId} onTargetJobConsumed={() => setTargetJobId(null)} onLoginRequest={() => setShowAuthModal(true)} /></div>;
        case 'gallery':
            return <div className="p-4"><Gallery isAdmin={isAdmin} /></div>;
        case 'register':
            return (
                <div className="p-4 max-w-2xl mx-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i className={`fas ${user ? 'fa-user-circle' : 'fa-user-plus'} text-brand-600`}></i>
                        {user ? '나의 프로필' : '인력 등록'}
                    </h3>
                    {user ? <MyProfile user={user} /> : <div className="flex flex-col gap-6"><RegistrationForm user={user as any} /><div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm"><i className="fas fa-lock text-3xl text-brand-100 mb-4"></i><h3 className="font-bold mb-2">로그인이 필요합니다</h3><button onClick={() => setShowAuthModal(true)} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold">로그인 / 회원가입</button></div></div>}
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
      <main className="flex-grow w-full max-w-7xl mx-auto md:px-4">
        {renderContent()}
      </main>
      {!showAdminDashboard && <Footer />}
      {!showAdminDashboard && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />}
      {!showAdminDashboard && (
        <div className="md:hidden fixed bottom-24 right-4 z-40">
          <button onClick={handleCall} className="w-14 h-14 bg-green-500 rounded-full text-white shadow-xl flex items-center justify-center text-2xl animate-bounce"><i className="fas fa-phone"></i></button>
        </div>
      )}
    </div>
  );
}

export default App;
