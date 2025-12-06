
import React from 'react';
import { BUSINESS_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-slate-300 py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
        
        {/* Info Section */}
        <div className="text-sm space-y-3 w-full md:w-auto">
          <h3 className="font-bold text-2xl text-white mb-2">{BUSINESS_INFO.name}</h3>
          
          <div className="flex flex-col gap-2">
            <p className="flex items-start gap-2">
              <i className="fas fa-map-marker-alt w-5 text-center mt-1 shrink-0"></i>
              <span>{BUSINESS_INFO.address}</span>
            </p>
            <p className="flex items-center gap-2">
              <i className="fas fa-phone w-5 text-center shrink-0"></i>
              <a href={`tel:${BUSINESS_INFO.phone}`} className="underline text-brand-500 hover:text-brand-100 font-bold">
                {BUSINESS_INFO.phone}
              </a>
            </p>
            <div className="flex flex-col sm:flex-row sm:gap-4 gap-2 text-slate-400">
               <p className="flex items-center gap-2">
                 <i className="fas fa-user-tie w-5 text-center shrink-0"></i>
                 대표: {BUSINESS_INFO.representative}
               </p>
               <p className="flex items-center gap-2">
                 <i className="fas fa-id-card w-5 text-center shrink-0"></i>
                 사업자번호: {BUSINESS_INFO.bizNumber}
               </p>
            </div>
            <p className="flex items-center gap-2 text-slate-400">
              <i className="fas fa-envelope w-5 text-center shrink-0"></i>
              {BUSINESS_INFO.email}
            </p>
            <div className="mt-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600 inline-block">
               <p className="text-xs text-slate-400 mb-1">입금 계좌안내</p>
               <p className="font-bold text-white flex items-center gap-2">
                 <i className="fas fa-university"></i>
                 {BUSINESS_INFO.bankAccount}
               </p>
            </div>
          </div>
        </div>

        {/* Copy Section */}
        <div className="text-xs text-slate-500 text-center md:text-right border-t md:border-t-0 border-slate-700 pt-6 md:pt-0 w-full md:w-auto mt-auto">
          <p>&copy; {new Date().getFullYear()} {BUSINESS_INFO.name}. All rights reserved.</p>
          <p className="mt-1">Young Workforce Agency.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
