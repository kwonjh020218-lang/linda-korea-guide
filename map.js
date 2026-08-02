// ===== Linda's Korea Guide — map view (Leaflet + OSM) =====
const PRIMARY = [
  { key: "matcha", emoji: "🍵", label: "Matcha" },
  { key: "cafedessert", emoji: "🍰", label: "Cafe & Dessert" },
  { key: "restaurant", emoji: "🍽️", label: "Restaurant" },
  { key: "landmark", emoji: "🏛️", label: "Landmark" },
  { key: "shop", emoji: "🛍️", label: "Shop" },
  { key: "fashion", emoji: "👕", label: "Fashion" },
];
const GROUP_OF = {
  matcha: "matcha", dessert: "cafedessert", cafe: "cafedessert",
  sushi: "restaurant", japanese: "restaurant", chinese: "restaurant", korean: "restaurant",
  italian: "restaurant", ramen: "restaurant", steak: "restaurant", burger: "restaurant",
  brunch: "restaurant", mexican: "restaurant", thai: "restaurant", vietnamese: "restaurant", indian: "restaurant",
  landmark: "landmark", photo: "photo", shop: "shop", fashion: "fashion",
};
const EMOJI = {
  matcha: "🍵", dessert: "🍰", cafe: "☕", sushi: "🍣", japanese: "🍜", chinese: "🥢",
  korean: "🍲", italian: "🍝", landmark: "🏛️", photo: "📸", shop: "🛍️", fashion: "👕",
  ramen: "🍜", steak: "🥩", burger: "🍔", brunch: "🥐", mexican: "🌮", thai: "🥘", vietnamese: "🍜", indian: "🍛",
};
const CITY_CENTER = { seoul: [37.5563, 126.9723], busan: [35.1667, 129.0667], tokyo: [35.6762, 139.6503] };
const state = { city: "seoul", cats: new Set() };
let map, cluster, userMarker, userCircle;

const inCity = p => p.city === state.city || (state.city === "busan" && p.city === "gyeongju");
function matches(p) {
  if (!inCity(p)) return false;
  if (state.cats.size && !state.cats.has(GROUP_OF[p.category] || p.category)) return false;
  return true;
}
function coordOf(p) {
  if (p.lat != null && p.lng != null) return [p.lat, p.lng];
  const c = (typeof COORDS !== "undefined") && COORDS[p.id];
  return c ? [c.lat, c.lng] : null;
}
function mapsUrl(p) {
  let q;
  if (p.lat != null && p.lng != null) q = `${p.lat},${p.lng}`;
  else if (p.address) q = encodeURIComponent(`${p.name_kr || p.name} ${p.address}`);
  else q = encodeURIComponent([p.name, p.name_kr, p.area].filter(Boolean).join(" "));
  let url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (p.place_id) url += `&query_place_id=${p.place_id}`;
  return url;
}
function pinIcon(p) {
  return L.divIcon({ className: "", html: `<div class="pin-emoji">${EMOJI[p.category] || "📍"}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15] });
}
function popupHTML(p) {
  const ig = p.instagram ? `<a href="https://instagram.com/${p.instagram}" target="_blank" rel="noopener">Instagram</a> · ` : "";
  const tag = p.must_try ? ' ⭐' : "";
  return `<b>${EMOJI[p.category] || "📍"} ${p.name}${tag}</b><br>
    <span style="color:#888">${p.area}${p.price ? " · " + p.price : ""}</span><br>
    ${p.signature ? p.signature + "<br>" : ""}
    ${ig}<a href="${mapsUrl(p)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`;
}
let allPts = [];
// re-fit to the current filter/city, then render markers for the viewport
function draw() {
  allPts = PLACES.filter(matches).map(p => ({ p, c: coordOf(p) })).filter(x => x.c);
  if (allPts.length) map.fitBounds(allPts.map(x => x.c), { padding: [40, 40], maxZoom: 15 });
  else map.setView(CITY_CENTER[state.city], 12);
  renderMarkers();
}
// only build markers currently in view (huge win vs 1000+ markers up front)
function renderMarkers() {
  if (cluster) map.removeLayer(cluster);
  cluster = L.markerClusterGroup({ maxClusterRadius: 48, showCoverageOnHover: false, chunkedLoading: true });
  const b = map.getBounds().pad(0.4);
  let n = 0;
  for (const { p, c } of allPts) {
    if (!b.contains(c)) continue;
    cluster.addLayer(L.marker(c, { icon: pinIcon(p) }).bindPopup(popupHTML(p)));
    if (++n > 1500) break;
  }
  map.addLayer(cluster);
}
const setPressed = (btn, on) => btn.setAttribute("aria-pressed", on ? "true" : "false");
function buildChips() {
  const el = document.getElementById("category-chips");
  el.innerHTML = `<button class="chip" data-cat="" aria-pressed="true">All</button>` +
    PRIMARY.map(c => `<button class="chip" data-cat="${c.key}" aria-pressed="false">${c.emoji} ${c.label}</button>`).join("");
  el.addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const k = b.dataset.cat;
    if (k === "") state.cats.clear();
    else if (state.cats.has(k)) state.cats.delete(k);
    else state.cats.add(k);
    el.querySelectorAll(".chip").forEach(c => setPressed(c, c.dataset.cat === "" ? state.cats.size === 0 : state.cats.has(c.dataset.cat)));
    draw();
  });
}
function initTabs() {
  document.getElementById("city-tabs").addEventListener("click", e => {
    const b = e.target.closest(".tab"); if (!b) return;
    state.city = b.dataset.city;
    document.querySelectorAll("#city-tabs .tab").forEach(t => setPressed(t, t === b));
    draw();
  });
}
function initLocate() {
  document.getElementById("locate-btn").addEventListener("click", () => {
    if (!navigator.geolocation) { alert("Location isn't available on this device."); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (userMarker) map.removeLayer(userMarker);
      if (userCircle) map.removeLayer(userCircle);
      userCircle = L.circle(ll, { radius: 150, color: "#7a8b5a", fillColor: "#7a8b5a", fillOpacity: 0.15 }).addTo(map);
      userMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: `<div class="pin-emoji" style="border-color:#c0621f">📍</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map).bindPopup("You are here").openPopup();
      map.setView(ll, 15);
    }, () => alert("Couldn't get your location — please allow location access."), { enableHighAccuracy: true, timeout: 8000 });
  });
}

map = L.map("map", { zoomControl: true }).setView(CITY_CENTER.seoul, 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
let moveT; map.on("moveend", () => { clearTimeout(moveT); moveT = setTimeout(renderMarkers, 120); });
buildChips();
initTabs();
initLocate();
draw();
