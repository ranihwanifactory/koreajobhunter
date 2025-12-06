
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

type TabView = 'home' | 'jobs' | 'register' | 'gallery';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Tab State for Mobile App-like navigation
  const [activeTab, setActiveTab] = useState<TabView>('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminStatus = currentUser?.email === ADMIN_EMAIL;
      setIsAdmin(adminStatus);
      
      // Admin auto-dashboard logic only if already logged in and explicit
      if (adminStatus) {
        setShowAdminDashboard(true);
      } else {
        setShowAdminDashboard(false);
      }
      setLoading(false);
      // Close auth modal on successful login
      if (currentUser) {
        setShowAuthModal(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCall = () => {
    window.location.href = `tel:${BUSINESS_INFO.phone}`;
  };

  const toggleAdminView = () => {
    setShowAdminDashboard(prev => !prev);
    // If exiting admin dashboard, go to home
    if (showAdminDashboard) {
       setActiveTab('home');
    }
  };

  const handleTabChange = (tab: string) => {
      // If user clicks a tab while in admin mode, exit admin mode
      if (showAdminDashboard) {
          setShowAdminDashboard(false);
      }
      setActiveTab(tab as TabView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If Auth Modal is active, show it over the content
  if (showAuthModal) {
    return <Auth onCancel={() => setShowAuthModal(false)} />;
  }

  const renderContent = () => {
    if (showAdminDashboard && isAdmin) {
        return <div className="p-4"><AdminDashboard /></div>;
    }

    switch (activeTab) {
        case 'home':
            return (
                <div className="flex flex-col gap-0 md:gap-8 pb-4">
                    <div className="px-4 md:px-0 pt-6 md:pt-0">
                        <HeroSection />
                    </div>
                    <WorkerTicker />
                    
                    <div className="px-4 md:px-0 space-y-6">
                        {/* Preview of Jobs on Home */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-briefcase text-brand-600"></i>
                                    최근 일자리
                                </h3>
                                <button 
                                    onClick={() => setActiveTab('jobs')}
                                    className="text-xs text-gray-500 font-medium hover:text-brand-600 flex items-center gap-1"
                                >
                                    더보기 <i className="fas fa-chevron-right text-[10px]"></i>
                                </button>
                             </div>
                             <div className="h-40 relative overflow-hidden">
                                {/* Only show a teaser here, users should go to Jobs tab */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white flex items-end justify-center pb-2 z-10">
                                    <button 
                                        onClick={() => setActiveTab('jobs')}
                                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors shadow-sm"
                                    >
                                        일자리 목록 전체보기
                                    </button>
                                </div>
                                <JobBoard /> 
                             </div>
                        </div>

                        {/* Location / Contact Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <i className="fas fa-map-marked-alt text-brand-600"></i>
                                사무소 오시는 길
                            </h3>
                            <div className="aspect-video w-full mb-4 shadow-inner rounded-lg overflow-hidden border border-gray-200">
                                <OfficeMap address={BUSINESS_INFO.address} />
                            </div>
                             <button 
                                onClick={handleCall}
                                className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                                >
                                <i className="fas fa-phone-alt"></i>
                                전화 문의하기
                            </button>
                        </div>
                    </div>
                </div>
            );
        case 'jobs':
            return (
                <div className="px-4 md:px-0 py-6">
                    <JobBoard />
                </div>
            );
        case 'gallery':
            return (
                <div className="p-4">
                    <Gallery isAdmin={isAdmin} />
                </div>
            );
        case 'register':
            return (
                <div className="p-4">
                     <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center">
                        <i className={`fas ${user ? 'fa-user-edit' : 'fa-user-plus'} mr-2 text-brand-600`}></i>
                        {user ? '내 정보 관리' : '인력 등록하기'}
                    </h3>
                    {user ? (
                        <MyProfile user={user} />
                    ) : (
                        <div className="flex flex-col gap-6">
                            <RegistrationForm user={user as any} /> 
                            {/* Note: RegistrationForm handles !user internally by showing login prompt if we passed null, 
                                but logically we might want to just show the login prompt here directly. 
                                The existing RegistrationForm handles !user gracefully. 
                            */}
                            {!user && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-fade-in">
                                    <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-lock text-2xl"></i>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h3>
                                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                                        인력으로 등록하고 일자리 매칭을 받으시려면<br/>
                                        로그인 또는 회원가입이 필요합니다.
                                    </p>
                                    <button 
                                        onClick={() => setShowAuthModal(true)}
                                        className="bg-brand-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
                                    >
                                        로그인 / 회원가입 하러가기
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900 pb-16 md:pb-0">
      <Header 
        user={user} 
        isAdmin={isAdmin} 
        onToggleAdmin={toggleAdminView} 
        isAdminView={showAdminDashboard}
        onLoginClick={() => setShowAuthModal(true)}
        
        // Map header interactions to tab changes
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-6">
        {renderContent()}
      </main>

      {/* Footer - Only show on Home or Desktop to save space on mobile functionality pages */}
      {(activeTab === 'home' || window.innerWidth >= 768) && <Footer />}
      
      {/* Mobile Bottom Navigation */}
      {!showAdminDashboard && (
          <BottomNav 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
            user={user}
          />
      )}
      
      {/* Sticky Bottom Call Button for Mobile - Positioned above BottomNav */}
      {!showAdminDashboard && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <button 
            onClick={handleCall}
            className="w-14 h-14 bg-green-500 rounded-full text-white shadow-lg shadow-green-500/40 flex items-center justify-center text-2xl animate-bounce hover:bg-green-600 transition-colors"
          >
            <i className="fas fa-phone"></i>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
