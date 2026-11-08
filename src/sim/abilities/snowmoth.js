// ICE-01-F Frostmark (snowmoth: Flurrit / Blizzmoth; K). Task 8 M3, Ice batch (zone). Formula play (rules.js doFieldGoal).
// Contract (Dex; FIELD_CLOCKS.md: "Clear"): a successful field goal ONLY (any distance; extra points and misses excluded) earns at
// most one pending field; no extra cooldown; maximum one pending token. Eight yards wide by six long, lateral and depth placement
// random, the whole rectangle between the opponent's upcoming line of scrimmage and the fixed 12-yard safety-depth reference, inside
// the normal playable boundaries. It is created at the next opposing offensive scrimmage pre-play, even while the kicker is benched;
// the placement is drawn once and locked (formation changes do not reroll). Ice: braking deceleration reduced 20% (Flurrit) / 25%
// (Blizzmoth) for every non-Ice monster of both teams (src/sim/t8/field-effects.js); no maximum Speed, acceleration or catching
// penalty and no automatic status. Lifetime 1 / 2 / 3 / 4 completed opposing offensive scrimmage plays by mastery, including the spawn
// play; a stationary world location after spawn. Kickoffs do not consume the pending activation; the pending token survives possession
// changes and halftime; the created field clears at halftime (non-legendary rule); the actual game end clears all.
//
// Choices where the contract is silent (documented, minimal):
// - The random fractions are drawn when the field goal is made (the field's lateral and depth position within the allowed band at the
//   upcoming line), from a stream derived from the game's state, so the main game stream is untouched.
// - "Reveal before both play choices": the field is created at the snap of that play, with the play's line (rules.js runScrimmagePlay);
//   it is then fixed for its lifetime. The mastery execution is recorded when the field is earned.
import { registerAbility } from './registry.js';
import { stageOf, tier } from './earth-ice-util.js';

const BRAKING = [20, 25]; // % by form
const LIFETIME = [1, 2, 3, 4]; // completed opposing offensive scrimmage plays, by mastery
export const FROSTMARK = Object.freeze({ width: 8, length: 6, maxDepth: 12 });

export default registerAbility({
  family: 'snowmoth', abilityId: 'ICE-01-F',
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
