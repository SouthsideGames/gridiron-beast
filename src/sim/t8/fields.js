// Task 8 M2 (WP5): field geometry, overlap resolution and movement-modifier aggregation (spec §11; N7d clocks live in the ability
// contracts). Absolute coordinates as src/core/field.js: `yard` -10..110 (end lines), `lat` -26.67..26.67. Pure; not yet wired.
import { FIELD } from '../../core/field.js';

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
export const contains = (r, yard, lat) => yard >= r.yard[0] && yard <= r.yard[1] && lat >= r.lat[0] && lat <= r.lat[1];

/** The six approved hybrid recipes (only these create hybrids). */
export const RECIPES = Object.freeze([
  { hybrid: 'Steam', parents: ['Fire', 'Water'] },
  { hybrid: 'Eclipse', parents: ['Light', 'Dark'] },
  { hybrid: 'Living Terrain', parents: ['Nature', 'Earth'] },
  { hybrid: 'Magnetic Storm', parents: ['Electric', 'Metal'] },
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
 */
export function effectsAt(fields, yard, lat, monsterType) {
  const here = fields.filter((f) => f.type !== 'Dragon' && contains(f, yard, lat));
  const byType = new Map();
  for (const f of here) { const cur = byType.get(f.type); if (!cur || (f.strength ?? 0) > (cur.strength ?? 0) || ((f.strength ?? 0) === (cur.strength ?? 0) && f.createdAt < cur.createdAt)) byType.set(f.type, f); }
  const oldest = new Map(); for (const f of here) { const o = oldest.get(f.type); if (!o || f.createdAt < o.createdAt || (f.createdAt === o.createdAt && String(f.id) < String(o.id))) oldest.set(f.type, f); }
  const types = [...byType.keys()].sort();
  let pick = null;
  for (let i = 0; i < types.length; i++) for (let j = i + 1; j < types.length; j++) {
    const r = recipeFor(types[i], types[j]); if (!r) continue;
    const a = oldest.get(types[i]), b = oldest.get(types[j]);
    const formed = Math.max(a.createdAt, b.createdAt); const key = [a.id, b.id].map(String).sort().join('|');
    if (!pick || formed < pick.formed || (formed === pick.formed && key < pick.key)) pick = { r, formed, key };
  }
  const replaced = new Set(pick ? pick.r.parents : []);
  const base = [...byType.values()].filter((f) => !replaced.has(f.type) && f.type !== monsterType).map((f) => ({ type: f.type, strength: f.strength, fieldId: f.id }));
  const hybrid = pick && !pick.r.parents.includes(monsterType) ? { name: pick.r.hybrid, parents: [...pick.r.parents] } : null;
  return { base, hybrid };
}

/** Same-property maximum-speed modifiers add (−15% status + −10% field = −25%); totals are bounded at −75% and +50%. */
export function combineMaxSpeed(pcts) { const t = pcts.reduce((s, p) => s + p, 0); return Math.max(-75, Math.min(50, t)); }
