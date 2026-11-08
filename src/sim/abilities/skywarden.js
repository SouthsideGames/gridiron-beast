// WIN-03-F Air Brake (skywarden: Aeralis). Task 8 M3 Wind batch (targeted effect, pass-breakup charge).
// Contract (Dex): three personal pass breakups fill the bar (interceptions excluded). On a later successful forward-pass catch by the
// receiver he guards (his man assignment, or the zone receiver he is tracking at the catch), Air Brake activates if he is within 8
// yards of that receiver (measured at the completed catch) and able; never on the charge-filling play. A frontal wind displaces the
// receiver 5 / 6.5 / 8 / 10 yards by mastery OPPOSITE the receiver's movement vector (lateral crossing routes included); the ball
// moves with the carrier; he stops safely at bodies, obstacles and field bounds; no pull, automatic tackle, status or strip. Wind
// receivers are eligible (no environmental immunity). The full bar is consumed only when a legal activation occurs; no extra
// cooldown; the activation play cannot recharge. Disabled source, invalid range or an unguarded target preserves the bar. Charge
// survives possessions, halftime, overtime and saves; the end of the game clears it. Football yardage can genuinely be lost; a later
// normal stop sets the spot. A catch that already ended the play (a touchdown, out of bounds) is never undone. No automatic breakup
// or second catch roll; the carrier keeps running.
//
// Choices where the contract is silent (documented, minimal):
// - Two-point tries do not charge the bar (no official pass-breakup statistic there); an activation on a two-point catch is allowed.
// - Vector fallback: the receiver's last nonzero heading, then the offense's forward direction (so the push is toward his own goal).
// - The catch spot statistic (stats.catchX) stays the catch point: the lost yards appear once, in the play's gain (never as negative
//   yards after catch).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the push at the
// guarded catch is the live activation (gated: a denied start preserves the bar); pass-breakup charges are in-play charge gains
// (gated).
import { registerAbility } from './registry.js';
import { byMastery, able, pushSafely } from './common.js';

export const PBUS = 3, RANGE = 8;
export const PUSH = [5, 6.5, 8, 10]; // yards by mastery

export default registerAbility({
  family: 'skywarden', abilityId: 'WIN-03-F',
  initGame: () => ({ charges: 0 }),
  review: { prime: () => ({ charges: PBUS }) }, // reviewer staged input: the bar is full
  hooks: {
    playStart(ctx, self) { self.ab = { armed: ctx.state(self).charges >= PBUS, fired: false }; },
    catchMade(ctx, self, r) {
      const ab = self.ab; if (!ab?.armed || ab.fired || self.team !== 'def' || ctx.result) return;
      if (!able(ctx, self) || !ctx.guards(self, r) || ctx.dist(self, r) > RANGE) return; // preserve the bar
      if (!ctx.canStartSignature(self)) return; // a denied start preserves the bar
      const h = ctx.heading(r) || [1, 0]; const s = Math.hypot(h[0], h[1]); const ux = -h[0] / s, uy = -h[1] / s;
      const [m] = pushSafely({ actors: ctx.actors, movers: [r], ux, uy, distance: byMastery(PUSH, self.mastery), bounds: ctx.bounds, obstacles: ctx.obstacles() });
      ctx.ball.x = r.x; ctx.ball.y = r.y; // the ball moves with the carrier
      ctx.state(self).charges = 0; ab.fired = true; ctx.executed(self);
      ctx.log(`${self.name}'s Air Brake drives ${r.name} back`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WIN-03-F', victim: r.slot, dir: [+ux.toFixed(3), +uy.toFixed(3)], from: m.from.map((v) => +v.toFixed(2)), to: m.to.map((v) => +v.toFixed(2)) });
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || ctx.twoPoint || self.ab?.fired) return;
      if (ctx.stats.pbuBy === self.slot && !ctx.stats.interceptor && ctx.canGainCharge(self)) st.charges = Math.min(PBUS, st.charges + 1);
    },
  },
});
