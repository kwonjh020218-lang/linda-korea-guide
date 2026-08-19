// ===== Linda's Korea Guide — render + filters + save/share (v0 design) =====
const PRIMARY = [
  { key: "matcha",      emoji: "🍵", label: "Matcha" },
  { key: "cafedessert", emoji: "🍰", label: "Cafe & Dessert" },
  { key: "restaurant",  emoji: "🍽️", label: "Restaurant" },
  { key: "landmark",    emoji: "🏛️", label: "Landmark" },
  { key: "shop",        emoji: "🛍️", label: "Shop" },
  { key: "fashion",     emoji: "👕", label: "Fashion & Vintage" },
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
// place group -> phrasebook category index (Basics0, NoPork1, Ordering2, Transit3, Shopping4, Help5)
const PHRASE_CAT = { matcha: 2, cafedessert: 2, restaurant: 1, shop: 4, fashion: 4, landmark: 3 };

const KOREA = new Set(["seoul", "busan", "gyeongju"]);
const state = { city: "seoul", cats: new Set(), top: false, pork: false, openNow: false, q: "", near: null, sortNear: false };
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
const CITY_KR = { seoul: "서울", busan: "부산", gyeongju: "경주" };
const detOf = p => (typeof DETAILS !== "undefined") && DETAILS[p.id] || null;
// ---- "Open now" status from weekdayDescriptions (device-local time; Seoul/Busan/Tokyo all UTC+9) ----
const DAY3 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function parseClock(s) {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m) { let h = (+m[1]) % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + (+m[2]); }
  return null; // no unambiguous meridiem -> unparseable (safe fallback to plain string)
}
function parseRanges(line) {
  if (!line) return null;
  const body = line.slice(line.indexOf(":") + 1).trim();
  if (/closed/i.test(body)) return [];
  if (/24\s*hours/i.test(body)) return [[0, 1440]];
  const out = [];
  for (const part of body.split(",")) {
    const seg = part.split(/[–—-]/); if (seg.length < 2) return null;
    const s = parseClock(seg[0]); let e = parseClock(seg[1]);
    if (s == null || e == null) return null;
    if (e <= s) e += 1440; // past midnight
    out.push([s, e]);
  }
  return out.length ? out : null;
}
function fmtClock(min) {
  min = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(min / 60); const m = min % 60, ap = h < 12 ? "AM" : "PM";
  h = h % 12; if (h === 0) h = 12;
  return m ? `${h}:${String(m).padStart(2, "0")} ${ap}` : `${h} ${ap}`;
}
function hoursInfo(det) {
  if (!det || !det.h) return null;
  const now = new Date(), dayIdx = (now.getDay() + 6) % 7, nowMin = now.getHours() * 60 + now.getMinutes();
  const today = parseRanges(det.h[dayIdx]);
  if (today === null) return null; // unparseable -> caller shows plain string
  const yest = parseRanges(det.h[(dayIdx + 6) % 7]);
  let closeAt = null;
  for (const [s, e] of today) if (nowMin >= s && nowMin < e) { closeAt = e; break; }
  if (closeAt == null && yest) for (const [s, e] of yest) if (e > 1440 && nowMin < e - 1440) { closeAt = e - 1440; break; }
  if (closeAt != null) {
    const left = ((closeAt % 1440) - nowMin + 1440) % 1440, soon = left <= 60;
    return { open: true, soon, text: soon ? `Closes ${fmtClock(closeAt)}` : `Open · till ${fmtClock(closeAt)}` };
  }
  for (const [s] of today) if (s > nowMin) return { open: false, text: `Closed · opens ${fmtClock(s)}` };
  for (let k = 1; k <= 6; k++) { const r = parseRanges(det.h[(dayIdx + k) % 7]); if (r && r.length) return { open: false, text: `Closed · opens ${DAY3[(dayIdx + k) % 7]} ${fmtClock(r[0][0])}` }; }
  return { open: false, text: "Closed" };
}
const isOpenNow = p => { const i = hoursInfo(detOf(p)); return !!(i && i.open); };
function todayHours(det) {
  if (!det || !det.h) return null;
  const line = det.h[(new Date().getDay() + 6) % 7]; // weekdayDescriptions start Monday
  if (!line) return null;
  return line.split(": ").slice(1).join(": ").replace(/ /g, "").replace(/\s?–\s?/g, "–");
}
const naverUrl = p => {
  // Naver is a Korean service — keep the query all-Korean (name_kr + Korean address, or + city). No English area.
  const q = p.address ? `${p.name_kr || p.name} ${p.address}` : `${p.name_kr || p.name} ${CITY_KR[p.city] || ""}`;
  return `https://map.naver.com/p/search/${encodeURIComponent(q.trim())}`;
};

