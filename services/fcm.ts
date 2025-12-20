
import { getMessagingInstance, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = 'BP17zRZCPtZpUrt3XG1zeCW_1TF36fPljzaiuPAMBlVjUs-yUTTZwDUGYTYg7Jk3O__j8gxhlv1qfj2zAhBK3DU';

export const requestFcmToken = async (userId: string) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  try {
    // 1. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }

    // 2. Wait for Service Worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // 3. Get FCM Token
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM Token acquired successfully');
      // 4. Update Firestore with the token
      const userRef = doc(db, 'workers', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(currentToken),
        lastTokenUpdate: new Date().toISOString()
      });
      return currentToken;
    } else {
      console.warn('No registration token available.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving FCM token.', err);
  }
};

export const onForegroundMessage = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    // Display a custom UI toast if needed
  });
};
