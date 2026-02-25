/**
 * WSG Check — Service Worker (WSG 4.2: Optimise Browser Caching)
 *
 * Caching strategy:
 *   /_next/static/**   → cache-first   (immutable hashed assets)
 *   GET /api/check/:id → network-first, cache for offline fallback (max 50 entries)
 *   navigate requests  → network-first, fallback to cached page or '/' app shell
 *
 * This allows users to view previously loaded results pages offline and
 * reduces repeat-visit data transfer by serving cached static assets
 * without a network round-trip.
 */

const SHELL_CACHE = 'wsg-shell-v1'
const RESULTS_CACHE = 'wsg-results-v1'
const STATIC_CACHE = 'wsg-static-v1'

/** Maximum number of API result responses to keep in RESULTS_CACHE. */
const MAX_RESULTS_ENTRIES = 50

/** App-shell pages pre-cached at install time. */
const SHELL_PAGES = ['/', '/about', '/guidelines']

globalThis.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_PAGES))
      .then(() => globalThis.skipWaiting())
  )
})

globalThis.addEventListener('activate', (event) => {
  const current = new Set([SHELL_CACHE, RESULTS_CACHE, STATIC_CACHE])
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !current.has(k)).map((k) => caches.delete(k))))
      .then(() => globalThis.clients.claim())
  )
})

globalThis.addEventListener('fetch', (event) => {
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
    event.respondWith(networkFirstWithLimit(request, RESULTS_CACHE, MAX_RESULTS_ENTRIES))
    return
  }

  // Navigation requests → network-first, fallback to exact cached page then '/' shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithShellFallback(request))
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

/**
 * Network-first with a max-entries eviction policy.
 * After each successful cache.put(), prune the oldest entries so the cache
 * never exceeds `maxEntries` items.
 */
async function networkFirstWithLimit(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
      pruneCache(cache, maxEntries)
    }
    return response
  } catch {
    return (await cache.match(request)) ?? Response.error()
  }
}

/**
 * Network-first for navigation: on network failure fall back to the exact
 * cached page, then to the pre-cached '/' app shell so users always get
 * something meaningful rather than a browser error.
 */
async function networkFirstWithShellFallback(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) ?? (await cache.match('/')) ?? Response.error()
  }
}

/**
 * Prune the oldest cache entries once the cache exceeds `maxEntries`.
 * Keys are returned in insertion order by the Cache API.
 */
async function pruneCache(cache, maxEntries) {
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map((k) => cache.delete(k)))
  }
}
