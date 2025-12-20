
import { getMessagingInstance, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';

const VAPID_KEY = 'BP17zRZCPtZpUrt3XG1zeCW_1TF36fPljzaiuPAMBlVjUs-yUTTZwDUGYTYg7Jk3O__j8gxhlv1qfj2zAhBK3DU';

export const requestFcmToken = async (userId: string) => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    // 1. 알림 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('알림 권한이 거부되었습니다.');
      return;
    }

    // 2. 서비스 워커가 활성화될 때까지 대기 (FCM 필수 조건)
    let registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.error('서비스 워커를 찾을 수 없습니다.');
      return;
    }

    // 3. FCM 토큰 획득
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('푸시 토큰 획득 성공');
      
      // Firestore에 토큰 저장 (문서가 없을 경우를 위해 setDoc merge 사용)
      const userRef = doc(db, 'workers', userId);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken),
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });
      
      return currentToken;
    }
  } catch (err) {
    console.error('FCM 설정 실패:', err);
  }
};

export const onForegroundMessage = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('포그라운드 메시지 수신:', payload);
    // 이 정보는 App.tsx의 Toast UI에서 처리하도록 이벤트를 발생시키거나 상태를 공유할 수 있습니다.
  });
};
