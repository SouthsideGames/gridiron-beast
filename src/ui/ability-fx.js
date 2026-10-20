// Ability presentation (polish 2.0, GDD §23). Purely cosmetic: reads the
// engine's event log (`kind: 'ability'` with the effect `key`, and outcome
// events flagged `ability: true`) and draws, per frame, the sequence
//   activation (0 to 0.35 s): element badge + pulse ring at the monster
//   action     (0 to 1.2 s):  a short elemental effect that follows the monster
//   outcome    (0.9 s):       a label ("Block Shed") at the contact, only when
//                             the engine logged that outcome for an ability monster.
// Abilities with a signature look (ability-sigs.js) draw their own effect; the rest
// fall back to the shared family shapes below. Drawing is split in two layers so
// the monsters stay on top of ground effects (owner's note): `under` and `over`.
// Effects are data: ELEMENT_FX picks the look, FAMILY (from the effect key)
// picks the shape. Particles are deterministic (hash of slot and index), so a
// frame redraws identically and nothing flickers. Nothing here touches the sim.

import { SIG, statusMarks } from './ability-sigs.js';
import { SPECIES_DEX } from '../data/species.js';

/**
 * Common monsters' shared traits (polish 2.0): a small icon, deliberately less than a signature
 * ability. One at a time, only near the ball, never while a signature effect is playing.
 */
export const TRAIT_CUE = Object.freeze({ quick_feet: '💨', anchor: '🧱', hard_hitter: '💥', slick: '🫧', sticky: '🧲', sharp_eyes: '👀', soft_hands: '🧤', bull_rush: '🐂' });
const TRAIT_OF = Object.fromEntries(SPECIES_DEX.filter((s) => s.trait).map((s) => [s.id, s.trait]));
export { statusMarks };

const FAMILY_OF = {
  burst: 'move', afterCatch: 'move', rushSpeed: 'move', closeSpeed: 'move', pursuitSpeed: 'move', routeAgility: 'move', elusive: 'move', elusiveFirst: 'move',
  blockStrength: 'block', anchor: 'block', rebound: 'block',
  shedStrength: 'contact', runStuff: 'contact', carryStrength: 'contact', noFumble: 'contact', forceFumble: 'contact', reaction: 'contact', blockerStun: 'contact',
  deepThrow: 'throw', openAccuracy: 'throw', throwVelocity: 'throw', pressureSense: 'throw',
  manCoverage: 'cover', contest: 'cover', breakRadius: 'cover', zoneRange: 'cover', pickCatching: 'cover', catchContest: 'cover', noPlayActionBite: 'cover', aura: 'aura',
  attrs: 'passive', fatigue: 'passive', fumbleResist: 'passive',
  // Built to match their cards (GDD §23.11)
  eruption: 'contact', permafrost: 'contact', roar: 'contact', quakeStep: 'contact',
  riptide: 'block', landslide: 'block', glacierWall: 'block',
  cyclone: 'move', eclipse: 'move', daybreak: 'move', blink: 'move', overcharge: 'move', radiantPursuit: 'move', ambush: 'move',
  thunderclap: 'throw', sovereign: 'throw', tailwind: 'throw',
  undertow: 'cover', whiteout: 'cover', nightVeil: 'cover', refraction: 'cover', heatHaze: 'cover', fortress: 'cover', staticField: 'cover', wingShadow: 'cover',
  grove: 'aura',
  pincer: 'contact', deepRoots: 'block', bramble: 'contact', vanishing: 'move', foresight: 'throw', echoRead: 'cover', mindGame: 'move', dragonhide: 'block', longKick: 'passive',
};
export const FAMILY_LABEL = { move: 'Movement', block: 'Blocking', contact: 'Contact', throw: 'Passing', cover: 'Coverage', aura: 'Aura', passive: 'Passive' };
export function familyOf(key) { return FAMILY_OF[key] || 'contact'; }

