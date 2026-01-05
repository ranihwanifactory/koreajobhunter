
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
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

    // 알림 권한 재요청
    if (next) {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission !== 'granted') {
        alert("알림 권한이 거부되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.");
        return;
      }
      // 권한 허용 시 토큰 갱신
      await requestFcmToken(user.uid);
    }

    try {
        await updateDoc(doc(db, 'workers', user.uid), {
            [`notificationSettings.${type}`]: next
        });
    } catch (e) { alert("업데이트 실패"); }
  };

  const checkRegistration = async () => {
    const permission = await Notification.requestPermission();
    setPushStatus(permission);
    if (permission === 'granted') {
      await requestFcmToken(user.uid);
      alert("푸시 알림 등록이 완료되었습니다.");
    }
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
                {profile?.name ? profile.name.charAt(0) : '👤'}
             </div>
             <div>
                <p className="font-bold text-lg">{profile?.name || '사용자'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
             </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">푸시 알림 상태</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pushStatus === 'granted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                      {pushStatus === 'granted' ? '활성화됨' : '비활성'}
                  </span>
              </div>
              {pushStatus !== 'granted' ? (
                  <button 
                    onClick={checkRegistration}
                    className="w-full bg-brand-600 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm"
                  >
                      알림 권한 허용 및 등록하기
                  </button>
              ) : (
                  <p className="text-[11px] text-slate-400">
                      <i className="fas fa-check-circle mr-1"></i>
                      현재 이 기기에서 앱을 닫아도 알림을 받을 수 있는 상태입니다.
                  </p>
              )}
          </div>

          <hr className="border-gray-100" />

          <div>
             <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">상세 구독 설정</h4>
             <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <div>
                      <p className="text-sm font-bold text-gray-800">일자리 알림</p>
                      <p className="text-[11px] text-gray-500">실시간 구인 공고 푸시 수신</p>
                   </div>
                   <button 
                    onClick={() => handleToggle('jobPostings')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.jobPostings ? 'bg-blue-600' : 'bg-gray-300'}`}
                   >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.jobPostings ? 'translate-x-6' : ''}`} />
                   </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <div>
                      <p className="text-sm font-bold text-gray-800">새로운 소식 및 공지</p>
                      <p className="text-[11px] text-gray-500">사무소 중요 소식 푸시 수신</p>
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
          
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
             <h5 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                <i className="fas fa-info-circle"></i> 아이폰(iOS) 사용자 주의사항
             </h5>
             <p className="text-[10px] text-amber-700 leading-normal">
                아이폰에서 앱을 닫은 상태로 알림을 받으려면 반드시 하단 공유 버튼을 눌러 <strong>'홈 화면에 추가'</strong>를 한 뒤, 홈 화면에 생성된 앱 아이콘으로 접속해야 합니다.
             </p>
          </div>
       </div>
    </div>
  );
};

export default MyProfile;
