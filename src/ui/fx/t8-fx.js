// Task 8 football ability presentation (docs/task8/FX_FOOTBALL_MATRIX.md; Dex "Visuals" rows; spec §13). Purely cosmetic: it reads
// the engine's event log (events carrying a Dex `ability` id, the shared `status` events, the field and obstacle records of the play)
// and draws, per frame, each ability's approved look through its phases:
//   anticipation (readiness and charge over the head, pre-snap marks, a wind-up before the event),
//   activation (the event itself: the cue and the primary shape),
//   movement / projectile (snowballs, rocks, crescents, walls that travel, a running tornado),
//   impact and affected-target feedback (marks on the victim, the shared status badge, pushes),
//   persistence (fields decorated by element and ability across plays, obstacles, summons, trails until a later event or the whistle),
//   cleanup (an `ability_end` or the whistle: fade, crumble, retract).
// Looks are data: LOOKS[abilityId] (src/ui/fx/looks/*.js) draws one ability. Nothing here reads into the simulation; frames and
// events are the only inputs, so a frame redraws identically (deterministic particles) and every quality level draws the same
// primary shapes (`countFor` thins secondary particles; 'min' keeps the effect recognizable and the status information visible).
import { f2, h, op, clamp01, ease, elementOf, countFor, ring, blob, text, esc } from './prims.js';
import { LOOKS, AMBIENT } from './looks/index.js';
import { fieldDecor, FIELD_REVEAL } from './fields-fx.js';
import { overheadSvg, STATUS_GLYPH } from './overhead.js';
import { readiness } from './charge.js';

export const DEX_ID = /^[A-Z]{3}-\d\d-F$/;
export const T8_REVISION = 1; // bump when the drawing of a look changes (the reviewer's fingerprint includes it)
const DEFAULT_DUR = 1.2, TAIL = 0.45, CUE = 0.9;
const HOLD_MAX = 0.9;

/** Events a look may start from without a Dex `ability` field (they carry `by` and `side`). */
const EXTRA_KINDS = new Set(['afterimage_end']);

/**
 * Build the Task 8 presentation state for one play. `lookup(team, slot)` -> { element, name, species } | null.
 * `meta` (optional, reviewer / match HUD data): { hud: { 'off:WR1': { status: {id, remaining}, battery: bool, charge: {n, max, ready, cd, cdMax, spent} } },
 * pre: [events logged before the snap (game log lines with a Dex ability id)] }.
 */