/** Per-element look: two colours (bright, deep), a badge glyph and a particle style. */
export const ELEMENT_FX = Object.freeze({
  Fire:     { a: '#ffb13d', b: '#ff5a2a', glyph: '🔥', style: 'trail' },
  Water:    { a: '#7fe0ff', b: '#2f8fd6', glyph: '💧', style: 'ripple' },
  Nature:   { a: '#b6f06a', b: '#3f9a3a', glyph: '🍃', style: 'leaves' },
  Electric: { a: '#fff36a', b: '#ffd000', glyph: '⚡', style: 'sparks' },
  Ice:      { a: '#e6f7ff', b: '#8ac6ff', glyph: '❄', style: 'shards' },
  Wind:     { a: '#dffdf6', b: '#7ad8c8', glyph: '🌀', style: 'streaks' },
  Earth:    { a: '#d8c39a', b: '#8a6a44', glyph: '🪨', style: 'dust' },
  Dark:     { a: '#9a7ad6', b: '#2a1a4a', glyph: '🌑', style: 'smoke' },
  Light:    { a: '#fff6c8', b: '#ffd84a', glyph: '✦', style: 'rays' },
  Metal:    { a: '#f4f4f8', b: '#9aa3b8', glyph: '⚙', style: 'flash' },
  Psychic:  { a: '#ff9ae6', b: '#a04ad6', glyph: '◎', style: 'pulse' },
  Dragon:   { a: '#ffd36a', b: '#c03a6a', glyph: '🐉', style: 'flare' },
});
const DEFAULT_FX = { a: '#ffe36c', b: '#c99a1a', glyph: '✦', style: 'flash' };
export function elementFx(element) { return ELEMENT_FX[element] || DEFAULT_FX; }

/** Outcome labels, keyed by event kind. Only shown when the event carries `ability: true`. */
const OUTCOME = {
  shed: { label: 'Block Shed', shake: true }, broken: { label: 'Tackle Broken', shake: true }, broken_tackle: { label: 'Tackle Broken', shake: true },
  juke: { label: 'Juked', shake: false }, fumble: { label: 'Ball Stripped', shake: true }, interception: { label: 'Picked Off', shake: true },
  incomplete: { label: 'Pass Deflected', shake: false, only: (e) => e.pbu }, sack: { label: 'Sacked', shake: true },
  tackle: { label: 'Read & Stopped', shake: false },
  flattened: { label: 'Flattened', shake: true }, blink: { label: 'Blink!', shake: true }, read_frozen: { label: 'Read Frozen', shake: false },
  sack_denied: { label: 'Sack Denied', shake: true }, pick_denied: { label: 'Pick Denied', shake: false }, no_breakup: { label: 'Too Fast', shake: false },
  spun: { label: 'Spun Around', shake: false }, lost_track: { label: 'Lost Him', shake: false }, falls_forward: { label: '+2 Yards', shake: false },
  stuffed: { label: 'Frozen', shake: true }, dragged: { label: 'Dragged Wide', shake: false }, slipped: { label: 'Slipped the Block', shake: false },
  pinched: { label: 'Pinned', shake: false }, vanished: { label: 'Vanished', shake: false }, thorned: { label: 'Thorned', shake: false }, bit_fake: { label: 'Bit the Fake', shake: false }, roared: { label: 'Roar!', shake: true }, catch: { label: 'Contested Catch', shake: false, only: (e) => e.contested },
};
export const OUTCOME_LABELS = Object.freeze(Object.fromEntries(Object.entries(OUTCOME).map(([k, v]) => [k, v.label])));

export const ACTIVATION = 0.35, ACTION = 1.2, LABEL = 0.9;

/**
 * Review revisions (GDD §23.7). An ability's review fingerprint covers its data
 * (name, text, effect, element look, family); drawing code is not data, so when
 * the way a family or a single ability is drawn changes, bump its number here and
 * the owner is asked to look again. `all` re-opens every ability.
 */
export const FX_REVISION = Object.freeze({ all: 1, family: {}, species: {} });
export const MAX_FX = 2, MAX_LABELS = 1;

/**
 * Build the per-play effect list once (at animation start).
 * @param {object} sim engine output ({events, frames})
 * @param {(team:string, slot:string) => {element?:string, name?:string}|null} lookup monster for a slot
 */
