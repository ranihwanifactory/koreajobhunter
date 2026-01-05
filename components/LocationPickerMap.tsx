
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
  const [keyword, setKeyword] = useState('');

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
        updatePosition(latlng.getLat(), latlng.getLng());
      });
    };

    checkKakao();
  }, []); 

  const updatePosition = (lat: number, lng: number) => {
    if (!map || !marker) return;
    const { kakao } = window;
    const position = new kakao.maps.LatLng(lat, lng);
    
    marker.setPosition(position);
    
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        const detailAddr = result[0].address.address_name;
        onLocationSelect(lat, lng, detailAddr);
      }
    });
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.addressSearch(keyword, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        const lat = parseFloat(result[0].y);
        const lng = parseFloat(result[0].x);
        const coords = new kakao.maps.LatLng(lat, lng);

        map.setCenter(coords);
        marker.setPosition(coords);
        onLocationSelect(lat, lng, result[0].address_name);
      } else {
        alert('주소를 찾을 수 없습니다. 다시 입력해 주세요.');
      }
    });
  };

  // Update map/marker if props change externally
  useEffect(() => {
    if (isMapLoaded && map && marker && latitude && longitude) {
      const currentCenter = map.getCenter();
      const newCenter = new window.kakao.maps.LatLng(latitude, longitude);
      
      if (Math.abs(currentCenter.getLat() - latitude) > 0.0001 || Math.abs(currentCenter.getLng() - longitude) > 0.0001) {
          map.panTo(newCenter);
          marker.setPosition(newCenter);
      }
    }
  }, [latitude, longitude, map, marker, isMapLoaded]);

  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-gray-50">
      {/* Search Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20">
        <form onSubmit={handleSearch} className="flex shadow-lg rounded-xl overflow-hidden ring-2 ring-white/50">
            <input 
                type="text" 
                placeholder="동/읍/면 또는 도로명 주소 검색" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="flex-1 p-3.5 bg-white text-sm outline-none font-medium"
            />
            <button 
                type="submit" 
                className="bg-brand-600 text-white px-5 hover:bg-brand-700 transition-colors"
            >
                <i className="fas fa-search"></i>
            </button>
        </form>
      </div>

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center text-gray-400">
            <i className="fas fa-map-marked-alt text-2xl mb-2 animate-bounce"></i>
            <span className="text-xs">지도 불러오는 중...</span>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full"></div>
      
      <div className="absolute bottom-2 left-2 z-20 bg-white/90 px-3 py-1.5 rounded-lg text-[10px] shadow-sm border border-gray-200 text-gray-500 font-bold pointer-events-none">
        <i className="fas fa-hand-pointer mr-1 text-brand-500"></i> 지도를 클릭하거나 주소를 검색하세요
      </div>
    </div>
  );
};

export default LocationPickerMap;
