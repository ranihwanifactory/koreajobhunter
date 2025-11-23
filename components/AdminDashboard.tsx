import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { WorkerProfile, JobType } from '../types';
import { JOB_TYPES_LIST } from '../constants';

const AdminDashboard: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkerProfile>>({});

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

  const startEdit = (worker: WorkerProfile) => {
    setEditingId(worker.id!);
    setEditForm({ ...worker });
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
        updatedAt: new Date().toISOString() // Update timestamp
      });
      
      setWorkers(prev => prev.map(w => w.id === editingId ? { ...w, ...editForm, updatedAt: new Date().toISOString() } as WorkerProfile : w));
      setEditingId(null);
      alert('수정되었습니다.');
    } catch (error) {
      console.error("Error updating worker:", error);
      alert('수정 실패');
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            <i className="fas fa-users-cog mr-2 text-brand-600"></i>
            인력 관리 ({workers.length}명)
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="이름, 연락처 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            </div>
            <button 
              onClick={fetchWorkers} 
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map(worker => (
            <div key={worker.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              {editingId === worker.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-brand-600">정보 수정 중</span>
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name || ''}
                    onChange={handleEditChange}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="이름"
                  />
                  <input
                    type="text"
                    name="phone"
                    value={editForm.phone || ''}
                    onChange={handleEditChange}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="연락처"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">희망 직종</p>
                    <div className="flex flex-wrap gap-1">
                      {JOB_TYPES_LIST.map(job => (
                        <button
                          key={job.value}
                          onClick={() => toggleEditJob(job.value)}
                          className={`text-xs px-2 py-1 rounded border ${
                            editForm.desiredJobs?.includes(job.value)
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {job.label}
                        </button>
                      ))}
                    </div>
                  </div>
                   <textarea
                    name="introduction"
                    value={editForm.introduction || ''}
                    onChange={handleEditChange}
                    className="w-full p-2 border rounded text-sm"
                    rows={2}
                    placeholder="소개"
                  />
                  <div className="flex gap-2 pt-2">
                    <button onClick={saveEdit} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold">저장</button>
                    <button onClick={cancelEdit} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm">취소</button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {worker.name}
                        {worker.updatedAt && (
                          <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100">
                             {new Date(worker.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <i className="fas fa-phone-alt w-4 text-gray-400"></i>
                        <a href={`tel:${worker.phone}`} className="hover:text-brand-600">{worker.phone}</a>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => startEdit(worker)}
                        className="w-8 h-8 rounded-full bg-gray-50 text-brand-600 hover:bg-brand-50 flex items-center justify-center transition-colors"
                      >
                        <i className="fas fa-pen text-xs"></i>
                      </button>
                      <button 
                        onClick={() => handleDelete(worker.id!, worker.name)}
                        className="w-8 h-8 rounded-full bg-gray-50 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">희망 직종</p>
                      <div className="flex flex-wrap gap-1">
                        {worker.desiredJobs && worker.desiredJobs.length > 0 ? (
                          worker.desiredJobs.map((job, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-700">
                              {job}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">선택 안함</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-500">계좌 정보</p>
                      <p className="font-medium text-gray-700">
                        {worker.bankName} {worker.accountNumber}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                       <p className="text-xs text-gray-500">위치</p>
                       <p className="text-gray-700 truncate" title={worker.location.addressString}>
                         {worker.location.addressString || '위치 정보 없음'}
                       </p>
                    </div>

                    {worker.introduction && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-gray-600 italic text-xs">"{worker.introduction}"</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {filteredWorkers.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <i className="fas fa-search text-3xl mb-3 opacity-50"></i>
              <p>검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;