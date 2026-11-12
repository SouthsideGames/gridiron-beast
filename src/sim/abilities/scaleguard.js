// DRA-04-F Dragon Stomp (scaleguard: Scalor, OL). Task 8 M3 (special action; charge bar).
// Contract (Dex; spec §9 pancakes): three participating offensive plays that he finishes engaged in a block fill the bar (presence
// alone never charges). On the next offensive play, his engagement of an eligible DL (one he personally blocks) triggers the stomp while
// he is able: a spectral dragon foot makes a guaranteed pancake attempt, subject to the shared status gate, using his one pancake
// attempt this play (no second ordinary attempt follows; if the budget is already spent there is no stomp). The pancake applies the
// existing Knocked Down for the rest of the current play (cleared at the whistle; no new status, no seconds-based duration). The full
// bar is spent on the stomp attempt even if the status is blocked; the activation play cannot recharge; an unable source or no eligible
// DL preserves the bar; partial and full bar survive possessions, halftime and overtime until the actual game end.
// Choices where the contract is silent (minimal readings): "able" is not immobilised (no stun, not Knocked Down); a blocked Knocked Down
// leaves the engagement as it was (only an accepted pancake ends it, as with the ordinary pancake); "offensive plays" are scrimmage
// plays (kickoff returns and two-point tries neither charge nor stomp); the stomp counts as a pancake attempt in the box score, and
// an accepted one as a pancake.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the stomp at the
// DL engagement is the live activation (gated: the bar and the ordinary pancake budget are kept); the engaged-finish bar is an in-play
// charge gain (gated).
import { registerAbility } from './registry.js';
import { positionOf } from '../../data/personnel.js';
import { E as $E } from '../../core/english.js';

export const DRAGON_STOMP = Object.freeze({ plays: 3 });
const offensive = (ctx, self) => self.team === 'off' && !ctx.kickoff && !ctx.twoPoint;
const ourBall = (ctx) => !ctx.stats.interceptor && ctx.ball.holder?.team !== 'def'; // with the defense carrying (a return) he is the one being blocked

export default registerAbility({
  family: 'scaleguard', abilityId: 'DRA-04-F',
  initGame: () => ({ bar: 0 }),
  hooks: {
    playStart(ctx, self) { self.stomp = { done: false }; },
    engage(ctx, self, d) {
      if (!offensive(ctx, self) || !ourBall(ctx) || self.stomp?.done || self.engaged !== d || positionOf(d.slot) !== 'DL') return; // he is the blocker, on a DL
      const st = ctx.state(self); if (st.bar < DRAGON_STOMP.plays || self.pancakeRolled || self.stun > 0 || self.knockedDown) return;
      if (!ctx.canStartSignature(self)) return; // denied: the bar is kept and the ordinary pancake budget is untouched
      self.pancakeRolled = true; self.stomp.done = true; st.bar = 0; ctx.executed(self); // the play's one pancake attempt
      const bk = (ctx.stats.blockers[self.slot] ||= { pass: 0, run: 0, lost: 0 }); bk.pancakeAttempts = (bk.pancakeAttempts || 0) + 1;
      const r = ctx.applyStatus(d, { id: 'knockedDown', strength: 1, duration: 0, restOfPlay: true, source: self, abilityId: 'DRA-04-F' });
      if (r.accepted) { self.engaged = null; d.engaged = null; bk.pancakes = (bk.pancakes || 0) + 1; ctx.stats.pancakes = (ctx.stats.pancakes || 0) + 1; }
      ctx.log(r.accepted ? `${$E('sim.s_dragon_stomp_flattens', { name: self.name, name2: d.name })}` : `${$E('sim.withstands_s_dragon_stomp', { name: d.name, name2: self.name })}`, { kind: r.accepted ? 'pancake' : 'ability', by: self.slot, side: self.team, ability: 'DRA-04-F', victim: d.slot, accepted: r.accepted, reason: r.reason });
    },
    playEnd(ctx, self) {
      if (!offensive(ctx, self) || self.stomp?.done) return; // the activation play cannot recharge
      const st = ctx.state(self); if (self.engaged && st.bar < DRAGON_STOMP.plays && ctx.canGainCharge(self)) st.bar += 1; // finishing the play engaged in a block
    },
  },
});
