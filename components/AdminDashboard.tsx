import React, { useEffect, useState } from 'react';
import { db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { WorkerProfile, JobType } from '../types';
import { JOB_TYPES_LIST } from '../constants';
import WorkerMap from './WorkerMap';

const AdminDashboard: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkerProfile>>({});

  // States for Admin Registration
  const [isAdding, setIsAdding] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [newFiles, setNewFiles] = useState<{idCard?: File, safetyCert?: File}>({});
  const [newWorker, setNewWorker] = useState<WorkerProfile>({
    name: '',
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
    isAgreed: true, // Admin registered implies consent
    idCardImageUrl: '',
    safetyCertImageUrl: ''
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'workers'));
      const workersList: WorkerProfile[] = [];
      querySnapshot.forEach((doc) => {
        workersList.push({ id: doc.id, ...doc.data() } as WorkerProfile);
      });
      // Sort by recently updated
      workersList.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      setWorkers(workersList);
    } catch (error) {
      console.error("Error fetching workers:", error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`${name} 님의 정보를 정말 삭제하시겠습니까? 복구할 수 없습니다.`)) {
      try {
        await deleteDoc(doc(db, 'workers', id));
        setWorkers(prev => prev.filter(worker => worker.id !== id));
        alert('삭제되었습니다.');
      } catch (error) {
        console.error("Error deleting worker:", error);
        alert('삭제 실패');
      }
    }
  };

  // --- Edit Logic ---
  const startEdit = (worker: WorkerProfile) => {
    setEditingId(worker.id!);
    setEditForm({ ...worker });
    setIsAdding(false); // Close add form if open
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleEditJob = (jobValue: JobType) => {
    setEditForm(prev => {
      const currentJobs = prev.desiredJobs || [];
      if (currentJobs.includes(jobValue)) {
        return { ...prev, desiredJobs: currentJobs.filter(j => j !== jobValue) };
      } else {
        return { ...prev, desiredJobs: [...currentJobs, jobValue] };
      }
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;

    try {
      const workerRef = doc(db, 'workers', editingId);
      await updateDoc(workerRef, {
        ...editForm,
        updatedAt: new Date().toISOString()
      });
      
      setWorkers(prev => prev.map(w => w.id === editingId ? { ...w, ...editForm, updatedAt: new Date().toISOString() } as WorkerProfile : w));
      setEditingId(null);
      alert('수정되었습니다.');
    } catch (error) {
      console.error("Error updating worker:", error);
      alert('수정 실패');
    }
  };

  // --- Add (Manual Register) Logic ---
  const handleNewWorkerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'addressString') {
        setNewWorker(prev => ({ ...prev, location: { ...prev.location, addressString: value } }));
    } else {
        setNewWorker(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleNewJob = (jobValue: JobType) => {
    setNewWorker(prev => {
      const currentJobs = prev.desiredJobs;
      if (currentJobs.includes(jobValue)) {
        return { ...prev, desiredJobs: currentJobs.filter(j => j !== jobValue) };
      } else {
        return { ...prev, desiredJobs: [...currentJobs, jobValue] };
      }
    });
  };

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'safetyCert') => {
      if (e.target.files && e.target.files[0]) {
          setNewFiles(prev => ({...prev, [type]: e.target.files![0]}));
      }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWorker.name || !newWorker.phone) {
          alert('이름과 연락처는 필수입니다.');
          return;
      }

      setUploadStatus('등록 중...');
      try {
        let idCardUrl = '';
        let safetyCertUrl = '';
        const timestamp = Date.now();
        const uploadPrefix = `workers/admin_upload_${timestamp}`;

        // Upload ID Card
        if (newFiles.idCard) {
            setUploadStatus('신분증 업로드 중...');
            const storageRef = ref(storage, `${uploadPrefix}/idCard`);
            await uploadBytes(storageRef, newFiles.idCard);
            idCardUrl = await getDownloadURL(storageRef);
        }

        // Upload Safety Cert
        if (newFiles.safetyCert) {
            setUploadStatus('이수증 업로드 중...');
            const storageRef = ref(storage, `${uploadPrefix}/safetyCert`);
            await uploadBytes(storageRef, newFiles.safetyCert);
            safetyCertUrl = await getDownloadURL(storageRef);
        }

        // Geocoding for manual entry (Basic Attempt)
        let lat = null;
        let lng = null;
        // In a real app, we would use Kakao Geocoder here too if address is provided, 
        // but for now we focus on the main registration flow for geocoding to keep manual entry simple or add later.
        // We will just leave lat/lng null for manual entries unless we add a geocoder call here.

        setUploadStatus('정보 저장 중...');
        const workerData: WorkerProfile = {
            ...newWorker,
            location: {
                ...newWorker.location,
                latitude: lat,
                longitude: lng
            },
            idCardImageUrl: idCardUrl,
            safetyCertImageUrl: safetyCertUrl,
            updatedAt: new Date().toISOString(),
            isAgreed: true
        };

        const docRef = await addDoc(collection(db, 'workers'), workerData);
        
        // Update local list
        setWorkers(prev => [{ ...workerData, id: docRef.id }, ...prev]);
        
        // Reset
        setIsAdding(false);
        setNewWorker({
            name: '',
            phone: '',
            bankName: '',
            accountNumber: '',
            desiredJobs: [],
            location: { latitude: null, longitude: null, addressString: '' },
            introduction: '',
            isAgreed: true,
            idCardImageUrl: '',
            safetyCertImageUrl: ''
        });
        setNewFiles({});
        alert('성공적으로 등록되었습니다.');

      } catch (err) {
          console.error(err);
          alert('등록 중 오류가 발생했습니다.');
      } finally {
          setUploadStatus('');
      }
  };


  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.phone.includes(searchTerm) ||
    worker.introduction.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Search */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 sticky top-16 z-30">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <span className="w-8 h-8 bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center mr-2 text-sm">
                <i className="fas fa-users-cog"></i>
              </span>
              인력 관리 
              <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {workers.length}명
              </span>
            </h2>
            <div className="flex gap-2">
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        isAdding ? 'bg-slate-800 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                >
                    {isAdding ? '닫기' : '+ 직접등록'}
                </button>
                <button 
                onClick={fetchWorkers} 
                className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                >
                <i className="fas fa-sync-alt text-sm"></i>
                </button>
            </div>
          </div>
          
          <div className="relative w-full">
            <input
              type="text"
              placeholder="이름 또는 전화번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-sm"
            />
            <i className="fas fa-search absolute left-3.5 top-3.5 text-gray-400"></i>
          </div>
        </div>
      </div>
      
      {/* Map View */}
      <div className="animate-fade-in">
        <h3 className="text-sm font-bold text-gray-500 mb-2 ml-1">인력 분포 지도</h3>
        <WorkerMap workers={workers} />
      </div>

      {/* Manual Registration Form */}
      {isAdding && (
          <div className="bg-white border-2 border-brand-100 rounded-2xl p-5 shadow-lg animate-fade-in-up">
              <h3 className="font-bold text-lg text-brand-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-user-plus"></i> 인력 직접 등록
              </h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={newWorker.name}
                            onChange={handleNewWorkerChange}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                            placeholder="이름 입력"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">연락처 *</label>
                        <input
                            type="tel"
                            name="phone"
                            required
                            value={newWorker.phone}
                            onChange={handleNewWorkerChange}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                            placeholder="010-xxxx-xxxx"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">주소</label>
                    <input
                        type="text"
                        name="addressString"
                        value={newWorker.location.addressString}
                        onChange={handleNewWorkerChange}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                        placeholder="거주지 또는 희망 근무지"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">은행명</label>
                        <input
                            type="text"
                            name="bankName"
                            value={newWorker.bankName}
                            onChange={handleNewWorkerChange}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                            placeholder="예: 농협"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">계좌번호</label>
                        <input
                            type="text"
                            name="accountNumber"
                            value={newWorker.accountNumber}
                            onChange={handleNewWorkerChange}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                            placeholder="계좌번호 입력"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">희망 직종</label>
                    <div className="flex flex-wrap gap-1.5 bg-gray-50 p-3 rounded-xl">
                      {JOB_TYPES_LIST.map(job => (
                        <button
                          key={job.value}
                          type="button"
                          onClick={() => toggleNewJob(job.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                            newWorker.desiredJobs.includes(job.value)
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {job.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">소개글</label>
                    <textarea
                        name="introduction"
                        value={newWorker.introduction}
                        onChange={handleNewWorkerChange}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none resize-none"
                        rows={2}
                        placeholder="특이사항이나 간단한 소개"
                    />
                  </div>

                  {/* File Uploads for Admin */}
                   <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                       <div>
                           <label className="text-xs text-gray-500 mb-1 block font-bold">신분증</label>
                           <input type="file" accept="image/*" onChange={(e) => handleNewFileChange(e, 'idCard')} className="hidden" id="adminIdUpload" />
                           <label htmlFor="adminIdUpload" className={`block w-full text-center py-2 border border-dashed rounded-lg text-xs cursor-pointer ${newFiles.idCard ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-400'}`}>
                               {newFiles.idCard ? '선택됨' : '+ 사진추가'}
                           </label>
                       </div>
                       <div>
                           <label className="text-xs text-gray-500 mb-1 block font-bold">이수증</label>
                           <input type="file" accept="image/*" onChange={(e) => handleNewFileChange(e, 'safetyCert')} className="hidden" id="adminSafeUpload" />
                           <label htmlFor="adminSafeUpload" className={`block w-full text-center py-2 border border-dashed rounded-lg text-xs cursor-pointer ${newFiles.safetyCert ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-400'}`}>
                               {newFiles.safetyCert ? '선택됨' : '+ 사진추가'}
                           </label>
                       </div>
                   </div>

                  <button
                    type="submit"
                    disabled={!!uploadStatus}
                    className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95 mt-2"
                  >
                      {uploadStatus ? <><i className="fas fa-spinner fa-spin mr-2"></i>{uploadStatus}</> : '등록하기'}
                  </button>
              </form>
          </div>
      )}

      {/* Workers List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredWorkers.map(worker => (
          <div key={worker.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            {editingId === worker.id ? (
              // Edit Mode (Mobile Optimized)
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-sm font-bold text-brand-600 flex items-center gap-2">
                    <i className="fas fa-pen-to-square"></i> 정보 수정
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">이름</label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name || ''}
                      onChange={handleEditChange}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">연락처</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone || ''}
                      onChange={handleEditChange}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">희망 직종</label>
                    <div className="flex flex-wrap gap-1.5 bg-gray-50 p-3 rounded-xl">
                      {JOB_TYPES_LIST.map(job => (
                        <button
                          key={job.value}
                          onClick={() => toggleEditJob(job.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                            editForm.desiredJobs?.includes(job.value)
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {job.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                     <label className="text-xs text-gray-500 mb-1 block">소개글</label>
                     <textarea
                      name="introduction"
                      value={editForm.introduction || ''}
                      onChange={handleEditChange}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={cancelEdit} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-bold">취소</button>
                  <button onClick={saveEdit} className="flex-1 bg-brand-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-brand-200">저장하기</button>
                </div>
              </div>
            ) : (
              // View Mode (Mobile Optimized)
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-gray-900">{worker.name}</h3>
                      {worker.updatedAt && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(worker.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {worker.phone}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                     <button 
                      onClick={() => startEdit(worker)}
                      className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                      aria-label="수정"
                    >
                      <i className="fas fa-pen text-xs"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(worker.id!, worker.name)}
                      className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                      aria-label="삭제"
                    >
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>

                {/* Job Tags */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {worker.desiredJobs && worker.desiredJobs.length > 0 ? (
                      worker.desiredJobs.map((job, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-100 rounded-lg text-xs font-medium">
                          {job}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs bg-gray-50 px-2 py-1 rounded">직종 미선택</span>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <i className="fas fa-map-marker-alt mt-1 w-4 text-center text-gray-400"></i>
                    <div className="flex-1 text-gray-700 break-keep">
                      {worker.location.addressString || <span className="text-gray-400">위치 정보 없음</span>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <i className="fas fa-university mt-1 w-4 text-center text-gray-400"></i>
                    <div className="flex-1 text-gray-700 font-mono text-xs pt-0.5">
                      {worker.bankName && worker.accountNumber 
                        ? `${worker.bankName} ${worker.accountNumber}` 
                        : <span className="text-gray-400 font-sans">계좌 정보 없음</span>}
                    </div>
                  </div>
                  
                  {/* Image Links */}
                  {(worker.idCardImageUrl || worker.safetyCertImageUrl) && (
                    <div className="flex gap-2 pt-2 mt-2 border-t border-gray-200">
                      {worker.idCardImageUrl && (
                        <a 
                          href={worker.idCardImageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <i className="fas fa-id-card"></i> 신분증 확인
                        </a>
                      )}
                      {worker.safetyCertImageUrl && (
                        <a 
                          href={worker.safetyCertImageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-50 text-teal-600 rounded-lg text-xs font-medium hover:bg-teal-100 transition-colors"
                        >
                          <i className="fas fa-hard-hat"></i> 이수증 확인
                        </a>
                      )}
                    </div>
                  )}

                   {worker.introduction && (
                    <div className="flex items-start gap-2 text-sm pt-2 mt-2 border-t border-gray-200">
                      <i className="fas fa-quote-left mt-1 w-4 text-center text-brand-300"></i>
                      <div className="flex-1 text-gray-600 italic text-xs leading-relaxed">
                        {worker.introduction}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Bar - Primary Call Button */}
                <a
                  href={`tel:${worker.phone}`}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-[0.98] transition-all"
                >
                  <i className="fas fa-phone-alt animate-pulse"></i>
                  전화걸기
                </a>
              </>
            )}
          </div>
        ))}

        {filteredWorkers.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-search text-2xl"></i>
            </div>
            <p className="text-gray-500 font-medium">검색된 인력이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">다른 검색어를 입력해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;