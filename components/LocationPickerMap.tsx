import React, { useEffect, useRef, useState } from 'react';

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ latitude, longitude, onLocationSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Default: Seongju-gun Office
  const defaultLat = 35.919;
  const defaultLng = 128.286;

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
      const initialLat = latitude || defaultLat;
      const initialLng = longitude || defaultLng;

      const container = mapRef.current;
      const options = {
        center: new kakao.maps.LatLng(initialLat, initialLng),
        level: 3,
      };

      const newMap = new kakao.maps.Map(container, options);
      setMap(newMap);

      const markerPosition = new kakao.maps.LatLng(initialLat, initialLng);
      const newMarker = new kakao.maps.Marker({
        position: markerPosition,
        map: newMap
      });
      setMarker(newMarker);
      setIsMapLoaded(true);

      // Map Click Event
      kakao.maps.event.addListener(newMap, 'click', function(mouseEvent: any) {
        const latlng = mouseEvent.latLng;
        newMarker.setPosition(latlng);
        
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
          if (status === kakao.maps.services.Status.OK) {
            const detailAddr = result[0].address.address_name;
            onLocationSelect(latlng.getLat(), latlng.getLng(), detailAddr);
          }
        });
      });
    };

    checkKakao();
  }, []); 

  // Update map/marker if props change externally (e.g. "Get Location" button)
  useEffect(() => {
    if (isMapLoaded && map && marker && latitude && longitude) {
      const currentCenter = map.getCenter();
      const newCenter = new window.kakao.maps.LatLng(latitude, longitude);
      
      // Only move if significantly different to avoid jitter during drag/click
      if (Math.abs(currentCenter.getLat() - latitude) > 0.0001 || Math.abs(currentCenter.getLng() - longitude) > 0.0001) {
          map.panTo(newCenter);
          marker.setPosition(newCenter);
      }
    }
  }, [latitude, longitude, map, marker, isMapLoaded]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-300 shadow-inner bg-gray-100">
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center text-gray-400">
            <i className="fas fa-map-marked-alt text-2xl mb-2 animate-bounce"></i>
            <span className="text-xs">지도 불러오는 중...</span>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full"></div>
      <div className="absolute bottom-2 left-2 z-20 bg-white/90 px-3 py-1.5 rounded-lg text-xs shadow-md border border-gray-200 text-gray-600">
        <i className="fas fa-hand-pointer mr-1"></i> 지도를 클릭하여 위치 변경
      </div>
    </div>
  );
};

export default LocationPickerMap;