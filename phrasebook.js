// Phrasebook overlay: category chips -> phrase list -> tap = show BIG for staff.
(function () {
  const fab = document.getElementById("phrase-fab");
  const sheet = document.getElementById("phrasebook");
  const cats = document.getElementById("phrase-cats");
  const list = document.getElementById("phrase-list");
  const big = document.getElementById("phrase-big");
  if (!fab || typeof PHRASES === "undefined") return;
  // tag each phrase with its pre-generated audio path (ElevenLabs, baked into /audio/phrases)
  PHRASES.forEach((c, ci) => c.items.forEach((it, ii) => { it._a = `audio/phrases/${ci}-${ii}`; }));
  let active = 0, built = false;

  const renderCats = () => {
    cats.innerHTML = PHRASES.map((c, i) => `<button class="chip" data-i="${i}" aria-pressed="${i === active}">${c.emoji} ${c.cat}</button>`).join("");
  };
  const renderList = () => {
    list.innerHTML = PHRASES[active].items.map((p, j) =>
      `<button class="phrase" data-j="${j}">
        <span class="phrase__en">${p.en}</span>
        <span class="phrase__ko">${p.ko}</span>
        <span class="phrase__ja">${p.ja}</span>
      </button>`).join("");
  };
  const open = () => { if (!built) { renderCats(); renderList(); built = true; } sheet.hidden = false; };
  const close = () => { sheet.hidden = true; };
  // play the pre-generated ElevenLabs clip; fall back to the device voice if it's missing
  const webSpeak = (text, lang) => {
    if (!("speechSynthesis" in window)) { alert("Voice isn't available on this device."); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", "));
    u.lang = lang; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  const speak = (src, text, lang) => {
    let fell = false; const fb = () => { if (fell) return; fell = true; webSpeak(text, lang); };
    const a = new Audio(src);
    a.addEventListener("error", fb, { once: true });
    a.play().catch(fb);
  };
  let current = null;
  const showBig = p => {
    current = p;
    document.getElementById("pb-en").textContent = p.en;
    document.getElementById("pb-ko").textContent = p.ko;
    document.getElementById("pb-ja").textContent = p.ja;
    big.hidden = false;
  };
  document.getElementById("pb-ko-btn").addEventListener("click", () => current && speak(current._a + "-ko.mp3", current.ko, "ko-KR"));
  document.getElementById("pb-ja-btn").addEventListener("click", () => current && speak(current._a + "-ja.mp3", current.ja, "ja-JP"));

  fab.addEventListener("click", open);
  window.openPhrasebook = (i) => { active = Math.max(0, Math.min(PHRASES.length - 1, i | 0)); built = true; renderCats(); renderList(); sheet.hidden = false; };
  document.getElementById("phrase-close").addEventListener("click", close);
  sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
  cats.addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; active = +b.dataset.i; renderCats(); renderList(); });
  list.addEventListener("click", e => { const b = e.target.closest(".phrase"); if (!b) return; showBig(PHRASES[active].items[+b.dataset.j]); });
  document.getElementById("phrase-big-close").addEventListener("click", () => { big.hidden = true; });
  big.addEventListener("click", e => { if (e.target === big) big.hidden = true; });
})();
