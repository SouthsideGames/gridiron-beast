// WAT-06-F Tsunami Line (tsunarok: Tsunarok; S, legendary). Task 8 M3 (zone earned by an interception; off-field creation).
// Contract (Dex; B20; N7d G1, G3): a personally secured interception while ready. The return finishes normally; before his team's
// next offensive scrimmage snap (not special teams; he need not be on the field: an explicit off-field permission, G3) a giant
// raindrop lands on the opposing secondary: cosmetic only (no damage, immediate stumble or displacement), creating a FULL-field-width
// Water field 5 yards long centred on the fixed safety reference 12 yards beyond the upcoming line (never the actual safeties), placed
// from the pre-play snapshot and kept within the playable bounds. Inside, later sharp cuts or stops slip at 30 / 32 / 34 / 36% by
// mastery (40% current-speed loss, at most one successful slip per monster per play, cleared at the whistle: the Water field effect).
// Water types immune; both teams' other types affected. Lifetime: two completed plays including the first offensive spawn play, on
// every completed scrimmage play by either team (G1); the remaining duration survives halftime without refresh (legendary
// exception); everything clears at the actual game end. Recharge: five subsequent defensive plays, the interception play excluded.
// No once-per-game restriction.
// Choices where the contract is silent (reported):
//  - "Defensive plays" for the recharge are his participating defensive scrimmage plays (the pilots' convention; unlike Splashdown,
//    no benched recharge is stated). Two-point tries neither trigger nor count.
//  - No pending limit is stated: an interception while ready queues its own field even if an earlier one has not spawned yet.
//  - The raindrop is the logged creation event; there is no football slam.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the raindrop field
// is created before his team's next offensive snap (out of play, off-field allowed: not gated); the secured interception's earned
// field (and the cooldown it starts) is an in-play charge gain: a suppressed safety earns nothing and stays ready (gated).
import { registerAbility } from './registry.js';
import { FIELD } from '../../core/field.js';
import { scrimmage, byMastery, cooldownStep } from './fw-util.js';

export const TSUNAMI = Object.freeze({ safetyDepth: 12, length: 5, lifetime: 2, cooldown: 5, slipByMastery: [30, 32, 34, 36] });

export default registerAbility({
  family: 'tsunarok', abilityId: 'WAT-06-F', repeatableCooldown: true,
  review: { games: 12 }, // reviewer: a genuinely rare trigger (his own interceptions (2 in 120 games, M3_RARE_ACTIVATIONS.md)); search up to 12 games
  initGame: () => ({ cd: 0 }),
  hooks: {
    playEnd(ctx, self) {
      if (self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self); cooldownStep(st, false);
      if (st.cd > 0 || ctx.stats.interceptor !== self.slot || !ctx.canGainCharge(self)) return;
      st.cd = TSUNAMI.cooldown; ctx.executed(self); // set after this play's step: the interception play is excluded
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.sideOf(self), offField: true, type: 'Water', ability: 'WAT-06-F', strength: byMastery(TSUNAMI.slipByMastery, self.mastery),
        lifetime: TSUNAMI.lifetime, clock: 'scrimmageAny', width: FIELD.width, length: TSUNAMI.length, lbDepth: TSUNAMI.safetyDepth, clearsAtHalftime: false });
      ctx.log(`${self.name} calls down a Tsunami Line`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-06-F', phase: 'earned' });
    },
  },
});
