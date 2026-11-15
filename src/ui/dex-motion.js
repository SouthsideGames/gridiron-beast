// Beast Dex 2.0 portrait motion (presentation only). The idle loop, the tap reaction and the rare reaction are chosen from what the
// form's sprite actually is: its body plan (src/ui/sprite16.js templates), its drawn features, its look, size and evolution stage, and
// the temperament words of its Dex personality. A legless serpent sways and rears instead of hopping; only a winged form takes off; a
// shelled form tucks in and rolls; a blob squashes. Shared techniques are tuned per form (tempo, amplitude, phase) so two families with
// the same body plan do not move identically.
//
// Nothing here reads or advances simulation randomness or any game state. Rare reactions are decided by the caller (UI randomness).
// Every animation is a CSS loop on the sprite element or a Web Animation that is cancelled when the next one starts, and all timers are
// tied to an AbortSignal so closing the profile or changing screens leaves nothing running. Reduced motion (the system preference or
// the game's own setting) turns every movement off; the text reaction still appears.
import { SPECIES_DEX } from '../data/species.js';
import { evolvedSpec } from '../data/monsters.js';
import { dexContent } from '../dex/content.js';

const BY_ID = new Map(SPECIES_DEX.map((s) => [s.id, s]));
const LIVELY = /\b(eager|playful|lively|exuberant|impatient|restless|curious|inquisitive|sociable|amused|funny|humorous|dramatic|nervous|alert|affectionate|wholehearted|competitive|enthusiastic|excitable|bouncy|mischievous|energetic)\b/g;
const CALM = /\b(quietly|quiet|patient|patience|steady|deliberate|measured|composed|unhurried|reserved|reflective|careful|cautious|gentle|discreet|thoughtful|imposing|firm|orderly|precise|watchful|observant|solemn|dignified|calm|serene)\b/g;

/** Small stable number in [0, 1) from a string: per-family variation without touching any game RNG. */
function hash01(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (h % 1000) / 1000; }

/** The form's sprite spec (base or evolved). */
export function dexFormSpec(familyId, stage = 0) {
  const s = BY_ID.get(familyId); if (!s) return null;
  return stage > 0 ? evolvedSpec(s, stage) : s;
}

/**
 * The motion profile of a form: { body, idle, tap, rare, tempo, amp, glow, facing, label }. `label` is the plain description the
 * reviewer shows, so the owner can judge the fit form by form.
 */
export function dexMotion(familyId, stage = 0) {
  const spec = dexFormSpec(familyId, stage); if (!spec) return null;
  const feats = new Set(spec.features || []); const body = spec.body || 'biped'; const look = spec.look || 'cool';
  const wings = feats.has('wings');
  const personality = (dexContent(familyId, stage)?.personality || '').toLowerCase();
  const lively = (personality.match(LIVELY) || []).length - (personality.match(CALM) || []).length;
  // Tempo: larger and later-stage forms move more slowly and with less travel; a lively temperament quickens, a calm one slows.
  const sizeK = { small: 0.85, medium: 1, large: 1.25 }[spec.size] ?? 1;
  const tempo = Math.round(1000 * sizeK * (1 + 0.1 * stage) * (lively > 0 ? 0.85 : lively < 0 ? 1.18 : 1) * (0.92 + 0.16 * hash01(familyId)));
  const amp = +(({ small: 1.15, medium: 1, large: 0.8 }[spec.size] ?? 1) * (look === 'cute' ? 1.15 : look === 'fierce' ? 0.95 : 1) * (lively > 0 ? 1.1 : 1)).toFixed(2);
  const facing = ['quadruped', 'serpent', 'shelled'].includes(body) ? 'left' : 'front'; // side-view templates face left; the rest face the viewer
  let idle, tap, rare;
  switch (body) {
    case 'quadruped': idle = 'breathe'; tap = look === 'fierce' ? 'pounce' : 'hop'; rare = 'zoomies'; break;
    case 'biped': idle = 'sway'; tap = look === 'fierce' ? 'stomp' : 'jump'; rare = look === 'cute' ? 'twirl' : 'cheer'; break;
    case 'blob': idle = 'squish'; tap = 'boing'; rare = 'wobble'; break;
    case 'serpent': idle = 'slither'; tap = 'rear'; rare = 'coil'; break;
    case 'avian': idle = wings ? 'hover' : 'bob'; tap = wings ? 'flutter' : 'hop'; rare = wings ? 'flyby' : 'strut'; break;
    case 'insectoid': idle = 'twitch'; tap = 'skitter'; rare = wings ? 'buzz' : 'scuttle'; break;
    case 'shelled': idle = 'slow-breathe'; tap = 'tuck'; rare = 'roll'; break;
    default: idle = 'breathe'; tap = 'hop'; rare = 'cheer';
  }
  const glow = feats.has('glow') || feats.has('halo') || spec.rarity === 'legendary';
  const words = { breathe: 'breathes', sway: 'sways', squish: 'squishes', slither: 'sways from its base', hover: 'hovers on its wings', bob: 'bobs', twitch: 'twitches', 'slow-breathe': 'breathes slowly' };
  const label = `${body}${wings ? ', winged' : ''} · ${look} · idle ${words[idle] || idle} · tap ${tap} · rare ${rare}${glow ? ' · glow pulse' : ''} · ${lively > 0 ? 'lively' : lively < 0 ? 'calm' : 'even'} temperament (${tempo} ms)`;
  return { body, idle, tap, rare, tempo, amp, glow, facing, label };
}

