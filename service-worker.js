// Bump this version string every time you deploy an update. It's the only thing that
// forces old caches to be thrown away — see CACHE_NAME usage below.
const CACHE_NAME = "yangon-taxi-fare-v14";

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
    url.includes("photon.komoot.io") ||
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

  // App shell (html/css/js, and third-party libs like Leaflet/fonts): stale-while-
  // revalidate — answer instantly from cache if we have it (so the app opens fast even
  // on a slow connection), then quietly fetch a fresh copy in the background so the
  // NEXT open already has the update. First-ever load (nothing cached yet) still waits
  // on the network, same as before.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (req.method === "GET" && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);

      // Keep the background revalidation alive even after we've already responded
      // from cache, so the updated copy is actually saved for next time.
      if (cached) event.waitUntil(networkFetch);

      return cached || networkFetch;
    })
  );
});
