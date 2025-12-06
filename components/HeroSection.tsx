
import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-12 px-8 rounded-3xl mb-4 shadow-xl shadow-brand-200/50 relative overflow-hidden flex flex-col md:flex-row items-center justify-between min-h-[240px]">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-48 h-48 bg-brand-400/20 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="relative z-10 max-w-lg">
        <div className="inline-block px-3 py-1 bg-brand-500/50 rounded-full text-xs font-semibold mb-4 border border-brand-400/50">
          신뢰받는 인력사무소
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          젊은 패기로 일하실<br className="hidden md:block"/>
          인재를 찾습니다!
        </h2>
        <p className="text-brand-100 text-sm md:text-base mb-6 max-w-sm">
          간단한 등록으로 내 주변의 다양한 일자리를 만나보세요.<br/>
          당일 지급, 안전한 현장만을 연결해 드립니다.
        </p>
        
        <div className="flex gap-4 text-xs md:text-sm font-medium text-brand-100">
          <div className="flex items-center gap-1.5 bg-brand-700/30 px-3 py-1.5 rounded-lg border border-brand-500/30">
            <i className="fas fa-bolt text-yellow-300"></i>
            빠른 배정
          </div>
          <div className="flex items-center gap-1.5 bg-brand-700/30 px-3 py-1.5 rounded-lg border border-brand-500/30">
            <i className="fas fa-shield-alt text-yellow-300"></i>
            안전 보장
          </div>
        </div>
      </div>

      <img 
        src="https://picsum.photos/400/300?grayscale&blur=2" 
        alt="Background placeholder" 
        className="absolute right-0 bottom-0 w-48 h-48 md:w-80 md:h-full object-cover opacity-20 mask-image-gradient rounded-tl-full pointer-events-none"
      />
    </div>
  );
};

export default HeroSection;
