
import React, { useEffect, useRef, useState } from 'react';
import { WorkerProfile } from '../types';

interface WorkerMapProps {
  workers: WorkerProfile[];
}

declare global {
  interface Window {
    kakao: any;
  }
}

const WorkerMap: React.FC<WorkerMapProps> = ({ workers }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const checkKakao = () => {
      if (window.kakao && window.kakao.maps) {
        loadMap();
      } else {
        setTimeout(checkKakao, 100);
      }
    };

    const loadMap = () => {
      if (!mapRef.current) return;

      const { kakao } = window;
      const container = mapRef.current;
      // Default center: Seongju-gun Office
      const defaultCenter = new kakao.maps.LatLng(35.919, 128.286); 
      
      const options = {
        center: defaultCenter,
        level: 9,
      };

      const map = new kakao.maps.Map(container, options);
      const bounds = new kakao.maps.LatLngBounds();
      let hasMarkers = false;

      workers.forEach((worker) => {
        if (worker.location.latitude && worker.location.longitude) {
          hasMarkers = true;
          const markerPosition = new kakao.maps.LatLng(
            worker.location.latitude,
            worker.location.longitude
          );

          const marker = new kakao.maps.Marker({
            position: markerPosition,
          });

          marker.setMap(map);
          bounds.extend(markerPosition);

          // InfoWindow
          const content = `
            <div style="padding:15px; font-family:sans-serif; min-width:220px; color:#333; background:white; border-radius:8px;">
              <div style="border-bottom:1px solid #eee; padding-bottom:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:bold; font-size:16px; color:#111;">${worker.name}</span>
              </div>
              <div style="font-size:13px; line-height:1.6; color:#555;">
                <div style="display:flex; margin-bottom:4px;">
                  <span style="color:#888; width:50px; flex-shrink:0;">직종</span>
                  <span style="font-weight:600; color:#2563eb;">${worker.desiredJobs?.join(', ') || '-'}</span>
                </div>
                <div style="display:flex; margin-bottom:4px;">
                  <span style="color:#888; width:50px; flex-shrink:0;">연락처</span>
                  <span>${worker.phone}</span>
                </div>
                <div style="display:flex; margin-bottom:8px;">
                  <span style="color:#888; width:50px; flex-shrink:0;">주소</span>
                  <span style="color:#666;">${worker.location.addressString || '-'}</span>
                </div>
              </div>
              <div style="text-align:center;">
                 <a href="tel:${worker.phone}" style="display:block; width:100%; padding:8px 0; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-size:13px; font-weight:bold; transition: background 0.2s;">
                   <i class="fas fa-phone-alt" style="margin-right:4px;"></i> 전화걸기
                 </a>
              </div>
            </div>
          `;

          const infowindow = new kakao.maps.InfoWindow({
            content: content,
            removable: true
          });

          kakao.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map, marker);
          });
        }
      });

      if (hasMarkers) {
        map.setBounds(bounds);
      }
      
      setIsMapLoaded(true);
    };

    checkKakao();
  }, [workers]);

  return (
    <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm border border-gray-200 relative">
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <i className="fas fa-circle-notch fa-spin text-gray-400 mr-2"></i>
          <span className="text-gray-500 text-sm">지도 로딩 중...</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full"></div>
      <div className="absolute bottom-2 right-2 z-10 bg-white/90 px-2 py-1 rounded text-xs text-gray-500 shadow-sm pointer-events-none">
        Powered by Kakao
      </div>
    </div>
  );
};

export default WorkerMap;
