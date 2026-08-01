# Linda's Korea Guide 🍵 (private)

A tiny static site — a personal, curated Seoul + Busan travel guide made as a gift.
No build step, no framework, no API keys. Just open `index.html`.

## Files
- `index.html` — page shell (header, tabs, chips, toggles, map slot, cards)
- `style.css` — matcha theme, mobile-first
- `app.js` — render + filters (city / category / search / top-picks / no-pork)
- `data.js` — all the places (the content)

## Add a place
Open `data.js`, copy any object in the `PLACES` array, and fill the fields.
Required-ish: `id`, `name`, `city`, `area`, `category`, `signature`, `blurb`.
Safe to leave `null`: `cuisine`, `place_id`, `instagram`, `hours`, `station`, `lat`, `lng`.

Key rules baked into the UI:
- **`pork_lamb_free`**: `true` = green "No pork/lamb ✓" · `false` = amber warning · `null` = hidden (cafe/dessert). Linda does **not** eat pork or lamb — set this accurately on every food place.
- **`spice`**: `0`–`3`. Only shown for food categories. `3` renders as a red "very spicy!" warning (she likes spice but not *very* spicy — prefer capping at 2).
- **`category`**: one of matcha, sushi, japanese, chinese, korean, italian, dessert, cafe, photo, landmark.
- **`city`**: `seoul` | `busan` | `gyeongju`. Gyeongju places show under the **Busan** tab (daytrip).
- **`must_try: true`** → gold ⭐ Top Pick badge.

If `lat`/`lng` are missing, the "Open in Google Maps" button falls back to a name search — still works, just less precise. Add coords when you can.

## Overview map (optional)
1. Build a Google **My Maps** for a city, drop pins, share it.
2. Menu → *Embed on my site* → copy the `<iframe src="…">` URL.
3. Paste that URL into `CITY_MAP` in `app.js`:
   ```js
   const CITY_MAP = { seoul: "https://www.google.com/maps/d/embed?mid=…", busan: "" };
   ```
   The map shows automatically when a URL is present; stays hidden when `""`.

## Japan tab (later)
Uncomment the Japan `<button>` in `index.html`, add a `CITY_MAP.japan`, and add places with `city: "japan"`. Ask Linda her cities first (Uji = matcha holy land).

## Deploy (GitHub Pages, private-ish)
```bash
git init && git add -A && git commit -m "init: Linda's Korea Guide"
# create a PRIVATE repo named linda-korea-guide, then:
git remote add origin git@github.com:<you>/linda-korea-guide.git
git push -u origin main
```
Enable Pages: repo Settings → Pages → Deploy from branch → `main` / root.
The page has `noindex,nofollow` — just don't share the URL publicly.

## TODO (next session)
- Seoul: sushi ×3–4, italian ×2–3, korean (no-pork) ×3–4, chinese ×2, landmarks/photo ×3–5
- Busan: sushi/japanese, korean seafood (pork-free), landmarks (Gamcheon, Haedong Yonggungsa, Sky Capsule)
- Verify coords/place_id for Cortz, Unforget, Cafe Hitaro
- Japan leg
