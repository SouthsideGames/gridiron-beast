// Evolution sounds (GDD §51.5). The game had no audio system and no mute setting, so this is the smallest thing that works:
// three cues synthesized with the Web Audio API (no files, no library), OFF by default, switched on by the owner from the
// evolution screen or Settings (`settings.evoSound`). The context is created only after a tap (browser autoplay rules);
// anything unsupported is silently skipped, and the scene never waits for a sound.
let ac = null;
function ctx() {
  if (ac) return ac;
  try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); } catch { ac = null; }
  return ac;
}
/** Call from a tap handler: creates/resumes the context so later cues may play. */
export function unlockSound() { const a = ctx(); try { if (a?.state === 'suspended') a.resume(); } catch { /* ignore */ } return !!a; }
function tone(a, { type = 'sine', from, to = from, start = 0, dur = 0.3, gain = 0.12, attack = 0.02 }) {
  const t0 = a.currentTime + start; const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(from, t0); if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
const CUES = {
  buildup: (a) => { tone(a, { type: 'sawtooth', from: 110, to: 440, dur: 2.2, gain: 0.05, attack: 0.6 }); tone(a, { type: 'sine', from: 220, to: 880, dur: 2.2, gain: 0.06, attack: 0.6 }); },
  transform: (a) => { for (let i = 0; i < 6; i++) tone(a, { type: 'triangle', from: 660 + i * 110, start: i * 0.09, dur: 0.22, gain: 0.07 }); },
  reveal: (a) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, { type: 'triangle', from: f, start: i * 0.06, dur: 1.2, gain: 0.08, attack: 0.01 })); },
};
/** Play a cue if sound is on. Never throws. */
export function playCue(name, on) {
  if (!on) return false; const a = ctx(); if (!a || a.state !== 'running') return false;
  try { CUES[name]?.(a); return true; } catch { return false; }
}
