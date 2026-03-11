const CACHE_VERSION = 'v2';
const STATIC_CACHE = `jupa-static-${CACHE_VERSION}`;
const DATA_CACHE = `jupa-data-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/completo',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/LOGO-JUPA.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, DATA_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isRscRequest = url.searchParams.has('_rsc')
    || request.headers.get('accept')?.includes('text/x-component')
    || request.headers.get('rsc') === '1';

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/examen/') && isRscRequest) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (
    request.destination === 'document' ||
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.startsWith('/examen/') ||
    url.pathname.startsWith('/completo')
  ) {
    event.respondWith(networkFirst(request, STATIC_CACHE, { normalizePathname: true }));
    return;
  }

  if (
    url.pathname.startsWith('/api/offline/cache-manifest') ||
    url.pathname.startsWith('/api/exams') ||
    url.pathname.startsWith('/api/schools')
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'manifest'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

async function networkFirst(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cacheKey = getCacheKey(request, options);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(cacheKey, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      const fallback = await cache.match('/');
      if (fallback) {
        return fallback;
      }
    }

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

function getCacheKey(request, options = {}) {
  const url = new URL(request.url);

  if (options.normalizePathname && url.pathname.startsWith('/examen/')) {
    return new Request(`${url.origin}${url.pathname}?__offline_shell=1`);
  }

  if (options.normalizePathname && request.mode === 'navigate') {
    return new Request(`${url.origin}${url.pathname}?__offline_shell=1`);
  }

  return request;
}
