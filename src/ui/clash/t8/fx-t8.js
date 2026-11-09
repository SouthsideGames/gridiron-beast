// Beast Clash t8 ability presentation (Task 8 fx pass; docs/task8/FX_CLASH_MATRIX.md; Dex "Visuals" rows; spec §13). Purely cosmetic:
// it reads the t8 engine's event stream (events carrying a Dex `abilityId` and their stage tags: trigger, activation, resolution,
// cleanup; the shared `status` events; enter / depart / ko / revive / rotation) and draws, per frame, each Clash ability's approved
// look through its phases:
//   anticipation (a lead-in before the activation, a charge / mark / armed indicator beside the ability icon, a trigger beat),
//   activation (the event itself: the cue and the primary shape at the owner),
//   movement (a meteor up and out, a bolt curving to a reserve, a lance, a lunge trail, a snowball, threads to reserves),
//   impact and affected-target feedback (marks on the target, the shared status badge, a link, a split, a redirect),
//   persistence (marks, links, constructs, slot markers, shells and decoys kept across turns until a later event),
//   cleanup (a `cleanup` event, an `until` event, the knockout, the battle's end: fade, crumble, retract, thaw).
// Looks are data: LOOKS[abilityId] (src/ui/clash/t8/looks/*.js) draws one ability. Nothing here reads into the engine; the log and the
// arena geometry are the only inputs, so a frame redraws identically (deterministic particles) and every quality level draws the same
// primary shapes (`countFor` thins secondary particles; 'min' keeps the effect recognizable and the shared status information visible).
//
// Look contract (every function returns an SVG string in stage pixels; `u` draws under the monsters, `o` over them):
//   { id, name, element, na: [phases the Dex visual does not have], dur, lead, until: [event kinds that end it], tail, shake, cue(c) | noCue,
//     kind (the activation event kind, default 'ability'), stage (its stage tag, default 'activation'), match(e), u(c), o(c),
//     sub: { [eventKind]: spec | [spec...] }   one spec per further event kind of the ability ({ match, lead, dur, until, u, o, main, cue }),
//     track(ind, e, st)                        a reducer over the owner's ability events for the ability indicator (pips, armed, marks),
//     indicator(c, ind)                        extra drawing beside the ability icon (charges, segments, claws, crescent...) }
// The drawing context `c`: { t, age, k, fade, cx, cy (owner feet), top (head), size, u (one sprite pixel), side, L (palette), ev, tgt
//   (target geometry or null), posOf(id), slot(side, i), q, n(count), sid, h, ease, stop, stopK, stopped, stopEv, W, H, st (state),
//   ind (the owner's indicator), owner, me (owner state), state }.
import { f2, h, op, clamp01, ease, elementOf, countFor, esc } from '../../fx/prims.js';
import { LOOKS } from './looks/index.js';
import { t8StateAt, HARMFUL, STATUS_NAME } from './timeline.js';
import { clashStatusBadge, abilityIcon, pips, turnMarker } from './badges.js';
export { clashStatusBadge, abilityIcon, pips, turnMarker };

export const T8C_REVISION = 1; // bump when the drawing of a look changes (the reviewer's fingerprint includes it)
export const PHASES = Object.freeze(['anticipation', 'activation', 'movement', 'impact', 'target', 'persistence', 'cleanup']);
const DEFAULT_DUR = 1.0, TAIL = 0.5, CUE = 1.1, HOLD = 0.9;

/**
 * Build the presentation state for a whole t8 battle from its cues (t8CuesFor). `opts.only` (reviewer): an ability id whose items
 * are the subject (others still draw). Returns { items, pops, indicators, cues, last, result }.
 */
