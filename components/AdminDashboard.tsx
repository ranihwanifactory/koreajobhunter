
import React, { useEffect, useState } from 'react';
import { db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { WorkerProfile, JobType, JobPosting, AppNotification } from '../types';
import { JOB_TYPES_LIST } from '../constants';
import WorkerMap from './WorkerMap';

type AdminTab = 'workers' | 'jobs';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('workers');
  
  // --- Worker Management States ---
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [workerLoading, setWorkerLoading] = useState(false);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJobType, setFilterJobType] = useState<string>(''); // '' = All
  const [filterLocation, setFilterLocation] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkerProfile>>({});
  const [editFiles, setEditFiles] = useState<{idCard?: File, safetyCert?: File}>({});
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
    isAgreed: true,
    idCardImageUrl: '',
    safetyCertImageUrl: ''
  });

  // --- Job Management States ---
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [newJob, setNewJob] = useState<JobPosting>({
    companyName: '',
    address: '',
    content: '',
    pay: '',
    date: '',
    contact: '',
    isUrgent: false,
    createdAt: ''
  });
  
  // Job Editing State
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobForm, setEditJobForm] = useState<Partial<JobPosting>>({});

  // Unified Realtime Listener Setup
  useEffect(() => {
    let unsubscribeWorkers: (() => void) | undefined;
    let unsubscribeJobs: (() => void) | undefined;

    if (activeTab === 'workers') {
      setWorkerLoading(true);
      const q = query(collection(db, 'workers'));
      
      unsubscribeWorkers = onSnapshot(q, (snapshot) => {
        const workersList: WorkerProfile[] = [];
        snapshot.forEach((doc) => {
          workersList.push({ id: doc.id, ...doc.data() } as WorkerProfile);
        });
        
        // Client-side sorting because Firestore indexes might be tricky with mixed queries sometimes,
        // but simple orderBy('updatedAt') is fine. Here we stick to memory sort for safety.
        workersList.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });

        setWorkers(workersList);
        setWorkerLoading(false);
      }, (error) => {
        console.error("Error fetching workers realtime:", error);
        setWorkerLoading(false);
      });

    } else {
      setJobLoading(true);
      const q = query(collection(db, 'job_postings'), orderBy('createdAt', 'desc'));
      
      unsubscribeJobs = onSnapshot(q, (snapshot) => {
        const jobList: JobPosting[] = [];
        snapshot.forEach((doc) => {
            jobList.push({ id: doc.id, ...doc.data() } as JobPosting);
        });
        setJobs(jobList);
        setJobLoading(false);
      }, (error) => {
        console.error("Error fetching jobs realtime:", error);
        setJobLoading(false);
      });
    }

    return () => {
      if (unsubscribeWorkers) unsubscribeWorkers();
      if (unsubscribeJobs) unsubscribeJobs();
    };
  }, [activeTab]);

  // =================================================================
  // WORKER FUNCTIONS
  // =================================================================

  const handleDeleteWorker = async (id: string, name: string) => {
    if (window.confirm(`${name} 님의 정보를 정말 삭제하시겠습니까? 복구할 수 없습니다.`)) {
      try {
        await deleteDoc(doc(db, 'workers', id));
        // State update is handled by onSnapshot
        alert('삭제되었습니다.');
      } catch (error) {
        console.error("Error deleting worker:", error);
        alert('삭제 실패');
      }
    }
  };

  // Safe upload function
  const uploadImageSafe = async (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        null,
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

  // --- Geocoding Helper ---
  const waitForKakao = async (retries = 10): Promise<boolean> => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      return true;
    }
    if (retries === 0) return false;
    await new Promise(resolve => setTimeout(resolve, 300));
    return waitForKakao(retries - 1);
  };

  const getCoordsFromAddress = async (addr: string): Promise<{lat: number, lng: number, addressName: string} | null> => {
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
  };

  const getAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
    const isReady = await waitForKakao();
    if (!isReady) return `위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)}`;

    return new Promise((resolve) => {
       const geocoder = new window.kakao.maps.services.Geocoder();
       geocoder.coord2Address(lon, lat, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
              resolve(result[0].address.address_name);
          } else {
              resolve(`위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)}`);
          }
       });
    });
  };

  const getLocationForAdmin = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const address = await getAddressFromCoords(lat, lon);
        
        setNewWorker(prev => ({
            ...prev,
            location: {
                latitude: lat,
                longitude: lon,
                addressString: address
            }
        }));
      },
      (error) => {
        console.log("Admin location auto-fetch failed", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const toggleAddMode = () => {
      const nextState = !isAdding;
      setIsAdding(nextState);
      if (nextState) {
          getLocationForAdmin();
      }
  };

  const handleSearchAddress = async (isEdit: boolean) => {
      const targetAddr = isEdit ? editForm.location?.addressString : newWorker.location.addressString;
      if (!targetAddr) {
          alert('주소를 입력해주세요.');
          return;
      }

      const result = await getCoordsFromAddress(targetAddr);
      if (result) {
          if (isEdit) {
              setEditForm(prev => ({
                  ...prev,
                  location: {
                      ...prev.location!,
                      latitude: result.lat,
                      longitude: result.lng,
                      addressString: result.addressName
                  }
              }));
          } else {
              setNewWorker(prev => ({
                  ...prev,
                  location: {
                      ...prev.location,
                      latitude: result.lat,
                      longitude: result.lng,
                      addressString: result.addressName
                  }
              }));
          }
          alert(`위치 확인 완료: ${result.addressName}`);
      } else {
          alert('주소를 찾을 수 없습니다.');
      }
  };


  // --- Edit Logic ---
  const startEdit = (worker: WorkerProfile) => {
    setEditingId(worker.id!);
    setEditForm({ 
        name: worker.name || '',
        phone: worker.phone || '',
        bankName: worker.bankName || '',
        accountNumber: worker.accountNumber || '',
        desiredJobs: worker.desiredJobs || [],
        introduction: worker.introduction || '',
        idCardImageUrl: worker.idCardImageUrl || '',
        safetyCertImageUrl: worker.safetyCertImageUrl || '',
        location: worker.location ? {
            latitude: worker.location.latitude ?? null,
            longitude: worker.location.longitude ?? null,
            addressString: worker.location.addressString || ''
        } : { latitude: null, longitude: null, addressString: '' }
    });
    setEditFiles({});
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditFiles({});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'addressString') {
        setEditForm(prev => ({ 
            ...prev, 
            location: { 
                latitude: prev.location?.latitude ?? null,
                longitude: prev.location?.longitude ?? null,
                addressString: value 
            } 
        }));
    } else {
        setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'safetyCert') => {
      if (e.target.files && e.target.files[0]) {
          setEditFiles(prev => ({...prev, [type]: e.target.files![0]}));
      }
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

    if (!window.confirm("변경된 내용을 저장하시겠습니까?")) return;

    try {
      let idCardUrl = editForm.idCardImageUrl || '';
      let safetyCertUrl = editForm.safetyCertImageUrl || '';
      const timestamp = Date.now();
      
      if (editFiles.idCard) {
         idCardUrl = await uploadImageSafe(editFiles.idCard, `workers/${editingId}/idCard_${timestamp}`);
      }
      
      if (editFiles.safetyCert) {
         safetyCertUrl = await uploadImageSafe(editFiles.safetyCert, `workers/${editingId}/safetyCert_${timestamp}`);
      }

      let finalLat = editForm.location?.latitude ?? null;
      let finalLng = editForm.location?.longitude ?? null;
      let finalAddr = editForm.location?.addressString || '';

      if (finalAddr) {
          try {
             const coords = await getCoordsFromAddress(finalAddr);
             if (coords) {
                 finalLat = coords.lat;
                 finalLng = coords.lng;
                 finalAddr = coords.addressName;
             }
          } catch(e) { console.error(e) }
      }

      const safeStr = (val: string | undefined | null) => val || '';
      const updateData = {
          name: safeStr(editForm.name),
          phone: safeStr(editForm.phone),
          bankName: safeStr(editForm.bankName),
          accountNumber: safeStr(editForm.accountNumber),
          introduction: safeStr(editForm.introduction),
          desiredJobs: editForm.desiredJobs || [],
          location: {
              latitude: finalLat,
              longitude: finalLng,
              addressString: finalAddr
          },
          idCardImageUrl: safeStr(idCardUrl),
          safetyCertImageUrl: safeStr(safetyCertUrl),
          updatedAt: new Date().toISOString()
      };

      const workerRef = doc(db, 'workers', editingId);
      await updateDoc(workerRef, updateData);
      
      // State update handled by onSnapshot
      setEditingId(null);
      setEditFiles({});
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

        if (newFiles.idCard) {
            setUploadStatus('신분증 업로드 중...');
            idCardUrl = await uploadImageSafe(newFiles.idCard, `${uploadPrefix}/idCard`);
        }
        if (newFiles.safetyCert) {
            setUploadStatus('이수증 업로드 중...');
            safetyCertUrl = await uploadImageSafe(newFiles.safetyCert, `${uploadPrefix}/safetyCert`);
        }

        setUploadStatus('위치 확인 중...');
        let finalLat = newWorker.location.latitude;
        let finalLng = newWorker.location.longitude;
        let finalAddr = newWorker.location.addressString;

        if ((!finalLat || !finalLng) && finalAddr) {
            try {
                const coords = await getCoordsFromAddress(finalAddr);
                if (coords) {
                    finalLat = coords.lat;
                    finalLng = coords.lng;
                    finalAddr = coords.addressName;
                }
            } catch (e) {
                console.error("Auto geocode failed", e);
            }
        }

        setUploadStatus('정보 저장 중...');
        const workerData: WorkerProfile = {
            ...newWorker,
            location: {
                latitude: finalLat,
                longitude: finalLng,
                addressString: finalAddr
            },
            idCardImageUrl: idCardUrl,
            safetyCertImageUrl: safetyCertUrl,
            updatedAt: new Date().toISOString(),
            isAgreed: true
        };

        await addDoc(collection(db, 'workers'), workerData);
        // State update handled by onSnapshot
        
        setIsAdding(false);
        setNewWorker({
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

  const filteredWorkers = workers.filter(worker => {
    // 1. Text Search (Name, Phone, Intro)
    const matchesSearch = 
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone.includes(searchTerm) ||
      (worker.introduction || '').includes(searchTerm);

    // 2. Job Type Filter
    const matchesJob = filterJobType === '' || worker.desiredJobs?.includes(filterJobType as JobType);

    // 3. Location Filter
    const matchesLocation = filterLocation === '' || (worker.location?.addressString || '').includes(filterLocation);

    return matchesSearch && matchesJob && matchesLocation;
  });


  // =================================================================
  // JOB FUNCTIONS
  // =================================================================

  const handleJobDelete = async (id: string) => {
    if (window.confirm('이 일자리 정보를 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'job_postings', id));
        // State update handled by onSnapshot
      } catch (error) {
        console.error("Error deleting job:", error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleNewJobChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewJob(prev => ({ ...prev, [name]: value }));
  };

  const handleNewJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.companyName || !newJob.content || !newJob.contact) {
      alert('필수 정보를 입력해주세요 (업체명, 내용, 연락처)');
      return;
    }

    try {
      const jobData = {
        ...newJob,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'job_postings'), jobData);

      // Notification 생성
      try {
        const notificationData: Omit<AppNotification, 'id'> = {
          title: '새로운 일자리 등록',
          message: `${newJob.companyName}에서 인력을 구합니다. (${newJob.content})`,
          createdAt: new Date().toISOString(),
          type: 'job',
          linkId: docRef.id
        };
        await addDoc(collection(db, 'notifications'), notificationData);
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
      
      setIsAddingJob(false);
      setNewJob({
        companyName: '',
        address: '',
        content: '',
        pay: '',
        date: '',
        contact: '',
        isUrgent: false,
        createdAt: ''
      });
      alert('일자리가 등록되었습니다. 알림이 발송되었습니다.');
    } catch (error) {
      console.error("Error adding job:", error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  // --- Job Edit Functions ---
  const startJobEdit = (job: JobPosting) => {
    setEditingJobId(job.id!);
    setEditJobForm({ ...job });
  };

  const cancelJobEdit = () => {
    setEditingJobId(null);
    setEditJobForm({});
  };

  const handleEditJobChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     const { name, value, type } = e.target;
     // Handle checkbox specifically
     if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setEditJobForm(prev => ({ ...prev, [name]: checked }));
     } else {
        setEditJobForm(prev => ({ ...prev, [name]: value }));
     }
  };

  const saveJobEdit = async () => {
    if (!editingJobId) return;
    try {
        const jobRef = doc(db, 'job_postings', editingJobId);
        await updateDoc(jobRef, {
            ...editJobForm,
        });
        // State update handled by onSnapshot
        setEditingJobId(null);
        setEditJobForm({});
        alert('일자리가 수정되었습니다.');
    } catch (e) {
        console.error(e);
        alert('수정 실패');
    }
  };


  return (
    <div className="space-y-4 pb-20">
      {/* Tabs */}
      <div className="sticky top-16 z-30 bg-gray-50/95 backdrop-blur pt-2 pb-2">
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'workers'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-users mr-2"></i>인력 관리
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'jobs'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-briefcase mr-2"></i>일자리 관리
          </button>
        </div>
      </div>

      {/* ======================= WORKER TAB CONTENT ======================= */}
      {activeTab === 'workers' && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">
                  등록된 인력 <span className="text-brand-600 ml-1">{workers.length}</span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={toggleAddMode}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                            isAdding ? 'bg-slate-800 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
                        }`}
                    >
                        {isAdding ? '닫기' : '+ 직접등록'}
                    </button>
                </div>
              </div>
              
              {/* Search & Filter Group */}
              <div className="space-y-3">
                {/* 1. Main Search */}
                <div className="relative w-full group">
                    <input
                        type="text"
                        placeholder="이름, 연락처 또는 소개 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-gray-400"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fas fa-search text-gray-400 group-focus-within:text-brand-500 transition-colors"></i>
                    </div>
                </div>

                {/* 2. Detail Filters */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Job Type */}
                    <div className="relative group">
                        <select
                            value={filterJobType}
                            onChange={(e) => setFilterJobType(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 appearance-none cursor-pointer transition-all hover:border-brand-300"
                        >
                            <option value="">전체 직종</option>
                            {JOB_TYPES_LIST.map(job => (
                                <option key={job.value} value={job.value}>{job.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <i className="fas fa-briefcase text-gray-400 group-focus-within:text-brand-500 transition-colors"></i>
                        </div>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="지역 (읍/면/동)"
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all hover:border-brand-300"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <i className="fas fa-map-marker-alt text-gray-400 group-focus-within:text-brand-500 transition-colors"></i>
                        </div>
                    </div>
                </div>
              </div>

            </div>
          </div>
          
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
             <WorkerMap workers={workers} />
          </div>

          {isAdding && (
             <div className="bg-white border-2 border-brand-100 rounded-2xl p-5 shadow-lg animate-fade-in-up">
                  <h3 className="font-bold text-lg text-brand-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-user-plus"></i> 인력 직접 등록
                  </h3>
                  <form onSubmit={handleAddSubmit} className="space-y-4">
                      {/* Name/Phone */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
                            <input type="text" name="name" required value={newWorker.name} onChange={handleNewWorkerChange} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" placeholder="이름" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">연락처 *</label>
                            <input type="tel" name="phone" required value={newWorker.phone} onChange={handleNewWorkerChange} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" placeholder="번호" />
                        </div>
                      </div>
                      {/* Address */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">주소</label>
                        <div className="flex gap-2">
                            <input type="text" name="addressString" value={newWorker.location.addressString} onChange={handleNewWorkerChange} className="flex-1 p-3 border border-gray-200 rounded-xl text-sm outline-none" placeholder="주소 입력" />
                            <button type="button" onClick={() => handleSearchAddress(false)} className="bg-brand-600 text-white px-3 rounded-xl text-xs font-bold whitespace-nowrap">검색</button>
                        </div>
                      </div>
                      {/* Bank */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">은행명</label>
                            <input type="text" name="bankName" value={newWorker.bankName} onChange={handleNewWorkerChange} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" placeholder="은행" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">계좌번호</label>
                            <input type="text" name="accountNumber" value={newWorker.accountNumber} onChange={handleNewWorkerChange} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" placeholder="계좌" />
                        </div>
                      </div>
                      {/* Job Types */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">직종</label>
                        <div className="flex flex-wrap gap-1.5 bg-gray-50 p-3 rounded-xl">
                          {JOB_TYPES_LIST.map(job => (
                            <button key={job.value} type="button" onClick={() => toggleNewJob(job.value)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${newWorker.desiredJobs.includes(job.value) ? 'bg-brand-500 text-white' : 'bg-white'}`}>{job.label}</button>
                          ))}
                        </div>
                      </div>
                      {/* Intro */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">소개</label>
                        <textarea name="introduction" value={newWorker.introduction} onChange={handleNewWorkerChange} className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none" rows={2} />
                      </div>
                      {/* Files */}
                      <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                           <div>
                               <label className="text-xs text-gray-500 mb-1 block font-bold">신분증</label>
                               <input type="file" accept="image/*" onChange={(e) => handleNewFileChange(e, 'idCard')} className="hidden" id="adminIdUpload" />
                               <label htmlFor="adminIdUpload" className="block w-full text-center py-2 border border-dashed rounded-lg text-xs cursor-pointer bg-white">{newFiles.idCard ? '선택됨' : '+ 추가'}</label>
                           </div>
                           <div>
                               <label className="text-xs text-gray-500 mb-1 block font-bold">이수증</label>
                               <input type="file" accept="image/*" onChange={(e) => handleNewFileChange(e, 'safetyCert')} className="hidden" id="adminSafeUpload" />
                               <label htmlFor="adminSafeUpload" className="block w-full text-center py-2 border border-dashed rounded-lg text-xs cursor-pointer bg-white">{newFiles.safetyCert ? '선택됨' : '+ 추가'}</label>
                           </div>
                      </div>

                      <button type="submit" disabled={!!uploadStatus} className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl mt-2">
                          {uploadStatus || '등록하기'}
                      </button>
                  </form>
             </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {workerLoading ? (
               <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-brand-500 text-2xl"></i></div>
            ) : filteredWorkers.map(worker => (
              <div key={worker.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                {editingId === worker.id ? (
                  // --- EDIT WORKER FORM ---
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-sm font-bold text-brand-600">정보 수정</span>
                    </div>
                    {/* Fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" name="name" value={editForm.name} onChange={handleEditChange} className="border p-2 rounded text-sm" placeholder="이름" />
                        <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} className="border p-2 rounded text-sm" placeholder="전화" />
                    </div>
                    <div className="flex gap-2">
                         <input type="text" name="addressString" value={editForm.location?.addressString} onChange={handleEditChange} className="flex-1 border p-2 rounded text-sm" placeholder="주소" />
                         <button onClick={() => handleSearchAddress(true)} className="bg-brand-600 text-white px-2 rounded text-xs">검색</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <input type="text" name="bankName" value={editForm.bankName} onChange={handleEditChange} className="border p-2 rounded text-sm" placeholder="은행" />
                         <input type="text" name="accountNumber" value={editForm.accountNumber} onChange={handleEditChange} className="border p-2 rounded text-sm" placeholder="계좌" />
                    </div>
                     <div className="flex flex-wrap gap-1">
                      {JOB_TYPES_LIST.map(job => (
                        <button key={job.value} onClick={() => toggleEditJob(job.value)} className={`text-xs px-2 py-1 rounded border ${editForm.desiredJobs?.includes(job.value) ? 'bg-brand-500 text-white' : 'bg-white'}`}>{job.label}</button>
                      ))}
                    </div>
                    <textarea name="introduction" value={editForm.introduction} onChange={handleEditChange} className="w-full border p-2 rounded text-sm" rows={2} />
                    
                    <div className="flex gap-2 pt-2">
                      <button onClick={cancelEdit} className="flex-1 bg-gray-100 py-2 rounded-lg text-sm font-bold">취소</button>
                      <button onClick={saveEdit} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold">저장</button>
                    </div>
                  </div>
                ) : (
                  // --- VIEW WORKER CARD ---
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{worker.name}</h3>
                        <p className="text-xs text-gray-500">{worker.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(worker)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100">
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        <button onClick={() => handleDeleteWorker(worker.id!, worker.name)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                       {worker.desiredJobs?.map(j => <span key={j} className="text-[10px] bg-gray-100 px-2 py-1 rounded">{j}</span>)}
                    </div>
                    <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">{worker.location.addressString || '주소 없음'}</p>
                    <a href={`tel:${worker.phone}`} className="block w-full bg-green-50 text-green-600 py-2 rounded-lg text-center font-bold text-sm">전화걸기</a>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= JOBS TAB CONTENT ======================= */}
      {activeTab === 'jobs' && (
        <div className="animate-fade-in space-y-4">
          
          {/* Add Job Button / Form */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  일자리 목록 <span className="text-brand-600 ml-1">{jobs.length}</span>
                </h2>
                <button
                    onClick={() => setIsAddingJob(!isAddingJob)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        isAddingJob ? 'bg-slate-800 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                >
                    {isAddingJob ? '닫기' : '+ 일자리 등록'}
                </button>
             </div>

             {isAddingJob && (
                <form onSubmit={handleNewJobSubmit} className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200 animate-fade-in-up">
                   <div>
                     <label className="text-xs text-gray-500 mb-1 block">업무 내용 (제목)</label>
                     <input type="text" name="content" required value={newJob.content} onChange={handleNewJobChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white" placeholder="예: 아파트 건설 현장 자재 정리" />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">업체명</label>
                        <input type="text" name="companyName" required value={newJob.companyName} onChange={handleNewJobChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white" placeholder="XX건설" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">일당/급여</label>
                        <input type="text" name="pay" value={newJob.pay} onChange={handleNewJobChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white" placeholder="예: 150,000원" />
                      </div>
                   </div>
                   <div>
                     <label className="text-xs text-gray-500 mb-1 block">현장 주소</label>
                     <input type="text" name="address" value={newJob.address} onChange={handleNewJobChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white" placeholder="예: 성주군 성주읍 ..." />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">작업 날짜/기간</label>
                        <input type="text" name="date" value={newJob.date} onChange={handleNewJobChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white" placeholder="예: 2024.03.15 하루" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">연락처</label>
                        <input type="tel" name="contact" required value={newJob.contact} onChange={handleNewJobChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white" placeholder="담당자 연락처" />
                      </div>
                   </div>
                   
                   <label className="flex items-center gap-2 pt-1">
                      <input type="checkbox" checked={newJob.isUrgent} onChange={(e) => setNewJob(prev => ({...prev, isUrgent: e.target.checked}))} className="w-4 h-4 text-red-500 rounded focus:ring-red-500" />
                      <span className="text-sm font-bold text-red-500">긴급 구인 표시</span>
                   </label>

                   <button type="submit" className="w-full bg-brand-600 text-white font-bold py-3 rounded-lg mt-2 shadow-sm">
                     게시하기
                   </button>
                </form>
             )}
          </div>

          <div className="space-y-3">
            {jobLoading ? (
              <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-brand-500 text-2xl"></i></div>
            ) : jobs.length === 0 ? (
               <div className="text-center py-10 text-gray-400">등록된 일자리가 없습니다.</div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm relative">
                  {editingJobId === job.id ? (
                      // --- EDIT JOB FORM ---
                      <div className="space-y-3 animate-fade-in bg-blue-50/50 p-2 rounded-xl -m-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-brand-600">일자리 수정</span>
                        </div>
                        <input type="text" name="content" value={editJobForm.content || ''} onChange={handleEditJobChange} className="w-full border p-2 rounded text-sm" placeholder="업무 내용" />
                        <div className="grid grid-cols-2 gap-2">
                             <input type="text" name="companyName" value={editJobForm.companyName || ''} onChange={handleEditJobChange} className="border p-2 rounded text-sm" placeholder="업체명" />
                             <input type="text" name="pay" value={editJobForm.pay || ''} onChange={handleEditJobChange} className="border p-2 rounded text-sm" placeholder="급여" />
                        </div>
                        <input type="text" name="address" value={editJobForm.address || ''} onChange={handleEditJobChange} className="w-full border p-2 rounded text-sm" placeholder="주소" />
                        <div className="grid grid-cols-2 gap-2">
                             <input type="text" name="date" value={editJobForm.date || ''} onChange={handleEditJobChange} className="border p-2 rounded text-sm" placeholder="날짜" />
                             <input type="text" name="contact" value={editJobForm.contact || ''} onChange={handleEditJobChange} className="border p-2 rounded text-sm" placeholder="연락처" />
                        </div>
                        <label className="flex items-center gap-2">
                             <input type="checkbox" name="isUrgent" checked={!!editJobForm.isUrgent} onChange={handleEditJobChange} className="text-red-500" />
                             <span className="text-xs font-bold text-red-500">긴급</span>
                        </label>
                        <div className="flex gap-2 pt-2">
                          <button onClick={cancelJobEdit} className="flex-1 bg-white border border-gray-300 py-2 rounded-lg text-sm font-bold hover:bg-gray-50">취소</button>
                          <button onClick={saveJobEdit} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-brand-700">수정 완료</button>
                        </div>
                      </div>
                  ) : (
                      // --- VIEW JOB CARD ---
                      <>
                        {job.isUrgent && <span className="absolute top-4 right-4 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">긴급</span>}
                        
                        <div className="pr-12">
                           <h3 className="font-bold text-gray-800 text-lg mb-1">{job.content}</h3>
                           <p className="text-sm text-brand-600 font-medium mb-3">{job.companyName}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">
                          <div className="col-span-2 flex items-center gap-2">
                             <i className="fas fa-map-marker-alt w-4 text-center text-gray-400"></i> {job.address}
                          </div>
                          <div className="flex items-center gap-2">
                             <i className="fas fa-won-sign w-4 text-center text-gray-400"></i> {job.pay}
                          </div>
                          <div className="flex items-center gap-2">
                             <i className="far fa-calendar-alt w-4 text-center text-gray-400"></i> {job.date}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                              {new Date(job.createdAt).toLocaleDateString()} 등록
                          </span>
                          <div className="flex gap-2">
                             <button 
                                onClick={() => startJobEdit(job)}
                                className="text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                              >
                                <i className="fas fa-edit mr-1"></i> 수정
                              </button>
                              <button 
                                onClick={() => handleJobDelete(job.id!)}
                                className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                              >
                                <i className="fas fa-trash mr-1"></i> 삭제
                              </button>
                          </div>
                        </div>
                      </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
