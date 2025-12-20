
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDbGBNoj53CdufejFqmA5hsyK81EyWmGuA",
  authDomain: "koreajobhunter-2cb76.firebaseapp.com",
  projectId: "koreajobhunter-2cb76",
  storageBucket: "koreajobhunter-2cb76.firebasestorage.app",
  messagingSenderId: "427949515852",
  appId: "1:427949515852:web:a3b700433b7ac764e880e9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
