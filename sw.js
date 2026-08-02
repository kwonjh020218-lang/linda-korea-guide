// Simple offline cache for the app shell + data (list page works offline).
const CACHE = "linda-korea-v3";
const ASSETS = [
  "./", "index.html", "style.css", "app.js", "data.js", "coords.js", "details.js",
  "store.js", "phrases.js", "phrasebook.js", "pwa.js",
  "mytrip.html", "mytrip.js", "map.html", "map.js",
  "vendor/leaflet.css", "vendor/leaflet.js",
  "vendor/MarkerCluster.css", "vendor/MarkerCluster.Default.css", "vendor/leaflet.markercluster.js",
  "manifest.webmanifest", "icon.svg",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
