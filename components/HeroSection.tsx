
import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <div className="relative mb-8">
      {/* Main Banner Background */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20 relative">
        {/* Image Background with Overlay */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20191217_182%2F1576547683994rVjL5_JPEG%2Fb1zVapPF8IqIvzScb22GuXY5.jpg" 
                alt="Background" 
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/60"></div>
        </div>

        <div className="relative z-10 px-6 py-10 md:py-14 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Text Content */}
          <div className="text-center md:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-600/90 text-white px-3 py-1 rounded-full text-xs font-bold mb-4 shadow-lg shadow-brand-900/50 backdrop-blur-sm border border-blue-400/30">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              성주 지역 최대 인력 보유
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight drop-shadow-lg">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-white">
                건설 · 공장 · 농촌
              </span><br/>
              인력 확실하게 공급합니다!
            </h1>
            
            <p className="text-slate-200 text-sm md:text-lg mb-8 leading-relaxed drop-shadow-md">
              <span className="font-semibold text-white">내국인</span>부터 성실한 <span className="font-semibold text-yellow-400">외국인 인력</span>까지 다수 보유.<br className="hidden md:block"/>
              규모가 다른 인력 네트워크로 <span className="underline decoration-brand-500 underline-offset-4">100% 출근을 보장</span>해 드립니다.
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-6 border-t border-slate-700/50 pt-6">
              <div className="text-center md:text-left">
                <div className="text-2xl md:text-3xl font-bold text-white">500<span className="text-blue-400 text-lg">+</span></div>
                <div className="text-[10px] md:text-xs text-slate-400">보유 인력</div>
              </div>
              <div className="text-center md:text-left border-l border-slate-700/50 pl-2 md:pl-6">
                <div className="text-2xl md:text-3xl font-bold text-white">100<span className="text-blue-400 text-lg">%</span></div>
                <div className="text-[10px] md:text-xs text-slate-400">현장 배치율</div>
              </div>
              <div className="text-center md:text-left border-l border-slate-700/50 pl-2 md:pl-6">
                <div className="text-2xl md:text-3xl font-bold text-white">24<span className="text-blue-400 text-lg">h</span></div>
                <div className="text-[10px] md:text-xs text-slate-400">상시 대기</div>
              </div>
            </div>
          </div>

          {/* Right Side Visuals (Cards) */}
          <div className="w-full md:w-auto flex flex-col gap-3 min-w-[280px]">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4 hover:bg-white/20 transition-colors cursor-default shadow-lg">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 text-xl">
                <i className="fas fa-seedling"></i>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">농촌 인력 전문</h3>
                <p className="text-xs text-slate-300">비닐하우스, 수확, 선별 작업</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4 hover:bg-white/20 transition-colors cursor-default shadow-lg">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 text-xl">
                <i className="fas fa-industry"></i>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">공장/제조 파견</h3>
                <p className="text-xs text-slate-300">생산라인, 포장, 물류 상하차</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4 hover:bg-white/20 transition-colors cursor-default shadow-lg">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 text-xl">
                <i className="fas fa-hard-hat"></i>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">건설 현장 인력</h3>
                <p className="text-xs text-slate-300">기공, 조공, 철거, 일반잡부</p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Bottom Banner Strip */}
      <div className="mt-4 bg-gradient-to-r from-brand-600 to-slate-800 rounded-xl p-3 flex items-center justify-center text-white text-xs md:text-sm shadow-md text-center">
        <i className="fas fa-globe-asia mr-2 text-yellow-300"></i>
        <span>
          <strong>외국인 인력 다수 보유!</strong> 의사소통 가능하고 성실한 젊은 인력을 공급해 드립니다.
        </span>
      </div>
    </div>
  );
};

export default HeroSection;