/** Is movement allowed? The OS preference or the game's reduced-motion setting turns it off. */
export function motionReduced() {
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.reducedMotion === '1') return true;
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Attributes for the sprite wrapper: the idle loop is pure CSS (it stops when the element leaves the page). */
export function motionAttrs(familyId, stage) {
  const m = dexMotion(familyId, stage); if (!m) return '';
  return `data-idle="${m.idle}" ${m.glow ? 'data-glow="1"' : ''} style="--dex-tempo:${m.tempo}ms;--dex-amp:${m.amp};--dex-phase:${Math.round(hash01(`${familyId}:${stage}`) * -m.tempo)}ms"`;
}

// Keyframes for one-shot reactions. Units: P is one sprite pixel (the rendered sprite width / 16). Values are multiplied by the form's amplitude.
const F = (frames) => frames;
function reactionFrames(kind, a, dir, P = 6) {
  const px = (n) => `${(n * a * P).toFixed(1)}px`;
  const t = (x, y, extra = '') => `translate(${px(x)}, ${px(y)})${extra}`;
  const run = dir === 'left' ? -1 : 1;
  switch (kind) {
    case 'hop': return F([{ transform: t(0, 0) }, { transform: t(0, 0, ' scale(1.06, .9)'), offset: 0.15 }, { transform: t(0, -3, ' scale(.96, 1.06)'), offset: 0.45 }, { transform: t(0, 0, ' scale(1.08, .9)'), offset: 0.75 }, { transform: t(0, 0) }]);
    case 'pounce': return F([{ transform: t(0, 0) }, { transform: t(-run * 1, 0, ' scale(1.04, .92)'), offset: 0.3 }, { transform: t(run * 3, -1.5), offset: 0.55 }, { transform: t(run * 2, 0, ' scale(1.06, .94)'), offset: 0.75 }, { transform: t(0, 0) }]);
    case 'jump': return F([{ transform: t(0, 0) }, { transform: t(0, 0.5, ' scale(1.05, .92)'), offset: 0.15 }, { transform: t(0, -4), offset: 0.5 }, { transform: t(0, 0, ' scale(1.05, .93)'), offset: 0.8 }, { transform: t(0, 0) }]);
    case 'stomp': return F([{ transform: t(0, 0) }, { transform: t(0, -2), offset: 0.35 }, { transform: t(0, 0.5, ' scale(1.07, .9)'), offset: 0.55 }, { transform: t(-0.5, 0), offset: 0.65 }, { transform: t(0.5, 0), offset: 0.75 }, { transform: t(0, 0) }]);
    case 'boing': return F([{ transform: t(0, 0) }, { transform: t(0, 0, ' scale(1.2, .78)'), offset: 0.2 }, { transform: t(0, -3, ' scale(.86, 1.16)'), offset: 0.45 }, { transform: t(0, 0, ' scale(1.14, .86)'), offset: 0.7 }, { transform: t(0, 0, ' scale(.96, 1.04)'), offset: 0.85 }, { transform: t(0, 0) }]);
    case 'rear': return F([{ transform: t(0, 0) }, { transform: t(0, -1.5, ' scale(.95, 1.14)'), offset: 0.4 }, { transform: t(0, -1.5, ' scale(.95, 1.14) skewX(-4deg)'), offset: 0.6 }, { transform: t(0, 0) }]);
    case 'flutter': return F([{ transform: t(0, 0) }, { transform: t(0, -3), offset: 0.2 }, { transform: t(0, -2), offset: 0.35 }, { transform: t(0, -4), offset: 0.5 }, { transform: t(0, -2.5), offset: 0.65 }, { transform: t(0, 0) }]);
    case 'skitter': return F([{ transform: t(0, 0) }, { transform: t(-1.5, 0), offset: 0.15 }, { transform: t(1.5, 0), offset: 0.35 }, { transform: t(-1, 0), offset: 0.55 }, { transform: t(1, 0), offset: 0.75 }, { transform: t(0, 0) }]);
    case 'tuck': return F([{ transform: t(0, 0) }, { transform: t(0, 1, ' scale(.88, .8)'), offset: 0.3 }, { transform: t(0, 1, ' scale(.88, .8)'), offset: 0.6 }, { transform: t(0, -0.5, ' scale(1.04, 1.04)'), offset: 0.82 }, { transform: t(0, 0) }]);
    // rare
    case 'zoomies': return F([{ transform: t(0, 0) }, { transform: `translateX(${run * 130}%)`, offset: 0.3 }, { transform: `translateX(${-run * 130}%)`, offset: 0.31 }, { transform: `translateX(${-run * 130}%)`, offset: 0.45 }, { transform: t(0, 0), offset: 0.75 }, { transform: t(0, -2), offset: 0.85 }, { transform: t(0, 0) }]);
    case 'cheer': return F([{ transform: t(0, 0) }, { transform: t(0, -4), offset: 0.2 }, { transform: t(0, 0, ' scale(1.05, .93)'), offset: 0.38 }, { transform: t(0, -5), offset: 0.6 }, { transform: t(0, 0, ' scale(1.05, .93)'), offset: 0.82 }, { transform: t(0, 0) }]);
    case 'twirl': return F([{ transform: t(0, 0) }, { transform: t(0, -3, ' scaleX(1)'), offset: 0.2 }, { transform: t(0, -3, ' scaleX(-1)'), offset: 0.4 }, { transform: t(0, -3, ' scaleX(1)'), offset: 0.6 }, { transform: t(0, 0, ' scale(1.05, .93)'), offset: 0.82 }, { transform: t(0, 0) }]);
    case 'wobble': return F([{ transform: t(0, 0) }, { transform: t(0, 0, ' scale(1.2, .8)'), offset: 0.12 }, { transform: t(0, -3, ' scale(.85, 1.15)'), offset: 0.28 }, { transform: t(0, 0, ' scale(1.2, .8)'), offset: 0.44 }, { transform: t(0, -2, ' scale(.9, 1.1)'), offset: 0.6 }, { transform: t(0, 0, ' scale(1.1, .9) skewX(6deg)'), offset: 0.72 }, { transform: t(0, 0, ' skewX(-5deg)'), offset: 0.84 }, { transform: t(0, 0) }]);
    case 'coil': return F([{ transform: t(0, 0) }, { transform: t(0, -1, ' scale(.96, 1.1) skewX(8deg)'), offset: 0.2 }, { transform: t(0, -1, ' scale(.96, 1.1) skewX(-8deg)'), offset: 0.4 }, { transform: t(0, -2, ' scale(.94, 1.16) skewX(6deg)'), offset: 0.6 }, { transform: t(0, -1, ' skewX(-4deg)'), offset: 0.8 }, { transform: t(0, 0) }]);
    case 'flyby': return F([{ transform: t(0, 0) }, { transform: t(0, -2), offset: 0.12 }, { transform: 'translate(0, -160%)', offset: 0.35 }, { transform: 'translate(0, -160%)', offset: 0.5 }, { transform: t(0, -3), offset: 0.78 }, { transform: t(0, 0) }]);
    case 'strut': return F([{ transform: t(0, 0) }, { transform: t(-2, -1), offset: 0.2 }, { transform: t(-3, 0), offset: 0.35 }, { transform: t(-3, 0, ' scaleX(-1)'), offset: 0.45 }, { transform: t(2, -1, ' scaleX(-1)'), offset: 0.65 }, { transform: t(2, 0), offset: 0.8 }, { transform: t(0, 0) }]);
    case 'buzz': return F([{ transform: t(0, 0) }, { transform: t(-3, -3), offset: 0.2 }, { transform: t(0, -5), offset: 0.4 }, { transform: t(3, -3), offset: 0.6 }, { transform: t(0, -1), offset: 0.8 }, { transform: t(0, 0) }]);
    case 'scuttle': return F([{ transform: t(0, 0) }, { transform: t(-3, 0), offset: 0.2 }, { transform: t(-3, 0, ' scaleX(-1)'), offset: 0.3 }, { transform: t(3, 0, ' scaleX(-1)'), offset: 0.6 }, { transform: t(3, 0), offset: 0.7 }, { transform: t(0, 0) }]);
    case 'roll': return F([{ transform: t(0, 0) }, { transform: t(0, 1, ' scale(.9, .82)'), offset: 0.15 }, { transform: `${t(run * 4, 0)} rotate(${run * 360}deg) scale(.9)`, offset: 0.55 }, { transform: `${t(0, 0)} rotate(${run * 360}deg) scale(.9)`, offset: 0.8 }, { transform: `${t(0, 0)} rotate(${run * 360}deg)` }]);
    default: return F([{ transform: t(0, 0) }, { transform: t(0, -2), offset: 0.5 }, { transform: t(0, 0) }]);
  }
}
const DURATION = { hop: 1.1, pounce: 1, jump: 1.1, stomp: 1.1, boing: 1.2, rear: 1.3, flutter: 1.1, skitter: 0.9, tuck: 1.4, zoomies: 2.2, cheer: 1.8, twirl: 1.8, wobble: 2, coil: 2, flyby: 2.4, strut: 2.2, buzz: 1.8, scuttle: 2, roll: 2 };

