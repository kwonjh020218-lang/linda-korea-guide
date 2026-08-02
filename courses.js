// Ready-made courses: auto-build a walkable day from the best (must_try) spots in each area.
const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
const EMOJI = {
  matcha: "🍵", dessert: "🍰", cafe: "☕", sushi: "🍣", japanese: "🍜", chinese: "🥢",
  korean: "🍲", italian: "🍝", landmark: "🏛️", photo: "📸", shop: "🛍️", fashion: "👕",
  ramen: "🍜", steak: "🥩", burger: "🍔", brunch: "🥐", mexican: "🌮", thai: "🥘", vietnamese: "🍜", indian: "🍛",
};
const CITY_NAME = { seoul: "Seoul", busan: "Busan", gyeongju: "Gyeongju", tokyo: "Tokyo" };
// coarse "kind" so a course mixes things to do, not five of the same
const KIND_OF = {
  matcha: "matcha", cafe: "cafe", dessert: "sweets",
  sushi: "food", japanese: "food", chinese: "food", korean: "food", italian: "food",
  ramen: "food", steak: "food", burger: "food", brunch: "food", mexican: "food", thai: "food", vietnamese: "food", indian: "food",
  landmark: "sight", photo: "sight", shop: "shopping", fashion: "vintage",
};
const KIND_WORD = { matcha: "matcha", cafe: "cafés", sweets: "sweets", food: "food", sight: "sights", shopping: "shops", vintage: "vintage" };

const state = { city: "seoul" };
const inCity = c => p => p.city === c || (c === "busan" && p.city === "gyeongju");