export function buildFx(sim, lookup) {
  const events = sim?.events || [];
  const fx = [];
  const frames = sim?.frames || [];
  const at = (team, slot, t) => { let best = null; for (const fr of frames) { if (fr.t > t + 1e-6) break; const p = (team === 'off' ? fr.off : fr.def).find((q) => q[0] === slot); if (p) best = p; } return best; };
  const traits = [];
  for (const e of events) {
    if (e.kind !== 'ability') continue;
    if (e.trait) { const m = lookup?.(e.side, e.by); const cue = TRAIT_CUE[TRAIT_OF[m?.species]]; if (cue) traits.push({ team: e.side, slot: e.by, t0: e.t, cue }); continue; }
    const m = lookup?.(e.side, e.by) || null;
    const family = familyOf(e.key);
    if (family === 'passive') continue;
    const nm = /^(.*)'s (.*) kicks in$/.exec(e.text || '');
    const sig = m?.species ? SIG[m.species] : null; const dur = sig?.dur || ACTION;
    const f = { team: e.side, slot: e.by, t0: e.t, dur, family, key: e.key, species: m?.species || null, sig, element: m?.element || null, look: elementFx(m?.element), name: nm ? nm[2] : 'Ability', outcome: null, victim: null, victimTeam: null, target: null };
    // Its path during the effect (ground trails), where it started (cyclone, cracks, smoke), and teammates nearby (roots, plates).
    f.path = frames.filter((fr) => fr.t >= e.t - 0.05 && fr.t <= e.t + dur).map((fr) => { const p = (e.side === 'off' ? fr.off : fr.def).find((q) => q[0] === e.by); return p ? [fr.t, p[1], p[2]] : null; }).filter(Boolean);
    const start = at(e.side, e.by, e.t); f.origin = start ? [start[1], start[2]] : null;
    if (start && (e.key === 'grove' || e.key === 'aura')) { const fr = frames.find((q) => q.t >= e.t) || frames[0]; const radius = e.key === 'grove' ? 5 : 2.6; f.mates = (e.side === 'off' ? fr.off : fr.def).filter((q) => q[0] !== e.by && Math.hypot(q[1] - start[1], q[2] - start[2]) <= radius).map((q) => q[0]); }
    const thr = family === 'throw' ? events.find((x) => x.kind === 'throw' && x.t >= e.t - 0.2) : [...events].reverse().find((x) => x.kind === 'throw' && x.t <= e.t + 0.05); if (thr) f.target = thr.target; // the receiver: of this throw, or of the ball he is covering
    fx.push(f);
  }
  const labels = [];
  for (const e of events) {
    const o = OUTCOME[e.kind]; if (!o || !e.ability || (o.only && !o.only(e))) continue;
    if (labels.some((l) => l.t === e.t && l.slot === e.by && l.label === o.label)) continue; // 'broken' and 'broken_tackle' log the same hit twice
    const owner = fx.find((f) => f.team === e.side && f.slot === e.by);
    labels.push({ t: e.t, team: e.side, slot: e.by, victim: e.victim || null, label: o.label, shake: o.shake, look: owner?.look || DEFAULT_FX, name: owner?.name || null, from: e.fromX != null ? [e.fromX, e.fromY] : null });
    if (owner) { owner.outcome = e.t; if (e.victim && !owner.victim) { owner.victim = e.victim; owner.victimTeam = e.side === 'off' ? 'def' : 'off'; } if (e.kind === 'blink' && e.fromX != null) owner.origin = [e.fromX, e.fromY]; }
  }
  // Major impacts shake on their own too (sacks and fumbles), ability or not.
  const shakes = events.filter((e) => (e.kind === 'sack' || e.kind === 'fumble') && !labels.some((l) => l.t === e.t)).map((e) => e.t);
  // Every tackle and sack gets a short contact ring (movement state), ability or not.
  const contacts = events.filter((e) => e.kind === 'tackle' || e.kind === 'sack').map((e) => ({ t: e.t, team: e.side, slot: e.by }));
  return { fx, labels, contacts, traits, shakes: shakes.concat(labels.filter((l) => l.shake).map((l) => l.t)) };
}

/** A new frame crossed an impact: true once per impact (previous frame time → this one). */
export function shakeBetween(state, tPrev, tNow) { return !!state?.shakes?.some((t) => t > tPrev && t <= tNow); }

