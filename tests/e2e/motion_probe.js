// Injected by test_motion.py: follows every new river tile and hand tile for
// 700 ms (one position per frame) and remembers where it should have started
// (the tapped hand tile for the player, the hand row of the rival's band).
(() => {
  const T = (window.__track = { paths: [], recording: false });
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; };
  const follow = (el, kind, extra) => {
    const path = { kind, extra, pts: [], t0: performance.now() };
    T.paths.push(path);
    const step = () => {
      if (!el.isConnected) return;
      path.pts.push(center(el));
      if (performance.now() - path.t0 < 700) requestAnimationFrame(step);
    };
    path.pts.push(center(el));
    requestAnimationFrame(step);
  };
  // Remember where the player's selected/drawn tile was right before a discard.
  let lastHand = null;
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest && e.target.closest("[class*=dock] [data-k]");
    if (t) lastHand = center(t);
  }, true);
  const mo = new MutationObserver((muts) => {
    if (!T.recording) return;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        const river = m.target.closest && m.target.closest("[class*=river]");
        if (river && n.parentElement === m.target) {
          const mine = !!m.target.closest("[class*=me]");
          let extra = mine ? lastHand : null;
          if (!mine) {
            const band = m.target.closest("section");
            const low = band && band.querySelector("[class*=lower]");
            if (low) { const r = low.getBoundingClientRect(); extra = [r.left, r.top, r.right, r.bottom]; }
          }
          follow(n, mine ? "myDiscard" : "rivalDiscard", extra);
        }
        if (n.matches && n.matches("[class*=dock] [data-k]")) follow(n, "handNew");
      }
      // Hand reorders: follow every hand tile for the next frames.
      if (m.target.closest && m.target.closest("[class*=dock]") && m.type === "childList") {
        for (const el of document.querySelectorAll("[class*=dock] [data-k]")) follow(el, "handTile", el.dataset.k);
      }
    }
  });
  const start = () => mo.observe(document.body, { childList: true, subtree: true });
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
