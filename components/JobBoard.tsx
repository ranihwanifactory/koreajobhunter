
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { JobPosting } from '../types';

const JobBoard: React.FC = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  useEffect(() => {
    // 실시간 리스너로 변경하여 푸시 알림 클릭 시 최신 데이터 보장
    const q = query(collection(db, 'job_postings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobList: JobPosting[] = [];
      snapshot.forEach((doc) => {
        jobList.push({ id: doc.id, ...doc.data() } as JobPosting);
      });
      setJobs(jobList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleJobClick = (job: JobPosting) => {
    setSelectedJob(job);
  };

  const closeDetail = () => {
    setSelectedJob(null);
  };

  const handleCallClick = (e: React.MouseEvent, contact: string) => {
    e.stopPropagation(); // Prevent card click event
    window.location.href = `tel:${contact}`;
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 mt-2">일자리 정보 불러오는 중...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 mb-8 animate-fade-in">
            <div className="text-gray-400 mb-3 text-4xl">
                <i className="far fa-folder-open"></i>
            </div>
            <p className="text-gray-500 text-sm">현재 등록된 일자리가 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">알림 설정을 켜두시면 새 일자리가 뜰 때 알려드려요!</p>
        </div>
    );
  }

  return (
    <div className="mb-4 animate-fade-in relative">
      <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center">
        <i className="fas fa-bullhorn mr-2 text-brand-600"></i>
        실시간 일자리 정보
        <span className="ml-2 text-xs font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
          NEW
        </span>
      </h3>
      
      {/* Grid Layout for PC Optimization */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div 
            key={job.id} 
            onClick={() => handleJobClick(job)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md flex flex-col h-full cursor-pointer group"
          >
            {job.isUrgent && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                긴급구인
              </div>
            )}
            
            <div className="mb-3">
              <h4 className="font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
                {job.content}
              </h4>
              <p className="text-sm text-brand-600 font-medium truncate">
                {job.companyName}
              </p>
            </div>

            <div className="space-y-2 mb-4 flex-grow">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <i className="fas fa-map-marker-alt mt-1 w-4 text-center text-gray-400 shrink-0"></i>
                <span className="line-clamp-1">{job.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <i className="far fa-calendar-alt w-4 text-center text-gray-400 shrink-0"></i>
                <span>{job.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <i className="fas fa-won-sign w-4 text-center text-gray-400 shrink-0"></i>
                <span className="font-bold text-gray-800">{job.pay}</span>
              </div>
            </div>

            <button 
              onClick={(e) => handleCallClick(e, job.contact)}
              className="block w-full bg-slate-800 text-white text-center py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 mt-auto z-20 relative"
            >
              <i className="fas fa-phone-alt mr-2"></i>
              지원 문의하기
            </button>
          </div>
        ))}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeDetail}>
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white mb-1 pr-6">{selectedJob.content}</h3>
                <p className="text-brand-400 text-sm font-medium">{selectedJob.companyName}</p>
              </div>
              <button 
                onClick={closeDetail}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">급여 (일당)</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <i className="fas fa-won-sign text-brand-500 text-sm"></i> {selectedJob.pay}
                    </span>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">근무 기간</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                       <i className="far fa-calendar-alt text-brand-500 text-sm"></i> {selectedJob.date}
                    </span>
                 </div>
              </div>

              {/* Detail List */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700">현장 위치</h4>
                    <p className="text-gray-600 text-sm">{selectedJob.address}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <i className="fas fa-align-left"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700">상세 업무 내용</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedJob.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button 
                onClick={closeDetail}
                className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button 
                onClick={(e) => handleCallClick(e, selectedJob.contact)}
                className="flex-[2] bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
              >
                <i className="fas fa-phone-alt animate-pulse"></i>
                지금 전화하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobBoard;
