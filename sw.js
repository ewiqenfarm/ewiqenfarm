// ============================================================
// 🌐 SERVICE WORKER — eWiqenFarm PWA
// Cache aset statis untuk offline support
// ============================================================

const CACHE_NAME = 'ewiqenfarm-v7-0-0';
const CACHE_ASSETS = [
  '/ewiqenfarm/',
  '/ewiqenfarm/index.html',
  '/ewiqenfarm/manifest.json',
  '/ewiqenfarm/icon-192.png',
  '/ewiqenfarm/icon-512.png'
];

// ============================================================
// INSTALL — Cache semua aset
// ============================================================
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(CACHE_ASSETS).catch(err => {
          console.warn('[SW] Some assets failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — Hapus cache lama
// ============================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Strategi network-first untuk API, cache-first untuk aset
// ============================================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip request Google Apps Script (harus online)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    return;
  }
  
  // Skip non-GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cache, update di background
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {});
          
          return cachedResponse;
        }
        
        // Tidak ada di cache → fetch network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache kalau 200 OK
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Kalau offline & tidak di cache → fallback ke index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// ============================================================
// MESSAGE — Handle message dari client
// ============================================================
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
