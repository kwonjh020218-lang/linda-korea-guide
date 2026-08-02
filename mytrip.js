// My Trip — saved (want) & visited (been) with notes + star ratings, from localStorage.
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

function stars(id, r) {
  r = r || 0;
  return `<div class="stars" data-id="${id}">` +
    [1,2,3,4,5].map(n => `<button class="star${n <= r ? " on" : ""}" data-r="${n}" aria-label="${n} star">★</button>`).join("") +
    (r ? `<button class="star clear" data-r="0" aria-label="Clear">✕</button>` : "") + `</div>`;
}
function tripCard(id) {
  const p = byId[id]; if (!p) return "";
  const rec = Trip.get(id) || {};
  return `
    <article class="trip-card" data-id="${id}">
      <div class="card__head">
        <h2 class="card__name"><span class="card__emoji">${EMOJI[p.category] || "📍"}</span>${p.name}</h2>
        <button class="savebtn remove" data-act="remove" aria-label="Remove">✕</button>
      </div>
      <div class="meta"><span class="metachip">${p.area}</span>${p.price ? `<span class="metachip metachip--price">${p.price}</span>` : ""}</div>
      ${stars(id, rec.rating)}
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
      html += `<div class="plan-area"><span class="plan-area__name">📍 ${a}</span><span class="plan-area__n">${g[c][a].length}</span></div>`;
      html += `<div class="list">${g[c][a].map(tripCard).join("")}</div>`;
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
  const star = e.target.closest(".star");
  if (star) { Trip.setRating(id, +star.dataset.r); render(); }
});
document.getElementById("trip-body").addEventListener("input", e => {
  const ta = e.target.closest(".trip-note"); if (!ta) return;
  Trip.setNote(ta.dataset.id, ta.value.trim());
});
render();
