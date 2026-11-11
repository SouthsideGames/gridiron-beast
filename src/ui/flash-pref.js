// "Reduce flashes" (Task 8 spec §14; docs/task8/FX_FOOTBALL_MATRIX.md I3): an accessibility setting, off by default, saved with the
// other settings (franchise settings; the menu's defaults before a career exists). When on, full-screen flashes and rapid strobing
// are softened or removed in the football effect layer (fxOptions.reducedFlash), the Clash effect layers and the screen overlays
// (styles/app.css, html[data-reduced-flash="1"]). It never hides an ability, a result or any information, and never touches the
// simulation. The operating system's "reduce motion" preference turns the softening on as well. This is not a graphics-quality preset.

/** Is flash softening on for these settings (or asked for by the page / the operating system)? */
export function reducedFlash(settings = null) {
  if (settings?.reducedFlash) return true;
  try {
    if (globalThis.document?.documentElement?.dataset?.reducedFlash === '1') return true;
    return typeof globalThis.matchMedia === 'function' && !!globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

/** The football effect layer's options (field-view.js `fxOptions`). */
export function fxOptionsFor(settings = null) { return { reducedFlash: reducedFlash(settings) }; }

/** Mirror the setting on the page root so the stylesheet can soften the overlay flashes (like data-reduced-motion). */
export function applyFlashPref(settings = null) { try { if (globalThis.document?.documentElement) globalThis.document.documentElement.dataset.reducedFlash = settings?.reducedFlash ? '1' : '0'; } catch { /* no document */ } }