export function buildClashT8(result, cues, opts = {}) {
  const log = result.log; const items = []; const pops = [];
  const byId = {}; for (const side of ['a', 'b']) for (const x of result.lines[side]) byId[x.id] = x;
  const last = cues.length ? cues[cues.length - 1].end : 0;
  const cueOf = (seq) => cues[seq];
  const endOf = (e, spec, i) => {
    const tail = spec.tail ?? TAIL;
    // `until`: the first later event of one of these kinds that belongs to this ability (same abilityId), or the battle's end, or the
    // knockout of the owner (or of the target, with untilTarget: 'target'); `untilMatch(x, e)` replaces that rule.
    const matches = (x) => (spec.untilMatch ? spec.untilMatch(x, e) : x.kind === 'end' || (x.kind === 'ko' ? x.target === (spec.untilTarget === 'target' ? e.target : e.actor) : x.abilityId === e.abilityId && (!spec.untilSame || x.actor === e.actor)));
    if (spec.until) { let left = spec.untilCount || 1; for (let j = i + 1; j < log.length; j++) { const x = log[j]; if (!spec.until.includes(x.kind) || !matches(x)) continue; if (x.kind !== 'end' && x.kind !== 'ko' && --left > 0) continue; const c = cueOf(j); return { end: c.at + tail, stop: c.at, stopEv: x }; }
      return { end: last + tail, stop: last, stopEv: null }; }
    if (spec.dur === 'battle') return { end: last + HOLD, stop: last, stopEv: null };
    return { end: cueOf(i).at + (spec.dur ?? DEFAULT_DUR), stop: null, stopEv: null };
  };
  // Indicators: per owner, the look's reducer runs over the owner's ability events in order (charges, marks, armed, segments).
  const indicators = {}; // id -> [{ t, ind }] snapshots
  const indFor = (id) => (indicators[id] ||= []);
  for (let i = 0; i < log.length; i++) {
    const e = log[i]; const cue = cueOf(i);
    if (e.kind === 'status' && e.target) pops.push({ id: e.target, status: e.status, t0: cue.at, remaining: e.slot?.remaining ?? null, abilityId: e.abilityId || null });
    if (e.kind === 'status_end' && e.target) pops.push({ id: e.target, status: e.status, t0: cue.at, end: true, reason: e.reason, abilityId: e.abilityId || null });
    // Looks flagged trackAll see every event of their owner (a performed-attack counter the engine does not log on its own).
    if (e.actor && byId[e.actor]?.abilityId && LOOKS[byId[e.actor].abilityId]?.trackAll && e.abilityId !== byId[e.actor].abilityId) { const lk = LOOKS[byId[e.actor].abilityId]; const prev = indFor(e.actor); const cur = prev.length ? structuredClone(prev[prev.length - 1].ind) : (lk.init ? lk.init() : {}); const before = JSON.stringify(cur); lk.track(cur, e, { seq: i, log }); if (JSON.stringify(cur) !== before) prev.push({ t: cue.at, ind: cur, seq: i }); }
    const id = e.abilityId; const look = id ? LOOKS[id] : null; if (!look) continue;
    const ownerLine = e.actor && byId[e.actor]?.abilityId === id ? e.actor : [...result.lines.a, ...result.lines.b].find((x) => x.abilityId === id && (x.id === e.actor || x.id === e.target))?.id || e.actor || null;
    if (look.track && ownerLine) { const prev = indFor(ownerLine); const cur = prev.length ? structuredClone(prev[prev.length - 1].ind) : (look.init ? look.init() : {}); const before = JSON.stringify(cur); look.track(cur, e, { seq: i, log }); if (JSON.stringify(cur) !== before || !prev.length) prev.push({ t: cue.at, ind: cur, seq: i }); }
    // Which spec draws this event: the main (activation) or one of the sub-looks for this event kind.
    let specs = [];
    const mainKind = look.kind || 'ability'; const mainStage = look.stage === null ? null : look.stage || 'activation';
    if (e.kind === mainKind && (mainStage == null || e.stage === mainStage || !e.stage) && (!look.match || look.match(e))) specs.push({ spec: look, main: look.main !== false });
    const subs = look.sub?.[e.kind]; if (subs) for (const s of Array.isArray(subs) ? subs : [subs]) if (!s.match || s.match(e)) specs.push({ spec: s, main: !!s.main });
    for (const { spec, main } of specs) {
      const { end, stop, stopEv } = endOf(e, spec, i); const lead = typeof spec.lead === 'function' ? spec.lead(e, log, i) : spec.lead || 0;
      const owner = spec.owner === 'target' ? e.target : spec.owner === 'actor' ? e.actor : ownerLine || e.actor; const el = byId[owner]?.type || look.element;
      items.push({ id, kind: e.kind, seq: i, owner, actor: e.actor, target: e.target, t0: cue.at, start: cue.at - lead, dur: end - cue.at, end, stop, stopEv, ev: e, look: spec, base: look, L: elementOf(look.element || el), name: byId[owner]?.name || owner, label: look.name, main, sid: (String(owner).charCodeAt(1) * 31 + i * 7) | 0, subject: !opts.only || opts.only === id });
    }
  }
  return { items, pops, indicators, cues, last, result, only: opts.only || null };
}