// Deterministic 0..1 from integers (no flicker between redraws of the same frame).
function h(a, b, c = 0) { let x = (a * 374761393 + b * 668265263 + c * 2246822519) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
const f2 = (n) => (+n).toFixed(2);

/**
 * SVG for one frame. `pos(team, slot)` returns [cx, cy, dx, dy] in SVG units
 * (dx, dy = movement since the previous frame) or null; `t` is the frame time.
 * `quality`: 'full' | 'low' (fewer particles) | 'min' (badges and labels only).
 */
export function fxSvg(state, t, pos, { quality = 'full', seed = 0, halfWidth = 26, toSvg = null, ball = null, pball = null } = {}) {
  if (!state) return { under: '', over: '', ball: '' };
  const cl = (x, pad) => Math.max(-halfWidth + pad, Math.min(halfWidth - pad, x)); // keep text inside the field
  let s = '', u = '', bl = '';
  const live = state.fx.filter((f) => t >= f.t0 && t - f.t0 < (f.dur || ACTION));
  // Priority: an effect that produced an outcome, then contact/move (the ball is there), then the rest; cap for readability.
  const rank = (f) => (f.outcome != null ? 0 : f.family === 'contact' || f.family === 'move' ? 1 : f.family === 'throw' ? 2 : 3) * 10 + (t - f.t0);
  live.sort((p, q) => rank(p) - rank(q));
  const labs = state.labels.filter((l) => t >= l.t && t - l.t < LABEL).sort((a, b) => b.t - a.t).slice(0, MAX_LABELS);
  let named = false; // one ability name at a time, and none while an outcome label is up: text never piles up
  for (const f of live.slice(0, MAX_FX)) {
    const p = pos(f.team, f.slot); if (!p) continue;
    const [cx, cy, dx, dy] = p; const age = t - f.t0; const k = age / (f.dur || ACTION); // 0 → 1
    const L = f.look;
    // Activation: pulse ring and badge.
    if (age < ACTIVATION + 0.25) {
      const ka = Math.min(1, age / ACTIVATION);
      u += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(1.6 + ka * 2.4)}" fill="none" stroke="${L.a}" stroke-width="${f2(0.6 * (1 - ka) + 0.12)}" opacity="${f2(1 - ka * 0.8)}"/>`;
    }
    if (age < 0.8 && !named && !labs.length) {
      named = true; const kb = age / 0.8;
      s += `<g opacity="${f2(1 - kb * kb)}"><text x="${f2(cl(cx, 8))}" y="${f2(cy - (f.sig?.o ? 6.6 : 3.1) - kb * 1.2)}" text-anchor="middle" font-size="2.2" font-weight="900" fill="${L.a}" stroke="#0b1a14" stroke-width="0.4" paint-order="stroke">${L.glyph} ${esc(f.name)}</text></g>`;
    } else if (age < 0.8) {
      s += `<text x="${f2(cx)}" y="${f2(cy - 3)}" text-anchor="middle" font-size="2" opacity="${f2(1 - age / 0.8)}">${L.glyph}</text>`;
    }
    if (quality === 'min') continue;
    if (f.sig) { // a signature look: the ability draws itself
      const vp = f.victim ? pos(f.victimTeam, f.victim) : null; const tp = f.target ? pos('off', f.target) : null;
      const c = { cx, cy, dx, dy, age, k, fade: k > 0.75 ? (1 - k) / 0.25 : 1, L, t, team: f.team, sid: (f.slot.charCodeAt(0) * 31 + f.slot.length) + seed * 7,
        path: toSvg ? f.path.filter((q) => q[0] <= t + 1e-6).map((q) => toSvg(q[1], q[2])) : [], victim: vp ? [vp[0], vp[1]] : null, target: tp ? [tp[0], tp[1]] : null,
        origin: f.origin && toSvg ? toSvg(f.origin[0], f.origin[1]) : null, ball, pball, mates: (f.mates || []).map((sl) => pos(f.team, sl)).filter(Boolean).map((q) => [q[0], q[1]]) };
      if (f.sig.u) u += f.sig.u(c); if (f.sig.o) s += f.sig.o(c); if (f.sig.b) bl += f.sig.b(c);
    } else u += particles(f, cx, cy, dx, dy, age, k, quality === 'low' ? 0.5 : 1, seed);
  }
  for (const c of state.contacts || []) {
    const age = t - c.t; if (age < 0 || age >= 0.3) continue; const p = pos(c.team, c.slot); if (!p) continue;
    const kr = age / 0.3; u += `<circle cx="${f2(p[0])}" cy="${f2(p[1])}" r="${f2(1.2 + kr * 1.6)}" fill="none" stroke="#ffffff" stroke-width="${f2(0.4 * (1 - kr))}" opacity="${f2(0.8 * (1 - kr))}"/>`;
  }
  // A trait cue (commons): only when nothing signature is on screen, the one nearest the ball, within 6 yards of it.
  if (quality !== 'min' && !live.length && !labs.length && ball && state.traits?.length) {
    const cands = state.traits.filter((q) => t >= q.t0 && t - q.t0 < 0.6).map((q) => { const p = pos(q.team, q.slot); return p ? { q, p, d: Math.hypot(p[0] - ball[0], p[1] - ball[1]) } : null; }).filter((c) => c && c.d < 6).sort((a, b) => a.d - b.d);
    const c = cands[0]; if (c) { const age = t - c.q.t0; s += `<text x="${f2(c.p[0])}" y="${f2(c.p[1] - 3.2 - age)}" text-anchor="middle" font-size="1.6" opacity="${f2(0.9 * (1 - age / 0.6))}">${c.q.cue}</text>`; }
  }
  // Outcome labels (newest first, capped).
  for (const l of labs) {
    const p = pos(l.team, l.slot); if (!p) continue;
    // A teleport (Blink): an afterimage where he was and a streak to where he is.
    if (l.from && toSvg) { const [fx0, fy0] = toSvg(l.from[0], l.from[1]); const kf = Math.min(1, (t - l.t) / LABEL);
      u += `<line x1="${f2(fx0)}" y1="${f2(fy0)}" x2="${f2(p[0])}" y2="${f2(p[1])}" stroke="${l.look.a}" stroke-width="${f2(0.7 * (1 - kf) + 0.1)}" stroke-dasharray="0.6 0.5" opacity="${f2(1 - kf)}"/>`;
      u += `<circle cx="${f2(fx0)}" cy="${f2(fy0)}" r="${f2(1.4 + kf * 1.5)}" fill="${l.look.a}" opacity="${f2(0.45 * (1 - kf))}"/>`; }
    let [cx, cy] = p; const v = l.victim ? pos(l.team === 'off' ? 'def' : 'off', l.victim) : null;
    if (v) { cx = (cx + v[0]) / 2; cy = Math.min(cy, v[1]); } // over the pair, never on top of them
    const kl = (t - l.t) / LABEL; const scale = kl < 0.15 ? 0.6 + (kl / 0.15) * 0.5 : 1.1 - (kl - 0.15) * 0.12;
    // The box fits its text (about 1.45 units a capital at this size) and the text is held inside it, whatever the label.
    const txt = l.label.toUpperCase(); const w = Math.max(8, txt.length * 1.45 + 2.2);
    s += `<g transform="translate(${f2(cl(cx, w / 2 + 0.6))} ${f2(cy - 6.4 - kl * 1.5)}) scale(${f2(scale)})" opacity="${f2(kl > 0.7 ? (1 - kl) / 0.3 : 1)}">`;
    s += `<rect x="${f2(-w / 2)}" y="-1.9" width="${f2(w)}" height="2.9" rx="0.5" fill="#0b1a14" opacity="0.82" stroke="${l.look.a}" stroke-width="0.18"/>`;
    s += `<text x="0" y="0.35" text-anchor="middle" font-size="2" font-weight="900" fill="${l.look.a}" textLength="${f2(w - 1.8)}" lengthAdjust="spacingAndGlyphs">${esc(txt)}</text></g>`;
    if (kl < 0.3) { const kr = kl / 0.3; u += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(1 + kr * 3)}" fill="none" stroke="#ffffff" stroke-width="${f2(0.5 * (1 - kr))}" opacity="${f2(1 - kr)}"/>`; }
  }
  return { under: u, over: s, ball: bl };
}

