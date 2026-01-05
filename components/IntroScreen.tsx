
import React from 'react';
import { BUSINESS_INFO } from '../constants';

const IntroScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-brand-700 via-brand-600 to-slate-900 flex flex-col items-center justify-center text-white overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl animate-pulse-soft"></div>
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-2xl"></div>

      <div className="relative flex flex-col items-center">
        {/* Animated Logo Icon */}
        <div className="w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-900/40 animate-scale-in mb-8">
          <span className="text-brand-600 font-black text-6xl select-none">젊</span>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl font-black tracking-tighter mb-3 animate-slide-up-fade" style={{ animationDelay: '0.4s' }}>
          {BUSINESS_INFO.name}
        </h1>

        {/* Tagline */}
        <div className="flex flex-col items-center gap-2 opacity-0 animate-slide-up-fade" style={{ animationDelay: '0.8s' }}>
          <p className="text-brand-100 font-medium tracking-wide">성주 지역 최대 인력 매칭 플랫폼</p>
          <div className="h-1 w-12 bg-yellow-400 rounded-full mt-1"></div>
        </div>
      </div>

      {/* Bottom Loading Text */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '1.2s' }}>
        <div className="flex gap-1.5 mb-2">
           <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
           <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
           <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <span className="text-xs text-brand-200 font-bold tracking-widest uppercase">Initializing Service</span>
      </div>
    </div>
  );
};

export default IntroScreen;
