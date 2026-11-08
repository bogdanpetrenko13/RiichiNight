// The web version (GitHub Pages, played on iPhones): registers the service
// worker that caches the whole game for offline play (scripts/web/sw.js,
// written into the build by scripts/web/pwa.mjs). Not in the APK (Capacitor
// serves the files itself) and not under test automation (Playwright routes
// would be bypassed by the worker's cache).
import { Capacitor } from "@capacitor/core";

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function registerServiceWorker() {
  if (Capacitor.isNativePlatform() || navigator.webdriver || !("serviceWorker" in navigator)) return;
  // Not on the dev server (localhost), where a cache would hide every edit.
  if (!window.isSecureContext || location.hostname === "localhost") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    // Ask the browser to keep saves and the cache when space runs low.
    navigator.storage?.persist?.().catch(() => {});
  });
}