function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

/** The elemental action effect: shape from the family, look from the element. */
function particles(f, cx, cy, dx, dy, age, k, density, seed) {
  const L = f.look; const sid = (f.slot.charCodeAt(0) * 31 + f.slot.charCodeAt(1 % f.slot.length)) + seed * 7;
  const n = Math.round((f.family === 'move' ? 7 : f.family === 'aura' ? 6 : 5) * density);
  const speed = Math.hypot(dx, dy); const bx = speed > 0.05 ? -dx / speed : 0, by = speed > 0.05 ? -dy / speed : (f.team === 'off' ? 1 : -1); // unit vector behind the monster
  let s = '';
  const fade = 1 - k; // whole-effect fade
  // Element glow at the feet while the effect runs: the one cue that reads at any size.
  if (f.family !== 'aura') s += `<ellipse cx="${f2(cx)}" cy="${f2(cy + 0.75)}" rx="${f2(2.1 + Math.sin(age * 12) * 0.15)}" ry="0.95" fill="${L.a}" opacity="${f2(0.42 * fade)}"/>`;
  switch (f.family) {
    case 'move': {
      // A trail behind the monster, in the element's style.
      for (let i = 0; i < n; i++) {
        const r1 = h(sid, i, 1), r2 = h(sid, i, 2); const d = 1.3 + i * 0.7 + r1 * 0.4; const side = (r2 - 0.5) * 1.8;
        const px = cx + bx * d + (-by) * side, py = cy + by * d + bx * side; const op = fade * (1 - i / (n + 1));
        s += shapeFor(L, px, py, op, i, age, bx, by, r1);
      }
      break;
    }
    case 'block': {
      // A shield arc in front of the blocker (facing the ball side: up for offense) and ground marks.
      const up = f.team === 'off' ? -1 : 1;
      const arc = 2.3 + Math.sin(age * 9) * 0.15;
      s += `<path d="M ${f2(cx - arc)} ${f2(cy)} A ${f2(arc)} ${f2(arc)} 0 0 ${up < 0 ? 1 : 0} ${f2(cx + arc)} ${f2(cy)}" fill="none" stroke="${L.a}" stroke-width="0.5" opacity="${f2(0.85 * fade)}" stroke-linecap="round"/>`;
      s += `<path d="M ${f2(cx - arc + 0.5)} ${f2(cy + up * -0.35)} A ${f2(arc - 0.5)} ${f2(arc - 0.5)} 0 0 ${up < 0 ? 1 : 0} ${f2(cx + arc - 0.5)} ${f2(cy + up * -0.35)}" fill="none" stroke="${L.b}" stroke-width="0.25" opacity="${f2(0.6 * fade)}"/>`;
      for (let i = 0; i < n; i++) { const r = h(sid, i, 3); const px = cx - 2 + r * 4, py = cy + 1.1 + h(sid, i, 4) * 0.8 - age * 0.3; s += shapeFor(L, px, py, fade * 0.8, i, age, 0, 1, r); }
      break;
    }
    case 'contact': {
      // A burst outward from the body at impact, settling fast.
      const kk = Math.min(1, age / 0.6);
      for (let i = 0; i < n + 2; i++) {
        const ang = (i / (n + 2)) * Math.PI * 2 + h(sid, i, 5) * 0.6; const d = 0.8 + kk * (2.2 + h(sid, i, 6) * 1.2);
        s += shapeFor(L, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.7, (1 - kk) * 0.95, i, age, Math.cos(ang), Math.sin(ang), h(sid, i, 7));
      }
      if (age < 0.25) s += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(0.6 + age * 8)}" fill="${L.a}" opacity="${f2(0.5 * (1 - age / 0.25))}"/>`;
      break;
    }
    case 'throw': {
      // A flare at the passer's hand and a ring that expands once.
      const kk = Math.min(1, age / 0.5);
      s += `<circle cx="${f2(cx)}" cy="${f2(cy - 0.6)}" r="${f2(0.4 + kk * 3.4)}" fill="none" stroke="${L.a}" stroke-width="${f2(0.45 * (1 - kk) + 0.08)}" opacity="${f2((1 - kk) * 0.9)}"/>`;
      for (let i = 0; i < n; i++) { const ang = -Math.PI / 2 + (i - n / 2) * 0.35; const d = 1.2 + kk * 2.4 + h(sid, i, 8); s += shapeFor(L, cx + Math.cos(ang) * d, cy - 0.6 + Math.sin(ang) * d, fade * 0.9, i, age, Math.cos(ang), Math.sin(ang), h(sid, i, 9)); }
      break;
    }
    case 'cover': {
      // A sweeping sight line / lock ring around the defender.
      const r = 2.2; const sweep = age * 7;
      s += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${L.b}" stroke-width="0.22" opacity="${f2(0.55 * fade)}" stroke-dasharray="1.2 0.8" transform="rotate(${f2(sweep * 57)} ${f2(cx)} ${f2(cy)})"/>`;
      for (let i = 0; i < 3; i++) { const ang = sweep + (i * Math.PI * 2) / 3; s += shapeFor(L, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, fade * 0.9, i, age, Math.cos(ang), Math.sin(ang), h(sid, i, 10)); }
      break;
    }
    case 'aura': {
      // A wide slow ring: the effect reaches teammates.
      const r = 2 + (age % 0.9) * 4.5; const op = (1 - (age % 0.9) / 0.9) * 0.6 * fade;
      s += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${L.a}" stroke-width="0.3" opacity="${f2(op)}"/>`;
      for (let i = 0; i < n; i++) { const ang = (i / n) * Math.PI * 2 + age; s += shapeFor(L, cx + Math.cos(ang) * 2.6, cy + Math.sin(ang) * 1.8, fade * 0.7, i, age, 0, 0, h(sid, i, 11)); }
      break;
    }
    default: break;
  }
  return s;
}

