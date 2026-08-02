// Trip store — saved (want/been) + notes + ratings, kept privately in localStorage.
const TRIP_KEY = "linda_trip_v1";
const Trip = {
  data: (() => { try { return JSON.parse(localStorage.getItem(TRIP_KEY)) || {}; } catch { return {}; } })(),
  _save() { try { localStorage.setItem(TRIP_KEY, JSON.stringify(this.data)); } catch (e) {} },
  _prune(id) { const c = this.data[id]; if (c && !c.status && !c.note && !c.rating) delete this.data[id]; },
  status(id) { return (this.data[id] && this.data[id].status) || null; },
  get(id) { return this.data[id] || null; },
  toggle(id, st) {
    const c = this.data[id] || (this.data[id] = {});
    c.status = c.status === st ? undefined : st;
    if (!c.status) delete c.status;
    this._prune(id); this._save();
    return this.status(id);
  },
  setNote(id, note) { const c = this.data[id] || (this.data[id] = {}); note ? (c.note = note) : delete c.note; this._prune(id); this._save(); },
  setRating(id, r) { const c = this.data[id] || (this.data[id] = {}); r ? (c.rating = r) : delete c.rating; this._prune(id); this._save(); },
  remove(id) { delete this.data[id]; this._save(); },
  ids() { return Object.keys(this.data); },
  counts() {
    let want = 0, been = 0;
    for (const k in this.data) { const s = this.data[k].status; if (s === "want") want++; else if (s === "been") been++; }
    return { want, been };
  },
};
