// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { byMastery } from './common.js';

export const PBUS = 2, STRENGTH = 20;
export const LIFETIME = [3, 4, 4, 5]; // by mastery
export const LANE = Object.freeze({ width: 4, from: 5, to: 12 });
const HALF = 80 / 3; // the playable half-width (core/field.js FIELD.halfWidth)

export default registerAbility({
  family: 'windlynx', abilityId: 'WIN-04-F',
  review: { games: 12 }, // reviewer: a genuinely rare trigger (two of his breakups in one game (4 of 40 games)); search up to 12 games
  initGame: () => ({ charges: 0 }),
  preSnap(api, self) {
    if (api.side !== 'def' || !api.able) return; const st = api.state(); if (st.charges < PBUS) return;
    if (api.fields().some((f) => f.owner === self.mid && f.ability === 'WIN-04-F')) return; // own lanes remain: hold the full bar
    for (const side of [-1, 1]) api.queueField({ owner: self.mid, ownerTeam: api.teamSide, type: 'Wind', ability: 'WIN-04-F', strength: STRENGTH, lifetime: byMastery(LIFETIME, self.mastery),
      clock: 'teamDefense', width: LANE.width, los: [LANE.from, LANE.to], latOff: side * HALF }); // centred on the sideline: placeRect shifts it inward, outer edge on the sideline
    st.charges = 0; st.fresh = true; api.executed();
  },
  hooks: {
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || ctx.kickoff) return;
      if (st.fresh) { st.fresh = false; return; } // the creation play cannot recharge
      if (ctx.twoPoint) return;
      if (ctx.stats.pbuBy === self.slot && !ctx.stats.interceptor && ctx.canGainCharge(self)) st.charges = Math.min(PBUS, st.charges + 1);
    },
  },
});
