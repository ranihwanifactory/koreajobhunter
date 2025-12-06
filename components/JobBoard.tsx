
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { JobPosting } from '../types';

const JobBoard: React.FC = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const q = query(collection(db, 'job_postings'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const jobList: JobPosting[] = [];
      querySnapshot.forEach((doc) => {
        jobList.push({ id: doc.id, ...doc.data() } as JobPosting);
      });
      setJobs(jobList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
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
    return null; // 일자리가 없으면 아무것도 표시하지 않음
  }

  return (
    <div className="mb-4 animate-fade-in">
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
          <div key={job.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-md flex flex-col h-full">
            {job.isUrgent && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                긴급구인
              </div>
            )}
            
            <div className="mb-3">
              <h4 className="font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-2">
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

            <a 
              href={`tel:${job.contact}`}
              className="block w-full bg-slate-800 text-white text-center py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 mt-auto"
            >
              <i className="fas fa-phone-alt mr-2"></i>
              지원 문의하기
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobBoard;
