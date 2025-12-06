
import React from 'react';
import { BUSINESS_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-slate-300 py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Info Section */}
        <div className="text-sm space-y-2 text-center md:text-left">
          <h3 className="font-bold text-xl text-white mb-4">{BUSINESS_INFO.name}</h3>
          <p className="flex items-center gap-2 justify-center md:justify-start">
            <i className="fas fa-map-marker-alt w-5 text-center"></i>
            {BUSINESS_INFO.address}
          </p>
          <p className="flex items-center gap-2 justify-center md:justify-start">
            <i className="fas fa-phone w-5 text-center"></i>
            <a href={`tel:${BUSINESS_INFO.phone}`} className="underline text-brand-500 hover:text-brand-100">
              {BUSINESS_INFO.phone}
            </a>
          </p>
          <p className="flex items-center gap-2 justify-center md:justify-start">
            <i className="fas fa-id-card w-5 text-center"></i>
            사업자번호: {BUSINESS_INFO.bizNumber}
          </p>
        </div>

        {/* Copy Section */}
        <div className="text-xs text-slate-500 text-center md:text-right border-t md:border-t-0 border-slate-700 pt-4 md:pt-0 w-full md:w-auto">
          <p>&copy; {new Date().getFullYear()} {BUSINESS_INFO.name}. All rights reserved.</p>
          <p className="mt-1">Designed for Young Workforce Agency.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
