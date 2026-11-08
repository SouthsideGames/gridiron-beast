// DAR-05-F Blackout Pocket (nocturne: Nocturne). Task 8 M3 Dark batch (zone).
// Contract (Dex): after his own completed pass gains at least 15 net yards while ready, he banks the next offensive field. At the next
// offensive pre-choice: a 12-wide by 5-long Dark rectangle from the LOS into the defensive side, centred on his upcoming initial (QB)
// lateral alignment. Non-Dark monsters of BOTH teams inside have -25% effective Awareness (the Dark field effect: it covers the front
// pressure reads but also his own blockers; no essential UI is concealed). Cooldown 6 subsequent offensive plays after creation; one
// pending. The pending field carries across the half; the created (non-legendary) field clears at halftime. No growth from YAC, no
// full-field coverage, no auto-completion, guaranteed escape or field-following; formation or audible does not reposition it after
// the reveal. Lifetime 1 / 2 / 2 / 3 offensive scrimmage plays by mastery including the spawn play.
//
// Choices where the contract is silent (documented, minimal):
// - "Net yards": the play's gain on a completion he threw (fumbles after the catch end it at the fumble spot); interceptions and
//   two-point tries never bank. "Ready": no cooldown running and nothing pending.
// - The QB aligns on the ball (every formation: lateral 0), so the field is centred on the ball's lateral; created at his next
//   on-field offensive snap (a QB is in every package). Cooldown plays are his participating offensive scrimmage plays, the
//   creation play excluded; the lifetime counts his team's offensive scrimmage plays (clock 'teamOffense').
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the pocket is
// created at the next offensive pre-choice (out of play: not gated); banking it from a 15-yard completion is an in-play charge gain
// (gated).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, sideOf } from './common.js';

export const MIN_GAIN = 15, STRENGTH = 25, COOLDOWN = 6;
export const LIFETIME = [1, 2, 2, 3]; // by mastery
export const POCKET = Object.freeze({ width: 12, length: 5 });

export default registerAbility({
  family: 'nocturne', abilityId: 'DAR-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid) && st.banked) { st.banked = false; st.cd = COOLDOWN; st.fresh = true; } self.ready = !(st.cd > 0) && !st.banked; }, // ready during this play
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (st.fresh) st.fresh = false; else if (st.cd > 0) st.cd -= 1;
      if (!self.ready || st.banked || ctx.stats.passer !== self.slot || !s.receiver || ctx.stats.interceptor || s.gain < MIN_GAIN || !ctx.canGainCharge(self)) return;
      st.banked = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: sideOf(ctx, self), side: 'off', type: 'Dark', ability: 'DAR-05-F', strength: STRENGTH, lifetime: byMastery(LIFETIME, self.mastery),
        clock: 'teamOffense', width: POCKET.width, los: [0, POCKET.length], latFromBall: 0 });
      ctx.log(`${self.name} banks a Blackout Pocket`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-05-F' });
    },
  },
});
