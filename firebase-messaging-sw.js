
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

// 1. PWA 캐싱 및 설치 전략
const CACHE_NAME = 'young-workforce-v15';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.skipWaiting();
});

// 2. 배경 메시지 처리 (앱이 완전히 닫혀있을 때 작동)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 배경 푸시 수신:', payload);
  
  const title = payload.notification?.title || payload.data?.title || '젊은인력 새 알림';
  const options = {
    body: payload.notification?.body || payload.data?.body || '새로운 정보가 등록되었습니다.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/',
      linkId: payload.data?.linkId,
      type: payload.data?.type
    }
  };

  return self.registration.showNotification(title, options);
});

// 3. 알림 클릭 시 앱 열기 및 페이지 이동
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  
  const data = e.notification.data;
  let targetUrl = '/';
  if (data?.linkId) {
      const tab = data.type === 'job' ? 'jobs' : 'home';
      targetUrl = `/?tab=${tab}&linkId=${data.linkId}`;
  } else if (data?.url) {
      targetUrl = data.url;
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const fullTargetUrl = new URL(targetUrl, self.location.origin).href;
      
      // 이미 열려있는 창이 있으면 포커스 후 이동
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => c.navigate(fullTargetUrl));
        }
      }
      // 열린 창이 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
