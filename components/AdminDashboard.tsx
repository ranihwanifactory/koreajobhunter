
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, doc, deleteDoc, updateDoc, addDoc, query, orderBy, onSnapshot, limit, setDoc } from 'firebase/firestore';
import { WorkerProfile, JobPosting, AppNotification, JobType } from '../types';
import { JOB_TYPES_LIST } from '../constants';
import WorkerMap from './WorkerMap';
import RegistrationForm from './RegistrationForm';

type AdminTab = 'workers' | 'jobs' | 'notices';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('workers');
  
  // --- Worker Management States ---
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  
  const [workerForm, setWorkerForm] = useState<Partial<WorkerProfile>>({
    name: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    desiredJobs: [],
    location: { latitude: null, longitude: null, addressString: '' },
    introduction: '',
    isAgreed: true,
  });

  // --- Job Management States ---
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState<JobPosting>({
    companyName: '',
    address: '',
    content: '',
    pay: '',
    date: '',
    contact: '',
    isUrgent: false,
    createdAt: ''
  });

  // --- Notice Management States ---
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notiLoading, setNotiLoading] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', message: '' });
  const [isSendingNotice, setIsSendingNotice] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (activeTab === 'workers') {
      setWorkerLoading(true);
      unsubscribe = onSnapshot(query(collection(db, 'workers')), (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkerProfile));
        list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setWorkers(list);
        setWorkerLoading(false);
      });
    } else if (activeTab === 'jobs') {
      setJobLoading(true);
      unsubscribe = onSnapshot(query(collection(db, 'job_postings'), orderBy('createdAt', 'desc')), (snapshot) => {
        setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting)));
        setJobLoading(false);
      });
    } else if (activeTab === 'notices') {
      setNotiLoading(true);
      unsubscribe = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30)), (snapshot) => {
        setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
        setNotiLoading(false);
      });
    }

    return () => unsubscribe?.();
  }, [activeTab]);

  // --- Worker Functions ---
  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.name || !workerForm.phone) return alert('이름과 연락처는 필수입니다.');

    try {
      setWorkerLoading(true);
      
      // 주소 입력 시 좌표 추출 시도 (카카오 SDK 활용)
      let finalLat = workerForm.location?.latitude;
      let finalLng = workerForm.location?.longitude;

      if (workerForm.location?.addressString && (!finalLat || !finalLng)) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          const coordPromise = new Promise<{lat: number, lng: number} | null>((resolve) => {
              geocoder.addressSearch(workerForm.location!.addressString, (result: any, status: any) => {
                  if (status === window.kakao.maps.services.Status.OK) {
                      resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
                  } else resolve(null);
              });
          });
          const coords = await coordPromise;
          if (coords) {
              finalLat = coords.lat;
              finalLng = coords.lng;
          }
      }

      const dataToSave = {
        ...workerForm,
        location: {
            ...workerForm.location,
            latitude: finalLat || null,
            longitude: finalLng || null,
        },
        updatedAt: new Date().toISOString(),
        isManagedByAdmin: true // 관리자가 등록했다는 플래그
      };

      await addDoc(collection(db, 'workers'), dataToSave);
      alert('인력이 성공적으로 등록되었습니다.');
      setIsAddingWorker(false);
      setWorkerForm({ name: '', phone: '', bankName: '', accountNumber: '', desiredJobs: [], location: { latitude: null, longitude: null, addressString: '' }, introduction: '', isAgreed: true });
    } catch (e) {
      alert('인력 등록 중 오류가 발생했습니다.');
    } finally {
      setWorkerLoading(false);
    }
  };

  const toggleWorkerJobType = (val: JobType) => {
      const current = [...(workerForm.desiredJobs || [])];
      if (current.includes(val)) {
          setWorkerForm({ ...workerForm, desiredJobs: current.filter(j => j !== val) });
      } else {
          setWorkerForm({ ...workerForm, desiredJobs: [...current, val] });
      }
  };

  // --- Job Functions ---
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.companyName || !jobForm.content || !jobForm.pay) return alert('필수 항목을 입력하세요.');

    try {
      const now = new Date().toISOString();
      if (editingJobId) {
        await updateDoc(doc(db, 'job_postings', editingJobId), { ...jobForm });
        alert('수정되었습니다.');
      } else {
        const docRef = await addDoc(collection(db, 'job_postings'), { ...jobForm, createdAt: now });
        await addDoc(collection(db, 'notifications'), {
          title: `[새 일자리] ${jobForm.content}`,
          message: `${jobForm.companyName} | 급여: ${jobForm.pay} | 위치: ${jobForm.address}`,
          createdAt: now,
          type: 'job',
          linkId: docRef.id,
          url: '/?tab=jobs'
        });
        alert('일자리가 등록되었으며 사용자들에게 푸시 알림이 발송되었습니다.');
      }
      setIsAddingJob(false);
      setEditingJobId(null);
      setJobForm({ companyName: '', address: '', content: '', pay: '', date: '', contact: '', isUrgent: false, createdAt: '' });
    } catch (e) { alert('작업 실패'); }
  };

  const startEditJob = (job: JobPosting) => {
    setJobForm({ ...job });
    setEditingJobId(job.id!);
    setIsAddingJob(true);
  };

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'job_postings', id));
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.message) return alert('내용을 입력하세요.');
    setIsSendingNotice(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        ...newNotice,
        createdAt: new Date().toISOString(),
        type: 'notice'
      });
      setNewNotice({ title: '', message: '' });
      alert('공지사항이 발송되었습니다.');
    } catch (e) { alert('발송 실패'); } finally { setIsSendingNotice(false); }
  };

  const filteredWorkers = workers.filter(w => 
    w.name.includes(searchTerm) || w.phone.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      <div className="sticky top-16 z-30 bg-gray-50/95 backdrop-blur-md pt-2 pb-4">
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          {(['workers', 'jobs', 'notices'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setIsAddingJob(false); setIsAddingWorker(false); setEditingWorkerId(null); setEditingJobId(null); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <i className={`fas fa-${tab === 'workers' ? 'users' : tab === 'jobs' ? 'briefcase' : 'bullhorn'} mr-2`}></i>
              {tab === 'workers' ? '인력 관리' : tab === 'jobs' ? '일자리 관리' : '공지 발송'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'workers' && (
        <div className="space-y-4 animate-fade-in">
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
               <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
               <input 
                 type="text" 
                 placeholder="이름 또는 연락처 검색..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)}
                 className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white outline-none"
               />
             </div>
             <button 
                onClick={() => { setIsAddingWorker(!isAddingWorker); setEditingWorkerId(null); }}
                className="w-full md:w-auto px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors whitespace-nowrap"
             >
                {isAddingWorker ? '닫기' : '+ 인력 직접 등록'}
             </button>
           </div>

           {editingWorkerId && (
              <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditingWorkerId(null)}>
                  <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <RegistrationForm 
                        workerId={editingWorkerId} 
                        onCancel={() => setEditingWorkerId(null)} 
                        onSuccess={() => { setEditingWorkerId(null); alert('정보가 수정되었습니다.'); }} 
                    />
                  </div>
              </div>
           )}

           {isAddingWorker && (
             <div className="bg-white p-8 rounded-3xl border-2 border-brand-100 shadow-2xl animate-fade-in-up">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <i className="fas fa-user-plus text-brand-600"></i>
                    인력 정보 수동 등록
                </h3>
                <form onSubmit={handleWorkerSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">이름 *</label>
                            <input required placeholder="홍길동" value={workerForm.name} onChange={e => setWorkerForm({...workerForm, name: e.target.value})} className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">연락처 *</label>
                            <input required placeholder="010-0000-0000" value={workerForm.phone} onChange={e => setWorkerForm({...workerForm, phone: e.target.value})} className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">희망/가능 직종 (복수 선택)</label>
                        <div className="flex flex-wrap gap-2">
                            {JOB_TYPES_LIST.map(job => (
                                <button 
                                    key={job.value} 
                                    type="button" 
                                    onClick={() => toggleWorkerJobType(job.value)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${workerForm.desiredJobs?.includes(job.value) ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <i className={`fas ${job.icon} mr-1`}></i> {job.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">계좌 정보 (은행/계좌번호)</label>
                            <div className="flex gap-2">
                                <input placeholder="은행명" value={workerForm.bankName} onChange={e => setWorkerForm({...workerForm, bankName: e.target.value})} className="w-1/3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                                <input placeholder="계좌번호" value={workerForm.accountNumber} onChange={e => setWorkerForm({...workerForm, accountNumber: e.target.value})} className="flex-1 p-3.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">거주지 주소 (동/읍/면 단위 권장)</label>
                            <input placeholder="성주군 성주읍..." value={workerForm.location?.addressString} onChange={e => setWorkerForm({...workerForm, location: {...workerForm.location!, addressString: e.target.value}})} className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">메모/소개</label>
                        <textarea placeholder="특기 사항 및 경력 메모" value={workerForm.introduction} onChange={e => setWorkerForm({...workerForm, introduction: e.target.value})} className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500 h-24" />
                    </div>

                    <button type="submit" className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-brand-700 transition-all flex items-center justify-center gap-2">
                        {workerLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i> 인력 데이터베이스 저장</>}
                    </button>
                </form>
             </div>
           )}
           
           <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
             <WorkerMap workers={filteredWorkers} />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredWorkers.map(w => (
               <div key={w.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                 {w.isManagedByAdmin && (
                     <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-bl-lg font-bold">수동등록</div>
                 )}
                 <div className="flex justify-between items-start mb-3">
                   <div>
                     <h4 className="font-bold text-gray-900 text-lg">{w.name}</h4>
                     <p className="text-sm text-brand-600 font-medium">{w.phone}</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => setEditingWorkerId(w.id!)} className="text-blue-500 hover:text-blue-700 text-sm font-bold p-1 transition-colors">수정</button>
                     <button onClick={() => { if(window.confirm('인력을 삭제하시겠습니까?')) deleteDoc(doc(db, 'workers', w.id!)); }} className="text-gray-300 hover:text-red-500 p-1 transition-colors"><i className="fas fa-trash-alt"></i></button>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-1 mb-3">
                   {w.desiredJobs.map(j => <span key={j} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">{j}</span>)}
                 </div>
                 {w.location?.addressString && (
                     <p className="text-[11px] text-gray-400 mb-2"><i className="fas fa-map-marker-alt mr-1"></i> {w.location.addressString}</p>
                 )}
                 <p className="text-xs text-gray-500 line-clamp-2 italic">"{w.introduction || '메모 없음'}"</p>
                 
                 <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                    <a href={`tel:${w.phone}`} className="flex-1 bg-brand-50 text-brand-600 text-center py-2 rounded-lg text-xs font-bold hover:bg-brand-100">전화</a>
                    <button onClick={() => setEditingWorkerId(w.id!)} className="flex-1 bg-gray-50 text-gray-500 text-center py-2 rounded-lg text-xs font-bold hover:bg-gray-100">상세정보/수정</button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4 animate-fade-in">
           <div className="flex justify-between items-center px-2">
             <h2 className="text-xl font-bold text-gray-800">실시간 구인 현황 <span className="text-brand-600">{jobs.length}</span></h2>
             <button 
               onClick={() => { setIsAddingJob(!isAddingJob); setEditingJobId(null); setJobForm({ companyName: '', address: '', content: '', pay: '', date: '', contact: '', isUrgent: false, createdAt: '' }); }}
               className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${isAddingJob ? 'bg-slate-800 text-white' : 'bg-brand-600 text-white'}`}
             >
               {isAddingJob ? '닫기' : '+ 일자리 등록'}
             </button>
           </div>

           {isAddingJob && (
             <div className="bg-white p-6 rounded-2xl border border-brand-100 shadow-xl animate-fade-in-up">
               <h3 className="font-bold text-lg mb-4">{editingJobId ? '일자리 수정' : '신규 일자리 등록'}</h3>
               <form onSubmit={handleJobSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <input placeholder="업체명/현장명" value={jobForm.companyName} onChange={e => setJobForm({...jobForm, companyName: e.target.value})} className="p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                 <input placeholder="연락처 (문의 받을 번호)" value={jobForm.contact} onChange={e => setJobForm({...jobForm, contact: e.target.value})} className="p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                 <div className="md:col-span-2">
                   <input placeholder="상세 업무 내용 (예: 성주 비닐하우스 수확)" value={jobForm.content} onChange={e => setJobForm({...jobForm, content: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                 </div>
                 <input placeholder="급여 (예: 16만원)" value={jobForm.pay} onChange={e => setJobForm({...jobForm, pay: e.target.value})} className="p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                 <input placeholder="근무 날짜/기간" value={jobForm.date} onChange={e => setJobForm({...jobForm, date: e.target.value})} className="p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                 <div className="md:col-span-2">
                   <input placeholder="상세 주소" value={jobForm.address} onChange={e => setJobForm({...jobForm, address: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-brand-500" />
                 </div>
                 <label className="flex items-center gap-2 cursor-pointer p-2">
                   <input type="checkbox" checked={jobForm.isUrgent} onChange={e => setJobForm({...jobForm, isUrgent: e.target.checked})} className="w-5 h-5 accent-red-500" />
                   <span className="text-sm font-bold text-red-500">긴급구인 표시</span>
                 </label>
                 <button type="submit" className="md:col-span-2 bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-700 transition-all">
                   {editingJobId ? '수정 완료' : '등록 및 즉시 알림 발송'}
                 </button>
               </form>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {jobs.map(job => (
               <div key={job.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                 <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-lg leading-tight">{job.content}</h4>
                      <div className="flex gap-2">
                        <button onClick={() => startEditJob(job)} className="text-blue-500 text-sm hover:underline font-bold transition-colors">수정</button>
                        <button onClick={() => handleDeleteJob(job.id!)} className="text-red-500 text-sm hover:underline font-bold transition-colors">삭제</button>
                      </div>
                    </div>
                    <p className="text-sm text-brand-600 font-bold mb-3">{job.companyName}</p>
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      <p><i className="fas fa-won-sign w-4"></i> {job.pay}</p>
                      <p><i className="fas fa-map-marker-alt w-4"></i> {job.address}</p>
                    </div>
                 </div>
                 <div className="text-[10px] text-gray-400 border-t pt-3 flex justify-between">
                    <span>등록일: {new Date(job.createdAt).toLocaleString()}</span>
                    <span className="text-brand-500 font-bold">게시중</span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'notices' && (
        <div className="animate-fade-in space-y-6">
           <div className="bg-white p-8 rounded-3xl border border-brand-100 shadow-lg">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
               <i className="fas fa-paper-plane text-brand-600"></i>
               전체 공지사항 발송
             </h2>
             <form onSubmit={handleSendNotice} className="space-y-4">
               <input placeholder="알림 제목" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:bg-white focus:border-brand-500" />
               <textarea placeholder="알림 상세 내용" value={newNotice.message} onChange={e => setNewNotice({...newNotice, message: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:bg-white focus:border-brand-500 h-32" />
               <button disabled={isSendingNotice} className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-700 disabled:bg-gray-300">
                 {isSendingNotice ? <i className="fas fa-spinner fa-spin"></i> : '즉시 발송하기'}
               </button>
             </form>
           </div>
           
           <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
             <div className="p-4 bg-gray-50 border-b font-bold text-sm">최근 알림 발송 내역</div>
             <div className="divide-y divide-gray-100">
               {notifications.map(n => (
                 <div key={n.id} className="p-4 flex justify-between items-center group hover:bg-gray-50">
                   <div>
                     <span className={`text-[10px] px-2 py-0.5 rounded-full mr-2 ${n.type === 'job' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {n.type === 'job' ? '일자리' : '공지'}
                     </span>
                     <h5 className="inline font-bold text-sm text-gray-800">{n.title}</h5>
                     <p className="text-xs text-gray-500 truncate max-w-md mt-1">{n.message}</p>
                     <span className="text-[10px] text-gray-400 block mt-1">{new Date(n.createdAt).toLocaleString()}</span>
                   </div>
                   <button onClick={() => deleteDoc(doc(db, 'notifications', n.id))} className="text-gray-300 group-hover:text-red-500 transition-colors p-2"><i className="fas fa-trash-alt"></i></button>
                 </div>
               ))}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
