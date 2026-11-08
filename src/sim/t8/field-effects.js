// Task 8 M3: the in-play effects of element fields (spec §11). One instance per simulated play, built by the engine from
// options.fields (already in the play-relative frame: x from the line of scrimmage toward the offense's goal, y lateral; see
// fields.js toPlayFrame). Every tick the engine asks what each monster experiences where he stands (fields.js effectsAt: same-type
// neutrality, strongest same-type magnitude, one hybrid by the oldest parent pair, parents exempt) and applies it through its own
// systems via the small functions below. Plays without fields never build one, so their physics and draws are unchanged.
//
// Magnitudes. A field's `strength` is its producing ability's approved magnitude in percent, read per element:
//   Fire  maximum-speed reduction        Wind  maximum-speed increase       Nature  turning-rate reduction
//   Ice   braking-deceleration reduction  Dark  effective Awareness reduction Earth   contact-displacement resistance (< 100)
//   Water slip chance per sharp cut/stop  Electric Stunned chance on first entry   Psychic inward pull, % of applicable max speed
// A field with no strength applies no magnitude-dependent effect (no universal magnitude is invented). `payload.deadband` overrides
// the Psychic centre deadband. Values §11 itself states (40% current-speed loss, the hybrids' numbers) are the constants below.
import { effectsAt, maxSpeedFactor } from './fields.js';
import { applyStatus } from './status-runtime.js';
import { createRng } from '../../core/rng.js';

export const STUMBLE_SPEED_LOSS = 0.4; // §11 Water / STA-03: Stumbled loses 40% of current speed, maximum speed unchanged
export const PSYCHIC_DEADBAND = 1; // the approved "standard Psychic field" centre deadband (PSY-04-F, PSY-01-F: 1 yard)
export const STEAM = Object.freeze({ catching: 0.15, blocking: 0.15 });
export const LIVING_TERRAIN = Object.freeze({ clumps: 4, diameter: 1 });
export const MAGNETIC_STORM = Object.freeze({ pairWithin: 3, pull: 0.2, breakAt: 6 });
export const FROSTSTORM = Object.freeze({ drift: 0.15, cap: 2 });
// Mindstorm: "opposing eligible AI may follow for one decision update". No probability is approved; 1 means every eligible opposing
// pursuer follows once per echo. Pending owner confirmation (reported).
export const MINDSTORM = Object.freeze({ behind: 2, followChance: 1 });

const pct = (s) => (s == null ? 0 : Math.max(0, s) / 100);
const centre = (f) => ({ x: (f.yard[0] + f.yard[1]) / 2, y: (f.lat[0] + f.lat[1]) / 2 });
const hyp = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

/**
 * @param o.fields play-frame fields; o.actors the engine's actors; o.seed the play seed (own stream); o.log the engine's event log;
 *        o.t8 the game's Task 8 block (shared status gate); o.setStatus the renderer status; o.bounds the play bounds; o.dt the tick.
 * @returns null without fields, else the per-play effect functions.
 */
