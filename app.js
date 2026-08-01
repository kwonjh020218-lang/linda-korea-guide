// ===== Linda's Korea Guide — render + filters =====

// Primary categories (top chip row)
const PRIMARY = [
  { key: "matcha",      emoji: "🍵", label: "Matcha" },
  { key: "cafedessert", emoji: "🍰", label: "Cafe & Dessert" },
  { key: "restaurant",  emoji: "🍽️", label: "Restaurant" },
  { key: "landmark",    emoji: "🏛️", label: "Landmark" },
  { key: "photo",       emoji: "📸", label: "Photo" },
  { key: "shop",        emoji: "🛍️", label: "Shop" },
  { key: "fashion",     emoji: "👕", label: "Fashion & Vintage" },
];

// Cuisine sub-filter (shown only when Restaurant is active)
const CUISINES = [
  { key: "korean",   emoji: "🍲", label: "Korean" },
  { key: "japanese", emoji: "🍣", label: "Japanese" },
  { key: "chinese",  emoji: "🥢", label: "Chinese" },
  { key: "western",  emoji: "🍝", label: "Western" },
];

// data.category -> primary group
const GROUP_OF = {
  matcha: "matcha",
  dessert: "cafedessert", cafe: "cafedessert",
  sushi: "restaurant", japanese: "restaurant", chinese: "restaurant",
  korean: "restaurant", italian: "restaurant",
  landmark: "landmark", photo: "photo", shop: "shop", fashion: "fashion",
};
// cuisine bucket -> which data.cuisine values belong to it
const CUISINE_MATCH = {
  korean:   c => c === "korean",
  japanese: c => c === "japanese",
  chinese:  c => c === "chinese",
  western:  c => c === "italian",
};

// per-card emoji (fine-grained by data.category)
const EMOJI = {
  matcha: "🍵", dessert: "🍰", cafe: "☕", sushi: "🍣", japanese: "🍜",
  chinese: "🥢", korean: "🍲", italian: "🍝", landmark: "🏛️", photo: "📸",
  shop: "🛍️", fashion: "👕",
};

// Paste My Maps embed URLs here to show an overview map per city (see README). "" = hidden.
const CITY_MAP = { seoul: "", busan: "" };

const state = { city: "seoul", cats: new Set(), cuisines: new Set(), top: false, pork: false, q: "", near: null };

// best-known coordinate for a place (exact from data, else geocoded from coords.js) — for distance only
function coordOf(p) {
  if (p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng };
  const c = (typeof COORDS !== "undefined") && COORDS[p.id];
  return c ? { lat: c.lat, lng: c.lng } : null;
}
function haversineKm(a, b) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// gyeongju places belong to the Busan tab
const inCity = p => p.city === state.city || (state.city === "busan" && p.city === "gyeongju");

function mapsUrl(p) {
  let q;
  if (p.lat != null && p.lng != null) q = `${p.lat},${p.lng}`;
  else if (p.address) q = encodeURIComponent(`${p.name_kr || p.name} ${p.address}`);
  else q = encodeURIComponent([p.name, p.name_kr, p.area].filter(Boolean).join(" "));
  let url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (p.place_id) url += `&query_place_id=${p.place_id}`;
  return url;
}

