import { audioContext, audioBus, audioPreferences, isAudioHidden } from './context.js';
import { cryCatalog, playCry, stopCry } from './monster-cries.js';
import { music } from './music.js';
let voice = null, ticket = 0;
export function stopAudioPreview() {
  ticket++;
  if (voice) { try { voice.stop(); } catch {} voice.disconnect(); voice = null; }
  stopCry();
}
export async function previewAudio(channel) {
  stopAudioPreview();
  if (audioPreferences().muted) return { ok: false, reason: 'Turn off Mute All Audio to hear a preview.' };
  if (isAudioHidden()) return { ok: false, reason: 'Return to the game to hear a preview.' };
  if (audioPreferences()[channel] === 0) return { ok: false, reason: 'Raise this volume to hear a preview.' };
  if (channel === 'music') { await music.select('main'); return { ok: true }; }
  if (channel === 'cries') { await playCry(cryCatalog[0].id, 1); return { ok: true }; }
  if (!['sfx', 'crowd'].includes(channel)) return { ok: false, reason: 'Unknown audio channel.' };
  const token = ticket, ctx = audioContext();
  if (!ctx) return { ok: false, reason: 'Audio is unavailable on this device.' };
  await ctx.resume();
  if (ticket !== token || isAudioHidden()) return { ok: false, reason: 'Preview canceled.' };
  // A short neutral sample uses the real channel's bus and its current volume.
  const oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = channel === 'sfx' ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(channel === 'sfx' ? 440 : 165, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(.12, ctx.currentTime + .025);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + .35);
  oscillator.connect(gain).connect(audioBus(channel)); voice = oscillator;
  oscillator.onended = () => { if (voice === oscillator) voice = null; oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(); oscillator.stop(ctx.currentTime + .4);
  return { ok: true };
}

globalThis.document?.addEventListener('visibilitychange', () => { if (isAudioHidden()) stopAudioPreview(); });
globalThis.addEventListener?.('gb-app-state', e => { if (e.detail?.isActive === false) stopAudioPreview(); });
