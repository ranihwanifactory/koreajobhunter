
import React, { useState, useEffect } from 'react';
import { WorkerProfile, JobType } from '../types';
import { JOB_TYPES_LIST } from '../constants';
// Fix: Use type-only import for User from firebase/auth
import { type User } from 'firebase/auth';
import { db, storage, ref, uploadBytesResumable, getDownloadURL } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import LocationPickerMap from './LocationPickerMap';

interface RegistrationFormProps {
  user?: User;
  workerId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ user, workerId, onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  
  const effectiveId = workerId || user?.uid;

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [safetyCertFile, setSafetyCertFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<{idCard?: string, safetyCert?: string}>({});

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
          const data = docSnap.data() as WorkerProfile;
          setFormData({
            ...formData,
            ...data
          });
          setPreviews({
            idCard: data.idCardImageUrl,
            safetyCert: data.safetyCertImageUrl
          });
        }
      } catch (error) {
        console.error("Error fetching worker data:", error);
      } finally { 
        setIsFetchingData(false); 
      }
    };
    fetchData();
  }, [effectiveId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'safetyCert') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'idCard') setIdCardFile(file);
      else setSafetyCertFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isAgreed) return alert('개인정보 동의가 필요합니다.');
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
      
      await setDoc(doc(db, "workers", effectiveId), dataToSave, { merge: true });
      alert('성공적으로 저장되었습니다.');
      if (onSuccess) onSuccess();
    } catch (error: any) { 
      alert(`저장 중 오류: ${error.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (isFetchingData) return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin mr-2 text-brand-600"></i>데이터 로드 중...</div>;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative max-w-2xl mx-auto">
      <div className="w-full bg-gray-100 h-2">
        <div className="bg-brand-500 h-2 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {workerId ? '인력 정보 수정' : '구직 정보 등록'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">단계별 정보를 정확히 입력해 주세요 ({step}/3)</p>
            </div>
            {onCancel && (
                <button type="button" onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                    <i className="fas fa-times"></i>
                </button>
            )}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1 flex items-center gap-1">
                        <i className="fas fa-user text-brand-500"></i> 이름
                    </label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-brand-500 focus:bg-white transition-all" placeholder="성함 입력" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1 flex items-center gap-1">
                        <i className="fas fa-phone text-brand-500"></i> 연락처
                    </label>
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-brand-500 focus:bg-white transition-all" placeholder="010-0000-0000" />
                </div>
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1 flex items-center gap-1">
                    <i className="fas fa-university text-brand-500"></i> 계좌 정보 (급여 지급용)
                </label>
                <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder="은행명" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="col-span-1 p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-brand-500 focus:bg-white transition-all" />
                    <input type="text" placeholder="계좌번호 입력" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="col-span-2 p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-brand-500 focus:bg-white transition-all" />
                </div>
             </div>
             <button type="button" onClick={() => setStep(2)} className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-black transition-all mt-4">
                다음 단계로 <i className="fas fa-arrow-right ml-2"></i>
             </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
             <div className="space-y-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <i className="fas fa-tools text-brand-500"></i> 희망/가능 업무
                </h3>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                    {JOB_TYPES_LIST.map(job => (
                      <button key={job.value} type="button" onClick={() => {
                        const exists = formData.desiredJobs.includes(job.value);
                        setFormData({...formData, desiredJobs: exists ? formData.desiredJobs.filter(j => j !== job.value) : [...formData.desiredJobs, job.value]});
                      }} className={`p-3 border-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${formData.desiredJobs.includes(job.value) ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-100 text-gray-500 hover:border-brand-200'}`}>
                        <i className={`fas ${job.icon} text-lg`}></i>
                        {job.label}
                      </button>
                    ))}
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-brand-500"></i> 거주지 위치 설정
                </h3>
                
                <LocationPickerMap 
                    latitude={formData.location.latitude} 
                    longitude={formData.location.longitude} 
                    onLocationSelect={(lat, lng, addr) => setFormData({...formData, location: { latitude: lat, longitude: lng, addressString: addr }})} 
                />

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <i className="fas fa-info-circle text-xs"></i>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-blue-900 mb-1">설정된 주소</p>
                        <p className="text-sm font-bold text-blue-700 leading-tight">
                            {formData.location.addressString || '위의 지도에서 주소를 검색하거나 클릭하세요.'}
                        </p>
                    </div>
                </div>
             </div>

             <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-5 rounded-2xl">이전</button>
                <button type="button" onClick={() => setStep(3)} className="flex-[2] bg-slate-900 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-black transition-all">다음 단계로</button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
             <div className="space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <i className="fas fa-id-card text-brand-500"></i> 신분증 및 서류 첨부
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 신분증 업로드 */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-gray-500 ml-1">주민등록증/외국인등록증</label>
                        <div className="relative group aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">
                            {previews.idCard ? (
                                <>
                                    <img src={previews.idCard} alt="ID Card" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <p className="text-white text-xs font-bold">이미지 변경</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <i className="fas fa-camera text-2xl text-gray-300 mb-2"></i>
                                    <p className="text-[10px] text-gray-400 font-bold">전면 사진 촬영 또는 선택</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'idCard')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                    {/* 건설이수증 업로드 */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-gray-500 ml-1">건설업 기초안전보건교육 이수증</label>
                        <div className="relative group aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">
                            {previews.safetyCert ? (
                                <>
                                    <img src={previews.safetyCert} alt="Safety Cert" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <p className="text-white text-xs font-bold">이미지 변경</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <i className="fas fa-hard-hat text-2xl text-gray-300 mb-2"></i>
                                    <p className="text-[10px] text-gray-400 font-bold">이수증 사진 촬영 또는 선택</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'safetyCert')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">자기소개 / 특기사항 (관리자 참고용)</label>
                <textarea 
                    value={formData.introduction} 
                    onChange={e => setFormData({...formData, introduction: e.target.value})} 
                    className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-brand-500 focus:bg-white h-32 text-sm leading-relaxed" 
                    placeholder="예: 굴삭기 면허 보유, 하우스 작업 경험 다수, 신체 건강함 등"
                />
             </div>

             <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                <label className="flex gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.isAgreed} onChange={e => setFormData({...formData, isAgreed: e.target.checked})} className="mt-1 w-5 h-5 accent-brand-600 rounded-lg" />
                    <span className="text-[11px] text-brand-900 font-medium leading-relaxed">
                        개인정보 수집 및 이용(신분증 포함)에 동의합니다. 수집된 정보는 인력 사무 업무 외 용도로 사용되지 않으며, 안전하게 관리됩니다.
                    </span>
                </label>
             </div>

             <div className="flex gap-4">
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-5 rounded-2xl">이전</button>
                <button type="submit" disabled={isLoading} className="flex-[2] bg-brand-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-brand-200 flex items-center justify-center gap-2 hover:bg-brand-700 transition-all">
                   {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                   프로필 저장 완료
                </button>
             </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default RegistrationForm;
