
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 1. Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyDbGBNoj53CdufejFqmA5hsyK81EyWmGuA",
  authDomain: "koreajobhunter-2cb76.firebaseapp.com",
  projectId: "koreajobhunter-2cb76",
  storageBucket: "koreajobhunter-2cb76.firebasestorage.app",
  messagingSenderId: "427949515852",
  appId: "1:427949515852:web:a3b700433b7ac764e880e9"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 2. 서비스 워커 설치 및 활성화 (PWA)
const CACHE_NAME = 'young-workforce-v10';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  event.waitUntil(self.clients.claim());
});

// 3. 배경 푸시 알림 수신기 (앱이 닫혀있을 때 핵심 로직)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 배경 알림 수신:', payload);
  
  const title = payload.notification?.title || payload.data?.title || '젊은인력 알림';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '새로운 메시지가 도착했습니다.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    tag: payload.data?.type || 'general-noti',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || './',
      linkId: payload.data?.linkId,
      type: payload.data?.type
    }
  };

  return self.registration.showNotification(title, notificationOptions);
});

// 4. 알림 클릭 시 동작
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let targetUrl = event.notification.data?.url || './';
  if (event.notification.data?.linkId) {
    const tab = event.notification.data.type === 'job' ? 'jobs' : 'home';
    targetUrl = `./?tab=${tab}&linkId=${event.notification.data.linkId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const fullTargetUrl = new URL(targetUrl, self.location.origin).href;
      
      // 이미 열려있는 창이 있으면 그 창을 포커스하고 이동
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(fullTargetUrl).then(c => c.focus());
        }
      }
      // 열린 창이 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
