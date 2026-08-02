// My Trip — saved (want) & visited (been) with notes, grouped into day-by-area plans.
const EMOJI = {
  matcha: "🍵", dessert: "🍰", cafe: "☕", sushi: "🍣", japanese: "🍜", chinese: "🥢",
  korean: "🍲", italian: "🍝", landmark: "🏛️", photo: "📸", shop: "🛍️", fashion: "👕",
  ramen: "🍜", steak: "🥩", burger: "🍔", brunch: "🥐", mexican: "🌮", thai: "🥘", vietnamese: "🍜", indian: "🍛",
};
const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
function mapsUrl(p) {
  let q;
  if (p.lat != null && p.lng != null) q = `${p.lat},${p.lng}`;
  else if (p.address) q = encodeURIComponent(`${p.name_kr || p.name} ${p.address}`);
  else q = encodeURIComponent([p.name, p.name_kr, p.area].filter(Boolean).join(" "));
  let url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (p.place_id) url += `&query_place_id=${p.place_id}`;
  return url;
}
const esc = s => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tripCard(id, step) {
  const p = byId[id]; if (!p) return "";
  const rec = Trip.get(id) || {};
  return `
    <article class="trip-card" data-id="${id}">
      <div class="card__head">
        <h2 class="card__name">${step ? `<span class="plan-step">${step}</span>` : `<span class="card__emoji">${EMOJI[p.category] || "📍"}</span>`}${p.name}</h2>
        <button class="savebtn remove" data-act="remove" aria-label="Remove">✕</button>
      </div>
      <div class="meta"><span class="metachip">${p.area}</span>${p.price ? `<span class="metachip metachip--price">${p.price}</span>` : ""}</div>
      <textarea class="trip-note" data-id="${id}" rows="1" placeholder="Your note… (e.g. the matcha here is unreal)">${esc(rec.note)}</textarea>
      <div class="actions"><a class="btn-primary" href="${mapsUrl(p)}" target="_blank" rel="noopener">🗺️ Open in Maps</a></div>
    </article>`;
}
function section(title, ids) {
  if (!ids.length) return "";
  return `<p class="section-label">${title} (${ids.length})</p><div class="list">${ids.map(tripCard).join("")}</div>`;
}
// Plan view: group the "want to go" list by city -> neighbourhood so each area reads as a day.
const CITY_NAME = { seoul: "Seoul", busan: "Busan", gyeongju: "Gyeongju", tokyo: "Tokyo" };
const CITY_ORDER = ["seoul", "busan", "gyeongju", "tokyo"];

