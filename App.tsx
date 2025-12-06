
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
import { BUSINESS_INFO, ADMIN_EMAIL } from './constants';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

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
      // Reset profile view on user change
      if (!currentUser) {
          setShowProfile(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCall = () => {
    window.location.href = `tel:${BUSINESS_INFO.phone}`;
  };

  const toggleAdminView = () => {
    setShowAdminDashboard(prev => !prev);
    if (!showAdminDashboard) {
        setShowProfile(false);
        setShowGallery(false);
    }
  };

  const toggleProfileView = () => {
      setShowProfile(prev => !prev);
      if (!showProfile) {
          setShowAdminDashboard(false);
          setShowGallery(false);
      }
  };

  const toggleGalleryView = () => {
      setShowGallery(prev => !prev);
      if (!showGallery) {
          setShowAdminDashboard(false);
          setShowProfile(false);
      }
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Header 
        user={user} 
        isAdmin={isAdmin} 
        onToggleAdmin={toggleAdminView} 
        isAdminView={showAdminDashboard}
        onLoginClick={() => setShowAuthModal(true)}
        onProfileClick={toggleProfileView}
        isProfileView={showProfile}
        onGalleryClick={toggleGalleryView}
        isGalleryView={showGallery}
      />
      
      {/* Main Container: Expanded for PC (max-w-7xl) */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-6">
        {showAdminDashboard && isAdmin ? (
          <div className="p-4"><AdminDashboard /></div>
        ) : showProfile && user ? (
          <div className="p-4"><MyProfile user={user} /></div>
        ) : showGallery ? (
          <div className="p-4"><Gallery isAdmin={isAdmin} /></div>
        ) : (
          <div className="flex flex-col gap-0 md:gap-8">
            <div className="px-4 md:px-0 pt-6 md:pt-0">
               <HeroSection />
            </div>

            {/* Scrolling Ticker Section */}
            <WorkerTicker />
            
            <div className="px-4 md:px-0 flex flex-col gap-8">
              {/* Job Board Section */}
              <JobBoard />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
                {/* Left/Main Column: Registration */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center">
                    <i className="fas fa-user-plus mr-2 text-brand-600"></i>
                    인력 등록하기
                  </h3>
                  
                  {user ? (
                    <RegistrationForm user={user} />
                  ) : (
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

                {/* Right Column: Contact/Map Info (Sidebar on PC) */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                    <h3 className="font-bold text-gray-800 mb-3">사무소 오시는 길</h3>
                    
                    {/* Replaced static image with interactive OfficeMap */}
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
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                       <p className="text-sm text-gray-500 text-center">
                         <i className="far fa-clock mr-1"></i> 상담시간: 06:00 ~ 18:00
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      
      {/* Sticky Bottom Call Button for Mobile Only - Hide in Admin Mode */}
      {!showAdminDashboard && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
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
