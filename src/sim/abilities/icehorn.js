// ICE-04-F Permafrost (icehorn: Glaciram; DL). Task 8 M3, Ice batch (zone).
// Contract (Dex; FIELD_CLOCKS.md: "Clear"): a personal tackle for loss or sack while ready (assisted credit qualifies; a zero-yard
// stop does not) banks one zone (maximum one pending). It is created at his next participating defensive scrimmage pre-play: ten yards
// wide by six long, from the upcoming line six yards into the OFFENSIVE backfield, centred laterally on the quarterback's initial
// alignment; ordinary boundary rules; stationary after spawn. Ice: 30% less braking deceleration for every non-Ice monster of both
// teams; normal maximum Speed and acceleration; no automatic status or yardage. Lifetime TWO completed defensive scrimmage plays
// including creation. Cooldown 5 / 4 / 3 / 2 subsequent defensive plays, starting at CREATION; it cannot be earned again during the
// creation play. The pending zone survives possession changes and halftime; the created field clears at halftime; game end clears all.
// The old subtract-one-yard Permafrost is gone (the registered contract replaces the legacy effect).
//
// Choices where the contract is silent (documented, minimal):
// - A qualifying sack is any sack credited to him; a tackle for loss is a tackle (or safety) he made or assisted with a negative
//   whole-yard gain. A strip-sack lost as a fumble is not counted (the play's result is the fumble).
// - "Ready" = no running cooldown and nothing pending. The lifetime counts his team's defensive scrimmage plays (not two-point tries).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the zone is
// created at the pre-play from the banked token (out of play: not gated); banking it from a TFL or sack is an in-play charge gain
// (gated).
import { registerAbility } from './registry.js';
import { tier, countDown, opponentSide } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const COOLDOWN = [5, 4, 3, 2];
export const PERMAFROST = Object.freeze({ width: 10, length: 6, braking: 30, lifetime: 2 });

export default registerAbility({
  family: 'icehorn', abilityId: 'ICE-04-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, pending: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (st.pending && ctx.createdFor(self.mid)) {
        st.pending = false; st.cd = tier(COOLDOWN, self.mastery); st.fresh = true; st.creation = true;
        ctx.log(`${$E('sim.stamps_permafrost_spreads_across_the_backfield', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ICE-04-F' });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || s.kickoff || s.twoPoint) return;
      const st = ctx.state(self); const creation = st.creation; st.creation = false; countDown(st);
      if (creation || st.cd > 0 || st.pending) return; // not during the creation play; only while ready
      const S = ctx.stats, mine = S.tackler === self.slot || S.assistBy === self.slot;
      const sack = s.result === 'sack' && S.tackler === self.slot, tfl = ['tackle', 'safety'].includes(s.result) && mine && s.gain < 0;
      if (!(sack || tfl) || !ctx.canGainCharge(self)) return;
      st.pending = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: opponentSide(ctx.teamSide), side: 'def', type: 'Ice', ability: 'ICE-04-F', strength: PERMAFROST.braking, lifetime: PERMAFROST.lifetime, clock: 'ownerDefense', place: 'backfield', width: PERMAFROST.width, length: PERMAFROST.length });
      ctx.log(`${$E('sim.banks_a_permafrost', { name: self.name })}`, { kind: 'ability_ready', by: self.slot, side: self.team, ability: 'ICE-04-F' });
    },
  },
});
