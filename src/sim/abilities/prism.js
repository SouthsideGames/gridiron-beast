// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
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
    preSnap(g, self, data) {
      if (data.team !== 'def' || data.sitsOut) return;
      const st = g.state(self); if (st.charges < PRISM.charges) return;
      const zone = prismBreak(g.t8, data.toAbs(data.align || [12, 0]), data.side, data.teams);
      if (!zone) return;
      st.charges = 0; st.noCharge = true; g.executed(self);
      const removed = { kind: zone.kind, fields: zone.fields.map((f) => f.id), yard: zone.rect.yard, lat: zone.rect.lat };
      const record = g.t8.preChoice; if (record) (record.prism ||= []).push({ mid: self.mid, slot: data.slot, at: data.align || [12, 0], removed });
      g.log(`${self.input?.name || 'Prismara'} shatters a newly placed enemy zone`, { ability: 'LIG-04-F', by: self.mid, removed, preChoice: true });
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
