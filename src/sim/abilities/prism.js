// LIG-04-F Prism Break (prism: Prismara; S). Task 8 M3, Light batch (special action).
// Contract (Dex; spec §11 "Prism Break removes exactly its selected approved zone/overlap region and corresponding parent
// contributions; do not remove all fields"): his personal tackles and pass breakups grant one charge per participating play, at most
// one per play; three charges (at every mastery; one full bar at most) arm Prism Break for his next eligible defensive pre-choice
// opportunity. It selects the nearest existing enemy-created environmental zone anywhere on the field (distance to its nearest edge,
// creation order breaking ties; base, legendary-created and overlap zones are eligible) and removes it: a base zone entirely; a hybrid
// overlap as the hybrid plus the contributing parents' effects within the overlap footprint only (the rest of each parent stays; no
// parent effect returns there, and the removed footprint is never reconstituted when overlaps are recomputed: fields.js holes). All
// three charges are spent only on a legal removal; no target keeps the full bar. The activation play cannot recharge. Charge
// persists over possessions, halftime and overtime and clears at game end (game-scope state). Physical obstacles, walls, clones,
// auras and statuses are never removed (only fields are candidates). An unable source keeps his readiness.
// Readings where the contract is silent (documented, minimal):
//   - The pre-choice opportunity is the pre-choice point of a defensive scrimmage snap he is on the field for (rules.js preSnap, after
//     this snap's pending fields are created); "nearest" is measured from his alignment spot for that snap.
//   - The zones are the effective footprints on the field: a hybrid overlap is the recipe intersection of two fields; a base zone is
//     its rectangle less the hybrid overlaps it is a parent of (there the hybrid replaces it, §11) and less removed footprints
//     (rectangle subtraction). "Distance to nearest edge" is the distance from him to the footprint's nearest edge, 0 when he stands
//     inside it (the zone he stands in is the nearest). Measured on whole rectangles instead, an overlap could never be nearer than
//     its own parents and overlap selection would never happen.
//   - An overlap is eligible only when both contributing parents are enemy-created; its creation order is the later parent's. Ties
//     after creation order: the zone id. Removing a base zone entirely also ends any hybrid it formed (one parent is gone).
//   - Charges come from defensive scrimmage plays only (tackles as the stat sheet credits them, pass breakups as pbuBy).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): Prism Break
// resolves at the pre-choice point (rules.js game preSnap: out of play, not gated); tackle and breakup charges are in-play charge
// gains (gated).
import { registerAbility } from './registry.js';
import { RECIPES } from '../t8/fields.js';
import { scrimmage } from './common.js';

export const PRISM = Object.freeze({ charges: 3 });
const isRecipe = (a, b) => a !== b && RECIPES.some((r) => r.parents.includes(a) && r.parents.includes(b));
const meet = (a, b) => ({ yard: [Math.max(a.yard[0], b.yard[0]), Math.min(a.yard[1], b.yard[1])], lat: [Math.max(a.lat[0], b.lat[0]), Math.min(a.lat[1], b.lat[1])] });
const area = (r) => r.yard[1] > r.yard[0] && r.lat[1] > r.lat[0];
/** Rectangle subtraction: the pieces of r outside h (at most four). */
export function subtract(r, h) {
  const m = meet(r, h); if (!area(m)) return [r];
  return [{ yard: [r.yard[0], m.yard[0]], lat: [...r.lat] }, { yard: [m.yard[1], r.yard[1]], lat: [...r.lat] },
    { yard: [...m.yard], lat: [r.lat[0], m.lat[0]] }, { yard: [...m.yard], lat: [m.lat[1], r.lat[1]] }].filter(area);
}
const minus = (rects, holes) => holes.reduce((acc, h) => acc.flatMap((r) => subtract(r, h)), rects);
/** Distance from point p ({ yard, lat }) to a rectangle (0 inside). */
export const rectDistance = (p, r) => Math.hypot(Math.max(r.yard[0] - p.yard, 0, p.yard - r.yard[1]), Math.max(r.lat[0] - p.lat, 0, p.lat - r.lat[1]));
/** Distance from p to a zone footprint (its rectangle pieces), 0 when he stands in it. */
export const zoneDistance = (p, pieces) => Math.min(...pieces.map((r) => rectDistance(p, r)));
function ownerSide(teams, mid) {
  for (const side of ['home', 'away']) { const t = teams?.[side]; if (!t) continue;
    const pool = [...Object.values(t.offense || {}), ...Object.values(t.defense || {}), ...(t.bench || []), t.kicker, t.returner];
    if (pool.some((m) => m?.id === mid)) return side; }
  return null;
}
/**
 * The candidate zones for a club `side` (home/away), each with its effective footprint (rectangle pieces): an enemy base field is its
 * rectangle less removed footprints and less every hybrid overlap it is a parent of; an enemy-made hybrid overlap is the two parents'
 * intersection less removed footprints.
 */
