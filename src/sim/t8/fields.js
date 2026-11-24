// Task 8 M2 (WP5): field geometry, overlap resolution and movement-modifier aggregation (spec §11; N7d clocks live in the ability
// contracts). Absolute coordinates as src/core/field.js: `yard` -10..110 (end lines), `lat` -26.67..26.67. Pure; not yet wired.
import { FIELD } from '../../core/field.js';
import { E as $E } from '../../core/english.js';

export const PLAYABLE = Object.freeze({ yardMin: -FIELD.endZone, yardMax: FIELD.length + FIELD.endZone, latMin: -FIELD.halfWidth, latMax: FIELD.halfWidth });

/**
 * Place a rectangle. Width is sideline-to-sideline, length end-zone-to-end-zone. The rectangle shifts laterally inward to keep its
 * width (never wider than the field) and its length is clipped at the playable bounds; the physical field never expands.
 */
export function placeRect({ id, type, createdAt, centerLat, yardFrom, yardTo, width, strength = null, owner = null }) {
  const w = Math.min(width, FIELD.width);
  let lo = centerLat - w / 2, hi = centerLat + w / 2;
  if (lo < PLAYABLE.latMin) { hi += PLAYABLE.latMin - lo; lo = PLAYABLE.latMin; }
  if (hi > PLAYABLE.latMax) { lo -= hi - PLAYABLE.latMax; hi = PLAYABLE.latMax; }
  const y0 = Math.max(PLAYABLE.yardMin, Math.min(yardFrom, yardTo)), y1 = Math.min(PLAYABLE.yardMax, Math.max(yardFrom, yardTo));
  return Object.freeze({ id, type, createdAt, strength, owner, lat: [lo, hi], yard: [y0, y1] });
}
const inRect = (r, yard, lat) => yard >= r.yard[0] && yard <= r.yard[1] && lat >= r.lat[0] && lat <= r.lat[1];
// M3 hook (Prism Break, spec §11): `holes` are removed footprints ({ yard, lat }); a point inside one is not in the field. A removed
// footprint is never reconstituted when overlaps are recomputed.
export const contains = (r, yard, lat) => inRect(r, yard, lat) && !(r.holes || []).some((h) => inRect(h, yard, lat));

/** The six approved hybrid recipes (only these create hybrids). */
export const RECIPES = Object.freeze([
  { hybrid: 'Steam', parents: ['Fire', 'Water'] },
  { hybrid: 'Eclipse', parents: ['Light', 'Dark'] },
  { hybrid: $E('sim.living_terrain'), parents: ['Nature', 'Earth'] },
  { hybrid: $E('sim.magnetic_storm'), parents: ['Electric', 'Metal'] },
  { hybrid: 'Froststorm', parents: ['Ice', 'Wind'] },
  { hybrid: 'Mindstorm', parents: ['Psychic', 'Electric'] },
]);
const recipeFor = (a, b) => RECIPES.find((r) => r.parents.includes(a) && r.parents.includes(b) && a !== b) || null;

/**
 * What a monster of `monsterType` experiences at a point. Returns { base: [{type, strength, fieldId}], hybrid: {name, parents} | null }.
 * - Same-type fields use the strongest magnitude, not addition.
 * - With 3+ types present, one compatible recipe is chosen by the oldest parent-pair creation order (a pair exists from the later
 *   creation of its two oldest parents), then stable ids; there is never a recursive hybrid.
 * - Inside a hybrid the parents' base effects are replaced; unpaired base effects still apply; parent types are exempt from the hybrid.
 * - A base field never affects monsters of its own type (same-type neutrality). Dragon has no base field.
 * - Sides (owner 2026-11-24). With `side` (the monster's club, 'home' | 'away') and a field that knows the club that placed it
 *   (`team`, else `ownerTeam`): a buff (Wind, Light, Earth) reaches only the placing club, every type; a debuff reaches only the other
 *   club, its own type still immune. A combination formed by one club's two zones hits only that club's opponents; one formed across
 *   clubs hits everyone; its parent types are always immune. Without side information the rule above stands unchanged.
 */
export const BUFF_TYPES = Object.freeze(['Wind', 'Light', 'Earth']);
const teamOfField = (f) => f.team ?? f.ownerTeam ?? null;
/** Does this field's own (base) effect reach a monster of `type` on club `side`? */
export function reaches(f, type, side) {
  const team = teamOfField(f);
  if (!side || !team) return f.type !== type;
  return BUFF_TYPES.includes(f.type) ? side === team : side !== team && f.type !== type;
}
export function effectsAt(fields, yard, lat, monsterType, side = null) { return effectsFor(effectsCore(fields, yard, lat), monsterType, side); }
/**
 * effectsAt in two steps (perf, outcome-identical: the same statements in the same order). effectsCore is everything that does not
 * depend on the monster's type (the strongest field of each base type at the point and the one hybrid that forms there);
 * effectsFor applies one monster type to it (own-type and parent immunity). A caller that resolves the same point for several types
 * (field-effects.js, once per play and set of containing fields) computes the first step once.
 */
