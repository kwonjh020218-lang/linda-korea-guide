// ===== Linda's Korea Guide — render + filters (v0 design) =====
const PRIMARY = [
  { key: "matcha",      emoji: "🍵", label: "Matcha" },
  { key: "cafedessert", emoji: "🍰", label: "Cafe & Dessert" },
  { key: "restaurant",  emoji: "🍽️", label: "Restaurant" },
  { key: "landmark",    emoji: "🏛️", label: "Landmark" },
  { key: "shop",        emoji: "🛍️", label: "Shop" },
  { key: "fashion",     emoji: "👕", label: "Fashion & Vintage" },
];
const CUISINES = [
  { key: "korean",   emoji: "🍲", label: "Korean" },
  { key: "japanese", emoji: "🍣", label: "Japanese" },
  { key: "chinese",  emoji: "🥢", label: "Chinese" },
  { key: "western",  emoji: "🍝", label: "Western" },
  { key: "global",   emoji: "🌍", label: "Global" },
];
const GROUP_OF = {
  matcha: "matcha", dessert: "cafedessert", cafe: "cafedessert",
  sushi: "restaurant", japanese: "restaurant", chinese: "restaurant", korean: "restaurant",
  italian: "restaurant", ramen: "restaurant", steak: "restaurant", burger: "restaurant",
  brunch: "restaurant", mexican: "restaurant", thai: "restaurant", vietnamese: "restaurant", indian: "restaurant",
  landmark: "landmark", photo: "photo", shop: "shop", fashion: "fashion",
};
const CUISINE_MATCH = {
  korean: c => c === "korean", japanese: c => c === "japanese", chinese: c => c === "chinese",
  western: c => c === "italian" || c === "western", global: c => c === "global",
};
const EMOJI = {
  matcha: "🍵", dessert: "🍰", cafe: "☕", sushi: "🍣", japanese: "🍜", chinese: "🥢",
  korean: "🍲", italian: "🍝", landmark: "🏛️", photo: "📸", shop: "🛍️", fashion: "👕",
  ramen: "🍜", steak: "🥩", burger: "🍔", brunch: "🥐", mexican: "🌮", thai: "🥘", vietnamese: "🍜", indian: "🍛",
};

const state = { city: "seoul", cats: new Set(), cuisines: new Set(), top: false, pork: false, q: "", near: null };
const inCity = p => p.city === state.city || (state.city === "busan" && p.city === "gyeongju");

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
    tags.push(`<span class="tag tag--dist">📍 ${label}</span>`);
  }
  if (p.spice > 0) tags.push(`<span class="tag${p.spice === 3 ? " tag--warn" : ""}">${"🌶️".repeat(p.spice)}${p.spice === 3 ? " very spicy!" : ""}</span>`);
  if (p.pork_lamb_free === true)  tags.push(`<span class="tag tag--ok">No pork/lamb ✓</span>`);
  if (p.pork_lamb_free === false) tags.push(`<span class="tag tag--warn">⚠ contains pork/lamb</span>`);
  if (p.photo_spot) tags.push(`<span class="tag tag--photo">📸 Photo spot</span>`);
  if (p.station && p.station !== "see map") tags.push(`<span class="tag">🚇 ${p.station}</span>`);
  if (p.hours) tags.push(`<span class="tag">🕑 ${p.hours}</span>`);
  const ig = p.instagram
    ? `<a class="btn-ig" href="https://instagram.com/${p.instagram}" target="_blank" rel="noopener">Instagram</a>` : "";
  return `
    <article class="card${p.must_try ? " card--top" : ""}">
      <div class="card__head">
        <h2 class="card__name"><span class="card__emoji" aria-hidden="true">${EMOJI[p.category] || "📍"}</span>${p.name}</h2>
        ${p.must_try ? `<span class="badge-top">⭐ Top Pick</span>` : ""}
      </div>
      <div class="meta">
        <span class="metachip">${p.area}</span>
        ${p.price ? `<span class="metachip metachip--price">${p.price}</span>` : ""}
      </div>
      <p class="card__sig">${p.signature}</p>
      <p class="card__blurb">${p.blurb}</p>
      ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
      <div class="actions">
        <a class="btn-primary" href="${mapsUrl(p)}" target="_blank" rel="noopener">Open in Google Maps</a>
        ${ig}
      </div>
    </article>`;
}

