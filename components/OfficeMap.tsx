
import React, { useEffect, useRef, useState } from 'react';
import { BUSINESS_INFO } from '../constants';

interface OfficeMapProps {
  address: string;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const OfficeMap: React.FC<OfficeMapProps> = ({ address }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkKakao = () => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        initMap();
      } else {
        setTimeout(checkKakao, 100);
      }
    };

    const initMap = () => {
      if (!mapRef.current) return;
      
      const { kakao } = window;
      const geocoder = new kakao.maps.services.Geocoder();

      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          
          const options = {
            center: coords,
            level: 3
          };
          
          const map = new kakao.maps.Map(mapRef.current, options);
          
          // Marker
          const marker = new kakao.maps.Marker({
            map: map,
            position: coords
          });

          // InfoWindow
          const content = `
            <div style="padding:10px; font-size:12px; color:#333; text-align:center; min-width:150px; background:white; border-radius:4px;">
              <div style="font-weight:bold; margin-bottom:5px; font-size:13px;">${BUSINESS_INFO.name}</div>
              <a href="https://map.kakao.com/link/to/${BUSINESS_INFO.name},${result[0].y},${result[0].x}" style="color:#2563eb; text-decoration:none; font-weight:bold; padding:4px 8px; background:#eff6ff; border-radius:4px; display:inline-block;" target="_blank">
                 <i class="fas fa-location-arrow mr-1"></i> 길찾기
              </a>
            </div>
          `;

          const infowindow = new kakao.maps.InfoWindow({
            content: content,
            removable: false
          });

          infowindow.open(map, marker);
          setIsLoaded(true);
        } else {
             console.error("Geocoding failed for office address");
             setIsLoaded(true); 
        }
      });
    };

    checkKakao();
  }, [address]);

  return (
    <div className="w-full h-full relative bg-gray-100 rounded-lg overflow-hidden">
        <div ref={mapRef} className="w-full h-full" />
        {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <i className="fas fa-spinner fa-spin text-gray-400 mr-2"></i>
                <span className="text-gray-500 text-sm">지도 로딩 중...</span>
            </div>
        )}
    </div>
  );
};

export default OfficeMap;
