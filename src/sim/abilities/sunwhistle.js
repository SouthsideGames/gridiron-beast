// LIG-02-F Dawn Signal (sunwhistle: Solchirp / Heliark; K). Task 8 M3, Light batch (targeted effect).
// Contract (Dex; N7b P7): after his club's successful extra point ONLY (field goals and two-point tries excluded) he banks support for
// his club's next kickoff; at most one pending. On that kickoff (a live play: N7b P7) at the snap, the one nearest eligible non-K
// teammate on kickoff coverage (stable lineup tie) gets an attempt at Quickened +15 / +20% (Solchirp / Heliark) plus 0 / 3 / 6 / 9
// points by mastery: maximum speed AND acceleration, for that kickoff play only (clears at the whistle). It does not touch the kick or
// the returner. No extra cooldown; the token is consumed on the eligible kickoff cast even if the status is blocked (an existing
// different status blocks, through the shared gate). A Stunned source at the cast delays the token; with no eligible target the
// token waits for the next own kickoff; a pending token persists over halftime.
// Readings where the contract is silent (documented, minimal):
//   - "Kickoff" is the live kickoff the engine plays. A touchback kick (no coverage is played), an onside kick and a free kick after
//     a safety are formula plays with no coverage actors: no cast happens and the token waits.
//   - "Nearest" is measured from the kicker (the source) at the snap; the stable lineup tie is the coverage unit's order.
//   - The kicker must be the source (the K slot of the coverage unit); a Solchirp lined up as a coverage player does not cast.
//   - The mastery execution is recorded when the status is accepted.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the cast at the
// live kickoff's snap is the activation of the banked support (gated: the token waits); the bank itself comes from the extra-point
// game hook (out of play: not gated).
import { registerAbility } from './registry.js';
import { able, stageOf, byMastery } from './common.js';
import { E as $E } from '../../core/english.js';

export const QUICKENED = Object.freeze({ byForm: [15, 20], byMastery: [0, 3, 6, 9] });
export const dawnSignalPct = (form, mastery) => (QUICKENED.byForm[stageOf(form)] ?? QUICKENED.byForm[0]) + byMastery(QUICKENED.byMastery, mastery);

export default registerAbility({
  family: 'sunwhistle', abilityId: 'LIG-02-F',
  initGame: () => ({ pending: false }),
  game: {
    extraPoint(g, self, { good }) {
      if (!good) return; const st = g.state(self); if (st.pending) return; // max one pending
      st.pending = true; g.log(`${$E('sim.banks_a_dawn_signal_for_the', { name: self.name })}`, { by: self.mid, ability: 'LIG-02-F', banked: true });
    },
  },
  hooks: {
    playStart(ctx, self) {
      if (!ctx.kickoff || self.team !== 'def' || self.slot !== 'K') return;
      const st = ctx.state(self); if (!st.pending || !able(ctx, self)) return; // a Stunned source delays the pending token
      const mates = ctx.actors.filter((a) => a.team === self.team && a !== self && a.slot !== 'K');
      if (!mates.length) return; // no eligible target: the token waits for the next own kickoff
      if (!ctx.canStartSignature(self)) return; // denied: the token waits
      const target = mates.reduce((b, a) => (ctx.dist(a, self) < ctx.dist(b, self) - 1e-9 ? a : b)); // first in lineup order on a tie
      st.pending = false; // consumed on the cast, even if the status is blocked
      const pct = dawnSignalPct(self.form, self.mastery);
      const r = ctx.applyStatus(target, { id: 'quickened', strength: pct, duration: 0, restOfPlay: true, source: self, abilityId: 'LIG-02-F' });
      if (r.accepted) ctx.executed(self);
      ctx.log(`${$E('sim.s_dawn_signal', { name: self.name, accepted: r.accepted ? 'quickens' : 'cannot reach', name2: target.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-02-F', target: target.slot, accepted: r.accepted, pct, x: +target.x.toFixed(2), y: +target.y.toFixed(2) });
    },
  },
});