export function buildT8(sim, lookup, meta = null) {
  const events = sim?.events || []; const frames = sim?.frames || [];
  const last = frames.length ? frames[frames.length - 1].t ?? 0 : 0;
  const items = []; const badges = []; const spends = [];
  const named = (team, slot) => lookup?.(team, slot) || null;
  const posAt = (team, slot, t) => { let best = null; for (const fr of frames) { if (fr.t > t + 1e-6) break; const p = (team === 'off' ? fr.off : fr.def).find((q) => q[0] === slot); if (p) best = p; } return best; };
  const endOf = (e, look, i) => {
    if (look.until) { for (let j = i + 1; j < events.length; j++) { const x = events[j]; if (look.until.includes(x.kind) && (x.ability === e.ability || x.by === e.by) && x.by === e.by) return { end: x.t + (look.tail ?? TAIL), stop: x.t, stopEv: x }; }
      return { end: last + (look.tail ?? TAIL), stop: last, stopEv: null }; } // no end event before the whistle: the whistle ends it (cleanup)
    if (look.dur === 'play') return { end: last + HOLD_MAX, stop: last, stopEv: null };
    return { end: e.t + (look.dur ?? DEFAULT_DUR), stop: null, stopEv: null };
  };
  // Pre-snap events the host supplies (game-log lines before the snap, e.g. Prism Break): drawn before t = 0.
  const view = sim?.t8view || null; // the rules engine's snap snapshot (rules.js snapView), the default HUD and pre-snap lines
  for (const e of meta?.pre || view?.pre || []) { const look = LOOKS[e.ability]; if (!look?.pre) continue; const m = named(e.side || 'def', e.by || ''); const lead = look.pre.lead ?? 1, dur = look.pre.dur ?? 0.4; const p0 = e.by ? posAt(e.side || 'def', e.by, 0) : null;
    items.push({ id: e.ability, kind: 'pre', phase: null, team: e.side || 'def', slot: e.by || null, t0: 0, start: -lead, dur, end: dur, stop: null, stopEv: null, ev: e, look: look.pre, base: look, L: elementOf(m?.element || look.element), name: m?.name || e.by, label: look.name, species: m?.species || null, main: true, sid: 97 + items.length * 7, origin: p0 ? [p0[1], p0[2]] : null, path: null }); if (e.by) spends.push({ team: e.side || 'def', slot: e.by, t: 0 }); }
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'status') { if (e.accepted && e.victim) badges.push({ team: e.victimSide || (e.side === 'off' ? 'def' : 'off'), slot: e.victim, id: e.status, t0: e.t, remaining: e.remaining ?? null, by: e.by || null }); continue; }
    const id = DEX_ID.test(e.ability || '') ? e.ability : null;
    if (!id && !EXTRA_KINDS.has(e.kind)) continue;
    const look = id ? LOOKS[id] : null; const base = look || LOOKS[Object.keys(LOOKS).find((k) => LOOKS[k].extra?.includes(e.kind))] || null;
    if (!base) continue;
    // The main item is the activation (`start` kind, default 'ability'); an 'ability' event with a phase picks its phase look; other
    // kinds pick their sub-look. A phase or sub-look flagged `main` is the activation for the cue and the charge spend.
    let spec = null, isMain = false;
    if (e.kind === 'ability' && base.phase) { spec = base.phase[e.phase] || null; isMain = !!spec?.main; }
    else if (e.kind === (base.start || 'ability')) { spec = base; isMain = true; }
    else if (base.sub?.[e.kind]) { spec = base.sub[e.kind]; isMain = !!spec.main; }
    if (!spec) continue;
    const team = e.side || 'off'; const slot = e.by;
    const m = named(team, slot); const { end, stop, stopEv } = endOf(e, spec, i);
    const lead = typeof spec.lead === 'function' ? spec.lead(e, events, i) : spec.lead || 0;
    const it = { id: base.id || id, kind: e.kind, phase: e.phase || null, team, slot, t0: e.t, start: e.t - lead, dur: end - e.t, end, stop, stopEv, ev: e, look: spec, base, L: elementOf(m?.element || base.element), name: m?.name || slot, label: base.name, species: m?.species || null, main: isMain, sid: (String(slot).charCodeAt(0) * 31 + String(slot).length + i * 7) };
    const p0 = posAt(team, slot, e.t); it.origin = e.x != null && e.y != null ? [e.x, e.y] : p0 ? [p0[1], p0[2]] : null;
    it.path = spec.path ? frames.filter((fr) => fr.t >= e.t - 0.05 && fr.t <= end).map((fr) => { const p = (team === 'off' ? fr.off : fr.def).find((q) => q[0] === slot); return p ? [fr.t, p[1], p[2]] : null; }).filter(Boolean) : null;
    if (isMain) spends.push({ team, slot, t: e.t });
    items.push(it);
  }
  // Ambient auras: a look that is on while its owner is on the field (no event needed), from the snap to the whistle.
  if (frames.length) for (const team of ['off', 'def']) for (const q of frames[0][team]) { const m = named(team, q[0]); const amb = m?.species ? AMBIENT[m.species] : null; if (!amb) continue;
    items.push({ id: amb.id, kind: 'ambient', team, slot: q[0], t0: 0, start: 0, dur: last + 0.3, end: last + 0.3, stop: last, ev: { by: q[0], side: team }, look: amb, base: amb, L: elementOf(m.element || amb.element), name: m.name, label: amb.name, species: m.species, main: false, sid: q[0].charCodeAt(0) * 13 + 5, origin: [q[1], q[2]], path: null }); }
  // Fields: the play's functional rectangles (play frame), with the reveal of the ones created at this snap (fresh).
  const fields = (sim?.fields || []).map((f) => ({ ...f, lead: f.fresh ? (FIELD_REVEAL[f.ability]?.lead ?? 0) : 0, expiring: !!(f.expires || meta?.expires?.includes(f.ability)) })); // expiring: its clock runs out at this whistle (cleanup)
  const obstacles = sim?.obstacles || [];
  let preroll = Math.max(0, ...items.map((it) => -it.start), ...fields.map((f) => f.lead));
  // A host that does not play time before the snap (the match screen starts at t = 0) gets the pre-snap choreography inside the play:
  // pre-snap lines (Prism Break) move to start at 0, field reveals run from 0, a lead-in before an event at the snap is dropped (the
  // bar over the head is the anticipation there). A host that pre-rolls passes meta.preroll = true and starts at -preroll (reviewer).
  if (!meta?.preroll && preroll > 0) {
    for (const it of items) { if (it.kind === 'pre') { const sh = -it.start; it.start += sh; it.t0 += sh; it.end += sh; } else if (it.start < 0) it.start = 0; }
    for (const f of fields) f.lead = 0;
    preroll = 0;
  }
  const slots = frames.length ? { off: frames[0].off.map((q) => q[0]), def: frames[0].def.map((q) => q[0]) } : { off: [], def: [] };
  return { items, badges, spends, fields, obstacles, last, preroll, slots, hud: meta?.hud || hudOf(view), names: sim?.names || null };
}

