// Jewelry Authority Fleet — Service Worker
// Strategy:
//   /api/*        → network only (always fresh data, no caching)
//   navigate      → network first, fall back to cached shell
//   static assets → cache first, network fallback + background update

const CACHE = 'ja-fleet-v1';
const SHELL  = ['/'];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests entirely
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls — network only, never intercept
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (HTML pages) — network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets — cache first; on miss fetch + cache
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