function matches(p) {
  if (!inCity(p)) return false;
  const group = GROUP_OF[p.category] || p.category;
  if (state.cats.size && !state.cats.has(group)) return false;
  if (state.top && !p.must_try) return false;
  if (state.pork && p.pork_lamb_free === false) return false;
  if (state.openNow && !isOpenNow(p)) return false;
  if (state.q) {
    const hay = `${p.name} ${p.name_kr} ${p.area} ${p.signature} ${p.blurb || ""} ${p.category} ${p.cuisine || ""}`.toLowerCase();
    if (!hay.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function cardHTML(p, dist) {
  const det = detOf(p);
  const photo = det && det.ph;
  const hrs = todayHours(det) || p.hours;
  const tags = [];
  if (p.tip) tags.push(`<span class="tag tag--tip">💡 ${p.tip}</span>`);
  if (dist != null && isFinite(dist)) {
    const label = dist < 1 ? Math.round(dist * 1000) + " m" : dist.toFixed(1) + " km";
    tags.push(`<span class="tag tag--dist">📍 ${label}</span>`);
  }
  if (p.spice > 0) tags.push(`<span class="tag${p.spice === 3 ? " tag--warn" : ""}">${"🌶️".repeat(p.spice)}${p.spice === 3 ? " very spicy!" : ""}</span>`);
  if (p.pork_lamb_free === true)  tags.push(`<span class="tag tag--ok">No pork/lamb ✓</span>`);
  if (p.pork_lamb_free === false) tags.push(`<span class="tag tag--warn">⚠ contains pork/lamb</span>`);
  if (p.photo_spot) tags.push(`<span class="tag tag--photo">📸 Photo spot</span>`);
  if (p.station && p.station !== "see map") tags.push(`<span class="tag">🚇 ${p.station}</span>`);
  const info = hoursInfo(det);
  if (info) {
    const cls = info.open ? (info.soon ? "tag--soon" : "tag--open") : "tag--closed";
    const dot = info.open ? (info.soon ? "🟡" : "🟢") : "🔴";
    tags.push(`<span class="tag ${cls}" title="${hrs || ""}">${dot} ${info.text}</span>`);
  } else if (hrs) {
    tags.push(`<span class="tag${/closed/i.test(hrs) ? " tag--warn" : ""}">🕑 ${hrs}</span>`);
  }
  const st = (typeof Trip !== "undefined") ? Trip.status(p.id) : null;
  return `
    <article class="card${p.must_try ? " card--top" : ""}${photo ? " has-photo" : ""}" data-id="${p.id}">
      ${photo ? `<img class="card__photo" loading="lazy" src="${photo}" alt="" />` : ""}
      <div class="card__head">
        <h2 class="card__name"><span class="card__emoji" aria-hidden="true">${EMOJI[p.category] || "📍"}</span>${p.name}</h2>
        <div class="savebtns">
          <button class="savebtn heart" data-act="want" aria-pressed="${st === "want"}" aria-label="Want to go">♥</button>
          <button class="savebtn check" data-act="been" aria-pressed="${st === "been"}" aria-label="Been here">✓</button>
        </div>
      </div>
      <div class="meta">
        ${p.must_try ? `<span class="metachip metachip--top">⭐ Top Pick</span>` : ""}
        <span class="metachip">${p.area}</span>
        ${p.price ? `<span class="metachip metachip--price">${p.price}</span>` : ""}
      </div>
      <p class="card__sig">${p.signature}</p>
      <p class="card__blurb">${p.blurb}</p>
      ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
      <div class="actions">
        <a class="btn-primary" href="${mapsUrl(p)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
        ${KOREA.has(p.city) ? `<a class="btn-2nd" href="${naverUrl(p)}" target="_blank" rel="noopener" title="Naver Map — best for Korea transit">🟢 Naver</a>` : ""}
      </div>
      <div class="utils">
        ${KOREA.has(p.city) ? `<button class="util" data-act="copy" title="Copy Korean name">📋 한글</button>` : ""}
        <button class="util" data-act="phrase" title="Useful phrases">💬</button>
        <button class="util" data-act="share" title="Share">↗</button>
      </div>
    </article>`;
}

const PAGE = 40;
let filtered = [], shown = 0, io = null;
function render() {
  filtered = PLACES.filter(matches).map(p => ({ p, d: null }));
  if (state.near) {
    filtered = filtered.map(x => { const c = coordOf(x.p); return { p: x.p, d: c ? haversineKm(state.near, c) : Infinity }; });
    if (state.sortNear) filtered.sort((a, b) => a.d - b.d);
  }
  document.getElementById("near-note").hidden = !state.sortNear;
  const tokyoTip = document.getElementById("tokyo-tip");
  if (tokyoTip) tokyoTip.hidden = !(state.city === "tokyo" && state.cats.has("matcha"));
  const cityTotal = PLACES.filter(inCity).length;
  document.getElementById("results-count").textContent = `Showing ${filtered.length} of ${cityTotal} hand-picked spots`;
  const el = document.getElementById("cards");
  shown = 0; el.innerHTML = "";
  if (!filtered.length) { el.innerHTML = `<p class="empty">No spots match these filters yet.<br />Try clearing one. 🍵</p>`; if (io) io.disconnect(); return; }
  appendMore();
}
function appendMore() {
  const el = document.getElementById("cards");
  const old = document.getElementById("sentinel"); if (old) old.remove();
  const next = filtered.slice(shown, shown + PAGE);
  el.insertAdjacentHTML("beforeend", next.map(x => cardHTML(x.p, x.d)).join(""));
  shown += next.length;
  if (shown < filtered.length) {
    const sent = document.createElement("div"); sent.id = "sentinel"; sent.style.height = "1px"; el.appendChild(sent);
    if (!io) io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) appendMore(); }, { rootMargin: "800px" });
    io.observe(sent);
  } else if (io) io.disconnect();
}

