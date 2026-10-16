// DniproXP — Production-Ready Service Worker
// Version: 1.0.0
// Epics: FE-PWA-01 / FE-PWA-02

const CACHE_NAME = 'dniproxp-app-shell-v1';
const IMAGES_CACHE = 'dniproxp-static-images-v1';
const FONTS_CACHE = 'dniproxp-fonts-v1';

// Precached app shell and essential assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/images/fallback.svg',
  '/images/community.jpg',
  '/images/nature.jpg',
  '/images/dogs.jpg',
  '/images/books.jpg'
];

// Install: precache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Continue install even if individual non-critical image fails in dev
        console.warn('[SW] Precache asset fetch notice:', err);
      });
    })
  );
  // Do not automatically skipWaiting; wait for user confirmation
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, IMAGES_CACHE, FONTS_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener for controlled updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event handler with strict security and caching policies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. NON-GET requests (mutations: POST, PUT, DELETE, PATCH):
  // NEVER cache, NO automatic replay queue without server sync, always NetworkOnly.
  if (request.method !== 'GET') {
    return;
  }

  // 2. Private API endpoints (/api/*, /v1/*, etc.):
  // NEVER cache authenticated responses, JWT, tokens, or personal passport/volunteer data.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/v1')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return standard network error response for API without caching
        return new Response(
          JSON.stringify({
            error: 'network_unavailable',
            message: 'Мережеве з’єднання тимчасово недоступне. Перевірте підключення до інтернету.',
            statusCode: 503
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 3. Static public images (/images/*, /pwa-*.png, /favicon.svg):
  // CacheFirst with Network fallback and cache update
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(IMAGES_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback image if image fails
          return caches.match('/images/fallback.svg');
        });
      })
    );
    return;
  }

  // 4. Web Fonts:
  // CacheFirst
  if (
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(FONTS_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. HTML Navigation requests (SPA pages):
  // NetworkFirst, falling back to cached App Shell (/index.html)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If valid response, cache the latest version of index.html
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached app shell
          const cachedShell = await caches.match('/index.html');
          if (cachedShell) {
            return cachedShell;
          }
          const cachedRoot = await caches.match('/');
          if (cachedRoot) {
            return cachedRoot;
          }
          return new Response(
            `<!DOCTYPE html>
            <html lang="uk">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>DniproXP — Офлайн</title>
                <style>
                  body { font-family: sans-serif; background: #faf9f5; color: #20362f; text-align: center; padding: 40px 20px; }
                  h1 { font-size: 1.8rem; margin-bottom: 12px; }
                  p { color: #65716b; max-width: 400px; margin: 0 auto 24px; line-height: 1.6; }
                  button { background: #268568; color: #fff; border: 0; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; }
                </style>
              </head>
              <body>
                <h1>Відсутнє з’єднання з інтернетом</h1>
                <p>DniproXP потребує підключення до мережі для актуальних квестів та синхронізації внесків.</p>
                <button onclick="window.location.reload()">Спробувати знову</button>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 6. Built JS/CSS bundles and other static assets:
  // Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

