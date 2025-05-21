// Service Worker for OxMail PWA

const CACHE_NAME = 'oxmail-cache-v1';
const OFFLINE_URL = '/index.html';

// Assets to cache immediately when the service worker is installed
const ASSETS_TO_CACHE = [
  // HTML
  '/index.html',
  
  // CSS
  '/css/style.css',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/admin.css',
  
  // JS
  '/js/firebase-config.js',
  '/js/i18n.js',
  '/js/ui-utils.js',
  '/js/email-service.js',
  '/js/payment.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/admin.js',
  '/js/app.js',
  
  // Language files
  '/lang/en.json',
  '/lang/fr.json',
  '/lang/es.json',
  
  // Manifest
  '/manifest.json',
  
  // External resources
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/ionicons/5.5.2/collection/components/icon/assets/logo.svg',
  
  // Offline fallback
  OFFLINE_URL
];

// Install event - cache assets for offline use
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - return cached responses when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Firebase/external API requests
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('apis.davidcyriltech.my.id') ||
    event.request.url.includes('paystack.co')
  ) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        
        // If not cached, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Return the original response if it's not valid for caching
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();
            
            // Cache the fetched resource
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If fetch fails (offline), return the offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'New message in your inbox',
    icon: 'https://cdnjs.cloudflare.com/ajax/libs/ionicons/5.5.2/collection/components/icon/assets/logo.svg',
    badge: 'https://cdnjs.cloudflare.com/ajax/libs/ionicons/5.5.2/collection/components/icon/assets/logo.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'OxMail Notification', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // If a window client is already open, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});
