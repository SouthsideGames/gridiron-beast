// WAT-04-F Second Touch (tidefin: Ripplet; WR). Task 8 M3 (special action; one extra catch attempt).
// Contract (Dex): a physically reached pass he fails to catch qualifies; an unreachable pass, an interception or a defender's
// deflection does not. Normal scrimmage plays only (not returns, not two-point tries). He gets one additional ordinary catch attempt
// at the same live, bobbled ball, using normal Catching, position and contest checks: no guaranteed catch, no retry bonus, no
// teleporting an unreachable throw into reach; defenders may intercept or bat the bobble; a second failure ends the sequence. Cooldown
// 5 / 4 / 3 / 2 offensive plays by mastery, spent even if the retry fails. No lingering buff, status, field or label.
// The engine's "dropped" hook (engine.js resolveArrival, "M3 hook") offers the drop; returning { retry } resolves the same ball again
// from the top (coverage, the defender's play on the ball, the catch roll), once per ball.
// Choices where the contract is silent (reported):
//  - In this engine every contested incompletion is credited as the defender's breakup (stats.pbuBy), so it is the "defender
//    deflection" that does not qualify; a "contested drop" is a reached ball he drops with a defender near but not breaking it up.
//  - The retry resolves in the same tick (the bobble does not move the ball or the players).
//  - The cooldown counts his participating offensive scrimmage plays (the pilots' convention).
//  - A drop inside an Eclipse cannot start it (spec §11; nothing is spent).
//  - The Dex's permanent Catching 78 / Speed 95 ceilings are generation and training limits, not part of the play contract; not
//    touched here.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the second catch
// attempt is the live activation (gated); cooldown only.
import { registerAbility } from './registry.js';
import { scrimmage, byMastery, cooldownStep } from './fw-util.js';

export const TOUCH = Object.freeze({ cooldownByMastery: [5, 4, 3, 2] });

export default registerAbility({
  family: 'tidefin', abilityId: 'WAT-04-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.touch = { used: false }; },
    dropped(ctx, self) {
      if (self.team !== 'off' || !scrimmage(ctx) || self.touch.used || ctx.state(self).cd > 0) return undefined;
      if (!ctx.canStartSignature(self)) return undefined;
      self.touch.used = true; ctx.state(self).cd = byMastery(TOUCH.cooldownByMastery, self.mastery); ctx.executed(self);
      ctx.log(`${self.name} bobbles it and reaches again`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-04-F' });
      return { retry: true };
    },
    playEnd(ctx, self) { if (self.team !== 'off' || !scrimmage(ctx)) return; cooldownStep(ctx.state(self), !!self.touch?.used); },
  },
});
