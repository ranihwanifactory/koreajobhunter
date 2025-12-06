
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
      if (docSnap.exists()) {
        setProfile(docSnap.data() as WorkerProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleNotificationToggle = async () => {
    if (!profile || !user) return;
    
    // Default to true if undefined, consistent with Header logic
    const currentSetting = profile.notificationSettings?.jobPostings ?? true;
    const newSetting = !currentSetting;

    // If turning on, request permission
    if (newSetting) {
      if (!("Notification" in window)) {
        alert("이 브라우저는 알림을 지원하지 않습니다.");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.");
        return; 
      }
    }

    try {
        const workerRef = doc(db, 'workers', user.uid);
        await updateDoc(workerRef, {
            'notificationSettings.jobPostings': newSetting
        });
    } catch (e) {
        console.error("Error updating notification settings:", e);
        alert("설정 변경 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>프로필 불러오는 중...</div>;
  }

  // Editing Mode
  if (isEditing) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-800 mb-4 px-1 flex items-center">
            <i className="fas fa-user-edit mr-2 text-brand-600"></i>
            정보 수정
        </h2>
        <RegistrationForm 
          user={user} 
          onCancel={() => setIsEditing(false)} 
          onSuccess={() => setIsEditing(false)} 
        />
      </div>
    );
  }

  // View Mode
  if (!profile) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-user-slash text-2xl"></i>
        </div>
        <p className="text-gray-500 mb-4">등록된 프로필 정보가 없습니다.</p>
        <button 
          onClick={() => setIsEditing(true)}
          className="bg-brand-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-brand-700 transition-colors"
        >
          등록하기
        </button>
      </div>
    );
  }

  const isNotiEnabled = profile.notificationSettings?.jobPostings ?? true;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
       <div className="flex items-center justify-between mb-4 px-1">
         <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <i className="fas fa-id-card mr-2 text-brand-600"></i>
            내 프로필
        </h2>
        <button 
            onClick={() => setIsEditing(true)}
            className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 transition-colors"
        >
            <i className="fas fa-pen mr-1"></i> 수정
        </button>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header Section */}
          <div className="bg-slate-50 p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center md:items-start text-center md:text-left">
             <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm">
                <span className="text-2xl font-bold">{profile.name.charAt(0)}</span>
             </div>
             <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h3>
                <p className="text-gray-500 text-sm mb-2">{user.email}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                   <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded border border-blue-100">
                      <i className="fas fa-phone-alt mr-1"></i> {profile.phone}
                   </span>
                </div>
             </div>
          </div>

          {/* Details Body */}
          <div className="p-6 space-y-6">
             
             {/* Jobs & Location */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">희망 직종</h4>
                    <div className="flex flex-wrap gap-2">
                        {profile.desiredJobs && profile.desiredJobs.length > 0 ? (
                            profile.desiredJobs.map(job => (
                                <span key={job} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                                    {job}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-sm">-</span>
                        )}
                    </div>
                 </div>
                 <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">거주/활동 지역</h4>
                    <div className="flex items-start gap-2 text-gray-700">
                        <i className="fas fa-map-marker-alt mt-1 text-brand-500"></i>
                        <span className="text-sm leading-relaxed">{profile.location.addressString || '미등록'}</span>
                    </div>
                 </div>
             </div>
             
             <hr className="border-gray-50" />

             {/* Bank & Intro */}
             <div className="space-y-4">
                 <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">계좌 정보</h4>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 inline-block w-full">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <i className="fas fa-university text-gray-400"></i>
                            <span className="font-bold">{profile.bankName || '-'}</span>
                            <span className="text-gray-300">|</span>
                            <span>{profile.accountNumber || '-'}</span>
                        </div>
                    </div>
                 </div>
                 
                 <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">한줄 소개</h4>
                    <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 text-sm text-gray-700 leading-relaxed italic">
                        "{profile.introduction || '작성된 소개가 없습니다.'}"
                    </div>
                 </div>
             </div>

             <hr className="border-gray-50" />

             {/* App Settings (Notification) */}
             <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">앱 설정</h4>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-brand-200 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isNotiEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            <i className={`fas ${isNotiEnabled ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-800">새 일자리 알림</div>
                            <div className="text-xs text-gray-500">신규 일자리가 등록되면 알림을 받습니다.</div>
                        </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <button 
                        onClick={handleNotificationToggle}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${isNotiEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                        role="switch"
                        aria-checked={isNotiEnabled}
                    >
                        <span className={`${isNotiEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm`}/>
                    </button>
                </div>
             </div>

             <hr className="border-gray-50" />

             {/* Documents Status */}
             <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">제출 서류 상태</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${profile.idCardImageUrl ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profile.idCardImageUrl ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                            <i className="fas fa-id-card"></i>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-500">신분증</div>
                            <div className={`text-sm font-bold ${profile.idCardImageUrl ? 'text-green-600' : 'text-gray-400'}`}>
                                {profile.idCardImageUrl ? '등록됨' : '미등록'}
                            </div>
                        </div>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${profile.safetyCertImageUrl ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profile.safetyCertImageUrl ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                            <i className="fas fa-hard-hat"></i>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-500">이수증</div>
                            <div className={`text-sm font-bold ${profile.safetyCertImageUrl ? 'text-green-600' : 'text-gray-400'}`}>
                                {profile.safetyCertImageUrl ? '등록됨' : '미등록'}
                            </div>
                        </div>
                    </div>
                </div>
             </div>

          </div>
       </div>
    </div>
  );
};

export default MyProfile;
