/**
 * WSG Check — Service Worker (WSG 4.2: Optimise Browser Caching)
 *
 * Caching strategy:
 *   /_next/static/**   → cache-first   (immutable hashed assets)
 *   GET /api/check/:id → network-first, cache for offline fallback
 *   navigate requests  → network-first, fallback to cached shell
 *
 * This allows users to view previously loaded results pages offline and
 * reduces repeat-visit data transfer by serving cached static assets
 * without a network round-trip.
 */

const SHELL_CACHE = 'wsg-shell-v1'
const RESULTS_CACHE = 'wsg-results-v1'
const STATIC_CACHE = 'wsg-static-v1'

/** App-shell pages pre-cached at install time. */
const SHELL_PAGES = ['/', '/about', '/guidelines']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_PAGES))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  const current = new Set([SHELL_CACHE, RESULTS_CACHE, STATIC_CACHE])
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !current.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin requests
  if (url.origin !== location.origin) return

  // Immutable hashed assets → cache-first (never stale)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // API result lookups → network-first, cache for offline fallback
  if (/^\/api\/check\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
    event.respondWith(networkFirst(request, RESULTS_CACHE))
    return
  }

  // Navigation requests → network-first, fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE))
    return
  }
})

/** Cache-first: serve from cache, populate cache on miss. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/** Network-first: try the network, fall back to cache when offline. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) ?? Response.error()
  }
}
