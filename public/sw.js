// Phase 3A: Minimal Service Worker - App Shell Only
// This service worker caches ONLY the app shell (HTML, CSS, JS bundles)
// It does NOT cache API responses, auth tokens, or any dynamic data
// This enables installability and fast shell load without offline complexity
//
// NOTE: In production, Vite builds assets with hashed filenames (e.g., index-abc123.js)
// The service worker will cache these automatically when they are requested.
// We don't need to pre-cache specific filenames since they change with each build.

// Phase 3C: Cache versioning for clean updates
const CACHE_NAME = 'shared-minds-shell-v2';
// Note: Cache name is static - service worker updates handle cache invalidation
// Shell files to pre-cache (static assets that don't change)
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Phase 3A: Install - Cache app shell only
// Phase 9: Don't skipWaiting immediately - wait for user confirmation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only cache shell files, not API responses
      return cache.addAll(SHELL_FILES).catch((err) => {
        // If any file fails to cache, log but don't fail installation
        console.warn('Service worker: Some shell files failed to cache', err);
      });
    })
  );
  // Phase 9: Don't activate immediately - wait for user to confirm update
  // Service worker will wait until user clicks "Update now" button
  // self.skipWaiting(); // Commented out - will be called on user confirmation
});

// Phase 3A: Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Phase 3A: Fetch - Network-first for everything, fallback to cache for shell only
// Phase 8B: Enhanced navigation handling for SPA routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Phase 8B: Handle navigation requests (page loads, refreshes, deep links)
  // Always serve index.html for navigation requests to ensure SPA routing works
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Phase 8B: If response is 404 or error, serve cached index.html
          if (!response.ok || response.status === 404) {
            return caches.match('/index.html').then((cachedIndex) => {
              if (cachedIndex) {
                return cachedIndex;
              }
              // Fallback: try to fetch index.html from network
              return fetch('/index.html').catch(() => {
                return new Response('App shell not available', { status: 503 });
              });
            });
          }
          // Phase 8B: Cache successful navigation responses (index.html)
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, serve cached index.html
          return caches.match('/index.html').then((cachedIndex) => {
            if (cachedIndex) {
              return cachedIndex;
            }
            // Last resort: return offline message
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return; // Don't process navigation requests further
  }

  // Phase 11: Never cache API requests or auth endpoints - ensure they always go to network
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.hostname.includes('vercel') ||
    request.method !== 'GET'
  ) {
    // Always go to network for API/auth, no caching, no service worker interference
    // Explicitly handle these requests to prevent service worker from interfering
    event.respondWith(
      fetch(request).catch((error) => {
        // If network fails, return error - don't serve stale cache for API calls
        console.error('[Service Worker] API request failed:', error);
        return new Response(
          JSON.stringify({ error: 'Network error', offline: true }),
          { 
            status: 503, 
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // For shell files (HTML, CSS, JS), try network first, fallback to cache
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Phase 8B: Never cache 404 responses
          if (response.status === 404) {
            // For 404s on shell files, try index.html as fallback
            if (request.destination === 'document') {
              return caches.match('/index.html').then((cachedIndex) => {
                return cachedIndex || response;
              });
            }
            return response;
          }
          // If network succeeds, cache the response for future use
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Phase 8B: For document requests, fallback to index.html
            if (request.destination === 'document') {
              return caches.match('/index.html').then((cachedIndex) => {
                return cachedIndex || new Response('Offline', { status: 503 });
              });
            }
            // If no cache, return a basic offline page (optional)
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
  // For all other requests (images, fonts, etc.), use network only, no caching
});

// Phase 9: Listen for skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

