// MET-05-F Bulwark Grid (metalhorn: Ferrhorn; TE). Task 8 M3, Metal batch (zone).
// Contract (Dex; FIELD_CLOCKS.md; N7d G3): while ready, after his own successful receiving first down OR his own successful pancake on
// a blocking play, he earns one next offensive field: an 8 wide by 4 long Metal rectangle from the upcoming line of scrimmage into the
// offensive backfield, centred on the QB's initial lateral alignment. The Metal effect (spec §11, field-effects.js defer) delays the
// first changed automatic decision of every non-Metal monster inside, own QB and blockers included; Metal types are unaffected; player
// input, physics and a forced pass are never delayed. Cooldown 6 / 5 / 4 / 3 offensive plays after creation; at most one pending.
// The pending field carries over halftime (it waits for his next eligible on-field offensive snap, G3); the created rare field clears
// at halftime. Nothing on a failed catch or an ordinary block hold. Life 1 / 1 / 2 / 2 offensive scrimmage plays including the spawn.
// Readings where the contract is silent (documented, minimal):
//   - "From the LOS into the backfield": yards [LOS - 4, LOS] (rules.js fieldPlacement with lbDepth -2); the QB lines up at the ball's
//     lateral position in every play, so the ball's lateral position is his initial lateral alignment.
//   - Life counts his club's offensive scrimmage plays (clock 'ownerOffense'; he need not take part); cooldown counts his own
//     offensive scrimmage plays from creation, as Beacon Lane; "ready" = cooldown 0 and nothing pending, so a token cannot be earned
//     during the cooldown (P9 A4 reading).
//   - A pancake is credited by the engine only to a monster in an OL slot (spec §12: OL pancakes), so as a TE this trigger fires only
//     when he lines up in an OL slot; it is not invented for the TE.
//   - The mastery execution is recorded when the field is banked (as Beacon Lane).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the grid is
// created at the next offensive snap (out of play: not gated); earning it is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { scrimmage, byMastery } from './common.js';
import { E as $E } from '../../core/english.js';

export const BULWARK = Object.freeze({ width: 8, length: 4, lbDepth: -2, life: [1, 1, 2, 2], cooldown: [6, 5, 4, 3] });

export default registerAbility({
  family: 'metalhorn', abilityId: 'MET-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid)) { st.banked = false; st.cd = byMastery(BULWARK.cooldown, self.mastery); st.fresh = true; } },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; // his offensive plays count; the creation play starts the cooldown
      st.fresh = false;
      if (st.cd !== 0 || st.banked) return;
      const catchFd = s.receiver === self.slot && s.firstDown, pancake = (ctx.stats.blockers?.[self.slot]?.pancakes || 0) > 0;
      if ((!catchFd && !pancake) || !ctx.canGainCharge(self)) return;
      st.banked = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, type: 'Metal', ability: 'MET-05-F', lifetime: byMastery(BULWARK.life, self.mastery), clock: 'ownerOffense', width: BULWARK.width, length: BULWARK.length, lbDepth: BULWARK.lbDepth });
      ctx.log(`${$E('sim.banks_a_bulwark_grid', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'MET-05-F', via: catchFd ? 'reception' : 'pancake' });
    },
  },
});