function matches(p) {
  if (!inCity(p)) return false;
  const group = GROUP_OF[p.category] || p.category;
  if (state.cats.size && !state.cats.has(group)) return false;
  if (state.cuisines.size) {
    if (group !== "restaurant") return false;
    if (![...state.cuisines].some(k => CUISINE_MATCH[k](p.cuisine))) return false;
  }
  if (state.top && !p.must_try) return false;
  if (state.pork && p.pork_lamb_free === false) return false;
  if (state.q) {
    const hay = `${p.name} ${p.name_kr} ${p.area}`.toLowerCase();
    if (!hay.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function cardHTML(p, dist) {
  const tags = [];
  if (dist != null && isFinite(dist)) {
    const label = dist < 1 ? Math.round(dist * 1000) + " m" : dist.toFixed(1) + " km";
    tags.push(`<span class="tag near">📍 ${label}</span>`);
  }
  if (p.spice > 0) {
    const hot = p.spice === 3 ? " hot" : "";
    tags.push(`<span class="tag spice${hot}">${"🌶️".repeat(p.spice)}${p.spice === 3 ? " very spicy!" : ""}</span>`);
  }
  if (p.pork_lamb_free === true)  tags.push(`<span class="tag good">No pork/lamb ✓</span>`);
  if (p.pork_lamb_free === false) tags.push(`<span class="tag amber">⚠ contains pork/lamb</span>`);
  if (p.photo_spot) tags.push(`<span class="tag photo">📸 Photo spot</span>`);
  if (p.station) tags.push(`<span class="tag info">🚇 ${p.station}</span>`);
  if (p.hours)   tags.push(`<span class="tag info">🕑 ${p.hours}</span>`);

  const ig = p.instagram
    ? `<a class="btn secondary" href="https://instagram.com/${p.instagram}" target="_blank" rel="noopener">Instagram</a>`
    : "";

  return `
    <article class="card">
      <div class="card-top">
        <span class="emoji">${EMOJI[p.category] || "📍"}</span>
        <h2>${p.name}</h2>
        ${p.must_try ? `<span class="badge">⭐ Top Pick</span>` : ""}
      </div>
      <div class="meta">
        <span class="pill">${p.area}</span>
        ${p.price ? `<span class="pill">${p.price}</span>` : ""}
      </div>
      <div class="signature">${p.signature}</div>
      <div class="blurb">${p.blurb}</div>
      <div class="tags">${tags.join("")}</div>
      <div class="actions">
        <a class="btn primary" href="${mapsUrl(p)}" target="_blank" rel="noopener">Open in Google Maps</a>
        ${ig}
      </div>
    </article>`;
}

function render() {
  const el = document.getElementById("cards");
  let items = PLACES.filter(matches).map(p => ({ p, d: null }));
  if (state.near) {
    items = items
      .map(x => { const c = coordOf(x.p); return { p: x.p, d: c ? haversineKm(state.near, c) : Infinity }; })
      .sort((a, b) => a.d - b.d);
  }
  el.innerHTML = items.length
    ? items.map(x => cardHTML(x.p, x.d)).join("")
    : `<div class="empty">No spots match these filters yet.<br />Try clearing a filter. 🍵</div>`;

  document.getElementById("near-note").hidden = !state.near;

  const wrap = document.getElementById("map-wrap");
  const src = CITY_MAP[state.city];
  if (src) { document.getElementById("overview-map").src = src; wrap.hidden = false; }
  else { wrap.hidden = true; }
}

function syncChips(el, isActive) {
  el.querySelectorAll(".chip").forEach(c => {
    const k = c.dataset.cat;
    c.classList.toggle("active", k === "" ? isActive(null) : isActive(k));
  });
}

function buildChips() {
  const el = document.getElementById("category-chips");
  el.innerHTML = `<button class="chip active" data-cat="">All</button>` +
    PRIMARY.map(c => `<button class="chip" data-cat="${c.key}">${c.emoji} ${c.label}</button>`).join("");

  const sub = document.getElementById("cuisine-chips");
  sub.innerHTML = `<span class="sub-label">Cuisine:</span>` +
    CUISINES.map(c => `<button class="chip" data-cat="${c.key}">${c.emoji} ${c.label}</button>`).join("");

  el.addEventListener("click", e => {
    const btn = e.target.closest(".chip"); if (!btn) return;
    const cat = btn.dataset.cat;
    if (cat === "") state.cats.clear();
    else if (state.cats.has(cat)) state.cats.delete(cat);
    else state.cats.add(cat);
    if (!state.cats.has("restaurant")) state.cuisines.clear();
    sub.hidden = !state.cats.has("restaurant");
    syncChips(el, k => k === null ? state.cats.size === 0 : state.cats.has(k));
    syncChips(sub, k => state.cuisines.has(k));
    render();
  });

  sub.addEventListener("click", e => {
    const btn = e.target.closest(".chip"); if (!btn) return;
    const k = btn.dataset.cat;
    if (state.cuisines.has(k)) state.cuisines.delete(k); else state.cuisines.add(k);
    syncChips(sub, key => state.cuisines.has(key));
    render();
  });
}

function wireControls() {
  document.getElementById("city-tabs").addEventListener("click", e => {
    const btn = e.target.closest(".tab"); if (!btn) return;
    state.city = btn.dataset.city;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === btn));
    render();
  });
  document.getElementById("toggle-top").addEventListener("change", e => { state.top = e.target.checked; render(); });
  document.getElementById("toggle-pork").addEventListener("change", e => { state.pork = e.target.checked; render(); });
  document.getElementById("search").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });

  const nearBtn = document.getElementById("toggle-near");
  nearBtn.addEventListener("click", () => {
    if (state.near) { state.near = null; nearBtn.classList.remove("active"); nearBtn.textContent = "📍 Near me"; render(); return; }
    if (!navigator.geolocation) { alert("Location isn't available on this device."); return; }
    nearBtn.textContent = "📍 Locating…";
    navigator.geolocation.getCurrentPosition(
      pos => { state.near = { lat: pos.coords.latitude, lng: pos.coords.longitude }; nearBtn.classList.add("active"); nearBtn.textContent = "📍 Near me ✓"; render(); },
      () => { nearBtn.textContent = "📍 Near me"; alert("Couldn't get your location — please allow location access in your browser."); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

buildChips();
wireControls();
render();
