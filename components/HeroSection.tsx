import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-8 px-6 rounded-3xl mb-8 shadow-xl shadow-brand-200/50 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-brand-400/20 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        <div className="inline-block px-3 py-1 bg-brand-500/50 rounded-full text-xs font-semibold mb-3 border border-brand-400/50">
          신뢰받는 인력사무소
        </div>
        <h2 className="text-2xl font-bold mb-2 leading-tight">
          젊은 패기로 일하실<br/>
          인재를 찾습니다!
        </h2>
        <p className="text-brand-100 text-sm mb-6 max-w-[200px]">
          간단한 등록으로 내 주변의 다양한 일자리를 만나보세요.
        </p>
        
        <div className="flex gap-4 text-xs font-medium text-brand-100">
          <div className="flex items-center gap-1">
            <i className="fas fa-bolt text-yellow-300"></i>
            빠른 배정
          </div>
          <div className="flex items-center gap-1">
            <i className="fas fa-coins text-yellow-300"></i>
            당일 지급
          </div>
          <div className="flex items-center gap-1">
            <i className="fas fa-shield-alt text-yellow-300"></i>
            안전 보장
          </div>
        </div>
      </div>

      <img 
        src="https://picsum.photos/400/300?grayscale&blur=2" 
        alt="Background placeholder" 
        className="absolute right-0 bottom-0 w-32 h-32 object-cover opacity-20 rounded-tl-full"
      />
    </div>
  );
};

export default HeroSection;