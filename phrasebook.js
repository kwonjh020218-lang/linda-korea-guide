// Phrasebook overlay: category chips -> phrase list -> tap = show BIG for staff.
(function () {
  const fab = document.getElementById("phrase-fab");
  const sheet = document.getElementById("phrasebook");
  const cats = document.getElementById("phrase-cats");
  const list = document.getElementById("phrase-list");
  const big = document.getElementById("phrase-big");
  if (!fab || typeof PHRASES === "undefined") return;
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
  const speak = (text, lang) => {
    if (!("speechSynthesis" in window)) { alert("Voice isn't available on this device."); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", "));
    u.lang = lang; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  let current = null;
  const showBig = p => {
    current = p;
    document.getElementById("pb-en").textContent = p.en;
    document.getElementById("pb-ko").textContent = p.ko;
    document.getElementById("pb-ja").textContent = p.ja;
    big.hidden = false;
  };
  document.getElementById("pb-ko-btn").addEventListener("click", () => current && speak(current.ko, "ko-KR"));
  document.getElementById("pb-ja-btn").addEventListener("click", () => current && speak(current.ja, "ja-JP"));

  fab.addEventListener("click", open);
  document.getElementById("phrase-close").addEventListener("click", close);
  sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
  cats.addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; active = +b.dataset.i; renderCats(); renderList(); });
  list.addEventListener("click", e => { const b = e.target.closest(".phrase"); if (!b) return; showBig(PHRASES[active].items[+b.dataset.j]); });
  document.getElementById("phrase-big-close").addEventListener("click", () => { big.hidden = true; });
  big.addEventListener("click", e => { if (e.target === big) big.hidden = true; });
})();
