// ICE-06-F Second Chance (glacivern: Glacivern; K, legendary; owner ruling N7g: keeps K, Second Chance and Deep Winter; the Avalanche
// play is retired). Task 8 M3, Ice batch (special action). Formula play (rules.js doFieldGoal).
// Contract (Dex, owner B): automatically on the first eligible missed FIELD GOAL of the game (wide or short; extra points and blocked
// kicks excluded; the resolver has no blocked kick and none is invented), the same football is retried from the original distance
// under the currently applicable kicking conditions: a fresh ordinary success check, never a guaranteed score. Two field-goal attempts
// are recorded (the miss and the retry); a successful retry records one make, a double miss none. One football play, one clock runoff,
// one final score and possession resolution; both checks and the ability use are logged. Once per GAME including overtime (no
// halftime refresh, no mastery scaling); the rescue spends the use whether it succeeds or fails; a good original kick keeps it. Only
// the final good result awards three points and triggers made-field-goal abilities, once.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): a formula field-
// goal retry (rules.js fieldGoalMiss), out of play; not gated.
import { registerAbility } from './registry.js';

export default registerAbility({
  family: 'glacivern', abilityId: 'ICE-06-F',
  initGame: () => ({ used: false }),
  hooks: {
    fieldGoalMiss(ctx, self, res, retry) {
      const st = ctx.state(self); if (st.used || res.good) return undefined;
      st.used = true; ctx.executed(self);
      const again = retry();
      return { ...again, checks: [{ good: false, chance: res.chance }, { good: again.good, chance: again.chance }], secondChance: true, ability: 'ICE-06-F',
        text: `${res.text} ${self.name}'s Second Chance: an ice shard redirects the ball toward the uprights. ${again.good ? `It is GOOD from ${again.distance} yards.` : 'Still no good.'}` };
    },
  },
});
