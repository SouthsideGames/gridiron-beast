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
import { effectsAt, effectsCore, effectsFor, maxSpeedFactor, contains } from './fields.js';
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
  let magEver = false; // Perf: has any monster's lookup carried the Magnetic Storm hybrid this play (tick sets it; magnetic() reads it)
  let t = 0;
  const ev = (a, kind, text, extra = {}) => log(text, { kind, by: a.slot, side: a.team, ...extra });
  // A monster's per-play field state. Perf (outcome-identical): every key it can take is declared at creation (undefined reads as
  // absent; nothing enumerates it), so all of them share one object shape.
  // Same for the effective-attribute layer record (layer(): a missing key and undefined both read as 0; nothing enumerates it).
  // Third pass: `m` is the lookup the last tick resolved for him (its entry events are done) and `byType` his type's memo map.
  const fxState = (cut) => ({ seen: new Set(), attr: { awareness: 0, catching: 0, blocking: 0 }, drift: 0, cut, base: undefined, hybrid: undefined, echo: undefined, pend: undefined, metalUsed: undefined, slipped: undefined, lured: undefined, bonded: undefined, m: undefined, byType: undefined, fms: 0 });
  const applicableMax = (a) => a.maxSpeed; // already carries the shared modifiers (engine refreshMaxSpeed)
  const unpair = (a) => { if (a.engaged) { a.engaged.engaged = null; a.engaged = null; } };

  /** Shared-gate status attempt from a field (§11 "explicit field-inflicted status uses normal status gates"). */
  function inflict(a, id, b) {
    if (a.immune && (a.immune.has('*') || a.immune.has(id))) return { accepted: false, reason: 'immune' }; // M3 hook: an ability's per-play status immunity
    return applyStatus(state, a.mid, { id, strength: b.strength, duration: 0, restOfPlay: id === 'stunned', sourceId: b.field.owner, abilityId: b.field.ability }); }
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
    // Perf (outcome-identical, fourth pass): the same two numbers, stored only when they differ from what is there (a store of an
    // equal number changes nothing; a zero is always stored so its sign is kept). At rest in a Dark field both repeat every tick.
    const cur = a.attrs[k], without = cur - prev, d = -without * r, nv = without + d;
    if (nv !== cur || nv === 0) a.attrs[k] = nv; if (d !== prev || d === 0) a.fx.attr[k] = d;
  }

  // Perf (outcome-identical): a play's field list and its rectangles never change during the play (abilities place and remove fields
  // in the stored list between plays), so effectsAt depends on the point only through which fields contain it. Each distinct
  // (monster type, set of containing fields) is resolved once per play, with the base-effect lookup built from it as before; both
  // are shared read-only (nothing writes into a.fx.base or the effectsAt result).
  const memo = new Map(), cores = new Map(); const bigList = fields.length > 30;
  // Perf (outcome-identical, third pass): the containment test reads each field's four bounds from flat arrays filled once per play
  // (the play-frame fields are plain copies that nothing changes during the play); a field with removed footprints (holes) keeps the
  // full `contains` test. The test itself is fields.js inRect unchanged (>= and <= on the same values). An actor outside the union of
  // every field's rectangle (strictly below a minimum or above a maximum) is inside no field, so his containment key is the empty one
  // without visiting any field.
  const NF = fields.length, FY0 = new Float64Array(NF), FY1 = new Float64Array(NF), FL0 = new Float64Array(NF), FL1 = new Float64Array(NF), HOLED = new Uint8Array(NF);
  let UY0 = Infinity, UY1 = -Infinity, UL0 = Infinity, UL1 = -Infinity;
  for (let i = 0; i < NF; i++) {
    const f = fields[i]; FY0[i] = f.yard[0]; FY1[i] = f.yard[1]; FL0[i] = f.lat[0]; FL1[i] = f.lat[1]; HOLED[i] = f.holes?.length ? 1 : 0;
    if (FY0[i] < UY0) UY0 = FY0[i]; if (FY1[i] > UY1) UY1 = FY1[i]; if (FL0[i] < UL0) UL0 = FL0[i]; if (FL1[i] > UL1) UL1 = FL1[i];
  }
  // The per-type base-effect lookup is created with every element key it can take (undefined reads as absent: `?.strength ?? 0`,
  // truthiness), in one fixed order, so every lookup object shares one shape and the per-tick reads are monomorphic.
  const baseOf = (e) => {
    const base = { Fire: undefined, Water: undefined, Nature: undefined, Electric: undefined, Earth: undefined, Ice: undefined, Wind: undefined, Psychic: undefined, Dark: undefined, Light: undefined, Metal: undefined, Dragon: undefined };
    for (const b of e.base) base[b.type] = { strength: b.strength, field: byId.get(b.fieldId), centre: undefined }; // centre: the Psychic pull point, filled at first use
    return base;
  };
  function effectsHere(a) {
    // Perf: an actor's type never changes, so his field state keeps his type's memo map once it has one (the Map lookup is skipped)
    const st = a.fx; let byType = st ? st.byType : undefined;
    if (!byType) { byType = memo.get(a.type); if (!byType) { byType = new Map(); memo.set(a.type, byType); } if (st) st.byType = byType; }
    let k = bigList ? '' : 0;
    const x = a.x, y = a.y;
    if (!(x < UY0 || x > UY1 || y < UL0 || y > UL1)) for (let i = 0; i < NF; i++) {
      if (HOLED[i] ? !contains(fields[i], x, y) : !(x >= FY0[i] && x <= FY1[i] && y >= FL0[i] && y <= FL1[i])) continue;
      if (bigList) k += `${i},`; else k |= 1 << i;
    }
    let m = byType.get(k);
    if (!m) {
      // Perf (outcome-identical, fourth pass): everything tick() reads from a lookup on every tick is worked out once here with the
      // same expressions: the hybrid's name, the Water entry, the Fire/Wind maximum-speed sum and the Dark Awareness share.
      // The type-independent half of effectsAt is resolved once per set of containing fields (cores) and shared by every monster type.
      let core = cores.get(k); if (!core) { core = effectsCore(fields, a.x, a.y); cores.set(k, core); }
      const e = effectsFor(core, a.type); const base = baseOf(e), hybrid = e.hybrid?.name || null;
      m = { e, base, hybrid, water: base.Water, ms: (-(base.Fire?.strength ?? 0) + (base.Wind?.strength ?? 0)) || 0, dark: pct(base.Dark?.strength), steam: hybrid === 'Steam', mind: hybrid === 'Mindstorm' };
      byType.set(k, m);
    }
    return m;
  }
  function tick(now) {
    t = now;
    if (!placed) { placed = true; clumps = placeClumps(fields, actors, rng); if (clumps.length) log(`Living Terrain raises ${clumps.length} vine clump${clumps.length > 1 ? 's' : ''}`, { kind: 'field_clumps', clumps: clumps.map((c) => [c.x, c.y]) }); }
    // Perf (outcome-identical, fourth pass). The loop does what it did, in the same order, with the per-lookup values read from the
    // lookup (effectsHere) instead of being derived again for every monster on every tick:
    //  - base and hybrid are stored only when his lookup changed (the same lookup would store the same two values);
    //  - the maximum-speed entry is written or removed only when the sum differs from the one stored (nothing else writes
    //    maxSpeedMods.field; removing an absent key and re-storing an equal number change nothing);
    //  - the Steam layers and the Mindstorm echo are visited only when they can do something: layer() returns at once with no
    //    previous delta and a zero share, and the echo branch needs the Mindstorm hybrid or an existing echo.
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      if (a.envImmune) continue; // M3 hook: an actor immune to environmental modifiers (Stormguard's guards) never experiences a field
      const st = (a.fx ||= fxState(a.cutUntil));
      const m = effectsHere(a);
      // The entry checks run only when his resolved lookup is not the one of his previous tick (third pass): after one pass over a
      // lookup every one of its field ids and its hybrid name is in `seen`, so with the same lookup again every test below would be
      // false: no entry event, no Electric roll.
      if (m !== st.m) {
        st.m = m; st.base = m.base; st.hybrid = m.hybrid; if (m.hybrid === 'Magnetic Storm') magEver = true;
        for (const b of m.e.base) if (!st.seen.has(b.fieldId)) {
          st.seen.add(b.fieldId); ev(a, 'field_enter', `${a.name} enters a ${b.type} field`, { field: b.fieldId, element: b.type });
          if (b.type === 'Electric') electric(a, st.base.Electric);
        }
        if (st.hybrid && !st.seen.has(st.hybrid)) { st.seen.add(st.hybrid); ev(a, 'field_enter', `${a.name} enters ${st.hybrid}`, { hybrid: st.hybrid }); }
      }
      const cut = a.cutUntil;
      if (m.water && cut !== st.cut && cut > t) water(a, m.water);
      if (cut !== st.cut) st.cut = cut; // water() does not move cutUntil; an equal value is not stored again
      const ms = m.ms; // Fire and Wind: one maximum-speed property, added
      // One aggregation with the statuses (§11). st.fms is the entry this function last left in maxSpeedMods.field (0: none; tick is its
      // only writer and both start empty with the play), so an unchanged sum touches nothing, exactly as before.
      if (ms !== st.fms) { if (ms) (a.maxSpeedMods ||= {}).field = ms; else if (a.maxSpeedMods) delete a.maxSpeedMods.field; st.fms = ms; refreshMaxSpeed?.(a); }
      layer(a, 'awareness', a.ignoreFieldAwareness ? 0 : m.dark); // M3 hook: a.ignoreFieldAwareness (set by a contract's tick) ignores only the Dark base field's Awareness term
      if (m.steam || st.attr.catching || st.attr.blocking) { layer(a, 'catching', m.steam ? STEAM.catching : 0); layer(a, 'blocking', m.steam ? STEAM.blocking : 0); }
      if (m.mind || st.echo) {
        if (m.mind && !st.echo) { st.echo = { of: a, x: a.x, y: a.y, live: true }; echoes.push(st.echo); placeEcho(st.echo); ev(a, 'field_echo', `A Mindstorm echo trails ${a.name}`, { hybrid: 'Mindstorm', x: +st.echo.x.toFixed(2), y: +st.echo.y.toFixed(2) }); }
        else if (st.echo?.live) { if (m.mind) placeEcho(st.echo); else st.echo.live = false; }
      }
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
    // Perf (outcome-identical, fourth pass): a monster's hybrid is written only by tick(), which notes the first Magnetic Storm
    // lookup; until then no monster can pass the filter below, so the candidate list is empty and the function returns here anyway.
    if (!magEver) return;
    const free = actors.filter((a) => a.fx?.hybrid === 'Magnetic Storm' && !a.fx.bonded && !a.sitsOut); if (free.length < 2) return;
    const pairs = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) { const d = hyp(free[i], free[j]); if (d <= MAGNETIC_STORM.pairWithin) pairs.push([d, free[i], free[j]]); }
    pairs.sort((p, q) => p[0] - q[0] || `${p[1].team}${p[1].slot}`.localeCompare(`${q[1].team}${q[1].slot}`));
    for (const [, a, b] of pairs) if (!a.fx.bonded && !b.fx.bonded) {
      a.fx.bonded = b.fx.bonded = true; bonds.push({ a, b, live: true });
      ev(a, 'field_bond', `The Magnetic Storm binds ${a.name} to ${b.name}`, { partner: b.slot, partnerSide: b.team });
    }
  }

  /** Steering: Nature reduces the turning (perpendicular) share of a velocity change, Ice the braking share. Null when unaffected. */
  // Perf (outcome-identical, third pass): the result goes out in one reused pair (its caller, the engine's steer, reads both numbers
  // at once and keeps nothing), so a shaped step allocates nothing.
  const shaped = [0, 0];
  function shapeDv(a, dvx, dvy) {
    const nat = pct(a.fx?.base?.Nature?.strength), ice = pct(a.fx?.base?.Ice?.strength); if (!nat && !ice) return null;
    const s = Math.hypot(a.vx, a.vy); if (s < 0.05) return null;
    const ux = a.vx / s, uy = a.vy / s; let par = dvx * ux + dvy * uy; const px = (dvx - par * ux) * (1 - nat), py = (dvy - par * uy) * (1 - nat);
    if (par < 0) par *= 1 - ice;
    shaped[0] = par * ux + px; shaped[1] = par * uy + py; return shaped;
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
      const c = (P.centre ||= centre(P.field)), r = hyp(c, a), db = P.field.payload?.deadband ?? PSYCHIC_DEADBAND;
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
    const st = (d.fx ||= fxState(undefined)); st.lured ||= new Map();
    const l = st.lured.get(e);
    if (l == null) { if (!rng.chance(MINDSTORM.followChance)) { st.lured.set(e, -1); return null; } st.lured.set(e, until); ev(d, 'field_lured', `${d.name} chases ${c.name}'s Mindstorm echo`, { victim: c.slot }); return e; }
    return l > t ? e : null;
  }
  /** Eclipse: an active signature cannot start inside (the contract spends nothing on a blocked start). */
  function canStart(a) {
    const h = effectsHere(a).e.hybrid?.name; if (h !== 'Eclipse') return true;
    ev(a, 'field_blocked_start', `${a.name}'s signature cannot start inside the Eclipse`, { hybrid: 'Eclipse' }); return false;
  }
  // M3 hook: a field's Prism Break removed footprints (holes) go out with it
  const output = () => ({ fields: fields.map((f) => ({ id: f.id, type: f.type, strength: f.strength, owner: f.owner, ability: f.ability, yard: [...f.yard], lat: [...f.lat], ...(f.fresh ? { fresh: true } : {}), /* Task 8 presentation: created at this snap (the reveal) */ ...(f.holes?.length ? { holes: f.holes.map((h) => ({ yard: [...h.yard], lat: [...h.lat] })) } : {}) })), clumps: clumps.map((c) => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), d: LIVING_TERRAIN.diameter })) });
  // hasEarth: does any field of this play have the Earth type? Without one no lookup ever carries an Earth entry, so resist() is
  // exactly 1 for everyone (the engine's separation pass uses this to take its plain loop).
  const hasEarth = fields.some((f) => f.type === 'Earth');
  return { tick, shapeDv, coast, resist, displace, defer, lure, canStart, output, get clumps() { return clumps; }, bonds, echoes, hasEarth };
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
