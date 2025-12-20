
import { getMessagingInstance, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = 'BP17zRZCPtZpUrt3XG1zeCW_1TF36fPljzaiuPAMBlVjUs-yUTTZwDUGYTYg7Jk3O__j8gxhlv1qfj2zAhBK3DU';

export const requestFcmToken = async (userId: string) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (currentToken) {
      console.log('FCM Token acquired:', currentToken);
      // Store token in user's document for backend targeting
      const userRef = doc(db, 'workers', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(currentToken)
      });
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token.', err);
  }
};

export const onForegroundMessage = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Message received in foreground. ', payload);
  });
};
