// Service worker for AniLab PWA
// Strategy:
//   - HTML navigations: network-first (so new deploys are picked up immediately)
//   - JS/CSS chunks: network-first (prevents stale chunk errors after deploys)
//   - Static assets (images, fonts, manifest): cache-first
//   - API: always network (never cache)

const CACHE_NAME = "anilab-v3";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/app-icon.png",
  "/favicon.png",
  "/logo.svg",
];

// Install — cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean up ALL old caches (different cache name = full clean)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (images from CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // API: always network, never cache
  if (url.pathname.startsWith("/api/")) return;

  // HTML navigations: network-first
  // This ensures the user always gets the latest HTML, which references
  // the correct chunk filenames for the current deploy.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(() => {});
          });
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // JS/CSS chunks (_next/static): network-first
  // This prevents the "Failed to load chunk" error that happens when
  // a cached old HTML references a chunk that no longer exists on the server.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r))
    );
    return;
  }

  // Static assets (images, fonts, icons): cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone).catch(() => {});
              });
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
