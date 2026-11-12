// N9d: rules.preparePreChoice saves the candidate from the visible look; playStart only validates that saved monster and its final assignment. Historical snap-selection notes below are superseded.
// PSY-03-F Foresight (cerebrix, QB). Task 8 M3 (targeted effect).
// Contract (Dex): while ready, one initially aligned opposing LB within 3 yards of the line is marked at random (both sides see the
// candidate: a 'foresight_mark' event). At the snap the mark is validated: if the marked LB actually blitzes and Cerebrix is able, a
// fixed 50% roll attempts Confused for the current play: 20% effective Awareness reduction through the shared status gate (a different
// status blocks; the same status follows the shared stronger/equal policy). The application chance and the penalty are separate and
// fixed at every mastery. Run or pass both qualify. No wrong-direction, stun, forced pass or guaranteed protection. The cast is spent
// (cooldown 6 / 5 / 4 / 3 subsequent participating offensive plays by mastery) whether the roll succeeds, fails or an existing status
// blocks; no eligible blitz or an unable source preserves readiness. The Confused is current-play only (it expires at the whistle).
// Choices where the contract is silent or the engine has no slot for it (listed in the M3 report):
//  - the engine has no pre-choice phase: the candidate is drawn from the abilities' own stream at the snap, among the LBs whose initial
//    alignment (the drawn formation spot, before the snap) is within 3 yards of the line; the candidate never depends on the call, the
//    audible or any later movement, and only the final assignment at the snap decides "blitzes";
//  - "blitzes" is the engine's pass-rush assignment for a linebacker (rush or contain, the same reading as the legacy Ambush card);
//  - "able": not immobilised (no stun, not sitting the play out);
//  - scrimmage plays only: two-point tries and kickoffs neither activate nor count the cooldown.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the validated cast
// at the snap is the live activation (gated after the mark: readiness kept); cooldown only.
import { registerAbility } from './registry.js';
import { positionOf } from '../../data/personnel.js';
import { E as $E } from '../../core/english.js';

export const FORESIGHT = Object.freeze({ chance: 0.5, awarenessPct: 20, depth: 3 });
const COOLDOWN = [6, 5, 4, 3];
const BLITZ = new Set(['rush', 'contain']);

export default registerAbility({
  family: 'cerebrix', abilityId: 'PSY-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'off' || ctx.kickoff || ctx.twoPoint || st.cd > 0) return;
      const saved = st.preChoiceMark;
      if (!saved || saved.key !== ctx.preChoice?.key) return;
      const mark = ctx.opponents(self.team).find((d) => (d.mid || d.id) === saved.mid);
      if (!mark) return; // no substitute when the selected package leaves the saved target out
      ctx.log(`${self.name} foresees ${mark.name}`, { kind: 'foresight_mark', by: self.slot, side: self.team, ability: 'PSY-03-F', victim: mark.slot });
      if (!BLITZ.has(mark.assignment?.a)) return; // no eligible blitz: readiness kept
      if (self.stun > 0 || self.sitsOut) return; // unable: readiness kept
      if (!ctx.canStartSignature(self)) return; // denied: readiness kept
      st.cd = COOLDOWN[self.mastery] ?? COOLDOWN[0]; st.fresh = true; ctx.executed(self);
      const hit = ctx.rng.chance(FORESIGHT.chance);
      const res = hit ? ctx.applyStatus(mark, { id: 'confused', strength: FORESIGHT.awarenessPct, duration: 0, restOfPlay: true, source: self, abilityId: 'PSY-03-F' }) : null;
      ctx.log(`${$E('sim.s_foresight', { name: self.name, hit: hit ? (res.accepted ? 'confuses' : 'cannot confuse') : 'misses', name2: mark.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-03-F', victim: mark.slot, roll: hit, accepted: !!res?.accepted });
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'off' || ctx.kickoff || ctx.twoPoint) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; st.fresh = false;
    },
  },
});