/** A fresh field's reveal progress 0..1 at time t (1 when it is not new this play). */
function revealK(f, t) { return f.fresh ? clamp01((t + f.lead) / ((FIELD_REVEAL[f.ability]?.dur ?? 0.9) + f.lead)) : 1; }
/**
 * How strongly field-view.js should paint a field's base rectangle at time t (fx hook): a field being revealed this snap fades in with
 * its reveal (the raindrop lands before the strip shows), and one whose clock ran out at the whistle fades out in the end hold.
 */
export function fieldAlpha(state, id, t) {
  const f = state?.fields.find((x) => x.id === id); if (!f) return 1;
  const kin = f.fresh ? clamp01((revealK(f, t) - 0.35) / 0.65) : 1; const out = f.expiring ? 1 - clamp01((t - state.last) / 0.6) : 1;
  return kin * out;
}
/** Over-the-head data from the snap snapshot: status slot, the bar's readiness (fx/charge.js), the low-stamina battery. */
function hudOf(view) {
  if (!view?.hud) return null; const out = {};
  for (const [k, v] of Object.entries(view.hud)) { const charge = v.ability ? readiness(v.family, v.ability, v.form, v.mastery) : null; const e = { element: v.element, ...(v.status ? { status: v.status } : {}), ...(v.battery ? { battery: true, staminaFrac: 0.2 } : {}), ...(charge ? { charge } : {}) }; if (e.status || e.battery || e.charge) out[k] = e; }
  return Object.keys(out).length ? out : null;
}
/** The longest an effect of this state keeps drawing after the last frame (end-of-play hold). */
export function t8Hold(state, lastT) { if (!state) return 0; let hold = state.fields.some((f) => f.expiring) ? 0.7 : 0; for (const it of state.items) if (it.start <= lastT + 1e-6 && it.end > lastT) hold = Math.max(hold, Math.min(HOLD_MAX, it.end - lastT)); for (const b of state.badges) if (b.t0 <= lastT + 1e-6 && b.t0 > lastT - 0.3) hold = Math.max(hold, 0.6); return hold; }
/** Impact times that may shake the screen (ability activations flagged `shake`). */
export function t8Shakes(state) { return (state?.items || []).filter((it) => it.main && it.base.shake).map((it) => it.t0); }

/**
 * Draw one frame. `pos(team, slot)` -> [cx, cy, dx, dy] svg or null; `toSvg(x, y)` play coords -> svg. Returns { under, over, ball, cues }
 * where `cues` is the number of text cues drawn (the host caps text with the legacy labels).
 */
