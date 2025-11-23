import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!window.kakao || !mapRef.current) return;

    const { kakao } = window;

    kakao.maps.load(() => {
      const container = mapRef.current;
      // Default center: Seongju-gun Office or average of workers
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
            <div style="padding:5px; font-size:12px; border-radius:4px; background:white; border:1px solid #ddd; min-width:120px;">
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
    });
  }, [workers]);

  return (
    <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm border border-gray-200 relative">
      <div ref={mapRef} className="w-full h-full"></div>
      <div className="absolute bottom-2 right-2 z-10 bg-white/90 px-2 py-1 rounded text-xs text-gray-500 shadow-sm pointer-events-none">
        Powered by Kakao
      </div>
    </div>
  );
};

export default WorkerMap;