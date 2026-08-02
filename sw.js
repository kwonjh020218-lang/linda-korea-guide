// Simple offline cache for the app shell + data (list page works offline).
const CACHE = "linda-korea-v4";
const ASSETS = [
  "./", "index.html", "style.css", "app.js", "data.js", "coords.js", "details.js",
  "store.js", "phrases.js", "phrasebook.js", "pwa.js",
  "mytrip.html", "mytrip.js", "map.html", "map.js",
  "vendor/leaflet.css", "vendor/leaflet.js",
  "vendor/MarkerCluster.css", "vendor/MarkerCluster.Default.css", "vendor/leaflet.markercluster.js",
  "manifest.webmanifest", "icon.svg",
];
self.addEventListener("install", e => {
  // cache:"reload" bypasses the browser HTTP cache so a new deploy precaches the
  // genuinely fresh files (not a stale style.css/app.js sitting in Safari's cache).
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(u =>
      fetch(new Request(u, { cache: "reload" })).then(r => r.ok && c.put(u, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
// Network-first: online → always fresh; offline → cached fallback.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // map tiles / fonts hit network
  // Fetch fresh from the network (bypassing the HTTP cache), re-cache, fall back to cache offline.
  e.respondWith(
    fetch(new Request(e.request.url, { cache: "no-cache" })).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
