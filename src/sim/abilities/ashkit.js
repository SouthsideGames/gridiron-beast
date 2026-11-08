// FIR-02-F Impact Pyre (ashkit: Cindruff / Magmaul; LB). Task 8 M3 (zone; tackle-earned charge).
// Contract (Dex; B20; N7d G1): three defensive scrimmage plays with a personally credited tackle, assist or sack fill a three-part
// bar, at most one charge a play; no charging while full. At his next participating defensive scrimmage snap the zone is created and
// the bar empties; the spawn play cannot earn a charge. Zone: a stationary, field-aligned 6-wide by 4-long Fire rectangle centred on
// his starting position at the activation snap (it does not follow him). Slow 15% (Cindruff) / 20% (Magmaul) of maximum speed for
// every non-Fire monster of both teams inside (the Fire field effect, src/sim/t8/field-effects.js). Lifetime 1 / 2 / 3 / 4 completed
// plays by mastery, the spawn play counting as the first, on every completed scrimmage play by either team, incompletions included,
// special teams not (G1). The bar (partial or full) survives possession changes and halftime; the zone clears at halftime; all game
// state clears at the actual game end. Punts and special teams neither spend nor build it. No separate cooldown.
// Choices where the contract is silent (reported):
//  - "Personally credited" follows the box score (rules.js): a sack or tackle credited to him, or an assist credited to him on a
//    play that is not a defensive score.
//  - "Starting position" is his formation alignment spot for that snap (the play's align, before the engine's pre-snap man shading).
//  - Two-point tries neither build nor spend the bar (they are not scrimmage plays here).
import { registerAbility } from './registry.js';
import { stageOf, scrimmage, byMastery } from './fw-util.js';

export const PYRE = Object.freeze({ width: 6, length: 4, charges: 3, slowByStage: [15, 20], lifetimeByMastery: [1, 2, 3, 4] });

function credited(s, slot) {
  if (s.result === 'sack') return s.tackler === slot;
  if (s.defensiveScore) return false;
  return s.tackler === slot || (s.assistBy === slot && s.assistBy !== s.tackler);
}

export default registerAbility({
  family: 'ashkit', abilityId: 'FIR-02-F',
  initGame: () => ({ bar: 0, queued: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self); self.pyre = { spawn: false };
      if (self.team === 'def' && st.queued && ctx.createdFor(self.mid)) {
        st.queued = false; st.bar = 0; self.pyre.spawn = true; ctx.executed(self);
        ctx.log(`${self.name}'s Impact Pyre blooms`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-02-F', x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self);
      if (self.pyre?.spawn || st.queued || st.bar >= PYRE.charges) return; // the spawn play earns nothing; no charging while full
      if (!credited({ ...ctx.stats, result: s.result }, self.slot)) return;
      st.bar += 1; // at most one charge a play
      ctx.log(`${self.name}'s Impact Pyre charges (${st.bar}/${PYRE.charges})`, { kind: 'ability_charge', by: self.slot, side: self.team, ability: 'FIR-02-F', charges: st.bar });
      if (st.bar >= PYRE.charges) {
        st.queued = true;
        ctx.queueField({ owner: self.mid, ownerTeam: ctx.sideOf(self), side: 'def', type: 'Fire', ability: 'FIR-02-F', strength: PYRE.slowByStage[stageOf(self.form)] ?? PYRE.slowByStage[0],
          lifetime: byMastery(PYRE.lifetimeByMastery, self.mastery), clock: 'scrimmageAny', width: PYRE.width, length: PYRE.length, depth: 'creator', lateral: 'creator' });
      }
    },
  },
});
