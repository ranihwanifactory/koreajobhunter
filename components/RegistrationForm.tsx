
import React, { useState, useEffect } from 'react';
import { WorkerProfile, JobType } from '../types';
import { JOB_TYPES_LIST, BUSINESS_INFO } from '../constants';
import { generateWorkerIntro } from '../services/geminiService';
import { User } from 'firebase/auth';
// Importing storage functions from our central firebase service instead of directly from firebase/storage
import { db, storage, ref, uploadBytesResumable, getDownloadURL } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import LocationPickerMap from './LocationPickerMap';

interface RegistrationFormProps {
  user?: User; // Optional for admin use
  workerId?: string; // If provided, edit this specific worker
  onCancel?: () => void;
  onSuccess?: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ user, workerId, onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const effectiveId = workerId || user?.uid;

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [safetyCertFile, setSafetyCertFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<WorkerProfile>({
    name: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    desiredJobs: [],
    location: { latitude: null, longitude: null, addressString: '' },
    introduction: '',
    idCardImageUrl: '',
    safetyCertImageUrl: '',
    isAgreed: true,
    notificationSettings: {
      jobPostings: true,
      notices: true
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveId) {
        setIsFetchingData(false);
        return;
      }
      try {
        const docRef = doc(db, "workers", effectiveId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<WorkerProfile>;
          setFormData({
            ...formData,
            ...data,
            notificationSettings: {
              jobPostings: data.notificationSettings?.jobPostings ?? true,
              notices: data.notificationSettings?.notices ?? true
            }
          } as WorkerProfile);
        }
      } catch (error) {
        console.error("Error fetching worker data:", error);
      } finally { 
        setIsFetchingData(false); 
      }
    };
    fetchData();
  }, [effectiveId]);

  const toggleNotification = async (type: 'jobPostings' | 'notices', checked: boolean) => {
    if (checked && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("알림 권한이 필요합니다.");
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings!,
        [type]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isAgreed) return alert('동의가 필요합니다.');
    if (!effectiveId) return alert('대상 ID를 찾을 수 없습니다.');
    
    setIsLoading(true);
    try {
      let idCardUrl = formData.idCardImageUrl || '';
      let safetyCertUrl = formData.safetyCertImageUrl || '';
      if (idCardFile) idCardUrl = await uploadImage(idCardFile, `workers/${effectiveId}/idCard_${Date.now()}`);
      if (safetyCertFile) safetyCertUrl = await uploadImage(safetyCertFile, `workers/${effectiveId}/safetyCert_${Date.now()}`);

      const dataToSave = {
        ...formData,
        idCardImageUrl: idCardUrl,
        safetyCertImageUrl: safetyCertUrl,
        updatedAt: new Date().toISOString(),
      };
      
      // Use setDoc with merge: true to update or create
      await setDoc(doc(db, "workers", effectiveId), dataToSave, { merge: true });
      
      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error: any) { 
      alert(`저장 중 오류: ${error.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', null, (e) => reject(e), () => {
        getDownloadURL(uploadTask.snapshot.ref).then(url => resolve(url));
      });
    });
  };

  if (isFetchingData) return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin mr-2 text-brand-600"></i>데이터 로드 중...</div>;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="w-full bg-gray-100 h-1.5">
        <div className="bg-brand-500 h-1.5 transition-all" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
                {workerId ? '인력 정보 수정' : '기본 정보 등록'}
            </h2>
            {onCancel && (
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times text-xl"></i>
                </button>
            )}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">이름</label>
                <input type="text" name="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500" placeholder="이름 입력" />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">연락처</label>
                <input type="tel" name="phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500" placeholder="010-0000-0000" />
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">은행</label>
                    <input type="text" placeholder="은행명" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">계좌번호</label>
                    <input type="text" placeholder="번호 입력" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500" />
                </div>
             </div>
             <button type="button" onClick={() => setStep(2)} className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-100 mt-4">다음 단계로</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
             <h3 className="font-bold text-gray-700">희망 업무 (중복 선택)</h3>
             <div className="grid grid-cols-2 gap-2">
                {JOB_TYPES_LIST.map(job => (
                  <button key={job.value} type="button" onClick={() => {
                    const exists = formData.desiredJobs.includes(job.value);
                    setFormData({...formData, desiredJobs: exists ? formData.desiredJobs.filter(j => j !== job.value) : [...formData.desiredJobs, job.value]});
                  }} className={`p-3 border rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${formData.desiredJobs.includes(job.value) ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                    <i className={`fas ${job.icon}`}></i>
                    {job.label}
                  </button>
                ))}
             </div>
             <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl">이전</button>
                <button type="button" onClick={() => setStep(3)} className="flex-[2] bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-100">다음 단계로</button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
             <div className="space-y-4">
                <h3 className="font-bold text-gray-700">알림 설정</h3>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div className="text-sm">
                            <span className="font-bold text-gray-800 block">일자리 알림</span>
                            <span className="text-xs text-gray-500">새 일자리 등록 시 실시간 알림</span>
                        </div>
                        <input type="checkbox" checked={formData.notificationSettings?.jobPostings} onChange={e => toggleNotification('jobPostings', e.target.checked)} className="w-5 h-5 accent-brand-600" />
                    </label>
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">자기소개 / 특기사항</label>
                <textarea 
                    value={formData.introduction} 
                    onChange={e => setFormData({...formData, introduction: e.target.value})} 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-500 h-32" 
                    placeholder="경력이나 자신있는 업무를 적어주세요."
                />
             </div>

             <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="flex gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.isAgreed} onChange={e => setFormData({...formData, isAgreed: e.target.checked})} className="mt-1 w-4 h-4 accent-brand-600" />
                    <span className="text-xs text-gray-600 leading-relaxed">
                        개인정보 수집 및 이용에 동의합니다. (수집된 정보는 인력 매칭 및 노무 관리에만 사용됩니다.)
                    </span>
                </label>
             </div>

             <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl">이전</button>
                <button type="submit" disabled={isLoading} className="flex-[2] bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 flex items-center justify-center gap-2">
                   {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                   정보 저장하기
                </button>
             </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default RegistrationForm;
