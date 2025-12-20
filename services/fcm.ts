
import { getMessagingInstance, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = 'BP17zRZCPtZpUrt3XG1zeCW_1TF36fPljzaiuPAMBlVjUs-yUTTZwDUGYTYg7Jk3O__j8gxhlv1qfj2zAhBK3DU';

export const requestFcmToken = async (userId: string) => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
        console.warn('푸시 알림이 지원되지 않는 환경입니다.');
        return;
    }

    // 1. 알림 권한 확인
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('알림 권한이 거부되었습니다.');
      return;
    }

    // 2. 서비스 워커 등록 확인
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.error('서비스 워커가 등록되지 않았습니다.');
      return;
    }

    // 3. FCM 토큰 획득
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM 토큰 갱신 성공');
      // Firestore 저장
      const userRef = doc(db, 'workers', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(currentToken),
        lastTokenUpdate: new Date().toISOString()
      }).catch(async (e) => {
          // 문서가 없는 경우 등 에러 처리 (필요시 setDoc)
          console.warn('토큰 저장 실패 (프로필 정보 없음):', e.message);
      });
      return currentToken;
    }
  } catch (err) {
    console.error('FCM 토큰 획득 중 오류:', err);
  }
};

export const onForegroundMessage = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('포그라운드 알림 수신:', payload);
    // App.tsx에서 전역 토스트로 처리됨
  });
};