const setPressed = (btn, on) => btn.setAttribute("aria-pressed", on ? "true" : "false");

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast"); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200);
}
function copyKR(p) {
  const txt = [p.name_kr, p.address].filter(Boolean).join("\n");
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("Copied Korean — show it to the driver/staff 🚕"), () => prompt("Copy:", txt));
  else prompt("Copy:", txt);
}
async function sharePlace(p) {
  const url = mapsUrl(p), text = `${p.name} — ${p.area}\n${p.signature}`;
  if (navigator.share) { try { await navigator.share({ title: p.name, text, url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(`${text}\n${url}`); toast("Link copied"); } catch { prompt("Copy:", url); } }
}
function geolocate(cb, btn, busyText) {
  if (!navigator.geolocation) { alert("Location isn't available on this device."); return; }
  const restore = btn ? btn.textContent : null;
  if (btn) btn.textContent = busyText || "📍 Locating…";
  navigator.geolocation.getCurrentPosition(
    pos => { if (btn) btn.textContent = restore; cb({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
    () => { if (btn) btn.textContent = restore; alert("Couldn't get your location — please allow location access."); },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function buildChips() {
  const el = document.getElementById("category-chips");
  el.innerHTML = `<button class="chip" data-cat="" aria-pressed="true">All</button>` +
    PRIMARY.map(c => `<button class="chip" data-cat="${c.key}" aria-pressed="false">${c.emoji} ${c.label}</button>`).join("");

  el.addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const cat = b.dataset.cat;
    if (cat === "") state.cats.clear();
    else if (state.cats.has(cat)) state.cats.delete(cat);
    else state.cats.add(cat);
    el.querySelectorAll(".chip").forEach(c => setPressed(c, c.dataset.cat === "" ? state.cats.size === 0 : state.cats.has(c.dataset.cat)));
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
  const openBtn = document.getElementById("toggle-open");
  if (openBtn) openBtn.addEventListener("click", () => { state.openNow = !state.openNow; openBtn.classList.toggle("is-on", state.openNow); render(); });
  let searchT;
  document.getElementById("search").addEventListener("input", e => { state.q = e.target.value.trim(); clearTimeout(searchT); searchT = setTimeout(render, 140); });

  const nearBtn = document.getElementById("toggle-near");
  const setNearBtn = on => { nearBtn.classList.toggle("is-on", on); nearBtn.textContent = on ? "📍 Nearest first ✓" : "📍 Near me"; };
  nearBtn.addEventListener("click", () => {
    if (state.sortNear) { state.sortNear = false; setNearBtn(false); render(); return; }
    const go = () => { state.sortNear = true; setNearBtn(true); render(); };
    if (state.near) go(); else geolocate(loc => { state.near = loc; go(); }, nearBtn);
  });

  const matchaBtn = document.getElementById("nearest-matcha");
  if (matchaBtn) matchaBtn.addEventListener("click", () => {
    geolocate(loc => {
      state.near = loc; state.sortNear = true; state.cats = new Set(["matcha"]);
      document.querySelectorAll("#category-chips .chip").forEach(c => setPressed(c, c.dataset.cat === "matcha"));
      setNearBtn(true);
      render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }, matchaBtn, "🍵 Finding…");
  });

  // if location was already allowed, grab it silently so every card shows a distance
  if (navigator.geolocation && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "geolocation" }).then(r => {
      if (r.state === "granted") navigator.geolocation.getCurrentPosition(
        pos => { state.near = { lat: pos.coords.latitude, lng: pos.coords.longitude }; render(); },
        () => {}, { maximumAge: 600000, timeout: 8000 });
    }).catch(() => {});
  }

  // card actions (delegated)
  document.getElementById("cards").addEventListener("click", e => {
    const card = e.target.closest(".card"); if (!card) return;
    const id = card.dataset.id;
    const sb = e.target.closest(".savebtn");
    if (sb) {
      const now = Trip.toggle(id, sb.dataset.act);
      card.querySelector(".savebtn.heart").setAttribute("aria-pressed", now === "want");
      card.querySelector(".savebtn.check").setAttribute("aria-pressed", now === "been");
      return;
    }
    const u = e.target.closest(".util[data-act]"); if (!u) return;
    const p = PLACES.find(x => x.id === id); if (!p) return;
    if (u.dataset.act === "copy") copyKR(p);
    else if (u.dataset.act === "phrase" && window.openPhrasebook) window.openPhrasebook(PHRASE_CAT[GROUP_OF[p.category]] ?? 0);
    else if (u.dataset.act === "share") sharePlace(p);
  });
}

buildChips();
wireControls();
render();