export function candidateZones(fields, side, teams = null) {
  const owner = (f) => f.ownerTeam ?? ownerSide(teams, f.owner);
  const rect = (f) => ({ yard: [...f.yard], lat: [...f.lat] });
  const enemy = fields.filter((f) => owner(f) && owner(f) !== side);
  const out = [];
  for (const f of enemy) {
    const hybrids = fields.filter((g) => g !== f && isRecipe(f.type, g.type)).map((g) => meet(f, g)).filter(area);
    const pieces = minus([rect(f)], [...(f.holes || []), ...hybrids]);
    if (pieces.length) out.push({ kind: 'base', fields: [f], rect: rect(f), pieces, createdAt: f.createdAt, id: String(f.id) });
  }
  for (let i = 0; i < enemy.length; i++) for (let j = i + 1; j < enemy.length; j++) {
    const a = enemy[i], b = enemy[j]; if (!isRecipe(a.type, b.type)) continue;
    const m = meet(a, b); if (!area(m)) continue;
    const pieces = minus([m], [...(a.holes || []), ...(b.holes || [])]); if (!pieces.length) continue; // already removed there
    out.push({ kind: 'overlap', fields: [a, b], rect: m, pieces, createdAt: Math.max(a.createdAt, b.createdAt), id: [a.id, b.id].map(String).sort().join('|') });
  }
  return out;
}
/** Select and remove one zone for a source at point p; returns the removed zone or null (nothing eligible). Mutates t8.fields.list. */
export function prismBreak(t8, p, side, teams = null) {
  const list = t8.fields?.list || []; const cands = candidateZones(list, side, teams); if (!cands.length) return null;
  for (const c of cands) c.dist = zoneDistance(p, c.pieces);
  cands.sort((x, y) => x.dist - y.dist || x.createdAt - y.createdAt || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const z = cands[0];
  if (z.kind === 'base') t8.fields.list = list.filter((f) => f !== z.fields[0]); // entirely (a hybrid it formed goes with it)
  else for (const f of z.fields) (f.holes ||= []).push({ yard: [...z.rect.yard], lat: [...z.rect.lat] }); // the overlap footprint only
  return z;
}

export default registerAbility({
  family: 'prism', abilityId: 'LIG-04-F',
  initGame: () => ({ charges: 0, noCharge: false }),
  game: {
    preSnap(g, self, { team, align, toAbs, teams, sitsOut, side }) {
      if (team !== 'def' || !align) return; const st = g.state(self);
      if (st.charges < PRISM.charges || sitsOut) return; // an unable source keeps his readiness
      const z = prismBreak(g.t8, toAbs(align), side, teams); if (!z) return; // no target keeps the full bar
      st.charges = 0; st.noCharge = true; g.executed(self);
      g.log(`${self.name}'s Prism Break shatters ${z.kind === 'base' ? `a ${z.fields[0].type} field` : 'a hybrid overlap'}`, { by: self.mid, ability: 'LIG-04-F', removed: { kind: z.kind, fields: z.fields.map((f) => f.id), yard: z.rect.yard, lat: z.rect.lat } });
    },
  },
  hooks: {
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || !scrimmage(ctx)) return; const st = ctx.state(self);
      if (st.noCharge) { st.noCharge = false; return; } // the activation play cannot recharge
      const S = ctx.stats; const tackle = S.tackler === self.slot && s.result !== 'sack' && s.result !== 'touchdown' && !S.defensiveScore;
      if ((tackle || S.pbuBy === self.slot) && st.charges < PRISM.charges && ctx.canGainCharge(self)) st.charges += 1; // one per play; one full bar at most
    },
  },
});
