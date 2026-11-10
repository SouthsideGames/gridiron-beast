// Frame rate (Task 8 M6, spec §14): the game targets 60 frames a second and offers a selectable 30 FPS battery-saving mode. The
// setting is saved with the other settings (`frameRate`: 60, the default, or 30). In 30 FPS mode the effect layers the game redraws
// itself (the Clash arena's ability layer and particle canvas, the evolution scene's particles) redraw at most 30 times a second.
// The football field already redraws at most 20 to 30 times a second in both modes. Presentation only: every simulation result is
// computed before it is drawn and playback follows the clock, not the number of frames drawn, so both settings give identical
// outcomes, clocks and seeded results. The game never changes this setting by itself.
export const FRAME_RATES = Object.freeze([60, 30]);
let rate = 60;
/** The selected frame rate for these settings (60 unless 30 is chosen). */
export const frameRateOf = (settings = null) => (Number(settings?.frameRate) === 30 ? 30 : 60);
/** Mirror the setting for the render loops (and on the page root, for checks). */
export function applyFrameRate(settings = null) { rate = frameRateOf(settings); try { if (globalThis.document?.documentElement) globalThis.document.documentElement.dataset.frameRate = String(rate); } catch { /* no document */ } }
export const currentFrameRate = () => rate;
/**
 * A gate for one render loop: `gate(now)` is true when this animation frame should be drawn. Always true at 60; at 30 it passes a
 * frame only when about 1/30 s has gone by since the last one it passed (a 4 ms allowance keeps a 60 Hz display on every second frame).
 */
export function frameGate() { let last = -Infinity; return (now) => { if (rate !== 30) return true; if (now - last < 1000 / 30 - 4) return false; last = now; return true; }; }
