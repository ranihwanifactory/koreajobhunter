
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDbGBNoj53CdufejFqmA5hsyK81EyWmGuA",
  authDomain: "koreajobhunter-2cb76.firebaseapp.com",
  projectId: "koreajobhunter-2cb76",
  storageBucket: "koreajobhunter-2cb76.firebasestorage.app",
  messagingSenderId: "427949515852",
  appId: "1:427949515852:web:a3b700433b7ac764e880e9"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

const CACHE_NAME = 'young-workforce-v12';
const urlsToCache = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => k !== CACHE_NAME && caches.delete(k)))));
  self.skipWaiting();
});

// 배경 메시지 처리 (앱이 닫혀있을 때)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || '젊은인력 알림';
  const options = {
    body: payload.notification?.body || payload.data?.body || '새로운 정보가 있습니다.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    data: payload.data
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data;
  let targetUrl = '/';
  
  if (data?.linkId) {
      targetUrl = `/?tab=${data.type === 'job' ? 'jobs' : 'home'}&linkId=${data.linkId}`;
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => c.navigate(targetUrl));
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
