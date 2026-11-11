// ICE-02-F Frost Nip (hailfang: Frostpup / Hoarhound; CB). Task 8 M3, Ice batch (targeted effect).
// Contract (Dex, owner 2B and override "fire a snowball"): while ready and before the pass is released, when his tracked route-running
// receiver (the assigned receiver in man coverage; the currently tracked receiver in zone) reaches at least TWO yards of separation
// (no cut needed) and is still within FOUR yards, he fires a snowball. At impact the tracked receiver, the two-yard separation, the
// four-yard range and pre-release eligibility are rechecked: if all hold, Slowed is attempted through the normal shared-status gate
// (15% Frostpup / 20% Hoarhound maximum movement-speed reduction) for the current play only (it clears at the whistle). A release
// before impact, the play ending, or a failed recheck cancels the snowball and the status; the launched use stays spent. No damage,
// automatic breakup or extra miss roll. Firing spends readiness even if an existing status blocks the application. Cooldown
// 5 / 4 / 3 / 2 subsequent defensive plays. Stunned or Knocked Down prevents activation and keeps readiness.
//
// Choices where the contract is silent (documented, minimal):
// - Separation is the distance between the receiver and him. The snowball flies at 15 yd/s (impact after distance / 15 s).
// - "Before pass release" is the quarterback still holding the ball with no pass thrown and no ball carrier yet (a handoff or a
//   scramble ends the window as a release does).
// - The cooldown counts his own subsequent defensive scrimmage plays; kickoffs and two-point tries are excluded.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the snowball
// launch is the live activation (gated); cooldown only.
import { registerAbility } from './registry.js';
import { scrimmage, disabled, tier, stageOf, countDown } from './earth-ice-util.js';

const SLOW = [15, 20]; // % by form
const COOLDOWN = [5, 4, 3, 2];
export const FROST_NIP = Object.freeze({ separation: 2, range: 4, snowballSpeed: 15 });
const preRelease = (ctx) => !ctx.stats.passer && !ctx.stats.carrier && !ctx.ball.inAir && ctx.ball.holder?.slot === 'QB' && ctx.ball.holder.team === 'off';
const eligible = (ctx, self, r) => !!r && ctx.coverTarget(self) === r && r.assignment?.a === 'route' && preRelease(ctx) && ctx.dist(r, self) >= FROST_NIP.separation && ctx.dist(r, self) <= FROST_NIP.range;

export default registerAbility({
  family: 'hailfang', abilityId: 'ICE-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.fn = { fired: false, ball: null }; },
    tick(ctx, self) {
      const fn = self.fn;
      if (fn.ball) {
        const b = fn.ball;
        if (!preRelease(ctx)) { fn.ball = null; ctx.log('The pass beats the snowball', { kind: 'ability_cancel', by: self.slot, side: self.team, victim: b.r.slot, ability: 'ICE-02-F' }); return; }
        if (ctx.t + 1e-9 < b.impact) return;
        fn.ball = null;
        if (!eligible(ctx, self, b.r)) { ctx.log(`${self.name}'s snowball misses its moment`, { kind: 'ability_cancel', by: self.slot, side: self.team, victim: b.r.slot, ability: 'ICE-02-F' }); return; }
        const pct = tier(SLOW, stageOf(self.form));
        ctx.applyStatus(b.r, { id: 'slowed', strength: pct, duration: 0, restOfPlay: true, source: self, abilityId: 'ICE-02-F', payload: { pct } });
        return;
      }
      if (fn.fired || self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self); if (st.cd > 0 || disabled(ctx, self)) return;
      const r = ctx.coverTarget(self); if (!eligible(ctx, self, r)) return;
      fn.fired = true; // one attempt a play (a denied activation does not retry)
      if (!ctx.canStartSignature(self)) return;
      st.cd = tier(COOLDOWN, self.mastery); st.fresh = true; ctx.executed(self);
      fn.ball = { r, impact: ctx.t + ctx.dist(r, self) / FROST_NIP.snowballSpeed };
      ctx.log(`${self.name} fires a snowball at ${r.name}`, { kind: 'ability', by: self.slot, side: self.team, victim: r.slot, ability: 'ICE-02-F', key: 'snowball', fromX: +self.x.toFixed(2), fromY: +self.y.toFixed(2), x: +r.x.toFixed(2), y: +r.y.toFixed(2) });
    },
    playEnd(ctx, self, s) {
      if (self.fn?.ball) { self.fn.ball = null; ctx.log('The whistle cancels the snowball', { kind: 'ability_cancel', by: self.slot, side: self.team, ability: 'ICE-02-F' }); }
      if (self.team === 'def' && !s.kickoff && !s.twoPoint) countDown(ctx.state(self));
    },
  },
});
