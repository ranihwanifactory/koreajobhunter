
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { WorkerProfile } from '../types';
import { User } from 'firebase/auth';

const maskName = (name: string) => {
  if (!name) return '***';
  return name.charAt(0) + '**';
};

const TickerItem: React.FC<{ worker: WorkerProfile }> = ({ worker }) => (
  <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-600/50 backdrop-blur-sm min-w-max shadow-lg">
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm ${
        worker.desiredJobs?.[0] === '건설/현장' ? 'bg-orange-500 text-white' :
        worker.desiredJobs?.[0] === '농촌/농업' ? 'bg-green-500 text-white' :
        worker.desiredJobs?.[0] === '공장/생산' ? 'bg-blue-500 text-white' :
        'bg-slate-600 text-white'
    }`}>
      {worker.desiredJobs?.[0] || '일반인력'}
    </span>
    <span className="font-bold text-white text-sm tracking-wide">
      {maskName(worker.name)}
    </span>
    <span className="text-xs text-slate-400 border-l border-slate-600 pl-2">
       {worker.location?.addressString?.split(' ')[0] || '성주군'}
    </span>
  </div>
);

interface WorkerTickerProps {
  user: User | null;
}

const WorkerTicker: React.FC<WorkerTickerProps> = ({ user }) => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    // Only attempt to subscribe if a user is logged in to avoid permission errors
    if (!user) {
      setHasPermission(false);
      return;
    }

    const q = query(collection(db, 'workers'), orderBy('updatedAt', 'desc'), limit(15));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as WorkerProfile);
      setWorkers(list);
      setHasPermission(true);
    }, (error) => {
      if (error.code === 'permission-denied') {
        setHasPermission(false);
        console.log("Worker ticker permission denied. Login might be required.");
      } else {
        console.error("Failed to fetch workers for ticker", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!hasPermission || !user) {
    return (
      <div className="w-full bg-slate-900 overflow-hidden py-4 shadow-inner border-y border-slate-800 mb-8 relative">
        <div className="flex items-center justify-center text-slate-400 text-xs gap-2">
           <i className="fas fa-lock"></i>
           로그인하시면 실시간 인력 현황을 보실 수 있습니다.
        </div>
      </div>
    );
  }

  if (workers.length === 0) return null;

  const displayList = workers.length < 5 ? [...workers, ...workers, ...workers] : workers;

  return (
    <div className="w-full bg-slate-900 overflow-hidden py-4 shadow-inner border-y border-slate-800 mb-8 relative">
       <div className="flex items-center justify-between mb-3 px-4">
           <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              성주 최대 인력망 실시간 현황
           </div>
           <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded">
               <i className="fas fa-eye mr-1"></i> 현재 대기중
           </span>
       </div>
       
       <div className="flex overflow-hidden relative w-full no-scrollbar">
          <div className="animate-marquee flex gap-3 min-w-full shrink-0 items-center px-4">
            {displayList.map((w, i) => (
              <TickerItem key={`t1-${i}`} worker={w} />
            ))}
          </div>
          <div className="animate-marquee flex gap-3 min-w-full shrink-0 items-center px-4">
            {displayList.map((w, i) => (
              <TickerItem key={`t2-${i}`} worker={w} />
            ))}
          </div>
       </div>
    </div>
  );
};

export default WorkerTicker;
