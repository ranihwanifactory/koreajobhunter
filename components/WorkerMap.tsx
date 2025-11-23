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
            <div style="padding:5px; font-size:12px; border-radius:4px; background:white; border:1px solid #ddd; min-width:120px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="font-weight:bold; color:#333; margin-bottom:2px;">${worker.name}</div>
              <div style="color:#666;">${worker.desiredJobs?.[0] || '직종미정'}</div>
            </div>
          `;

          const infowindow = new kakao.maps.InfoWindow({
            content: content,
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