function render() {
  const el = document.getElementById("cards");
  let items = PLACES.filter(matches).map(p => ({ p, d: null }));
  if (state.near) {
    items = items.map(x => { const c = coordOf(x.p); return { p: x.p, d: c ? haversineKm(state.near, c) : Infinity }; })
      .sort((a, b) => a.d - b.d);
  }
  el.innerHTML = items.length
    ? items.map(x => cardHTML(x.p, x.d)).join("")
    : `<p class="empty">No spots match these filters yet.<br />Try clearing one. 🍵</p>`;
  document.getElementById("near-note").hidden = !state.near;
  const cityTotal = PLACES.filter(inCity).length;
  document.getElementById("results-count").textContent = `Showing ${items.length} of ${cityTotal} hand-picked spots`;
}

const setPressed = (btn, on) => btn.setAttribute("aria-pressed", on ? "true" : "false");

function buildChips() {
  const el = document.getElementById("category-chips");
  el.innerHTML = `<button class="chip" data-cat="" aria-pressed="true">All</button>` +
    PRIMARY.map(c => `<button class="chip" data-cat="${c.key}" aria-pressed="false">${c.emoji} ${c.label}</button>`).join("");
  const sub = document.getElementById("cuisine-chips");
  sub.innerHTML = CUISINES.map(c => `<button class="chip" data-cat="${c.key}" aria-pressed="false">${c.emoji} ${c.label}</button>`).join("");
  const wrap = document.getElementById("cuisine-wrap");

  el.addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const cat = b.dataset.cat;
    if (cat === "") state.cats.clear();
    else if (state.cats.has(cat)) state.cats.delete(cat);
    else state.cats.add(cat);
    if (!state.cats.has("restaurant")) state.cuisines.clear();
    wrap.classList.toggle("is-open", state.cats.has("restaurant"));
    el.querySelectorAll(".chip").forEach(c => setPressed(c, c.dataset.cat === "" ? state.cats.size === 0 : state.cats.has(c.dataset.cat)));
    sub.querySelectorAll(".chip").forEach(c => setPressed(c, state.cuisines.has(c.dataset.cat)));
    render();
  });
  sub.addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const k = b.dataset.cat;
    if (state.cuisines.has(k)) state.cuisines.delete(k); else state.cuisines.add(k);
    sub.querySelectorAll(".chip").forEach(c => setPressed(c, state.cuisines.has(c.dataset.cat)));
    render();
  });
}

function wireControls() {
  document.getElementById("city-tabs").addEventListener("click", e => {
    const b = e.target.closest(".tab"); if (!b) return;
    state.city = b.dataset.city;
    document.querySelectorAll("#city-tabs .tab").forEach(t => setPressed(t, t === b));
    render();
  });
  document.getElementById("toggle-top").addEventListener("change", e => { state.top = e.target.checked; render(); });
  document.getElementById("toggle-pork").addEventListener("change", e => { state.pork = e.target.checked; render(); });
  document.getElementById("search").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });

  const nearBtn = document.getElementById("toggle-near");
  nearBtn.addEventListener("click", () => {
    if (state.near) { state.near = null; nearBtn.classList.remove("is-on"); nearBtn.textContent = "📍 Near me"; render(); return; }
    if (!navigator.geolocation) { alert("Location isn't available on this device."); return; }
    nearBtn.textContent = "📍 Locating…";
    navigator.geolocation.getCurrentPosition(
      pos => { state.near = { lat: pos.coords.latitude, lng: pos.coords.longitude }; nearBtn.classList.add("is-on"); nearBtn.textContent = "📍 Near me ✓"; render(); },
      () => { nearBtn.textContent = "📍 Near me"; alert("Couldn't get your location — please allow location access."); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

buildChips();
wireControls();
render();
