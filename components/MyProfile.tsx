
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { WorkerProfile } from '../types';
import RegistrationForm from './RegistrationForm';

interface MyProfileProps {
  user: User;
}

const MyProfile: React.FC<MyProfileProps> = ({ user }) => {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'workers', user.uid), (docSnap) => {
      if (docSnap.exists()) setProfile(docSnap.data() as WorkerProfile);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleToggle = async (type: 'jobPostings' | 'notices') => {
    if (!profile) return;
    const current = profile.notificationSettings?.[type] ?? true;
    const next = !current;

    if (next && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return alert("알림 권한이 거부되었습니다.");
    }

    try {
        await updateDoc(doc(db, 'workers', user.uid), {
            [`notificationSettings.${type}`]: next
        });
    } catch (e) { alert("업데이트 실패"); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
  if (isEditing) return <RegistrationForm user={user} onCancel={() => setIsEditing(false)} onSuccess={() => setIsEditing(false)} />;

  const settings = profile?.notificationSettings || { jobPostings: true, notices: true };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold text-gray-800">내 정보 관리</h2>
         <button onClick={() => setIsEditing(true)} className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg font-bold">정보 수정</button>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold text-2xl">
                {profile?.name.charAt(0)}
             </div>
             <div>
                <p className="font-bold text-lg">{profile?.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
             </div>
          </div>

          <hr />

          <div>
             <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">알림 구독 설정</h4>
             <div className="space-y-3">
                {/* Job Alert */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <div>
                      <p className="text-sm font-bold text-gray-800">일자리 알림</p>
                      <p className="text-[11px] text-gray-500">실시간 구인 공고 알림 수신</p>
                   </div>
                   <button 
                    onClick={() => handleToggle('jobPostings')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.jobPostings ? 'bg-blue-600' : 'bg-gray-300'}`}
                   >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.jobPostings ? 'translate-x-6' : ''}`} />
                   </button>
                </div>
                {/* Notice Alert */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <div>
                      <p className="text-sm font-bold text-gray-800">새로운 소식 및 공지 알림</p>
                      <p className="text-[11px] text-gray-500">사무소 공지, 이벤트, 휴무 안내 등 수신</p>
                   </div>
                   <button 
                    onClick={() => handleToggle('notices')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.notices ? 'bg-purple-600' : 'bg-gray-300'}`}
                   >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.notices ? 'translate-x-6' : ''}`} />
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default MyProfile;
