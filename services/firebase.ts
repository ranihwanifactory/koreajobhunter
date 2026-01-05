
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Import storage utilities from firebase/storage
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDbGBNoj53CdufejFqmA5hsyK81EyWmGuA",
  authDomain: "koreajobhunter-2cb76.firebaseapp.com",
  databaseURL: "https://koreajobhunter-2cb76-default-rtdb.firebaseio.com",
  projectId: "koreajobhunter-2cb76",
  storageBucket: "koreajobhunter-2cb76.firebasestorage.app",
  messagingSenderId: "427949515852",
  appId: "1:427949515852:web:a3b700433b7ac764e880e9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export storage functions to be used centrally in components
export { ref, uploadBytesResumable, getDownloadURL };

/**
 * Safely retrieves the Firebase Messaging instance after checking browser support.
 * This prevents the "Service messaging is not available" error on unsupported environments.
 */
export const getMessagingInstance = async () => {
  try {
    if (typeof window !== 'undefined' && await isSupported()) {
      return getMessaging(app);
    }
  } catch (error) {
    console.warn("Firebase Messaging initialization failed or is not supported:", error);
  }
  return null;
};

export const googleProvider = new GoogleAuthProvider();