export function effectsCore(fields, yard, lat) {
  const here = fields.filter((f) => f.type !== 'Dragon' && contains(f, yard, lat));
  const byType = new Map(); const stronger = (f, cur) => !cur || (f.strength ?? 0) > (cur.strength ?? 0) || ((f.strength ?? 0) === (cur.strength ?? 0) && f.createdAt < cur.createdAt);
  for (const f of here) if (stronger(f, byType.get(f.type))) byType.set(f.type, f);
  const oldest = new Map(); for (const f of here) { const o = oldest.get(f.type); if (!o || f.createdAt < o.createdAt || (f.createdAt === o.createdAt && String(f.id) < String(o.id))) oldest.set(f.type, f); }
  const types = [...byType.keys()].sort();
  let pick = null;
  for (let i = 0; i < types.length; i++) for (let j = i + 1; j < types.length; j++) {
    const r = recipeFor(types[i], types[j]); if (!r) continue;
    const a = oldest.get(types[i]), b = oldest.get(types[j]);
    const formed = Math.max(a.createdAt, b.createdAt); const key = [a.id, b.id].map(String).sort().join('|');
    // The combination's side: one club's two zones -> that club; two clubs -> 'both'; unknown -> null (everyone but the parents)
    const ta = teamOfField(a), tb = teamOfField(b); const side = ta && tb ? (ta === tb ? ta : 'both') : null;
    if (!pick || formed < pick.formed || (formed === pick.formed && key < pick.key)) pick = { r, formed, key, side };
  }
  return { strongest: [...byType.values()], here, stronger, pick, replaced: new Set(pick ? pick.r.parents : []) };
}
/**
 * One monster's effects from a core. Without `side` the result is exactly the type-only rule. With it, each base type is the
 * strongest field of that type that reaches him, and the hybrid comes back for every type present with `applies` (does it act on
 * him: not a parent type, and on the receiving side) and `side` (the combination's club, 'both' or null).
 */
export function effectsFor(core, monsterType, side = null) {
  const { strongest, pick, replaced } = core;
  if (!side) {
    const base = strongest.filter((f) => !replaced.has(f.type) && f.type !== monsterType).map((f) => ({ type: f.type, strength: f.strength, fieldId: f.id }));
    const hybrid = pick && !pick.r.parents.includes(monsterType) ? { name: pick.r.hybrid, parents: [...pick.r.parents] } : null; // the type-only result, unchanged (applies: always)
    return { base, hybrid };
  }
  const best = new Map();
  for (const f of core.here) if (!replaced.has(f.type) && reaches(f, monsterType, side) && core.stronger(f, best.get(f.type))) best.set(f.type, f);
  const base = [...best.values()].map((f) => ({ type: f.type, strength: f.strength, fieldId: f.id }));
  const hybrid = pick ? { name: pick.r.hybrid, parents: [...pick.r.parents], side: pick.side ?? null, applies: !pick.r.parents.includes(monsterType) && (!pick.side || pick.side === 'both' || pick.side !== side) } : null;
  return { base, hybrid };
}

/** Same-property maximum-speed modifiers add (−15% status + −10% field = −25%); totals are bounded at −75% and +50%. */
export function combineMaxSpeed(pcts) { const t = pcts.reduce((s, p) => s + p, 0); return Math.max(-75, Math.min(50, t)); }
/**
 * The shared maximum-speed aggregation for one monster (Task 8 M3; spec §11): `mods` maps a source layer (e.g. 'field', 'status')
 * to its signed percentage; all same-property layers add and the total is bounded by combineMaxSpeed. Returns the multiplier on the
 * monster's ordinary maximum speed (exactly 1 with no modifiers). Current-speed loss (Stumbled) is not a maximum-speed modifier.
 */
export function maxSpeedFactor(mods) { if (!mods) return 1; const v = Object.values(mods); return v.length ? 1 + combineMaxSpeed(v) / 100 : 1; }

/**
 * The fields of one play in the engine's play-relative frame (Task 8 M3). Fields are stored in the absolute home-goal frame
 * (rules.js absYard/absLat); the engine's x runs from the line of scrimmage toward the offense's goal and y is lateral in the offense's
 * frame. `home` is true when the home team has the ball. Returns plain copies (the stored fields are never mutated by a play).
 */
export function toPlayFrame(fields, { home, ballOn, ballLat = 0 }) {
  const fx = (yard) => (home ? yard : 100 - yard) - ballOn, fy = (lat) => (home ? lat : -lat) - ballLat;
  return (fields || []).map((f) => {
    const xs = f.yard.map(fx), ys = f.lat.map(fy);
    const hole = (h) => { const hx = h.yard.map(fx), hy = h.lat.map(fy); return { yard: [Math.min(...hx), Math.max(...hx)], lat: [Math.min(...hy), Math.max(...hy)] }; };
    return { id: f.id, type: f.type, createdAt: f.createdAt, strength: f.strength ?? null, owner: f.owner ?? null, team: f.team ?? null, ability: f.ability ?? null, payload: f.payload ?? null, remaining: f.remaining, clock: f.clock, ownerTeam: f.ownerTeam, ...(f.createdThisPlay ? { fresh: true } : {}), /* Task 8 presentation: the field's creation play (reveal), data only */
      yard: [Math.min(...xs), Math.max(...xs)], lat: [Math.min(...ys), Math.max(...ys)], ...(f.holes?.length ? { holes: f.holes.map(hole) } : {}) }; // M3 hook: removed footprints
  });
}