function coordOf(p) {
  if (p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng };
  const c = (typeof COORDS !== "undefined") && COORDS[p.id];
  return c ? { lat: c.lat, lng: c.lng } : null;
}
function haversineKm(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Order stops into a sensible walking sequence — nearest-neighbour from the northern-most point.
// ponytail: NN heuristic, not optimal TSP; fine for a handful of stops in one neighbourhood.
function routeOrder(ids) {
  const pts = ids.map(id => ({ id, c: coordOf(byId[id]) })).filter(x => x.c);
  const noCoord = ids.filter(id => !coordOf(byId[id]));
  if (pts.length < 2) return { ids, coords: null };
  let start = 0; pts.forEach((p, i) => { if (p.c.lat > pts[start].c.lat) start = i; });
  const used = Array(pts.length).fill(false), seq = [start]; used[start] = true;
  while (seq.length < pts.length) {
    const last = pts[seq[seq.length - 1]].c; let best = -1, bd = Infinity;
    pts.forEach((p, i) => { if (!used[i]) { const d = haversineKm(last, p.c); if (d < bd) { bd = d; best = i; } } });
    seq.push(best); used[best] = true;
  }
  return { ids: seq.map(i => pts[i].id).concat(noCoord), coords: seq.map(i => pts[i].c) };
}
function routeMapsUrl(coords) {
  const pts = coords.slice(0, 10); // Google Maps caps waypoints ~10
  const o = pts[0], d = pts[pts.length - 1];
  const wp = pts.slice(1, -1).map(c => `${c.lat},${c.lng}`).join("|");
  let u = `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}&travelmode=walking`;
  if (wp) u += `&waypoints=${encodeURIComponent(wp)}`;
  return u;
}
// straight-line km -> rough on-foot minutes (×1.3 detour, ~5 km/h)
const walkMin = km => Math.max(1, Math.round(km * 1.3 / 5 * 60));
function routeTotal(coords) {
  let km = 0; for (let i = 1; i < coords.length; i++) km += haversineKm(coords[i - 1], coords[i]);
  return { km, min: walkMin(km) };
}
function planSection(ids) {
  if (!ids.length) return "";
  const g = {};
  ids.forEach(id => { const p = byId[id], a = p.area || "Other"; ((g[p.city] = g[p.city] || {})[a] = g[p.city][a] || []).push(id); });
  const cities = CITY_ORDER.filter(c => g[c]);
  const nAreas = cities.reduce((s, c) => s + Object.keys(g[c]).length, 0);
  let html = `<p class="section-label">⭐ Want to go (${ids.length})</p>`;
  html += `<p class="plan-hint">${ids.length} spot${ids.length > 1 ? "s" : ""} across ${nAreas} neighbourhood${nAreas > 1 ? "s" : ""} — grouped so each area is an easy day out.</p>`;
  cities.forEach(c => {
    if (cities.length > 1) html += `<h3 class="plan-city">${CITY_NAME[c] || c}</h3>`;
    Object.keys(g[c]).sort().forEach(a => {
      const r = routeOrder(g[c][a]);
      const routeBtn = r.coords ? `<a class="route-btn" href="${routeMapsUrl(r.coords)}" target="_blank" rel="noopener" title="Walking route in order">🧭 Route</a>` : "";
      const tot = r.coords && r.coords.length > 1 ? routeTotal(r.coords) : null;
      const totLabel = tot ? `<span class="plan-area__tot">${tot.km.toFixed(1)} km · ${tot.min} min walk</span>` : "";
      html += `<div class="plan-area"><span class="plan-area__name">📍 ${a}</span><span class="plan-area__right">${totLabel}${routeBtn}<span class="plan-area__n">${g[c][a].length}</span></span></div>`;
      html += `<div class="list">${r.ids.map((id, i) => {
        const walk = r.coords && i > 0 && i < r.coords.length ? `<div class="walkstep">↓ ${walkMin(haversineKm(r.coords[i - 1], r.coords[i]))} min walk</div>` : "";
        return walk + tripCard(id, r.coords ? i + 1 : null);
      }).join("")}</div>`;
    });
  });
  return html;
}
function render() {
  const c = Trip.counts();
  document.getElementById("trip-stats").innerHTML =
    `<div class="stat"><b>${c.want}</b><span>want to go</span></div>` +
    `<div class="stat"><b>${c.been}</b><span>visited</span></div>` +
    `<div class="stat"><b>${c.want + c.been}</b><span>saved</span></div>`;
  const ids = Trip.ids().filter(id => byId[id]);
  const want = ids.filter(id => Trip.status(id) === "want");
  const been = ids.filter(id => Trip.status(id) === "been");
  const body = document.getElementById("trip-body");
  if (!ids.length) {
    body.innerHTML = `<p class="empty">Nothing saved yet.<br />Tap ♥ (want to go) or ✓ (been here) on any spot in the List. 🍵</p>`;
    return;
  }
  body.innerHTML = planSection(want) + section("✓ Visited", been) +
    (want.length + been.length < ids.length ? section("Noted", ids.filter(id => !Trip.status(id))) : "");
}

document.getElementById("trip-body").addEventListener("click", e => {
  const card = e.target.closest(".trip-card"); if (!card) return;
  const id = card.dataset.id;
  if (e.target.closest("[data-act=remove]")) { Trip.remove(id); render(); return; }
});

// Add a spot to the plan — search our curated places (no external API)
function addResults(q) {
  const el = document.getElementById("add-results");
  if (q.length < 2) { el.innerHTML = ""; return; }
  const ql = q.toLowerCase();
  const hits = PLACES.filter(p => !Trip.status(p.id) &&
    `${p.name} ${p.name_kr || ""} ${p.area || ""} ${CITY_NAME[p.city] || p.city}`.toLowerCase().includes(ql)).slice(0, 8);
  el.innerHTML = hits.length
    ? hits.map(p => `<button class="add-result" data-id="${p.id}"><span class="add-result__name">${EMOJI[p.category] || "📍"} ${p.name}</span><span class="add-result__area">${p.area || ""} · ${CITY_NAME[p.city] || p.city}</span></button>`).join("")
    : `<p class="add-empty">Not in the guide — send it to me and I'll add it. 🍵</p>`;
}
const addInput = document.getElementById("add-search");
if (addInput) {
  addInput.addEventListener("input", e => addResults(e.target.value.trim()));
  document.getElementById("add-results").addEventListener("click", e => {
    const b = e.target.closest(".add-result"); if (!b) return;
    Trip.toggle(b.dataset.id, "want");
    addInput.value = ""; addResults(""); addInput.focus();
    render();
  });
}
document.getElementById("trip-body").addEventListener("input", e => {
  const ta = e.target.closest(".trip-note"); if (!ta) return;
  Trip.setNote(ta.dataset.id, ta.value.trim());
});
render();
