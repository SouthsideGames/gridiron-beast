// DAR-04-F Ambush Tag (mireclaw: Murklaw). Task 8 M3 Dark batch (targeted effect, team-stop charge).
// Contract (Dex): three of his own participating defensive scrimmage plays allowing at most 4 net yards fill the bar, at most one
// credit per play; incompletions and losses qualify; touchdowns, special teams and two-point plays do not. With the bar full, his
// next participating defensive pre-choice selects the opposing RB by stable lineup (no RB: the full charge is held; no QB fallback).
// At the snap a shadow claw attempts Weakened (Strength -15 / -20 / -25 / -30% by mastery) for the CURRENT play on that RB, through
// the shared status gate. No damage, movement pull or tackle guarantee. Threshold 3 fixed; the bar empties on launch even when the
// status is blocked; the activation play cannot recharge. Only if the target participates and the source is able. Partial / full bar
// carries across halves and possessions. The application ends at the whistle (no seconds duration). Selection is visible to both
// sides; the offense can still pass.
//
// Choices where the contract is silent (documented, minimal):
// - Net yards allowed: the play's gain; an interception allows 0 (the pass gained nothing). Any touchdown play (either team) is
//   excluded. "The opposing RB" is the monster in the RB slot.
// - "For the current play": Weakened with no counted duration and rest-of-play scope (cleared at the whistle, status.js atWhistle).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the claw launch at
// the snap is the live activation (gated: the full charge is held); the team-stop bar is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, able } from './common.js';
import { E as $E } from '../../core/english.js';

export const PLAYS = 3, MAX_YARDS = 4;
export const WEAKEN = [15, 20, 25, 30]; // Strength reduction % by mastery

export default registerAbility({
  family: 'mireclaw', abilityId: 'DAR-04-F',
  initGame: () => ({ charges: 0 }),
  hooks: {
    playStart(ctx, self) {
      self.at = { launched: false }; const st = ctx.state(self);
      if (self.team !== 'def' || !scrimmage(ctx) || st.charges < PLAYS || !able(ctx, self)) return;
      const rb = ctx.opponents(self.team).find((o) => o.slot === 'RB'); if (!rb) return; // no RB: hold the full charge
      if (!ctx.canStartSignature(self)) return; // denied: the full charge is held
      st.charges = 0; self.at.launched = true; ctx.executed(self); // the bar empties on launch, even if blocked
      const pct = byMastery(WEAKEN, self.mastery);
      ctx.log(`${$E('sim.s_ambush_tag_claws_at', { name: self.name, name2: rb.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-04-F', victim: rb.slot });
      ctx.applyStatus(rb, { id: 'weakened', strength: pct, payload: { pct }, duration: 0, restOfPlay: true, source: self, abilityId: 'DAR-04-F' });
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'def' || !scrimmage(ctx) || self.at?.launched) return;
      if (s.result === 'touchdown' || ctx.stats.defensiveScore) return;
      const net = ctx.stats.interceptor ? 0 : s.gain;
      if (net <= MAX_YARDS && ctx.canGainCharge(self)) st.charges = Math.min(PLAYS, st.charges + 1);
    },
  },
});
