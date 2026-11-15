// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { stageOf, tier } from './earth-ice-util.js';

const BRAKING = [20, 25]; // % by form
const LIFETIME = [3, 4, 5, 5]; // completed opposing offensive scrimmage plays, by mastery
export const FROSTMARK = Object.freeze({ width: 8, length: 6, maxDepth: 12 });

export default registerAbility({
  family: 'snowmoth', abilityId: 'ICE-01-F',
  review: { games: 12 }, // reviewer: a genuinely rare trigger (made field goals (about 0.5 a club a game)); search up to 12 games
  hooks: {
    fieldGoalMade(ctx, self) {
      if (ctx.pendingFields().some((p) => p.owner === self.mid && p.ability === 'ICE-01-F')) return; // maximum one pending token
      const u = ctx.rng ? ctx.rng.next() : 0.5, v = ctx.rng ? ctx.rng.next() : 0.5;
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, side: 'def', benchOk: true, type: 'Ice', ability: 'ICE-01-F', strength: tier(BRAKING, stageOf(self.form)),
        lifetime: tier(LIFETIME, self.mastery), clock: 'ownerDefense', place: 'randomDefense', ...FROSTMARK, u, v });
      ctx.executed(self);
    },
  },
});
