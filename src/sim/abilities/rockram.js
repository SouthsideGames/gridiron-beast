// EAR-02-F Stonewall Swat (rockram: Craggo / Ramparte; LB). Task 8 M3, Earth batch (targeted effect).
// Contract (Dex): three qualifying participating defensive scrimmage plays fill the bar (at most one per play; no personal credit
// needed). A play qualifies when the opponent gains <= 3 / 4 / 5 / 6 yards by mastery, losses and incompletions included; opponent
// touchdowns, special teams and two-point attempts are excluded. Armed, he targets the first opposing forward pass released on a later
// participating defensive play (play action and RPO passing branches included): a guaranteed breakup regardless of distance; no
// interception, fumble, damage or status. The launch empties the bar; no extra cooldown; the activation play earns no charge; runs
// keep him ready. Partial and full bars carry through possessions and halftime; game end clears (game-scope state). Stunned or
// Knocked Down at release prevents the launch and keeps the bar; an ordinary block engagement does not. With several able armed
// users, stable lineup order picks one (the engine asks defenders in lineup order and stops at the first breakup).
// The incompletion is an ordinary one (down, clock and stats): the engine ends the play incomplete at the release, no catch is made.
//
// Choices where the contract is silent (documented, minimal):
// - The breakup is credited to him as the pass breakup of the play (the ordinary stat handling of a broken-up pass).
// - "Opponent gain" is the play's net gain; an interception counts as no gain (scored like an incompletion).
// - Two-point tries neither charge nor launch (they are not defensive scrimmage plays).
import { registerAbility } from './registry.js';
import { scrimmage, disabled, tier, allowedGain } from './earth-ice-util.js';

const MAX_GAIN = [3, 4, 5, 6]; // by mastery
export const FULL = 3;

export default registerAbility({
  family: 'rockram', abilityId: 'EAR-02-F',
  initGame: () => ({ bar: 0 }),
  hooks: {
    playStart(ctx, self) { self.sw = { launched: false }; },
    passRelease(ctx, self, passer) {
      const st = ctx.state(self);
      if (st.bar < FULL || self.team !== 'def' || !scrimmage(ctx) || disabled(ctx, self)) return undefined;
      if (!ctx.canStartSignature(self)) return undefined;
      st.bar = 0; self.sw.launched = true; ctx.executed(self);
      ctx.log(`${self.name}'s Stonewall Swat knocks the pass down`, { kind: 'ability', by: self.slot, side: self.team, victim: passer.slot, ability: 'EAR-02-F', fromX: +self.x.toFixed(2), fromY: +self.y.toFixed(2), x: +passer.x.toFixed(2), y: +passer.y.toFixed(2) });
      return { breakup: true };
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || s.kickoff || s.twoPoint || self.sw?.launched) return; // the activation play earns no charge
      const st = ctx.state(self); if (st.bar >= FULL) return;
      const g = allowedGain(ctx, s);
      if (g != null && g <= tier(MAX_GAIN, self.mastery) && ctx.canGainCharge(self)) st.bar += 1;
    },
  },
});
