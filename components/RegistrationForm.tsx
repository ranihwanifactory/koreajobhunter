import React, { useState, useEffect } from 'react';
import { WorkerProfile, JobType } from '../types';
import { JOB_TYPES_LIST, BUSINESS_INFO } from '../constants';
import { generateWorkerIntro } from '../services/geminiService';
import { User } from 'firebase/auth';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface RegistrationFormProps {
  user: User;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ user }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
    isAgreed: false
  });

  // Load existing data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "workers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as WorkerProfile;
          setFormData(data);
          if (data.isAgreed) {
            // If already registered effectively, show submitted state or let them edit
            // For now, let's just prefill and let them edit/resubmit
          }
        }
      } catch (error) {
        console.error("Error loading document: ", error);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const getLocation = () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            addressString: `위도: ${position.coords.latitude.toFixed(4)}, 경도: ${position.coords.longitude.toFixed(4)} (자동감지)`
          }
        }));
        setIsLoading(false);
      },
      (error) => {
        alert(`위치 정보를 가져올 수 없습니다: ${error.message}`);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isAgreed) {
      alert('개인정보 수집 및 이용에 동의해야 합니다.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Save to Firestore
      await setDoc(doc(db, "workers", user.uid), {
        ...formData,
        email: user.email,
        updatedAt: new Date().toISOString()
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error writing document: ", error);
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData) {
    return <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>정보를 불러오는 중...</div>;
  }

  if (isSubmitted) {
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
              <div className="flex gap-2">
                 <input
                  type="text"
                  name="addressString"
                  value={formData.location.addressString}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, addressString: e.target.value }}))}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  placeholder="주소를 입력하거나 버튼을 누르세요"
                />
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={isLoading}
                  className="bg-slate-700 text-white px-4 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center min-w-[3rem]"
                >
                  {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">* 위치 버튼을 누르면 현재 계신 곳이 자동 입력됩니다.</p>
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
              자기소개 및 동의
            </h2>

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
                    입력하신 정보는 구직 매칭을 위해 <strong>{BUSINESS_INFO.name}</strong>에 제공되며,
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
                {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                {isSubmitted ? '수정 완료' : '등록 완료'}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default RegistrationForm;