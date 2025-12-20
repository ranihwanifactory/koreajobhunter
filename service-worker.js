
const CACHE_NAME = 'young-workforce-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(event.request).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// Push Event Listener for Background Notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    const payload = event.data.json();
    const options = {
      body: payload.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      vibrate: [100, 50, 100],
      data: {
        url: payload.url || '/',
        linkId: payload.linkId
      }
    };
    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
    .then(function(clientList) {
      // If there is an open window, focus it and navigate
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
