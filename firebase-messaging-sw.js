
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 1. Firebase Initialization
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

// 2. PWA Caching Logic
const CACHE_NAME = 'young-workforce-v8';
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

self.addEventListener('fetch', (event) => {
  // Navigation request strategy: Network first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  
  // General static assets strategy: Cache first, then network
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

// 3. FCM Background Message Handler
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background Message Received:', payload);
  
  const title = payload.notification?.title || '젊은인력 알림';
  const options = {
    body: payload.notification?.body || '',
    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || './',
      linkId: payload.data?.linkId
    }
  };

  self.registration.showNotification(title, options);
});

// 4. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || './';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Create a full URL for comparison
      const fullTargetUrl = new URL(targetUrl, self.location.origin).href;
      
      // If a window is already open, focus it
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
