import React from 'react';
import { BUSINESS_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-slate-300 py-8 px-4 mt-auto">
      <div className="max-w-md mx-auto text-sm space-y-2">
        <h3 className="font-bold text-lg text-white mb-4">{BUSINESS_INFO.name}</h3>
        <p className="flex items-center gap-2">
          <i className="fas fa-map-marker-alt w-5 text-center"></i>
          {BUSINESS_INFO.address}
        </p>
        <p className="flex items-center gap-2">
          <i className="fas fa-phone w-5 text-center"></i>
          <a href={`tel:${BUSINESS_INFO.phone}`} className="underline text-brand-500 hover:text-brand-100">
            {BUSINESS_INFO.phone}
          </a>
        </p>
        <p className="flex items-center gap-2">
          <i className="fas fa-id-card w-5 text-center"></i>
          사업자번호: {BUSINESS_INFO.bizNumber}
        </p>
        <div className="border-t border-slate-600 mt-6 pt-4 text-xs text-slate-500 text-center">
          &copy; {new Date().getFullYear()} {BUSINESS_INFO.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;