export function createFieldPlay({ fields, actors, seed = 1, log = () => {}, t8 = { status: {} }, setStatus = () => {}, bounds: B, dt = 0.05, refreshMaxSpeed = null }) {
  if (!fields?.length) return null;
  const rng = createRng(((Number(seed) >>> 0) ^ 0x1b873593) >>> 0 || 17); // the fields' own draws: other plays keep theirs
  const byId = new Map(fields.map((f) => [f.id, f]));
  const state = { t8 };
  let clumps = []; let placed = false; // Living Terrain clumps: placed at the snap (first tick, after alignment)
  const driftDir = rng.chance(0.5) ? 1 : -1; // Froststorm: seeded side, fixed for the play
  const bonds = [], echoes = [];
  let t = 0;
  const ev = (a, kind, text, extra = {}) => log(text, { kind, by: a.slot, side: a.team, ...extra });
  const applicableMax = (a) => a.maxSpeed; // already carries the shared modifiers (engine refreshMaxSpeed)
  const unpair = (a) => { if (a.engaged) { a.engaged.engaged = null; a.engaged = null; } };

  /** Shared-gate status attempt from a field (§11 "explicit field-inflicted status uses normal status gates"). */
  function inflict(a, id, b) { return applyStatus(state, a.mid, { id, strength: b.strength, duration: 0, restOfPlay: id === 'stunned', sourceId: b.field.owner, abilityId: b.field.ability }); }
  /** Electric: chance to apply Stunned on first entry (starting inside counts; no re-entry reroll). */
  function electric(a, b) {
    if (b.strength == null || a.sitsOut || !rng.chance(pct(b.strength))) return;
    const r = inflict(a, 'stunned', b);
    if (!r.accepted) { ev(a, 'field_status_blocked', `${a.name} resists the Electric field's Stunned (${r.reason})`, { field: b.field.id, status: 'stunned' }); return; }
    unpair(a); a.vx = 0; a.vy = 0; a.stun = 1e6; a.noEngage = 1e6; setStatus(a, 'stun', 1e6);
    ev(a, 'field_stun', `${a.name} is Stunned in the Electric field`, { field: b.field.id, element: 'Electric' });
  }
  /** Water: a distinct sharp cut or stop (the engine's plant) rolls the slip chance; success attempts Stumbled; one success a play. */
  function water(a, b) {
    if (a.fx.slipped || b.strength == null || !rng.chance(pct(b.strength))) return;
    const r = inflict(a, 'stumbled', b);
    if (!r.accepted) { ev(a, 'field_status_blocked', `${a.name} keeps his feet (${r.reason})`, { field: b.field.id, status: 'stumbled' }); return; }
    a.fx.slipped = true; unpair(a); a.vx *= 1 - STUMBLE_SPEED_LOSS; a.vy *= 1 - STUMBLE_SPEED_LOSS; a.stumbled = true; setStatus(a, 'stumble', 0.4);
    ev(a, 'field_slip', `${a.name} slips in the Water field`, { field: b.field.id, element: 'Water' });
  }
  /** Effective-attribute layer (Dark Awareness, Steam Catching/Blocking): replaces its own previous delta, so it never compounds. */
  function layer(a, k, r) {
    const prev = a.fx.attr[k] || 0; if (!prev && !r) return;
    const without = a.attrs[k] - prev, d = -without * r; a.attrs[k] = without + d; a.fx.attr[k] = d;
  }

  function tick(now) {
    t = now;
    if (!placed) { placed = true; clumps = placeClumps(fields, actors, rng); if (clumps.length) log(`Living Terrain raises ${clumps.length} vine clump${clumps.length > 1 ? 's' : ''}`, { kind: 'field_clumps', clumps: clumps.map((c) => [c.x, c.y]) }); }
    for (const a of actors) {
      const st = (a.fx ||= { seen: new Set(), attr: {}, drift: 0, cut: a.cutUntil });
      const e = effectsAt(fields, a.x, a.y, a.type);
      st.base = {}; for (const b of e.base) st.base[b.type] = { strength: b.strength, field: byId.get(b.fieldId) };
      st.hybrid = e.hybrid?.name || null;
      for (const b of e.base) if (!st.seen.has(b.fieldId)) {
        st.seen.add(b.fieldId); ev(a, 'field_enter', `${a.name} enters a ${b.type} field`, { field: b.fieldId, element: b.type });
        if (b.type === 'Electric') electric(a, st.base.Electric);
      }
      if (st.hybrid && !st.seen.has(st.hybrid)) { st.seen.add(st.hybrid); ev(a, 'field_enter', `${a.name} enters ${st.hybrid}`, { hybrid: st.hybrid }); }
      if (st.base.Water && a.cutUntil !== st.cut && a.cutUntil > t) water(a, st.base.Water);
      st.cut = a.cutUntil;
      const ms = -(st.base.Fire?.strength ?? 0) + (st.base.Wind?.strength ?? 0); // Fire and Wind: one maximum-speed property, added
      { const had = a.maxSpeedMods?.field ?? 0; if (ms) (a.maxSpeedMods ||= {}).field = ms; else if (a.maxSpeedMods) delete a.maxSpeedMods.field; if ((ms || 0) !== had) refreshMaxSpeed?.(a); } // one aggregation with the statuses (§11)
      layer(a, 'awareness', pct(st.base.Dark?.strength));
      layer(a, 'catching', st.hybrid === 'Steam' ? STEAM.catching : 0); layer(a, 'blocking', st.hybrid === 'Steam' ? STEAM.blocking : 0);
      if (st.hybrid === 'Mindstorm' && !st.echo) { st.echo = { of: a, x: a.x, y: a.y, live: true }; echoes.push(st.echo); placeEcho(st.echo); ev(a, 'field_echo', `A Mindstorm echo trails ${a.name}`, { hybrid: 'Mindstorm', x: +st.echo.x.toFixed(2), y: +st.echo.y.toFixed(2) }); }
      else if (st.echo?.live) { if (st.hybrid === 'Mindstorm') placeEcho(st.echo); else st.echo.live = false; }
    }
    magnetic();
  }
  function placeEcho(e) {
    const a = e.of, s = Math.hypot(a.vx, a.vy);
    const [ux, uy] = s > 0.5 ? [a.vx / s, a.vy / s] : [a.team === 'off' ? 1 : -1, 0];
    e.x = a.x - ux * MINDSTORM.behind; e.y = a.y - uy * MINDSTORM.behind;
  }
  /** Magnetic Storm: once a play, nearest eligible nonparent pairs within 3 yd bond (one partner each); break at 6 yd, exit or whistle. */
  function magnetic() {
    for (const b of bonds) if (b.live && (hyp(b.a, b.b) > MAGNETIC_STORM.breakAt || b.a.fx.hybrid !== 'Magnetic Storm' || b.b.fx.hybrid !== 'Magnetic Storm')) { b.live = false; ev(b.a, 'field_unbond', `${b.a.name} and ${b.b.name} break the Magnetic Storm's hold`, { partner: b.b.slot, partnerSide: b.b.team }); }
    const free = actors.filter((a) => a.fx.hybrid === 'Magnetic Storm' && !a.fx.bonded && !a.sitsOut); if (free.length < 2) return;
    const pairs = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) { const d = hyp(free[i], free[j]); if (d <= MAGNETIC_STORM.pairWithin) pairs.push([d, free[i], free[j]]); }
    pairs.sort((p, q) => p[0] - q[0] || `${p[1].team}${p[1].slot}`.localeCompare(`${q[1].team}${q[1].slot}`));
    for (const [, a, b] of pairs) if (!a.fx.bonded && !b.fx.bonded) {
      a.fx.bonded = b.fx.bonded = true; bonds.push({ a, b, live: true });
      ev(a, 'field_bond', `The Magnetic Storm binds ${a.name} to ${b.name}`, { partner: b.slot, partnerSide: b.team });
    }
  }

  /** Steering: Nature reduces the turning (perpendicular) share of a velocity change, Ice the braking share. Null when unaffected. */
  function shapeDv(a, dvx, dvy) {
    const nat = pct(a.fx?.base?.Nature?.strength), ice = pct(a.fx?.base?.Ice?.strength); if (!nat && !ice) return null;
    const s = Math.hypot(a.vx, a.vy); if (s < 0.05) return null;
    const ux = a.vx / s, uy = a.vy / s; let par = dvx * ux + dvy * uy; const px = (dvx - par * ux) * (1 - nat), py = (dvy - par * uy) * (1 - nat);
    if (par < 0) par *= 1 - ice;
    return [par * ux + px, par * uy + py];
  }
  /** A stunned monster's coasting decay per tick (0.93 ordinarily): Ice extends the slide by the same braking reduction. */
  const coast = (a) => { const ice = pct(a.fx?.base?.Ice?.strength); return ice ? 1 - 0.07 * (1 - ice) : 0.93; };
  /** Earth: the share of a contact displacement this monster still takes (never zero: no guaranteed immunity). */
  const resist = (a) => 1 - Math.min(0.99, pct(a.fx?.base?.Earth?.strength));
  /** Environmental motion after the monster's own move: Psychic pull, Froststorm drift, Magnetic pull, Living Terrain vines. */
  function displace(a) {
    const st = a.fx; if (!st) return;
    let dx = 0, dy = 0; const vmax = applicableMax(a);
    const P = st.base.Psychic;
    if (P?.strength != null) {
      const c = centre(P.field), r = hyp(c, a), db = P.field.payload?.deadband ?? PSYCHIC_DEADBAND;
      if (r > db) { const step = Math.min(pct(P.strength) * vmax * dt, r - db); dx += ((c.x - a.x) / r) * step; dy += ((c.y - a.y) / r) * step; }
    }
    for (const b of bonds) if (b.live && (b.a === a || b.b === a)) {
      const o = b.a === a ? b.b : b.a, r = hyp(o, a);
      if (r > MAGNETIC_STORM.pairWithin) { const step = Math.min(MAGNETIC_STORM.pull * vmax * dt, r - MAGNETIC_STORM.pairWithin); dx += ((o.x - a.x) / r) * step; dy += ((o.y - a.y) / r) * step; }
    }
    if (st.hybrid === 'Froststorm' && st.drift < FROSTSTORM.cap) {
      const step = Math.min(FROSTSTORM.drift * vmax * dt, FROSTSTORM.cap - st.drift), ny = a.y + dy + driftDir * step;
      const clear = actors.every((o) => o === a || o === a.engaged || Math.hypot(o.x - (a.x + dx), o.y - ny) >= 0.7); // collision-safe
      if (clear && (!B || (ny > B.left + 0.3 && ny < B.right - 0.3))) { dy += driftDir * step; st.drift += step; }
    }
    a.x += dx; a.y += dy;
    if (clumps.length && a.type !== 'Nature' && a.type !== 'Earth') for (const c of clumps) { // nonparents path around; parents pass through
      const r = hyp(c, a), R = LIVING_TERRAIN.diameter / 2 + 0.35;
      if (r < R) { const ux = r > 1e-6 ? (a.x - c.x) / r : 0, uy = r > 1e-6 ? (a.y - c.y) / r : 1; a.x = c.x + ux * R; a.y = c.y + uy * R; }
    }
  }
  /**
   * Metal: a non-Metal monster's first changed automatic decision inside the field this play is adopted only at his next ordinary
   * AI decision update (`until`); until then the prior decision stands (`prev`; null: hold). Later decisions pass straight through.
   */
  function defer(a, key, value, prev, until) {
    const st = a.fx; if (!st) return value;
    if (st.pend) { if (st.pend.key !== key) return value; if (t + 1e-9 >= st.pend.until || value === st.pend.from) { st.pend = null; return value; } return st.pend.from; }
    if (st.metalUsed || !st.base?.Metal || value === prev) return value;
    st.metalUsed = true; st.pend = { key, from: prev, until };
    ev(a, 'field_defer', `${a.name}'s ${key} decision is held a beat in the Metal field`, { field: st.base.Metal.field.id, element: 'Metal', decision: key });
    return prev;
  }
  /** Mindstorm: an opposing AI pursuer of a monster with a live echo may chase the echo for one decision update. */
  function lure(d, c, until) {
    const e = c.fx?.echo; if (!e?.live || d.team === c.team) return null;
    const st = (d.fx ||= { seen: new Set(), attr: {}, drift: 0 }); st.lured ||= new Map();
    const l = st.lured.get(e);
    if (l == null) { if (!rng.chance(MINDSTORM.followChance)) { st.lured.set(e, -1); return null; } st.lured.set(e, until); ev(d, 'field_lured', `${d.name} chases ${c.name}'s Mindstorm echo`, { victim: c.slot }); return e; }
    return l > t ? e : null;
  }
  /** Eclipse: an active signature cannot start inside (the contract spends nothing on a blocked start). */
  function canStart(a) {
    const h = effectsAt(fields, a.x, a.y, a.type).hybrid?.name; if (h !== 'Eclipse') return true;
    ev(a, 'field_blocked_start', `${a.name}'s signature cannot start inside the Eclipse`, { hybrid: 'Eclipse' }); return false;
  }
  const output = () => ({ fields: fields.map((f) => ({ id: f.id, type: f.type, strength: f.strength, owner: f.owner, ability: f.ability, yard: [...f.yard], lat: [...f.lat] })), clumps: clumps.map((c) => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), d: LIVING_TERRAIN.diameter })) });
  return { tick, shapeDv, coast, resist, displace, defer, lure, canStart, output, get clumps() { return clumps; }, bonds, echoes };
}

