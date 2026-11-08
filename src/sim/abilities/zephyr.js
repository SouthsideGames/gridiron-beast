// WIN-05-F Tailwind Huddle (zephyr: Zephiro). Task 8 M3 Wind batch (aura, snap-local).
// Contract (Dex): at an offensive snap while ready and able, he chooses one eligible allied NON-Wind blocker with a legal blocking
// assignment and a running cooldown, inside the mastery radius 4 / 5 / 6 / 7 yards of his initial (snap) alignment: the nearest,
// stable lineup ties, snapshotted at the snap and never switched. At the whistle, after the ordinary participating-play cooldown
// decrement, one extra play is removed from that blocker's still-running eligible cooldown. Never a charge or once-use refill, never
// a replayed missed trigger; no effect on once-per-game / possession uses or status clocks; never himself, a construct or an
// already-ready ability. His own cooldown is 4 subsequent offensive plays (the application play excluded), spent only if the bonus
// actually removed a unit. Stunned / Knocked Down at the snap prevents.
//
// Choices where the contract is silent (documented, minimal):
// - "Running cooldown": the blocker's contract declares a repeatable cooldown (repeatableCooldown) and its game-scope `cd` is
//   positive at the snap; "still running" at the whistle: still positive after his own playEnd decrement (ctx.afterWhistle).
// - Legal blocking assignment: block, run_block or pull (the engine's blocking jobs, AURA_BLOCK_JOBS).
// - Kickoffs and two-point tries are not offensive scrimmage snaps (no ordinary cooldown decrement happens on them).
// - Category Aura: its mastery credit is passive (at most one per game, registry.recordExecution), recorded when a unit is removed.
import { registerAbility, contractOf } from './registry.js';
import { byMastery, scrimmage, able, byLineup } from './common.js';

export const RADIUS = [4, 5, 6, 7]; // yards by mastery
export const COOLDOWN = 4;
export const BLOCK_JOBS = new Set(['block', 'run_block', 'pull']);

export default registerAbility({
  family: 'zephyr', abilityId: 'WIN-05-F', repeatableCooldown: true, passive: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) {
      self.tw = null; const st = ctx.state(self);
      if (self.team !== 'off' || !scrimmage(ctx) || st.cd > 0 || !able(ctx, self)) return;
      const R = byMastery(RADIUS, self.mastery);
      const cands = ctx.actors.filter((b) => b !== self && b.team === self.team && b.type !== 'Wind' && b.contract && contractOf(b.family)?.repeatableCooldown
        && BLOCK_JOBS.has(b.assignment?.a) && ctx.dist(b, self) <= R && ctx.state(b).cd > 0);
      cands.sort((p, q) => ctx.dist(p, self) - ctx.dist(q, self) || byLineup(p, q));
      const b = cands[0]; if (!b) return;
      self.tw = { target: b }; // snapshot: never switched
      ctx.log(`${self.name}'s Tailwind Huddle picks ${b.name}`, { kind: 'ability_target', by: self.slot, side: self.team, ability: 'WIN-05-F', victim: b.slot, radius: R });
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      const had = st.cd; if (st.cd > 0) st.cd -= 1; // his own cooldown: subsequent offensive plays
      const b = self.tw?.target; if (!b || had > 0) return;
      ctx.afterWhistle(() => { // after every ordinary playEnd decrement
        const bs = ctx.state(b); if (!(bs.cd > 0)) return; // already ready: nothing to remove, nothing spent
        bs.cd -= 1; st.cd = COOLDOWN; ctx.executed(self, { passive: true });
        ctx.log(`${self.name}'s Tailwind Huddle speeds ${b.name}'s recharge`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WIN-05-F', victim: b.slot, cd: bs.cd });
      });
    },
  },
});
