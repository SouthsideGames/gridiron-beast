// MET-01-F Anchor Plate (ironcub: Ferrcub; OL). Task 8 M3, Metal batch (self enhancement).
// Contract (Dex; N7b P4: mastery values apply to every form): at his first own block engagement of each offensive play, while ready,
// against that engaged defender's ordinary push: the first 0.5 / 0.75 / 1 / 1.25 yards (by mastery) of net backward displacement that
// play is ignored, then ordinary strength-based pushing resumes. No extra Blocking, no shed immunity, no guaranteed pancake, no
// rooting to a spot. Cooldown 5 / 4 / 3 / 2 offensive plays, spent when positive displacement is actually absorbed. One budget per
// play that never refills on re-engagement; unspent readiness persists; the temporary allowance clears at the whistle. Stunned /
// Knocked Down disables blocking normally. Only the ordinary engagement push is filtered (engine blockPush), so displacement from any
// other source (an approved guaranteed legendary displacement such as Landslide, G05; fields) is never absorbed.
// Readings where the contract is silent (documented, minimal):
//   - Offensive plays are his own offensive scrimmage plays (as Beacon Lane's cooldown); kickoff returns and two-point tries excluded.
//   - "Net backward displacement" is absorbed tick by tick from the positive (defender-gaining) push until the budget is used; ground
//     he wins back does not refill it.
//   - The play on which it is spent does not count toward the cooldown (it starts after it, as Beacon Lane's from creation).
import { registerAbility } from './registry.js';
import { scrimmage, byMastery } from './common.js';

export const ANCHOR = Object.freeze({ allowance: [0.5, 0.75, 1, 1.25], cooldown: [5, 4, 3, 2] });

export default registerAbility({
  family: 'ironcub', abilityId: 'MET-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.anchor = { ready: self.team === 'off' && scrimmage(ctx) && ctx.state(self).cd === 0, armed: false, budget: 0, absorbed: 0, spent: false, engaged: false }; },
    engage(ctx, self, other) {
      const A = self.anchor; if (!A || A.engaged || self.team !== 'off' || other.team === self.team) return;
      A.engaged = true; if (A.ready) { A.armed = true; A.budget = byMastery(ANCHOR.allowance, self.mastery); } // his first engagement only
    },
    blockPush(ctx, self, d, push) {
      const A = self.anchor; if (!A?.armed || push <= 0 || A.budget <= 1e-12) return undefined;
      const move = push * ctx.dt, take = Math.min(move, A.budget); A.budget -= take; A.absorbed += take;
      if (!A.spent) { A.spent = true; const st = ctx.state(self); st.cd = byMastery(ANCHOR.cooldown, self.mastery); ctx.executed(self);
        ctx.log(`${self.name}'s Anchor Plate drops`, { kind: 'ability', by: self.slot, side: self.team, ability: 'MET-01-F', victim: d.slot }); }
      return (move - take) / ctx.dt;
    },
    playEnd(ctx, self) {
      const A = self.anchor; if (self.team !== 'off' || !scrimmage(ctx)) return; const st = ctx.state(self);
      if (st.cd > 0 && !A?.spent) st.cd -= 1; // subsequent offensive plays; the spending play excluded
      if (A?.spent) ctx.log(`${self.name}'s Anchor Plate absorbed ${A.absorbed.toFixed(2)} yd`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'MET-01-F', absorbed: +A.absorbed.toFixed(3) });
    },
  },
});
