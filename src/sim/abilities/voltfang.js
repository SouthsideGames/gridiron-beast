// ELE-03-F Phase Release (voltfang: Zappard, WR). Task 8 M3 Electric batch (self enhancement).
// Contract (Dex): activates automatically at a ready receiving-route snap and spends readiness even with no contact. Zappard only (no
// teammate protection, no field). While phased he ignores opposing body collisions and jams and cannot block opponents; no teleport
// and no Speed increase. Phasing ends at the first designated route cut, the quarterback's pass release or the whistle, whichever is
// first: he solidifies before the ball's flight, so catches, interceptions and tackles resolve normally. Defenders track him normally
// (no automatic separation or confusion); fields and statuses still apply. Stunned or Knocked Down prevents activation or ends
// phasing. Cooldown 5 / 4 / 3 / 2 subsequent offensive plays by mastery (mastery changes the cooldown only). An ability state, not a
// shared status.
// Engine capability used (M3 hook): `phased` (opposing collision pushes skipped; cannot engage as a blocker).
// Choices where the contract is silent (reported): "designated route cut" = his first drawn interior waypoint with a direction change
// (cutsTaken); the engine has no press-jam mechanic, so "jams" are the body collisions; two-point tries are excluded (batch reading).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the route-snap
// phase is the live activation (gated); cooldown only.
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, scrimmage, ready, spend, countPlay, disabled, cutsTaken } from './nature-electric-common.js';

export default registerAbility({
  family: 'voltfang', abilityId: 'ELE-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    playStart(ctx, self) {
      self.pr = { wp: 0, live: false }; const st = ctx.state(self);
      if (self.team !== 'off' || !scrimmage(ctx) || self.assignment?.a !== 'route' || !ready(st) || disabled(ctx, self) || !ctx.canStartSignature(self)) return;
      self.pr.live = true; self.phased = true; spend(st, byMastery(CD_5432, self.mastery)); ctx.executed(self);
      ctx.log(`${self.name} phases out`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ELE-03-F' });
    },
    tick(ctx, self) {
      const pr = self.pr; if (!pr?.live) return;
      const cut = cutsTaken(self, pr).length > 0, released = ctx.ball.thrownAt != null;
      const why = cut ? 'cut' : released ? 'release' : disabled(ctx, self) || self.stun > 1e5 ? 'disabled' : null;
      if (!why) return;
      pr.live = false; self.phased = false;
      ctx.log(`${self.name} solidifies`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'ELE-03-F', reason: why });
    },
    playEnd(ctx, self) { self.phased = false; countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
