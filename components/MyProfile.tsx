
import React, { useState, useEffect } from 'react';
// Fix: Use type-only import for User from firebase/auth
import { type User } from 'firebase/auth';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { WorkerProfile } from '../types';
import RegistrationForm from './RegistrationForm';
import { requestFcmToken } from '../services/fcm';

interface MyProfileProps {
  user: User;
}

const MyProfile: React.FC<MyProfileProps> = ({ user }) => {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default'>(Notification.permission);

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

    if (next) {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission !== 'granted') {
        alert("알림 권한이 거부되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.");
        return;
      }
      await requestFcmToken(user.uid);
    }

    try {
        await updateDoc(doc(db, 'workers', user.uid), {
            [`notificationSettings.${type}`]: next
        });
    } catch (e) { alert("업데이트 실패"); }
  };

  if (loading) return <div className="p-20 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-2xl"></i></div>;
  if (isEditing) return <RegistrationForm user={user} onCancel={() => setIsEditing(false)} onSuccess={() => setIsEditing(false)} />;

  const settings = profile?.notificationSettings || { jobPostings: true, notices: true };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto pb-10 space-y-6">
       <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header Cover */}
          <div className="h-32 bg-gradient-to-r from-brand-600 to-indigo-700 relative">
             <button 
                onClick={() => setIsEditing(true)} 
                className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/30 transition-all"
             >
                <i className="fas fa-edit mr-1"></i> 정보 수정
             </button>
          </div>
          
          <div className="px-8 pb-8">
             <div className="relative -mt-12 flex flex-col items-center">
                <div className="w-24 h-24 bg-white p-1 rounded-3xl shadow-xl">
                    <div className="w-full h-full bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center font-extrabold text-4xl">
                        {profile?.name ? profile.name.charAt(0) : '👤'}
                    </div>
                </div>
                <h2 className="mt-4 text-2xl font-black text-gray-900">{profile?.name || '사용자'}</h2>
                <p className="text-gray-500 text-sm font-medium">{user.email}</p>
                <p className="mt-2 text-brand-600 font-bold bg-brand-50 px-4 py-1 rounded-full text-xs">
                    {profile?.phone || '연락처 없음'}
                </p>
             </div>

             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">나의 주소</p>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <i className="fas fa-map-marker-alt text-brand-500"></i>
                        {profile?.location?.addressString || '주소 정보가 없습니다.'}
                    </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">희망 업무</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {profile?.desiredJobs?.length ? profile.desiredJobs.map(job => (
                            <span key={job} className="text-[10px] font-bold bg-white text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">{job}</span>
                        )) : <span className="text-xs text-gray-400">설정된 업무가 없습니다.</span>}
                    </div>
                </div>
             </div>

             <div className="mt-6 space-y-4">
                <h4 className="text-sm font-bold text-gray-800 px-1">제출 서류 현황</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[10px] font-bold text-gray-400 mb-2">주민등록증</p>
                        {profile?.idCardImageUrl ? (
                            <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
                                <img src={profile.idCardImageUrl} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="aspect-[4/3] rounded-xl bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                                <i className="fas fa-camera text-gray-300"></i>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[10px] font-bold text-gray-400 mb-2">건설이수증</p>
                        {profile?.safetyCertImageUrl ? (
                            <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
                                <img src={profile.safetyCertImageUrl} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="aspect-[4/3] rounded-xl bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                                <i className="fas fa-hard-hat text-gray-300"></i>
                            </div>
                        )}
                    </div>
                </div>
             </div>

             <div className="mt-8 space-y-4">
                <h4 className="text-sm font-bold text-gray-800 px-1">알림 설정</h4>
                <div className="divide-y divide-gray-100 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm font-bold text-gray-800">일자리 알림</p>
                            <p className="text-[10px] text-gray-500">새 일자리 등록 시 실시간 알림 수신</p>
                        </div>
                        <button 
                            onClick={() => handleToggle('jobPostings')}
                            className={`relative w-12 h-6 rounded-full transition-colors ${settings.jobPostings ? 'bg-brand-600' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.jobPostings ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm font-bold text-gray-800">사무소 공지</p>
                            <p className="text-[10px] text-gray-500">전체 공지사항 푸시 수신</p>
                        </div>
                        <button 
                            onClick={() => handleToggle('notices')}
                            className={`relative w-12 h-6 rounded-full transition-colors ${settings.notices ? 'bg-brand-600' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.notices ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>
             </div>
          </div>
       </div>

       <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
             <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div>
             <h5 className="font-bold text-amber-900 text-sm mb-1">안전한 정보 관리 안내</h5>
             <p className="text-xs text-amber-800 leading-relaxed">
                첨부하신 신분증과 이수증은 암호화되어 안전하게 보관됩니다. 현장 배치 시 본인 확인 용도로만 사용되며, 언제든지 직접 수정하거나 탈퇴 시 즉시 파기됩니다.
             </p>
          </div>
       </div>
    </div>
  );
};

export default MyProfile;
