// FIR-06-F Eruption — Burning Wake (pyroclast: Pyroclast; TE, legendary). Task 8 M3 (zone; YAC-earned pending field).
// Contract (Dex; N7d G1, G3): a catch-and-run reaching 5 yards after the catch while ready earns one pending activation; the earned
// width is finalised after the run ends (the whistle). Before his next offensive snap (G3: his next eligible on-field offensive
// snap) the token becomes a Fire zone: a fixed 5-yard-long rectangle centred on the fixed LB reference 5 yards beyond the upcoming
// line (never the actual linebackers), centred laterally on Pyroclast's initial pre-play position, width = total YAC (minimum 5,
// capped at the field width), expanding symmetrically and shifting inward at a boundary (fields.js placeRect). Slow 25 / 28 / 31 /
// 34% by mastery; Fire types immune, every other type on both teams slowed. No live-run Fire strip. Once per offensive possession; at
// most one pending activation (no banking while one is pending); the token waits through touchdowns, possession changes and
// halftime and is spent when its zone spawns. Two-point tries cannot trigger. Lifetime: two completed plays including the spawn play,
// every completed scrimmage play by either team (G1); the created field and the pending token keep their state through halftime
// (legendary exception: no refresh); everything clears at the actual game end. Not the legacy Eruption stun.
// Choices where the contract is silent (reported):
//  - YAC is the engine's own measure: whole yards from the catch spot to where the play ended (fumbles after the catch included).
//  - "Offensive possession" is the drive key the game passes (rules.js abilityMemory); without one (labs) no once-per-possession
//    limit can be told apart and only the one-pending rule applies.
//  - A new token may be earned on the spawn play (the old one is spent at spawn), matching P9_VERIFIED_LIMITS.md.
import { registerAbility } from './registry.js';
import { FIELD } from '../../core/field.js';
import { scrimmage, byMastery } from './fw-util.js';

export const WAKE = Object.freeze({ minYac: 5, length: 5, lbDepth: 5, minWidth: 5, lifetime: 2, slowByMastery: [25, 28, 31, 34] });

export default registerAbility({
  family: 'pyroclast', abilityId: 'FIR-06-F',
  initGame: () => ({ pending: false, earnedOn: null }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (self.team === 'off' && st.pending && ctx.createdFor(self.mid)) {
        st.pending = false; ctx.executed(self); // the stored token is spent when its zone actually spawns
        ctx.log(`${self.name}'s Burning Wake erupts ahead`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-06-F', phase: 'spawn' });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'off' || !scrimmage(ctx) || s.receiver !== self.slot || ctx.stats.catchX == null) return;
      const st = ctx.state(self);
      if (st.pending || (ctx.possession != null && st.earnedOn === ctx.possession)) return; // one pending; once per offensive possession
      const yac = Math.max(0, Math.round(ctx.ball.x - ctx.stats.catchX)); if (yac < WAKE.minYac) return;
      const width = Math.min(FIELD.width, Math.max(WAKE.minWidth, yac));
      st.pending = true; st.earnedOn = ctx.possession;
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, type: 'Fire', ability: 'FIR-06-F', strength: byMastery(WAKE.slowByMastery, self.mastery), lifetime: WAKE.lifetime,
        clock: 'scrimmageAny', width, length: WAKE.length, lbDepth: WAKE.lbDepth, lateral: 'creator', clearsAtHalftime: false, payload: { yac } });
      ctx.log(`${self.name} earns a Burning Wake (${width.toFixed(1)} yards wide)`, { kind: 'ability_charge', by: self.slot, side: self.team, ability: 'FIR-06-F', yac, width: +width.toFixed(2) });
    },
  },
});
