self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupAndClaimClients());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
    return;
  }
  if (event.request.cache === "no-store") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname === "/pwa-version.json" || requestUrl.pathname === "/sw.js") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  if (STATIC_ASSET_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(handleStaticAssetRequest(event.request));
  }
});

const APP_SHELL_CACHE = "fatma-app-shell-v3";
const APP_SHELL_URL = "/";
const PRECACHE_URLS = [
  APP_SHELL_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];
const STATIC_ASSET_DESTINATIONS = new Set(["style", "script", "worker", "font", "image"]);

async function precacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  await cache.addAll(PRECACHE_URLS);
}

async function cleanupAndClaimClients() {
  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys
      .filter((cacheKey) => cacheKey !== APP_SHELL_CACHE)
      .map((cacheKey) => caches.delete(cacheKey)),
  );
  await self.clients.claim();
}

function isCacheableResponse(response) {
  return response.ok && (response.type === "basic" || response.type === "default");
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch {
    const cachedAppShell = await cache.match(APP_SHELL_URL);
    if (cachedAppShell) {
      return cachedAppShell;
    }
    throw new Error("Unable to load the app shell.");
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error(`Unable to load ${request.url}`);
}
