// sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치됨');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화됨');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '새 알림';
  const options = {
    body: data.body || '새로운 메시지가 도착했습니다.',
    icon: data.icon || '/icon.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