/**
 * Play the tap or rare reaction on a profile's portrait. `detail` is the beast-dex-reaction event detail. Returns the Animation (or
 * null when movement is reduced). Sparkles for a rare reaction are removed when they finish, or when the signal aborts.
 */
export function playDexReaction(portrait, detail, { signal } = {}) {
  const wrap = portrait?.querySelector('[data-dex-sprite]'); if (!wrap || !detail) return null;
  const m = dexMotion(detail.familyId, detail.stage); if (!m) return null;
  for (const a of wrap.getAnimations?.() || []) if (a.id === 'dex-reaction') a.cancel();
  portrait.querySelectorAll('.dexp-spark').forEach((s) => s.remove());
  if (motionReduced() || typeof wrap.animate !== 'function') return null;
  const kind = detail.rare ? m.rare : m.tap;
  const P = (wrap.querySelector('svg')?.getBoundingClientRect().width || 96) / 16;
  const anim = wrap.animate(reactionFrames(kind, m.amp, m.facing, P), { duration: Math.round((DURATION[kind] || 1.2) * m.tempo * (detail.rare ? 1 : 0.8)), easing: 'ease-in-out', id: 'dex-reaction' });
  anim.id = 'dex-reaction';
  wrap.classList.add('reacting'); const done = () => wrap.classList.remove('reacting');
  anim.onfinish = done; anim.oncancel = done;
  if (detail.rare) {
    const host = portrait.querySelector('.dexp-stage-art') || portrait;
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('i'); s.className = 'dexp-spark'; s.setAttribute('aria-hidden', 'true');
      const ang = (i / 8) * Math.PI * 2; const r = 46 + (i % 2) * 14;
      host.appendChild(s);
      const sa = s.animate([{ transform: 'translate(-50%, -50%) scale(0)', opacity: 0 }, { transform: `translate(calc(-50% + ${Math.round(Math.cos(ang) * r * 0.5)}px), calc(-50% + ${Math.round(Math.sin(ang) * r * 0.5)}px)) scale(1)`, opacity: 1, offset: 0.4 }, { transform: `translate(calc(-50% + ${Math.round(Math.cos(ang) * r)}px), calc(-50% + ${Math.round(Math.sin(ang) * r)}px)) scale(.5)`, opacity: 0 }], { duration: 900, delay: 150 + i * 40, easing: 'steps(6, end)', fill: 'both' });
      sa.onfinish = () => s.remove();
    }
  }
  signal?.addEventListener('abort', () => { anim.cancel(); portrait.querySelectorAll('.dexp-spark').forEach((s) => s.remove()); }, { once: true });
  return anim;
}