/**
 * Living Terrain vine clumps, placed at the snap: at most four 1-yard clumps per connected Nature–Earth overlap, only where the
 * hybrid actually forms, and "safe": at least 1.5 yd from every monster's starting spot (and so from the ball) and from each other.
 */
export function placeClumps(fields, actors, rng) {
  const nat = fields.filter((f) => f.type === 'Nature'), ear = fields.filter((f) => f.type === 'Earth'); if (!nat.length || !ear.length) return [];
  const rects = [];
  for (const n of nat) for (const e of ear) { const y0 = Math.max(n.yard[0], e.yard[0]), y1 = Math.min(n.yard[1], e.yard[1]), l0 = Math.max(n.lat[0], e.lat[0]), l1 = Math.min(n.lat[1], e.lat[1]); if (y1 > y0 && l1 > l0) rects.push({ yard: [y0, y1], lat: [l0, l1] }); }
  const touch = (p, q) => p.yard[0] <= q.yard[1] && q.yard[0] <= p.yard[1] && p.lat[0] <= q.lat[1] && q.lat[0] <= p.lat[1];
  const comp = rects.map((_, i) => i); const root = (i) => (comp[i] === i ? i : (comp[i] = root(comp[i])));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (touch(rects[i], rects[j])) comp[root(i)] = root(j);
  const groups = new Map(); rects.forEach((r, i) => { const k = root(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
  const out = [];
  for (const group of groups.values()) {
    const cand = [];
    for (const r of group) for (let x = r.yard[0] + 0.5; x <= r.yard[1] - 0.5 + 1e-9; x += 1) for (let y = r.lat[0] + 0.5; y <= r.lat[1] - 0.5 + 1e-9; y += 1) cand.push({ x, y });
    const ok = cand.filter((p) => effectsAt(fields, p.x, p.y, null).hybrid?.name === 'Living Terrain' && actors.every((a) => Math.hypot(a.x - p.x, a.y - p.y) >= 1.5));
    for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
    const mine = [];
    for (const p of ok) { if (mine.length >= LIVING_TERRAIN.clumps) break; if (mine.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 1.5) && out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 1.5)) mine.push(p); }
    out.push(...mine);
  }
  return out;
}
