// Bump this version string every time you deploy an update. It's the only thing that
// forces old caches to be thrown away — see CACHE_NAME usage below.
const CACHE_NAME = "yangon-taxi-fare-v10";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Assets that rarely change — safe to serve from cache first for speed.
const CACHE_FIRST_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  // Never cache map tiles / geocoding / routing / bus-data calls — always go to network.
  if (
    url.includes("tile.openstreetmap.org") ||
    url.includes("nominatim.openstreetmap.org") ||
    url.includes("router.project-osrm.org") ||
    url.includes("open-meteo.com") ||
    url.includes("opendevelopmentmekong.net") ||
    url.includes("opendevelopmentmyanmar.net") ||
    url.includes("opendevelopmentcambodia.net")
  ) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  const isCacheFirst = CACHE_FIRST_EXTENSIONS.some((ext) => url.endsWith(ext));

  if (isCacheFirst) {
    // Icons etc: cache first, fall back to network.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (req.method === "GET" && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // App shell (html/css/js): network first, so a deploy is picked up on the very next
  // load instead of waiting for the old cache to expire. Falls back to cache when
  // offline or the network request fails.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (req.method === "GET" && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
