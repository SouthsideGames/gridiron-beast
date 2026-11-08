// WIN-02-F Slipstream Step (breezefang: Zephyroo / Mistralope). Task 8 M3 Wind batch (special action, broken-tackle charge).
// Contract (Dex): each personal broken tackle earns one charge (counted once, the bar caps at full with no overflow); the threshold is
// 3 (Zephyroo) / 2 (Mistralope), fixed by form. When full, his NEXT participating rushing play activates on his first crossing beyond
// the LOS while carrying the ball and able; never on the charge-filling play. One wind gust, one simultaneous snapshot of positions
// and of his current movement vector: ALL other on-field monsters of BOTH teams (other Wind monsters included; no radius; no shared
// status gate) are displaced 1 / 1.5 / 2 / 2.5 yards by mastery OPPOSITE his movement direction (diagonals included), stopping
// safely at bodies, obstacles and field bounds, with no domino pushing. No stun, stumble, tackle break or extra football. Velocity
// zero: his last nonzero heading, then the offense's forward direction. The bar empties on activation, no other cooldown; the
// activation play cannot recharge. Unable at the crossing preserves readiness; no crossing preserves the full bar. Partial / full
// charge persists across possessions, halftime and overtime to the end of the game (game-scope state, saved with the game).
//
// Choices where the contract is silent (documented, minimal):
// - Broken tackles count on every play he carries except two-point tries (kick returns included); a "rushing play" is a designed run
//   from scrimmage (not a kickoff return, not a two-point try) on which he is the carrier.
// - "Able" (common.js able): no accepted Stunned / Knocked Down status; the engine's momentary off-balance is not a status.
// - The displaced monsters keep their velocities; engaged pairs move together (both are displaced by the same vector).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the gust at the
// first crossing is the live activation (gated: a denied start preserves the full bar); broken-tackle charges are in-play charge gains
// (gated).
import { registerAbility } from './registry.js';
import { stageOf, byMastery, scrimmage, able, pushSafely } from './common.js';

export const THRESHOLD = [3, 2]; // by form
export const PUSH = [1, 1.5, 2, 2.5]; // yards by mastery
const thresholdOf = (form) => THRESHOLD[Math.min(THRESHOLD.length - 1, stageOf(form))];

export default registerAbility({
  family: 'breezefang', abilityId: 'WIN-02-F',
  initGame: () => ({ charges: 0 }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); self.ss = { armed: st.charges >= thresholdOf(self.form), crossed: false, fired: false }; },
    tick(ctx, self) {
      const ss = self.ss; if (!ss?.armed || ss.crossed || ss.fired) return;
      if (ctx.ball.holder !== self || !ctx.isRun || !scrimmage(ctx) || self.team !== 'off' || ctx.result) return;
      if (self.x <= 0) return;
      ss.crossed = true; // the first crossing beyond the LOS: activate now or not at all this play
      if (!able(ctx, self)) return; // an unable source preserves readiness
      if (!ctx.canStartSignature(self)) return; // a denied start preserves the full bar (nothing spent)
      const h = ctx.heading(self) || [1, 0]; const s = Math.hypot(h[0], h[1]);
      const ux = -h[0] / s, uy = -h[1] / s;
      const movers = ctx.actors.filter((a) => a !== self);
      const moves = pushSafely({ actors: ctx.actors, movers, ux, uy, distance: byMastery(PUSH, self.mastery), bounds: ctx.bounds, obstacles: ctx.obstacles() });
      ctx.state(self).charges = 0; ss.fired = true; ctx.executed(self);
      ctx.log(`${self.name}'s Slipstream Step blasts everyone back`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WIN-02-F', x: +self.x.toFixed(2), y: +self.y.toFixed(2), dir: [+ux.toFixed(3), +uy.toFixed(3)],
        moves: moves.map((m) => ({ slot: m.a.slot, side: m.a.team, from: m.from.map((v) => +v.toFixed(2)), to: m.to.map((v) => +v.toFixed(2)) })) });
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (ctx.twoPoint || self.ss?.fired) return; // the activation play cannot recharge
      if (!self.brokeTackle || !ctx.canGainCharge(self)) return;
      st.charges = Math.min(thresholdOf(self.form), st.charges + (self.brokeTackle || 0)); // once each, capped, no overflow
    },
  },
});