/** The indicator snapshot of an owner at time t (the last reducer state at or before t). */
export function indicatorAt(state, id, t) { const list = state.indicators[id]; if (!list) return null; let out = null; for (const s of list) { if (s.t <= t + 1e-6) out = s.ind; else break; } return out; }
/** The longest an effect keeps drawing after the last cue (end hold). */
export function t8Hold(state) { let hold = 0; for (const it of state.items) if (it.end > state.last) hold = Math.max(hold, Math.min(HOLD, it.end - state.last)); return hold; }
/** Does anything animate at time t (so the host can skip idle frames)? */
export function t8Live(state, t) { return state.items.some((it) => t >= it.start - 1e-6 && t < it.end + 1e-6) || state.pops.some((p) => t >= p.t0 && t < p.t0 + 0.8); }

/**
 * Draw one frame. `geom`: { pos(id) -> { x, y (feet), size, side, slotIndex, active, ko } | null, slot(side, i) -> { x, y, size }, W, H,
 * reduced }. Returns { under, over, hud } (hud: the information layer: badges, icons, turn markers, the provisional label).
 */
export function drawClashT8(state, t, geom, { quality = 'full', reduced = false, maxCues = 1, seed = 0 } = {}) {
  if (!state || !geom) return { under: '', over: '', hud: '' };
  const st = t8StateAt(state.result, (state.cues.findLast ? state.cues.findLast((c) => c.at <= t + 1e-9) : [...state.cues].reverse().find((c) => c.at <= t + 1e-9))?.i ?? 0);
  let u = '', o = '', hud = ''; let cues = 0;
  const posOf = (id) => geom.pos(id); const slot = (side, i) => geom.slot(side, i);
  const gm = (id) => { const p = posOf(id); return p ? { x: p.x, y: p.y, top: p.y - p.size, size: p.size, side: p.side, ko: p.ko, active: p.active, id } : null; };
  const live = state.items.filter((it) => t >= it.start - 1e-6 && t < it.end + 1e-6).sort((p, q) => (p.main === q.main ? p.start - q.start : p.main ? 1 : -1));
  for (const it of live) {
    const look = it.look; const own = gm(it.owner); if (!own && !look.anywhere) continue;
    const age = t - it.t0; const span = it.dur || DEFAULT_DUR; const k = clamp01(age / span);
    const stopK = it.stop != null ? clamp01((t - it.stop) / (look.tail ?? TAIL)) : 0; const fade = it.stop != null ? 1 - stopK : k > 0.8 ? (1 - k) / 0.2 : 1;
    const base = own || { x: geom.W / 2, y: geom.H / 2, top: geom.H / 2 - 48, size: 48, side: it.owner?.[0] || 'a' };
    const c = { t, age, k, fade, cx: base.x, cy: base.y, top: base.top, size: base.size, u: base.size / 16, hu: Math.max(base.size / 16, 4.5), side: base.side, L: it.L, ev: it.ev, tgt: it.target ? gm(it.target) : null, act: it.actor ? gm(it.actor) : null, posOf: gm, slot, q: quality, n: (n) => countFor(n, quality), sid: it.sid + seed * 7, h, ease, stop: it.stop, stopK, stopped: it.stop != null && t >= it.stop, stopEv: it.stopEv, W: geom.W, H: geom.H, st, state, ind: indicatorAt(state, it.owner, t), owner: it.owner, me: st.S[it.owner] || null, reduced, item: it, mid: { x: geom.W / 2, y: geom.H / 2 } };
    if (look.u) u += look.u(c); if (look.o) o += look.o(c);
    if (it.main && age >= 0 && age < CUE && cues < maxCues && !look.noCue && own) { cues += 1; const kb = age / CUE; const txt = look.cue ? look.cue(c) : it.label; if (txt) o += `<text x="${f2(Math.max(30, Math.min(geom.W - 30, own.x)))}" y="${f2(Math.max(14, own.top - 2.6 * c.hu - kb * 6))}" text-anchor="middle" font-size="${f2(Math.max(10, 1.55 * c.hu))}" font-weight="900" fill="${it.L.a}" stroke="#0b1a14" stroke-width="2.4" paint-order="stroke" opacity="${op(1 - kb * kb)}">${it.L.glyph} ${esc(txt)}</text>`; }
  }
  // ---- the information layer: never hidden by effects (spec §13): status badge over the head, ability icon beside the tag, turn markers
  for (const id of Object.keys(st.S)) {
    const s = st.S[id]; if (s.ko) continue; const p = gm(id); if (!p) continue; const hu = Math.max(p.size / 16, 4.5);
    const headY = Math.max(1.4 * hu, p.top - 1.5 * hu);
    if (s.status) { const pop = state.pops.find((x) => x.id === id && !x.end && t >= x.t0 && t < x.t0 + 0.35); const sc = pop ? 0.6 + 0.4 * ease((t - pop.t0) / 0.35) : 1; hud += clashStatusBadge(p.x, headY, hu, s.status, { pop: sc, frozen: s.frozen, t }); }
    else { const gone = state.pops.find((x) => x.id === id && x.end && t >= x.t0 && t < x.t0 + 0.5); if (gone && gone.reason !== 'end of a standalone battle') { const kk = (t - gone.t0) / 0.5; hud += clashStatusBadge(p.x, headY - kk * 6, hu, { id: gone.status, remaining: null }, { pop: 1 + kk * 0.6, o: 1 - kk }); } }
    if (s.abilityId) {
      const L = elementOf(s.type); const look = LOOKS[s.abilityId]; const ind = indicatorAt(state, id, t) || (look?.init ? look.init() : null);
      const cds = Object.values(s.clocks).filter((k) => k.kind === 'cooldown'); const cd = cds.length ? Math.max(...cds.map((k) => k.left)) : 0; const cdMax = cds.length ? Math.max(...cds.map((k) => k.max)) : 0;
      const broken = state.items.some((it) => it.id === 'ELE-04-C' && it.kind === 'clock_adjust' && it.target === id && t >= it.t0 && t < it.end);
      const ix = p.x + (p.side === 'b' && geom.landscape ? -1 : 1) * (p.size * 0.5 + 1.5 * hu), iy = p.y + 2.2 * hu; // beside the name tag, off the HP bar
      hud += abilityIcon(ix, iy, hu, L, { cd, cdMax, ready: cd === 0, restricted: !!s.restricted, broken, armed: !!ind?.armed });
      if (look?.indicator && ind) hud += look.indicator({ x: ix, y: iy, hu, L, t, ind, me: s, st, q: quality, n: (n) => countFor(n, quality) }, ind);
    }
    if (st.turnOrder && s.active && !reduced) { const n = st.turnOrder.indexOf(id) + 1; if (n > 0 && !state.items.some((it) => it.id === 'WIN-04-C' && t >= it.start && t < it.end)) hud += turnMarker(p.x + (s.status ? 2.6 * hu : 0), headY + (s.status ? 0.2 * hu : 0), hu * 0.9, n, 0.95); }
  }
  if (st.provisional) hud += `<g><rect x="${f2(geom.W / 2 - 58)}" y="2" width="116" height="15" rx="3" fill="#7c2d12" fill-opacity="0.9" stroke="#fdba74" stroke-width="1"/><text x="${f2(geom.W / 2)}" y="13" text-anchor="middle" font-size="10" font-weight="900" fill="#fed7aa" letter-spacing="1">PROVISIONAL</text></g>`;
  return { under: u, over: o, hud };
}
export { HARMFUL, STATUS_NAME };
