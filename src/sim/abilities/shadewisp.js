// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
// PSY-02-F Mirror Rift: redirect a live pass to a seeded random legal location.
// The destination is near a randomly selected eligible receiver/defender or open
// grass. No outcome is selected: the real catch/interception checks resolve it.
import { registerAbility } from './registry.js';
import { able, scrimmage, byMastery } from './common.js';
export const RANGE = [3, 4]; // historical export; Mirror Rift has no proximity gate
export const RIFT = Object.freeze({ cooldown: [6, 5, 4, 3], reaction: 0.85, hidden: 0.15 });
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export default registerAbility({
  family: 'shadewisp', abilityId: 'PSY-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.riftAt = null; self.riftFresh = false; },
    passRelease(ctx, self, { ball }) {
      if (self.team !== 'def' || !scrimmage(ctx) || ctx.state(self).cd > 0 || !able(ctx, self) || ball.riftClaimed) return;
      if (!ctx.canStartSignature(self)) return;
      ball.riftClaimed = self.mid; self.riftAt = ctx.t + Math.min(0.15, ball.flightTime * 0.25);
    },
    tick(ctx, self) {
      if (self.riftAt == null || ctx.t < self.riftAt) return;
      self.riftAt = null; const ball = ctx.ball;
      if (!ball.inAir || !able(ctx, self) || !ctx.canStartSignature(self)) return;
      const B = ctx.bounds;
      const eligible = ctx.actors.filter((a) => !a.temp && !a.noBall && !a.sitsOut && (a.team === 'def' || ['route', 'release'].includes(a.assignment?.a)));
      const options = [...eligible, null, null, null, null]; const anchor = ctx.rng.pick(options);
      const x = clamp(anchor ? anchor.x + ctx.rng.range(-2, 2) : ctx.rng.range(B.ownGoal + 1, B.goal - 1), B.ownGoal + 0.5, B.goal - 0.5);
      const y = clamp(anchor ? anchor.y + ctx.rng.range(-2, 2) : ctx.rng.range(B.left + 1, B.right - 1), B.left + 0.5, B.right - 0.5);
      const from = [ball.x, ball.y];
      ball.mirrorRift = true; ball.hiddenUntil = ctx.t + RIFT.hidden;
      ball.from = { x, y }; ball.landing = ball.to = { x, y }; ball.aim = { x, y };
      ball.x = x; ball.y = y; ball.flight = 0; ball.flightTime = RIFT.reaction; ball.thrownAt = ball.hiddenUntil;
      ball.airYards = x;
      const catchers = eligible.filter((a) => a.team === 'off');
      ball.target = catchers.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || ball.target;
      ctx.stats.airYards = Math.round(x);
      const st = ctx.state(self); st.cd = byMastery(RIFT.cooldown, self.mastery); self.riftFresh = true; ctx.executed(self);
      ctx.log(`${self.name}'s Mirror Rift sends the pass through a random portal`, { kind: 'ability', ability: 'PSY-02-F', by: self.slot, side: self.team, from, destination: [x, y], hidden: RIFT.hidden, reaction: RIFT.reaction, x: from[0], y: from[1] });
    },
    playEnd(ctx, self) { if (self.team !== 'def' || !scrimmage(ctx)) return; const st = ctx.state(self); if (st.cd > 0 && !self.riftFresh) st.cd -= 1; },
  },
});
