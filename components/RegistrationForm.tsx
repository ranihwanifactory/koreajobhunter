
import React, { useState, useEffect } from 'react';
import { WorkerProfile, JobType } from '../types';
import { JOB_TYPES_LIST, BUSINESS_INFO } from '../constants';
import { generateWorkerIntro } from '../services/geminiService';
import { User } from 'firebase/auth';
import { db, storage } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import LocationPickerMap from './LocationPickerMap';

interface RegistrationFormProps {
  user: User;
  onCancel?: () => void;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ user, onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // File states
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [safetyCertFile, setSafetyCertFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<WorkerProfile>({
    name: user.displayName || '',
    phone: '',
    bankName: '',
    accountNumber: '',
    desiredJobs: [],
    location: {
      latitude: null,
      longitude: null,
      addressString: ''
    },
    introduction: '',
    idCardImageUrl: '',
    safetyCertImageUrl: '',
    isAgreed: false,
    notificationSettings: {
      jobPostings: true
    }
  });

  // Load existing data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "workers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<WorkerProfile>;
          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            desiredJobs: data.desiredJobs || [],
            location: {
              latitude: data.location?.latitude ?? null,
              longitude: data.location?.longitude ?? null,
              addressString: data.location?.addressString || ''
            },
            introduction: data.introduction || '',
            idCardImageUrl: data.idCardImageUrl || '',
            safetyCertImageUrl: data.safetyCertImageUrl || '',
            isAgreed: !!data.isAgreed,
            notificationSettings: data.notificationSettings || { jobPostings: true }
          });
        }
      } catch (error) {
        console.error("Error loading document: ", error);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchData();
  }, [user]);

  // Auto-fetch location if no location data exists
  useEffect(() => {
    if (!isFetchingData && !formData.location.latitude && !formData.location.addressString) {
      getLocation(true); // silent mode
    }
  }, [isFetchingData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'safetyCert') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'idCard') setIdCardFile(file);
      else setSafetyCertFile(file);
    }
  };

  const toggleJob = (job: JobType) => {
    setFormData(prev => {
      const exists = prev.desiredJobs.includes(job);
      if (exists) {
        return { ...prev, desiredJobs: prev.desiredJobs.filter(j => j !== job) };
      } else {
        return { ...prev, desiredJobs: [...prev.desiredJobs, job] };
      }
    });
  };

  const toggleNotification = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    
    // Request permission if checking the box
    if (isChecked) {
      if (!("Notification" in window)) {
        alert("이 브라우저는 알림을 지원하지 않습니다.");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.");
        // Do not verify the checkbox visually if permission denied
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        jobPostings: isChecked
      }
    }));
  };

  // Helper to wait for Kakao API
  const waitForKakao = async (retries = 10): Promise<boolean> => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      return true;
    }
    if (retries === 0) return false;
    await new Promise(resolve => setTimeout(resolve, 300));
    return waitForKakao(retries - 1);
  };

  const getAddressFromCoords = async (lat: number, lon: number) => {
    try {
      const isReady = await waitForKakao();
      if (!isReady) {
        // Just set coords if Kakao fails
        setFormData(prev => ({
            ...prev,
            location: {
              latitude: lat,
              longitude: lon,
              addressString: prev.location.addressString || `위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)}`
            }
          }));
        setIsLoading(false);
        return;
      }

      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lon, lat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const detailAddr = result[0].address.address_name;
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: lat,
              longitude: lon,
              addressString: detailAddr
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: lat,
              longitude: lon,
              addressString: `위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)}`
            }
          }));
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Geocoding failed:", error);
      setIsLoading(false);
    }
  };

  const getCoordsFromAddressHelper = async (addr: string): Promise<{lat: number, lng: number, addressName: string} | null> => {
    try {
      const isReady = await waitForKakao();
      if (!isReady) return null;
      return new Promise((resolve) => {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(addr, (result: any, status: any) => {
              if (status === window.kakao.maps.services.Status.OK) {
                  resolve({
                      lat: parseFloat(result[0].y),
                      lng: parseFloat(result[0].x),
                      addressName: result[0].address_name
                  });
              } else {
                  resolve(null);
              }
          });
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // New function: Search address string to get coordinates
  const searchAddress = async () => {
    const addr = formData.location.addressString;
    if (!addr) {
      alert('주소를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await getCoordsFromAddressHelper(addr);
      if (result) {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: result.lat,
            longitude: result.lng,
            addressString: result.addressName
          }
        }));
      } else {
        alert('주소를 찾을 수 없습니다. 정확한 주소를 입력해주세요.');
      }
    } catch (error) {
      console.error("Address search failed:", error);
      alert('주소 검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!navigator.geolocation) {
      if (!silent) {
        alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
        setIsLoading(false);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        getAddressFromCoords(lat, lon);
      },
      (error) => {
        if (!silent) {
          alert(`위치 정보를 가져올 수 없습니다: ${error.message}`);
          setIsLoading(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Callback from LocationPickerMap
  const handleMapLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        latitude: lat,
        longitude: lng,
        addressString: address
      }
    }));
  };

  const generateSmartIntro = async () => {
    if (!formData.name || formData.desiredJobs.length === 0) {
      alert('이름과 희망 직종을 먼저 선택해주세요.');
      return;
    }
    
    setAiLoading(true);
    const intro = await generateWorkerIntro(
      formData.name,
      formData.desiredJobs,
      formData.location.addressString || '경북 성주군'
    );
    setFormData(prev => ({ ...prev, introduction: intro }));
    setAiLoading(false);
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress monitoring if needed
        },
        (error) => {
          console.error("Upload error:", error);
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isAgreed) {
      alert('개인정보 수집 및 이용에 동의해야 합니다.');
      return;
    }
    
    setIsLoading(true);
    try {
      let idCardUrl = formData.idCardImageUrl || '';
      let safetyCertUrl = formData.safetyCertImageUrl || '';

      // Upload ID Card if new file selected
      if (idCardFile) {
        setUploadStatus('신분증 업로드 중...');
        try {
          idCardUrl = await uploadImage(idCardFile, `workers/${user.uid}/idCard_${Date.now()}`);
        } catch (uploadError) {
          console.error("ID Card upload failed", uploadError);
          throw new Error("신분증 업로드에 실패했습니다.");
        }
      }

      // Upload Safety Cert if new file selected
      if (safetyCertFile) {
        setUploadStatus('교육증 업로드 중...');
        try {
          safetyCertUrl = await uploadImage(safetyCertFile, `workers/${user.uid}/safetyCert_${Date.now()}`);
        } catch (uploadError) {
          console.error("Safety Cert upload failed", uploadError);
           throw new Error("이수증 업로드에 실패했습니다.");
        }
      }

      setUploadStatus('위치 정보 확인 중...');
      
      // Auto-geocode logic if missing lat/lng
      let finalLat = formData.location.latitude ?? null;
      let finalLng = formData.location.longitude ?? null;
      let finalAddr = formData.location.addressString || '';

      if ((!finalLat || !finalLng) && finalAddr) {
          try {
             const coords = await getCoordsFromAddressHelper(finalAddr);
             if (coords) {
                 finalLat = coords.lat;
                 finalLng = coords.lng;
                 finalAddr = coords.addressName;
             }
          } catch(e) {
              console.error("Auto geocode fail", e);
          }
      }

      setUploadStatus('정보 저장 중...');
      
      // Sanitized data object ensuring NO undefined values
      const dataToSave = {
        name: formData.name || '',
        phone: formData.phone || '',
        bankName: formData.bankName || '',
        accountNumber: formData.accountNumber || '',
        desiredJobs: formData.desiredJobs || [],
        location: {
            latitude: finalLat,
            longitude: finalLng,
            addressString: finalAddr
        },
        introduction: formData.introduction || '',
        idCardImageUrl: idCardUrl || '',
        safetyCertImageUrl: safetyCertUrl || '',
        email: user.email || '',
        updatedAt: new Date().toISOString(),
        isAgreed: true,
        notificationSettings: formData.notificationSettings || { jobPostings: true }
      };

      await setDoc(doc(db, "workers", user.uid), dataToSave);
      
      // Update local state to reflect possible geocode changes
      setFormData(prev => ({
          ...prev,
          location: {
              latitude: finalLat,
              longitude: finalLng,
              addressString: finalAddr
          },
          idCardImageUrl: idCardUrl,
          safetyCertImageUrl: safetyCertUrl
      }));

      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error writing document: ", error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
      setUploadStatus('');
    }
  };

  if (isFetchingData) {
    return <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>정보를 불러오는 중...</div>;
  }

  if (isSubmitted && !onSuccess) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center animate-fade-in-up">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-check text-3xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">등록 완료!</h2>
        <p className="text-gray-600 mb-8">
          {formData.name}님의 정보가 안전하게 저장되었습니다.<br/>
          언제든지 정보를 수정할 수 있습니다.
        </p>
        <button 
          onClick={() => setIsSubmitted(false)}
          className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-transform active:scale-95"
        >
          내 정보 확인하기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Cancel Button if props exist */}
      {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20 p-2"
          >
              <i className="fas fa-times text-xl"></i>
          </button>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-1.5">
        <div 
          className="bg-brand-500 h-1.5 transition-all duration-300 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        ></div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm">1</span>
              기본 정보 입력
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">계좌정보 (급여 수령용)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-1/3 px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none"
                  placeholder="은행명"
                />
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="w-2/3 px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none"
                  placeholder="계좌번호"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.phone}
              className="w-full bg-brand-600 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl mt-4 transition-colors"
            >
              다음 단계로
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm">2</span>
              희망 업무 및 위치
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">희망 일자리 (중복 선택 가능)</label>
              <div className="grid grid-cols-2 gap-3">
                {JOB_TYPES_LIST.map((job) => (
                  <button
                    key={job.value}
                    type="button"
                    onClick={() => toggleJob(job.value)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      formData.desiredJobs.includes(job.value)
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <i className={`fas ${job.icon} text-lg mb-1`}></i>
                    <span className="text-sm font-medium">{job.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">현재 위치 (출근 가능 지역)</label>
              <div className="space-y-3">
                <LocationPickerMap 
                  latitude={formData.location.latitude} 
                  longitude={formData.location.longitude} 
                  onLocationSelect={handleMapLocationSelect}
                />

                <div className="flex gap-2">
                   <input
                    type="text"
                    name="addressString"
                    value={formData.location.addressString}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, addressString: e.target.value }}))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-brand-500 outline-none"
                    placeholder="주소 입력 후 검색 버튼 클릭"
                  />
                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={isLoading}
                    className="bg-brand-600 text-white px-3 rounded-lg hover:bg-brand-700 transition-colors text-sm font-bold whitespace-nowrap"
                  >
                    검색
                  </button>
                  <button
                    type="button"
                    onClick={() => getLocation(false)}
                    disabled={isLoading}
                    className="bg-slate-700 text-white px-4 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center min-w-[3rem]"
                    aria-label="현위치 찾기"
                  >
                    {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-crosshairs"></i>}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 transition-colors"
              >
                다음 단계로
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm">3</span>
              서류 및 설정
            </h2>

            {/* Document Upload Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-id-card mr-1 text-brand-500"></i>
                  신분증 (주민등록증, 여권/비자 등)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'idCard')}
                    className="hidden"
                    id="idCardUpload"
                  />
                  <label 
                    htmlFor="idCardUpload"
                    className={`flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                      idCardFile || formData.idCardImageUrl 
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <i className="fas fa-camera"></i>
                    <span className="text-sm font-medium">
                      {idCardFile ? `선택됨: ${idCardFile.name}` : (formData.idCardImageUrl ? '기존 등록 완료 (변경하려면 클릭)' : '사진 촬영 또는 업로드')}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                   <i className="fas fa-hard-hat mr-1 text-brand-500"></i>
                   기초안전보건교육증 (이수증)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'safetyCert')}
                    className="hidden"
                    id="safetyCertUpload"
                  />
                  <label 
                    htmlFor="safetyCertUpload"
                    className={`flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                      safetyCertFile || formData.safetyCertImageUrl
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <i className="fas fa-camera"></i>
                    <span className="text-sm font-medium">
                       {safetyCertFile ? `선택됨: ${safetyCertFile.name}` : (formData.safetyCertImageUrl ? '기존 등록 완료 (변경하려면 클릭)' : '사진 촬영 또는 업로드')}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <hr className="border-gray-100 my-4" />
            
            {/* Intro */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">한줄 소개</label>
                <button 
                  type="button" 
                  onClick={generateSmartIntro}
                  disabled={aiLoading}
                  className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1"
                >
                  {aiLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                  AI 자동완성
                </button>
              </div>
              <textarea
                name="introduction"
                value={formData.introduction}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none resize-none"
                placeholder="성실하게 일하겠습니다! (AI 자동완성을 눌러보세요)"
              />
            </div>

            {/* Notification Setting */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                     <i className="fas fa-bell"></i>
                   </div>
                   <div className="text-sm">
                      <span className="font-bold text-gray-800 block">새로운 일자리 알림</span>
                      <span className="text-xs text-gray-500">신규 일자리가 등록되면 푸시 알림을 받습니다.</span>
                   </div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.notificationSettings?.jobPostings ?? true}
                    onChange={toggleNotification}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isAgreed}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAgreed: e.target.checked }))}
                  className="mt-1 w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <div className="text-sm text-gray-600">
                  <span className="font-bold text-gray-800">[필수] 개인정보 수집 및 이용 동의</span>
                  <p className="text-xs mt-1 leading-relaxed">
                    입력하신 정보(신분증 포함)는 구직 매칭을 위해 <strong>{BUSINESS_INFO.name}</strong>에 제공되며,
                    관련 법령에 따라 안전하게 보관됩니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
              >
                이전
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.isAgreed}
                className="flex-1 bg-brand-600 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    {uploadStatus || '처리중'}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    저장하기
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default RegistrationForm;
