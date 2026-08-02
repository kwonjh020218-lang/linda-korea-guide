// Register service worker + wire the dismissible "install" prompt (Android / iOS hint).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
(function () {
  const wrap = document.getElementById("install-wrap");
  const btn = document.getElementById("install-btn");
  if (!wrap || !btn) return;
  const DISMISS_KEY = "linda_install_dismissed";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let dismissed = false;
  try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch (e) {}
  if (standalone || dismissed) return; // installed or user closed it

  const show = () => { wrap.hidden = false; };
  const hide = (remember) => { wrap.hidden = true; if (remember) { try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {} } };

  let deferred = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; show(); });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) show();

  btn.addEventListener("click", async () => {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; hide(r && r.outcome === "accepted"); return; }
    if (isIOS) { alert("On iPhone this only works in Safari:\n\n1. If you're not in Safari, tap “Open in Safari” first\n2. Tap the Share button (⬆️ box at the bottom)\n3. Scroll down and choose “Add to Home Screen”"); return; }
    alert("Open the browser menu (⋮) and choose “Install app” / “Add to Home screen”.");
  });
  document.getElementById("install-dismiss").addEventListener("click", () => hide(true));
  window.addEventListener("appinstalled", () => hide(true));
})();
