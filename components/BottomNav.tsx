
import React from 'react';
import { User } from 'firebase/auth';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User | null;
  hasNewNotification?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, user, hasNewNotification }) => {
  const navItems = [
    { id: 'home', label: '홈', icon: 'fa-home' },
    { id: 'jobs', label: '일자리', icon: 'fa-briefcase' },
    { 
      id: 'register', 
      label: user ? '내정보' : '인력등록', 
      icon: user ? 'fa-user' : 'fa-user-plus' 
    },
    { id: 'gallery', label: '갤러리', icon: 'fa-images' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe pt-2 px-2 z-50 
                    md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:min-w-[440px] md:rounded-2xl md:border md:shadow-2xl md:px-6">
      <div className="flex justify-around items-center h-14 md:h-16 gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all relative group ${
              activeTab === item.id 
                ? 'text-brand-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <i className={`fas ${item.icon} text-xl md:text-2xl mb-0.5 transition-transform duration-300 ${activeTab === item.id ? 'scale-110 -translate-y-1' : 'group-hover:scale-110'}`}></i>
              {/* Badge example for profile/notifications if needed */}
              {item.id === 'home' && hasNewNotification && (
                 <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <span className={`text-[10px] md:text-xs font-bold transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
            </span>
            
            {/* Active Indicator Bar (Desktop only) */}
            {activeTab === item.id && (
                <span className="hidden md:block absolute -bottom-1 w-1 h-1 bg-brand-600 rounded-full"></span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
