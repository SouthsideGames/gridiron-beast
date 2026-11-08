// MET-02-F Iron Lungs (steelpaw: Steelpaw; LB). Task 8 M3, Metal batch (aura).
// Contract (Dex; N7b P4): while the linebacker is able, allied defenders within 3 / 4 / 5 / 6 yards (by mastery) at the snap qualify
// for this play. Protected: himself and the nearest ONE living allied defender in the radius (no constructs; lineup order breaks a
// tie). Every SECOND qualifying participating play of each protected monster reduces that play's ordinary stamina drain by 1 point,
// minimum 0. Counted per protected monster, not per source, and copies do not stack (one count per monster per play). Ability drain
// is unchanged and nothing is restored. Passive, one calculation per participating defensive play. Eligibility is sampled at the
// snap. Each monster keeps his 0/1 qualified-play progress over bench time and halftime; non-qualifying plays pause it; at the second
// eligible play the counter is consumed even if the baseline drain is 0; the actual game end clears it (game-scope state). No effect
// on Exhausted (it never removes exhaustion). Baseline 1 therefore drains 1 on the first qualifying play, 0 on the second, and repeats.
// Readings where the contract is silent (documented, minimal):
//   - Defensive scrimmage plays only (kickoffs are not defensive snaps, B20; two-point tries excluded: common.js); the source must be
//     lined up at linebacker (an LB slot).
//   - "Ordinary stamina drain" is the 1-point participation drain; an Afflicted monster's status drain is ability drain and stays
//     unchanged (his counter is still consumed). The relief reaches the drain through t8.drainRelief (stamina-runtime.js).
//   - Aura mastery: one credit per game, the first time a drain is reduced.
import { registerAbility } from './registry.js';
import { able, scrimmage, byMastery } from './common.js';

export const IRON_LUNGS = Object.freeze({ radius: [3, 4, 5, 6], relief: 1 });
/** The per-monster progress ledger (game scope, shared by every source). */
export const lungsLedger = (t8) => (t8.ironLungs ||= { progress: {} });

export default registerAbility({
  family: 'steelpaw', abilityId: 'MET-02-F', passive: true,
  hooks: {
    playStart(ctx, self) {
      if (self.team !== 'def' || !scrimmage(ctx) || !/^LB/.test(self.slot) || !able(ctx, self)) return;
      const R = byMastery(IRON_LUNGS.radius, self.mastery);
      const mates = ctx.actors.filter((a) => a.team === self.team && a !== self && !a.construct && ctx.dist(a, self) <= R);
      const ally = mates.length ? mates.reduce((b, a) => (ctx.dist(a, self) < ctx.dist(b, self) - 1e-9 ? a : b)) : null; // lineup order on a tie
      const L = lungsLedger(ctx.t8); const relieved = [];
      for (const p of [self, ally]) {
        if (!p?.mid || p.ironLungsCounted) continue; p.ironLungsCounted = true; // copies do not stack
        if ((L.progress[p.mid] || 0) >= 1) { L.progress[p.mid] = 0; (ctx.t8.drainRelief ||= {})[p.mid] = IRON_LUNGS.relief; relieved.push(p); }
        else L.progress[p.mid] = 1;
      }
      if (relieved.length) { ctx.executed(self, { passive: true });
        ctx.log(`${self.name}'s Iron Lungs steady ${relieved.map((p) => p.name).join(' and ')}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'MET-02-F', targets: relieved.map((p) => p.slot) }); }
    },
  },
});