export function drawT8(state, t, pos, { quality = 'full', toSvg = null, ball = null, pball = null, halfWidth = 26, reducedFlash = false, seed = 0, maxCues = 1 } = {}) {
  if (!state || !toSvg) return { under: '', over: '', ball: '', cues: 0 };
  let u = '', o = '', b = ''; let cues = 0;
  const S = (x, y) => toSvg(x, y);
  const cl = (x, pad) => Math.max(-halfWidth + pad, Math.min(halfWidth - pad, x));
  const live = state.items.filter((it) => t >= it.start - 1e-6 && t < it.end + 1e-6);
  // Fields first (ground), then obstacles, then the items by their start (older under newer).
  for (const f of state.fields) {
    const k = revealK(f, t);
    const r = { x0: S(0, f.lat[0])[0], x1: S(0, f.lat[1])[0], y0: S(f.yard[1], 0)[1], y1: S(f.yard[0], 0)[1] };
    if (f.holes?.length) r.holes = f.holes.map((hh) => ({ x0: S(0, hh.lat[0])[0], x1: S(0, hh.lat[1])[0], y0: S(hh.yard[1], 0)[1], y1: S(hh.yard[0], 0)[1] }));
    const gone = f.expiring ? clamp01((t - state.last) / 0.6) : 0; // the field's clock ran out at this whistle: it dissolves in the end hold
    const d = fieldDecor(f, r, { t, k: k * (1 - gone), fresh: !!f.fresh, quality, S, seed, reducedFlash });
    u += d.under; o += d.over;
    if (gone > 0) { const L = elementOf(f.type); u += `<rect x="${f2(r.x0)}" y="${f2(r.y0)}" width="${f2(r.x1 - r.x0)}" height="${f2(r.y1 - r.y0)}" fill="#0b1a14" opacity="${op(0.16 * gone)}"/>`; for (let i = 0; i < countFor(6, quality); i++) { const x = r.x0 + (r.x1 - r.x0) * h(i, 3, 7), y = r.y0 + (r.y1 - r.y0) * h(i, 5, 9) - gone * 1.5; u += blob(x, y, 0.35 * (1 - gone) + 0.05, L.a, 1 - gone); } }
  }
  const rank = (p, q) => (p.main === q.main ? p.start - q.start : p.main ? 1 : -1);
  live.sort(rank);
  for (const it of live) {
    const look = it.look; const age = t - it.t0; const span = it.dur || DEFAULT_DUR; const k = clamp01(age / span);
    const P = pos(it.team, it.slot); const own = P || (it.origin ? [...S(it.origin[0], it.origin[1]), 0, 0] : null); if (!own && !look.anywhere) continue;
    const other = (side) => (side === 'off' ? 'def' : 'off');
    const victimSide = it.ev.victimSide || other(it.team);
    const vpos = (slot, side = victimSide) => { const p = pos(side, slot) || (it.ev.victimSide ? null : pos(other(side), slot)); return p ? [p[0], p[1]] : null; }; // a victim is usually an opponent; a teammate (Tailwind Huddle, Night Watch) is found on the other list
    const stopK = it.stop != null ? clamp01((t - it.stop) / ((look.tail ?? TAIL))) : 0; // 0 before the stop event, 1 at the end of the tail
    const fade = it.stop != null ? 1 - stopK : k > 0.75 ? (1 - k) / 0.25 : 1;
    const c = { cx: own[0], cy: own[1], dx: own[2] || 0, dy: own[3] || 0, age, k, fade, t, team: it.team, slot: it.slot, L: it.L, ev: it.ev, q: quality, sid: it.sid + seed * 7, S, pos, vpos, victim: it.ev.victim ? vpos(it.ev.victim) : null, victims: (it.ev.victims || []).map((v) => (typeof v === 'string' ? vpos(v) : v && v.slot ? vpos(v.slot, v.side || victimSide) : null)).filter(Boolean),
      origin: it.origin ? S(it.origin[0], it.origin[1]) : null, all: (team) => (state.slots?.[team] || []).map((sl) => { const p = pos(team, sl); return p ? [p[0], p[1], sl] : null; }).filter(Boolean), path: it.path ? it.path.filter((q) => q[0] <= t + 1e-6).map((q) => S(q[1], q[2])) : [], ball, pball, stop: it.stop, stopK, stopped: it.stop != null && t >= it.stop, stopEv: it.stopEv, n: (n) => countFor(n, quality), reducedFlash, last: state.last, ease, h, item: it };
    if (look.u) u += look.u(c); if (look.o) o += look.o(c); if (look.b) b += look.b(c);
    // The cue: the ability name over the owner at activation (one at a time; the host caps text with its own labels).
    if (it.main && age >= 0 && age < CUE && cues < maxCues && !look.noCue) {
      cues += 1; const kb = age / CUE; const txt = look.cue ? look.cue(c) : it.label;
      if (txt) o += `<g opacity="${op(1 - kb * kb)}"><text x="${f2(cl(own[0], 8))}" y="${f2(own[1] - 5.4 - kb * 1.2)}" text-anchor="middle" font-size="2.1" font-weight="900" fill="${it.L.a}" stroke="#0b1a14" stroke-width="0.4" paint-order="stroke">${it.L.glyph} ${esc(txt)}</text></g>`;
    }
  }
  // Over the head: the shared status badge, the charge / recharge bar and the low-stamina battery, alternating (never together).
  o += overheadSvg(state, t, pos, { quality, seed });
  return { under: u, over: o, ball: b, cues };
}
