
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

const RegistrationForm: React.FC<RegistrationFormProps> = ({ user, onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [safetyCertFile, setSafetyCertFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<WorkerProfile>({
    name: user.displayName || '',
    phone: '',
    bankName: '',
    accountNumber: '',
    desiredJobs: [],
    location: { latitude: null, longitude: null, addressString: '' },
    introduction: '',
    idCardImageUrl: '',
    safetyCertImageUrl: '',
    isAgreed: false,
    notificationSettings: {
      jobPostings: true,
      notices: true // Default to true
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "workers", user.uid);
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
      } catch (error) {} finally { setIsFetchingData(false); }
    };
    fetchData();
  }, [user]);

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
    
    setIsLoading(true);
    try {
      let idCardUrl = formData.idCardImageUrl || '';
      let safetyCertUrl = formData.safetyCertImageUrl || '';
      if (idCardFile) idCardUrl = await uploadImage(idCardFile, `workers/${user.uid}/idCard_${Date.now()}`);
      if (safetyCertFile) safetyCertUrl = await uploadImage(safetyCertFile, `workers/${user.uid}/safetyCert_${Date.now()}`);

      const dataToSave = {
        ...formData,
        idCardImageUrl: idCardUrl,
        safetyCertImageUrl: safetyCertUrl,
        email: user.email || '',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "workers", user.uid), dataToSave);
      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error: any) { alert(`저장 중 오류: ${error.message}`); } finally { setIsLoading(false); }
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

  if (isFetchingData) return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin mr-2"></i>로딩 중...</div>;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="w-full bg-gray-100 h-1.5">
        <div className="bg-brand-500 h-1.5 transition-all" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-800">1. 기본 정보</h2>
             <input type="text" name="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg" placeholder="이름" />
             <input type="tel" name="phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-lg" placeholder="연락처" />
             <button type="button" onClick={() => setStep(2)} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">다음</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-800">2. 업무 및 위치</h2>
             <div className="grid grid-cols-2 gap-2">
                {JOB_TYPES_LIST.map(job => (
                  <button key={job.value} type="button" onClick={() => {
                    const exists = formData.desiredJobs.includes(job.value);
                    setFormData({...formData, desiredJobs: exists ? formData.desiredJobs.filter(j => j !== job.value) : [...formData.desiredJobs, job.value]});
                  }} className={`p-2 border rounded-lg text-sm ${formData.desiredJobs.includes(job.value) ? 'bg-brand-50 border-brand-500' : ''}`}>{job.label}</button>
                ))}
             </div>
             <button type="button" onClick={() => setStep(3)} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">다음</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-800">3. 알림 및 서류</h2>
             
             <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div className="text-sm">
                            <span className="font-bold text-gray-800 block">일자리 알림</span>
                            <span className="text-xs text-gray-500">새 일자리 등록 시 알림</span>
                        </div>
                        <input type="checkbox" checked={formData.notificationSettings?.jobPostings} onChange={e => toggleNotification('jobPostings', e.target.checked)} className="w-5 h-5" />
                    </label>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div className="text-sm">
                            <span className="font-bold text-gray-800 block">새로운 소식 알림</span>
                            <span className="text-xs text-gray-500">중요 공지 및 사무소 소식 알림</span>
                        </div>
                        <input type="checkbox" checked={formData.notificationSettings?.notices} onChange={e => toggleNotification('notices', e.target.checked)} className="w-5 h-5" />
                    </label>
                </div>
             </div>

             <div className="bg-gray-50 p-4 rounded-xl">
                <label className="flex gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isAgreed} onChange={e => setFormData({...formData, isAgreed: e.target.checked})} className="mt-1" />
                    <span className="text-xs text-gray-600">개인정보 수집 및 이용에 동의합니다.</span>
                </label>
             </div>

             <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-gray-100 py-3 rounded-xl">이전</button>
                <button type="submit" className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-xl">저장하기</button>
             </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default RegistrationForm;
