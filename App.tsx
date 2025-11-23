
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RegistrationForm from './components/RegistrationForm';
import HeroSection from './components/HeroSection';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import JobBoard from './components/JobBoard';
import { BUSINESS_INFO, ADMIN_EMAIL } from './constants';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const adminStatus = currentUser?.email === ADMIN_EMAIL;
      setIsAdmin(adminStatus);
      // Auto-show admin dashboard on login if admin
      if (adminStatus) {
        setShowAdminDashboard(true);
      } else {
        setShowAdminDashboard(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCall = () => {
    window.location.href = `tel:${BUSINESS_INFO.phone}`;
  };

  const toggleAdminView = () => {
    setShowAdminDashboard(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Header 
        user={user} 
        isAdmin={isAdmin} 
        onToggleAdmin={toggleAdminView} 
        isAdminView={showAdminDashboard}
      />
      
      <main className="flex-grow w-full max-w-md mx-auto px-4 py-6">
        {showAdminDashboard && isAdmin ? (
          <AdminDashboard />
        ) : (
          <>
            <HeroSection />
            
            {/* New Job Board Section */}
            <JobBoard />

            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">
                <i className="fas fa-user-plus mr-2 text-brand-600"></i>
                인력 등록하기
              </h3>
              <RegistrationForm user={user} />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <h3 className="font-bold text-gray-800 mb-3">사무소 오시는 길</h3>
              <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                 {/* Use a static placeholder map image for demo */}
                <img 
                    src="https://picsum.photos/600/300?random=1" 
                    alt="Map Placeholder" 
                    className="absolute inset-0 w-full h-full object-cover opacity-80" 
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white">
                    <i className="fas fa-map-marked-alt text-3xl mb-2"></i>
                    <span className="font-bold">{BUSINESS_INFO.address}</span>
                </div>
              </div>
              <button 
                onClick={handleCall}
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
              >
                <i className="fas fa-phone-alt"></i>
                전화 문의하기
              </button>
            </div>
          </>
        )}
      </main>

      <Footer />
      
      {/* Sticky Bottom Call Button for Mobile - Hide in Admin Mode */}
      {!showAdminDashboard && (
        <div className="md:hidden fixed bottom-6 right-6 z-40">
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
