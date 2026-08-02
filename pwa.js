// Register service worker + wire the small "install" button (Android prompt / iOS hint).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
(function () {
  const btn = document.getElementById("install-btn");
  if (!btn) return;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return; // already installed

  let deferred = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; btn.hidden = false; });

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) btn.hidden = false; // iOS has no prompt event — show button with instructions

  btn.addEventListener("click", async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; return; }
    if (isIOS) { alert("On iPhone this only works in Safari:\n\n1. If you're not in Safari, tap “Open in Safari” first\n2. Tap the Share button (⬆️ box at the bottom)\n3. Scroll down and choose “Add to Home Screen”"); return; }
    alert("Open the browser menu (⋮) and choose “Install app” / “Add to Home screen”.");
  });
  window.addEventListener("appinstalled", () => { btn.hidden = true; });
})();
