// ===== Linda's Korea Guide — render + filters =====

const CATEGORIES = [
  { key: "matcha",   emoji: "🍵", label: "Matcha" },
  { key: "sushi",    emoji: "🍣", label: "Sushi" },
  { key: "japanese", emoji: "🍜", label: "Japanese" },
  { key: "chinese",  emoji: "🥢", label: "Chinese" },
  { key: "korean",   emoji: "🍲", label: "Korean" },
  { key: "italian",  emoji: "🍝", label: "Italian" },
  { key: "dessert",  emoji: "🍰", label: "Dessert" },
  { key: "cafe",     emoji: "☕", label: "Cafe" },
  { key: "photo",    emoji: "📸", label: "Photo" },
  { key: "landmark", emoji: "🏛️", label: "Landmark" },
];
const EMOJI = Object.fromEntries(CATEGORIES.map(c => [c.key, c.emoji]));
const FOOD = new Set(["sushi", "japanese", "chinese", "korean", "italian"]);

// Paste My Maps embed URLs here to show an overview map per city (see README). Leave "" to hide.
const CITY_MAP = { seoul: "", busan: "" };

const state = { city: "seoul", cats: new Set(), top: false, pork: false, q: "" };

// gyeongju places belong to the Busan tab
const inCity = p => p.city === state.city || (state.city === "busan" && p.city === "gyeongju");

function mapsUrl(p) {
  const q = (p.lat != null && p.lng != null)
    ? `${p.lat},${p.lng}`
    : encodeURIComponent([p.name, p.name_kr, p.area].filter(Boolean).join(" "));
  let url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (p.place_id) url += `&query_place_id=${p.place_id}`;
  return url;
}

function matches(p) {
  if (!inCity(p)) return false;
  if (state.cats.size && !state.cats.has(p.category)) return false;
  if (state.top && !p.must_try) return false;
  if (state.pork && p.pork_lamb_free === false) return false;
  if (state.q) {
    const hay = `${p.name} ${p.name_kr} ${p.area}`.toLowerCase();
    if (!hay.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function cardHTML(p) {
  const isFood = FOOD.has(p.category);

  const tags = [];
  if (isFood && p.spice > 0) {
    const hot = p.spice === 3 ? " hot" : "";
    tags.push(`<span class="tag spice${hot}">${"🌶️".repeat(p.spice)}${p.spice === 3 ? " very spicy!" : ""}</span>`);
  }
  if (isFood && p.pork_lamb_free === true) tags.push(`<span class="tag good">No pork/lamb ✓</span>`);
  if (isFood && p.pork_lamb_free === false) tags.push(`<span class="tag amber">⚠ contains pork/lamb</span>`);
  if (p.photo_spot) tags.push(`<span class="tag photo">📸 Photo spot</span>`);
  if (p.station) tags.push(`<span class="tag info">🚇 ${p.station}</span>`);
  if (p.hours) tags.push(`<span class="tag info">🕑 ${p.hours}</span>`);

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
  const list = PLACES.filter(matches);
  const el = document.getElementById("cards");
  el.innerHTML = list.length
    ? list.map(cardHTML).join("")
    : `<div class="empty">No spots match these filters yet.<br />Try clearing a filter. 🍵</div>`;

  // overview map
  const wrap = document.getElementById("map-wrap");
  const src = CITY_MAP[state.city];
  if (src) {
    document.getElementById("overview-map").src = src;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
}

function buildChips() {
  const el = document.getElementById("category-chips");
  const all = `<button class="chip active" data-cat="">All</button>`;
  el.innerHTML = all + CATEGORIES.map(c =>
    `<button class="chip" data-cat="${c.key}">${c.emoji} ${c.label}</button>`
  ).join("");

  el.addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const cat = btn.dataset.cat;
    if (cat === "") { state.cats.clear(); }
    else if (state.cats.has(cat)) { state.cats.delete(cat); }
    else { state.cats.add(cat); }
    // sync active classes
    el.querySelectorAll(".chip").forEach(c => {
      const k = c.dataset.cat;
      c.classList.toggle("active", k === "" ? state.cats.size === 0 : state.cats.has(k));
    });
    render();
  });
}

function wireControls() {
  document.getElementById("city-tabs").addEventListener("click", e => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    state.city = btn.dataset.city;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === btn));
    render();
  });
  document.getElementById("toggle-top").addEventListener("change", e => { state.top = e.target.checked; render(); });
  document.getElementById("toggle-pork").addEventListener("change", e => { state.pork = e.target.checked; render(); });
  document.getElementById("search").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
}

buildChips();
wireControls();
render();