// Per-course customisation (add/remove stops), kept locally. { "city|area": [id,...] }
const CKEY = "linda_courses_v1";
let CUSTOM = (() => { try { return JSON.parse(localStorage.getItem(CKEY)) || {}; } catch { return {}; } })();
const saveCustom = () => { try { localStorage.setItem(CKEY, JSON.stringify(CUSTOM)); } catch (e) {} };
const seedCustom = c => { if (!CUSTOM[c.key]) CUSTOM[c.key] = c.stops.map(p => p.id); };

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
// nearest-neighbour order from the northern-most stop. ponytail: heuristic, not optimal TSP — fine for a few stops.
function routeOrder(places) {
  const pts = places.map(p => ({ p, c: coordOf(p) })).filter(x => x.c);
  if (pts.length < 2) return { stops: places, coords: pts.map(x => x.c) };
  let start = 0; pts.forEach((x, i) => { if (x.c.lat > pts[start].c.lat) start = i; });
  const used = Array(pts.length).fill(false), seq = [start]; used[start] = true;
  while (seq.length < pts.length) {
    const last = pts[seq[seq.length - 1]].c; let best = -1, bd = Infinity;
    pts.forEach((x, i) => { if (!used[i]) { const d = haversineKm(last, x.c); if (d < bd) { bd = d; best = i; } } });
    seq.push(best); used[best] = true;
  }
  return { stops: seq.map(i => pts[i].p), coords: seq.map(i => pts[i].c) };
}
function routeMapsUrl(coords) {
  const pts = coords.slice(0, 10);
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
// pick up to `max`, one per kind round-robin — matcha first (Linda drinks it daily)
const KIND_PRIORITY = ["matcha", "cafe", "sweets", "food", "sight", "shopping", "vintage"];
function pickDiverse(places, max) {
  const byKind = {};
  places.forEach(p => { const k = KIND_OF[p.category] || "food"; (byKind[k] = byKind[k] || []).push(p); });
  const kinds = Object.keys(byKind).sort((a, b) => KIND_PRIORITY.indexOf(a) - KIND_PRIORITY.indexOf(b));
  const out = [];
  let i = 0, guard = 0;
  while (out.length < max && out.length < places.length && guard++ < 300) {
    const k = kinds[i % kinds.length];
    if (byKind[k].length) out.push(byKind[k].shift());
    i++;
  }
  return out;
}
function centroid(places) {
  const cs = places.map(coordOf).filter(Boolean);
  return { lat: cs.reduce((s, c) => s + c.lat, 0) / cs.length, lng: cs.reduce((s, c) => s + c.lng, 0) / cs.length };
}
function buildCourses(city) {
  const inThisCity = PLACES.filter(p => inCity(city)(p) && coordOf(p));
  const matchaSpots = inThisCity.filter(p => p.category === "matcha");
  const byArea = {};
  inThisCity.forEach(p => { const a = p.area || "Other"; (byArea[a] = byArea[a] || []).push(p); });
  const make = filterFn => {
    const courses = [];
    Object.keys(byArea).forEach(a => {
      const cand = byArea[a].filter(filterFn);
      if (cand.length < 3) return; // need enough for a real day
      let chosen = pickDiverse(cand, 6);
      // Linda drinks matcha daily — every course gets the nearest good matcha (within ~2.5km), if it lacks one
      if (!chosen.some(p => p.category === "matcha") && matchaSpots.length) {
        const cen = centroid(chosen);
        let best = null, bw = Infinity;
        matchaSpots.forEach(m => { if (chosen.includes(m)) return; const w = haversineKm(cen, coordOf(m)) - (m.must_try ? 0.25 : 0); if (w < bw) { bw = w; best = m; } });
        if (best && haversineKm(cen, coordOf(best)) <= 2.5) { if (chosen.length >= 6) chosen = chosen.slice(0, 5); chosen.push(best); }
      }
      courses.push(Object.assign({ area: a, city, key: city + "|" + a }, routeOrder(chosen)));
    });
    return courses.sort((x, y) => y.stops.length - x.stops.length);
  };
  let list = make(p => p.must_try);          // top picks first
  if (!list.length) list = make(() => true); // fall back to all hand-picked spots (e.g. Tokyo)
  // apply the user's per-course edits
  return list.map(c => CUSTOM[c.key]
    ? Object.assign({}, c, routeOrder(CUSTOM[c.key].map(id => byId[id]).filter(Boolean)), { custom: true })
    : c);
}
function vibe(stops) {
  const seen = [], order = ["matcha", "food", "cafe", "sweets", "sight", "shopping", "vintage"];
  stops.forEach(p => { const k = KIND_OF[p.category] || "food"; if (!seen.includes(k)) seen.push(k); });
  return seen.sort((a, b) => order.indexOf(a) - order.indexOf(b)).map(k => KIND_WORD[k]).join(" · ");
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast"); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200);
}

function courseHTML(c, idx) {
  const canRemove = c.stops.length > 1;
  const stops = c.stops.map((p, i) => {
    const walk = c.coords && i > 0 && i < c.coords.length ? `<li class="walkstep">↓ ${walkMin(haversineKm(c.coords[i - 1], c.coords[i]))} min walk</li>` : "";
    return walk + `<li class="course__stop"><span class="plan-step">${i + 1}</span><span class="course__stopname">${EMOJI[p.category] || "📍"} ${p.name}</span>${canRemove ? `<button class="stop-x" data-id="${p.id}" aria-label="Remove ${p.name}">✕</button>` : ""}</li>`;
  }).join("");
  const tot = c.coords && c.coords.length > 1 ? routeTotal(c.coords) : null;
  const totLabel = tot ? ` · ${tot.km.toFixed(1)} km · ${tot.min} min walk` : "";
  return `
    <article class="course" data-idx="${idx}">
      <div class="course__head">
        <div>
          <h2 class="course__title">${c.area}</h2>
          <p class="course__sub">${c.stops.length} stops · ${vibe(c.stops)}${totLabel}</p>
        </div>
        <span class="metachip ${c.custom ? "metachip--price" : "metachip--top"}">${c.custom ? "✎ Yours" : "⭐ Best of"}</span>
      </div>
      <ol class="course__stops">${stops}</ol>
      <div class="course-add" hidden>
        <div class="search"><span aria-hidden="true">🔍</span><input class="course-add__input" placeholder="Add a spot to this course…" aria-label="Add a spot" autocomplete="off" /></div>
        <div class="course-add__results"></div>
      </div>
      <div class="course-edit">
        <button class="util" data-act="add-toggle">＋ Add stop</button>
        ${c.custom ? `<button class="util" data-act="reset">↺ Reset</button>` : ""}
      </div>
      <div class="actions">
        <a class="btn-primary" href="${routeMapsUrl(c.coords)}" target="_blank" rel="noopener">🧭 Walk this route</a>
        <button class="btn-2nd" data-act="save-all">♥ Save all</button>
      </div>
    </article>`;
}

let COURSES = [];
function render() {
  COURSES = buildCourses(state.city);
  const body = document.getElementById("courses-body");
  if (!COURSES.length) {
    body.innerHTML = `<p class="empty">No ready-made courses here yet.<br />Try another city, or build your own in ❤️ My Trip. 🍵</p>`;
    return;
  }
  body.innerHTML = `<p class="results__count">${COURSES.length} day course${COURSES.length > 1 ? "s" : ""} — top spots, ordered to walk. Make it yours: ✕ remove, ＋ add.</p>` +
    `<div class="list">${COURSES.map(courseHTML).join("")}</div>`;
}

document.getElementById("city-tabs").addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  state.city = b.dataset.city;
  document.querySelectorAll("#city-tabs .tab").forEach(t => t.setAttribute("aria-pressed", t === b ? "true" : "false"));
  render();
});
function addSearch(art, q) {
  const c = COURSES[+art.dataset.idx]; if (!c) return;
  const res = art.querySelector(".course-add__results");
  if (q.length < 2) { res.innerHTML = ""; return; }
  const inCourse = new Set(c.stops.map(p => p.id)), ql = q.toLowerCase();
  const hits = PLACES.filter(p => inCity(c.city)(p) && !inCourse.has(p.id) &&
    `${p.name} ${p.name_kr || ""} ${p.area || ""}`.toLowerCase().includes(ql)).slice(0, 8);
  res.innerHTML = hits.length
    ? hits.map(p => `<button class="add-result" data-id="${p.id}"><span class="add-result__name">${EMOJI[p.category] || "📍"} ${p.name}</span><span class="add-result__area">${p.area || ""}</span></button>`).join("")
    : `<p class="add-empty">Not in the guide — send it to me and I'll add it. 🍵</p>`;
}
document.getElementById("courses-body").addEventListener("click", e => {
  const art = e.target.closest(".course"); if (!art) return;
  const c = COURSES[+art.dataset.idx]; if (!c) return;

  const sx = e.target.closest(".stop-x");
  if (sx) { seedCustom(c); CUSTOM[c.key] = CUSTOM[c.key].filter(id => id !== sx.dataset.id); saveCustom(); render(); return; }

  if (e.target.closest("[data-act=add-toggle]")) {
    const box = art.querySelector(".course-add"); box.hidden = !box.hidden;
    if (!box.hidden) box.querySelector(".course-add__input").focus(); return;
  }
  const ar = e.target.closest(".add-result");
  if (ar) { seedCustom(c); CUSTOM[c.key].push(ar.dataset.id); saveCustom(); render(); return; }

  if (e.target.closest("[data-act=reset]")) { delete CUSTOM[c.key]; saveCustom(); render(); return; }

  if (e.target.closest("[data-act=save-all]")) {
    let added = 0;
    c.stops.forEach(p => { if (typeof Trip !== "undefined" && Trip.status(p.id) !== "want") { Trip.toggle(p.id, "want"); added++; } });
    toast(added ? `Added ${added} to ❤️ My Trip` : "Already in My Trip");
  }
});
document.getElementById("courses-body").addEventListener("input", e => {
  const inp = e.target.closest(".course-add__input"); if (!inp) return;
  addSearch(e.target.closest(".course"), inp.value.trim());
});

render();
