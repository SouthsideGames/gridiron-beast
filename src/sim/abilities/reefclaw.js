// WAT-03-F Pressure Drain (reefclaw: Crustank; DL). Task 8 M3 (targeted effect; immediate stamina drain).
// Contract (Dex; spec §12; B10): at his first block engagement while ready (immediate, not prolonged contact), one engaged opposing
// blocker loses 5 / 10 / 15 / 20 CURRENT stamina points by mastery, bounded at zero. The pool is the per-game stamina (capacity =
// permanent Durability 1:1; temporary Durability modifiers never resize it); the drain does not reduce Durability and is not resisted
// by higher Durability. The loss lasts until the approved halftime recovery; reaching 0 starts the game-long Exhaustion (from his
// next play, as every stamina exhaustion). Not Afflicted, not a percentage drain, not injury damage; no timed debuff or shared status.
// Recharge: three subsequent defensive plays; one blocker per activation.
// The drain goes through the engine's ctx.drainStamina ("M3 hook"; src/sim/t8/stamina.js drainBy).
// Choices where the contract is silent (reported):
//  - Defensive plays are scrimmage plays (a kickoff is not a defensive snap, B20; two-point tries neither activate nor count); the
//    cooldown counts his participating defensive plays (the pilots' convention).
//  - Without a game (labs, previews) the drain lands on that play's throwaway record only (labs award and keep nothing).
//  - An engagement inside an Eclipse cannot start it (spec §11; nothing is spent).
import { registerAbility } from './registry.js';
import { scrimmage, byMastery, cooldownStep } from './fw-util.js';
import * as F from '../../core/fraction.js';

export const DRAIN = Object.freeze({ pointsByMastery: [5, 10, 15, 20], cooldown: 3 });

export default registerAbility({
  family: 'reefclaw', abilityId: 'WAT-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.drain = { done: false }; },
    engage(ctx, self, blocker) {
      if (self.team !== 'def' || !scrimmage(ctx) || self.drain.done) return;
      self.drain.done = true; // his first block engagement of the play
      if (ctx.state(self).cd > 0 || !ctx.canStartSignature(self)) return;
      const pts = byMastery(DRAIN.pointsByMastery, self.mastery); const rec = ctx.drainStamina(blocker, pts);
      ctx.state(self).cd = DRAIN.cooldown; self.drain.fired = true; ctx.executed(self);
      ctx.log(`${self.name}'s Pressure Drain saps ${blocker.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-03-F', victim: blocker.slot, victimSide: blocker.team, points: pts,
        stamina: rec ? F.toNumber(rec.stamina) : null, exhausted: !!rec?.exhausted });
    },
    playEnd(ctx, self) { if (self.team !== 'def' || !scrimmage(ctx)) return; cooldownStep(ctx.state(self), !!self.drain?.fired); },
  },
});
