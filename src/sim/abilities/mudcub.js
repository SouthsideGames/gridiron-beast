// WAT-02-F Divided Guard (mudcub: Muddlet / Sludgeon; OL). Task 8 M3 (self enhancement; two simultaneous engagements).
// Contract (Dex): activates automatically at the snap of an eligible offensive play when ready, even if in the end zero or one
// defender is engaged; the activation is spent at the snap. For that play he may hold up to two defenders at once, each within his
// normal physical reach (no ranged blocking), and may replace a freed target during the play; no two fixed targets for the whole
// play. With two engagements each uses 50% of his Strength and his form/mastery Blocking fraction (Muddlet 70/73/76/79%, Sludgeon
// 80/83/86/89%); with one engagement, his normal 100% attributes. No pancake while double-engaged; a single engagement keeps the
// ordinary one-attempt-per-play OL pancake rule. Reach, collision and ordinary contest rules remain; the monster, the ball and his
// statuses are not duplicated. Active the whole activation play, ending at the whistle. Cooldown: three subsequent offensive plays;
// carries across halftime and overtime; resets at the actual game end (game-scope state).
// The engine holds the second engagement as engaged2 and scales each engagement's attributes while he holds two (engine.js
// blockAttrs / tryEngage / resolveEngagement, "M3 hook"). The contract picks up the second defender: each tick while he holds one
// engagement, the nearest free defender within the ordinary engagement reach (1.6 yd) is engaged through the ordinary attempt.
// Choices where the contract is silent (reported):
//  - Eligible offensive plays are offensive scrimmage plays (kickoff returns and two-point tries are not); the cooldown counts his
//    participating offensive scrimmage plays (the pilots' convention).
//  - "Free" defender: not engaged, not stunned, not in his no-engage recovery, not knocked down.
//  - Mastery: one execution per activation (at the snap, where the contract spends it).
//  - A snap inside an Eclipse cannot start it (spec §11; nothing is spent).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the automatic snap
// activation is the live activation (gated); cooldown only, no charge.
import { registerAbility } from './registry.js';
import { stageOf, scrimmage, byMastery, cooldownStep } from './fw-util.js';

export const GUARD = Object.freeze({ reach: 1.6, strengthSplit: 0.5, cooldown: 3, blockingByStage: [[70, 73, 76, 79], [80, 83, 86, 89]] });

export default registerAbility({
  family: 'mudcub', abilityId: 'WAT-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) {
      self.guard = { active: false, held: [], doubled: 0 };
      if (self.team !== 'off' || !scrimmage(ctx) || ctx.state(self).cd > 0 || !ctx.canStartSignature(self)) return;
      const frac = byMastery(GUARD.blockingByStage[stageOf(self.form)] || GUARD.blockingByStage[0], self.mastery) / 100;
      self.guard.active = true; self.maxEngagements = 2; self.splitMods = { strength: GUARD.strengthSplit, blocking: frac };
      ctx.state(self).cd = GUARD.cooldown; ctx.executed(self);
      ctx.log(`${self.name}'s Divided Guard braces`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-02-F', phase: 'snap' });
    },
    tick(ctx, self) {
      const g = self.guard; if (!g?.active) return;
      // Keep his two engagement slots truthful (another system may have broken one of them).
      const held = [self.engaged, self.engaged2, ...g.held].filter((x, i, arr) => x && x.engaged === self && arr.indexOf(x) === i).slice(0, 2);
      self.engaged = held[0] || null; self.engaged2 = held[1] || null; g.held = held;
      if (!self.engaged || self.engaged2 || self.stun > 0) return;
      const free = ctx.opponents(self.team).filter((d) => !d.engaged && !(d.stun > 0) && !(d.noEngage > 0) && !d.knockedDown && ctx.dist(d, self) <= GUARD.reach).sort((p, q) => ctx.dist(p, self) - ctx.dist(q, self))[0];
      if (free && ctx.tryEngage(self, free)) {
        g.held = [self.engaged, self.engaged2]; g.doubled += 1;
        ctx.log(`${self.name} divides to hold ${self.engaged.name} and ${free.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-02-F', phase: 'double', victims: [self.engaged.slot, free.slot] });
      }
    },
    playEnd(ctx, self) { if (self.team !== 'off' || !scrimmage(ctx)) return; cooldownStep(ctx.state(self), !!self.guard?.active); },
  },
});
