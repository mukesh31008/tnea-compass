// TNEA Compass Service Worker
const CACHE_NAME = "tnea-compass-v1";
const PRECACHE_ASSETS = [
  "/",
  "/colleges",
  "/cutoffs",
  "/predictor",
  "/compare",
  "/choices",
  "/simulator",
  "/resources",
  "/about",
  "/privacy",
  "/terms",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip auth/api mutating endpoints
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/auth") ||
    event.request.url.includes("/api/account")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for navigational / static content
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // If navigating to an HTML page and offline, return the cached homepage or choice list
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/choices");
          if (fallback) return fallback;
        }
        return new Response("Offline · TNEA Compass", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }),
  );
});