/** One pixel-art particle in the element's style at (x, y). (bx, by) is the direction it trails; r a stable random. */
function shapeFor(L, x, y, op, i, age, bx, by, r) {
  if (op <= 0.02) return '';
  const o = f2(Math.min(1, op)); const c = i % 2 ? L.b : L.a;
  switch (L.style) {
    case 'trail':   { const w = 1.1 - r * 0.35; return `<rect x="${f2(x - w / 2)}" y="${f2(y - w / 2)}" width="${f2(w)}" height="${f2(w)}" fill="${c}" opacity="${o}"/>`; }
    case 'sparks':  { const dx = (r - 0.5) * 2, dy = (h(i, 2, 3) - 0.5) * 2; return `<polyline points="${f2(x)},${f2(y)} ${f2(x + dx)},${f2(y + dy)} ${f2(x + dx * 1.6)},${f2(y - dy * 0.4)}" fill="none" stroke="${c}" stroke-width="0.42" stroke-linecap="round" opacity="${o}"/>`; }
    case 'shards':  { const sz = 0.65 + r * 0.45; return `<polygon points="${f2(x)},${f2(y - sz)} ${f2(x + sz * 0.6)},${f2(y)} ${f2(x)},${f2(y + sz)} ${f2(x - sz * 0.6)},${f2(y)}" fill="${c}" opacity="${o}"/>`; }
    case 'streaks': { const len = 1.8 + r; return `<line x1="${f2(x)}" y1="${f2(y)}" x2="${f2(x + bx * len)}" y2="${f2(y + by * len)}" stroke="${c}" stroke-width="0.36" stroke-linecap="round" opacity="${o}"/>`; }
    case 'dust':    { const rr = 0.55 + r * 0.5 + age * 0.3; return `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(rr)}" fill="${c}" opacity="${f2(Math.min(1, op) * 0.7)}"/>`; }
    case 'smoke':   { const rr = 0.5 + r * 0.5 + age * 0.5; return `<circle cx="${f2(x)}" cy="${f2(y - age * 0.4)}" r="${f2(rr)}" fill="${c}" opacity="${f2(Math.min(1, op) * 0.55)}"/>`; }
    case 'rays':    { const len = 1.6 + r * 0.9; return `<line x1="${f2(x - bx * 0.2)}" y1="${f2(y - by * 0.2)}" x2="${f2(x + bx * len)}" y2="${f2(y + by * len)}" stroke="${c}" stroke-width="0.32" opacity="${o}"/>`; }
    case 'flash':   { const sz = 0.7 + r * 0.6; return `<path d="M ${f2(x)} ${f2(y - sz)} L ${f2(x + sz * 0.25)} ${f2(y - sz * 0.25)} L ${f2(x + sz)} ${f2(y)} L ${f2(x + sz * 0.25)} ${f2(y + sz * 0.25)} L ${f2(x)} ${f2(y + sz)} L ${f2(x - sz * 0.25)} ${f2(y + sz * 0.25)} L ${f2(x - sz)} ${f2(y)} L ${f2(x - sz * 0.25)} ${f2(y - sz * 0.25)} Z" fill="${c}" opacity="${o}"/>`; }
    case 'pulse':   { const rr = 0.5 + ((age * 2 + r) % 1) * 1.5; return `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(rr)}" fill="none" stroke="${c}" stroke-width="0.34" opacity="${o}"/>`; }
    case 'ripple':  { const rr = 0.5 + ((age * 1.5 + r) % 1) * 1.1; return `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(rr)}" ry="${f2(rr * 0.55)}" fill="none" stroke="${c}" stroke-width="0.32" opacity="${o}"/>`; }
    case 'leaves':  { const rot = r * 360 + age * 200; return `<rect x="${f2(x - 0.6)}" y="${f2(y - 0.28)}" width="1.2" height="0.56" rx="0.25" fill="${c}" opacity="${o}" transform="rotate(${f2(rot)} ${f2(x)} ${f2(y)})"/>`; }
    case 'flare':   { const sz = 0.7 + r * 0.7; return `<polygon points="${f2(x)},${f2(y - sz * 1.3)} ${f2(x + sz * 0.5)},${f2(y)} ${f2(x)},${f2(y + sz * 0.5)} ${f2(x - sz * 0.5)},${f2(y)}" fill="${c}" opacity="${o}"/>`; }
    default:        return `<rect x="${f2(x - 0.35)}" y="${f2(y - 0.35)}" width="0.7" height="0.7" fill="${c}" opacity="${o}"/>`;
  }
}

/**
 * Movement states for sprites (polish 2.0): facing from lateral movement, a
 * dust puff on a hard cut by the ball carrier, a contact ring on tackles.
 * Returns extra SVG drawn under the sprites. `carrier` = [cx, cy, dx, dy] or null.
 */
export function movementSvg(carrier, { quality = 'full' } = {}) {
  if (!carrier || quality === 'min') return '';
  const [cx, cy, dx, dy] = carrier; const lat = Math.abs(dx), fwd = Math.abs(dy);
  if (lat < 0.45 || lat < fwd * 0.9) return ''; // a hard cut: mostly sideways, fast (>= 4.5 yd/s at 10 fps)
  let s = '';
  for (let i = 0; i < 3; i++) { const r = h(97, i, Math.round(cx * 10)); s += `<circle cx="${f2(cx - Math.sign(dx) * (0.6 + i * 0.5))}" cy="${f2(cy + 0.9 + (r - 0.5) * 0.4)}" r="${f2(0.35 + r * 0.25)}" fill="#e8dcc0" opacity="${f2(0.55 - i * 0.15)}"/>`; }
  return s;
}

/**
 * How long to hold the final frame so effects that fire as the play ends (a label at the tackle,
 * Fortress at an incompletion) are seen: 0 when nothing is running at the end, else up to 0.9 s.
 */
export function endHold(state, lastT) {
  if (!state) return 0; let hold = 0;
  for (const f of state.fx) if (f.t0 <= lastT + 1e-6 && f.t0 + (f.dur || ACTION) > lastT) hold = Math.max(hold, Math.min(0.9, f.t0 + Math.min(f.dur || ACTION, 1.2) - lastT));
  for (const l of state.labels) if (l.t <= lastT + 1e-6 && l.t + LABEL > lastT) hold = Math.max(hold, Math.min(0.9, l.t + LABEL - lastT));
  return Math.max(0, hold);
}
