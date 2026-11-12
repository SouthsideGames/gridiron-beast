// PSY-01-F Mind Bend (mindwing: Psyflutter / Psyraptor, S). Task 8 M3 (zone, defensive).
// Contract (Dex; FIELD_CLOCKS.md; N7d G3): his personal tackle or assist after an opponent's completed pass, while ready (no cooldown
// running, nothing banked), banks a Psychic zone for his next eligible defensive scrimmage snap; creation waits for that snap with him
// on the field and able (G3; "Unable source preserves pending readiness": a carried-over Stunned that keeps him out of the play waits).
// The zone is 8 yards wide and 6 long, placed at the snap from LOS+3 to LOS+9 toward the opponent goal (the offense's own goal, the
// same "opponent goal" reading as Hoard Flight's "opponent 35": the offensive backfield), centred laterally on the ball, shifted toward
// the line only enough to fit the field of play; it is placed before the snap from the line (revealed before both choices, never moved
// by an audible) and stays put. Standard Psychic field (spec §11, field-effects.js): non-Psychic monsters of both teams inside are pulled
// inward at 20% of their applicable maximum speed, 1-yard centre deadband, Psychic monsters neutral; no status, stun, targeted drag or
// football displacement; collisions and bounds apply. Life 1 / 1 / 2 / 2 defensive scrimmage plays by mastery (his team's, incomplete
// passes included), counting the creation play; it clears at halftime (a pending zone carries). Cooldown 6 / 5 / 4 / 3 subsequent
// participating defensive scrimmage plays by mastery, starting after creation; no banking during the cooldown.
// Choices where the contract is silent (minimal readings): two-point tries and kickoffs neither bank nor count the cooldown (scrimmage
// plays only); the lifetime counts his team's defensive scrimmage plays whether or not he is on the field (the contract does not say
// "participating" for the life, only for the cooldown).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the zone is
// created at the next defensive snap (out of play: not gated); banking it is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { E as $E } from '../../core/english.js';

export const MIND_BEND = Object.freeze({ width: 8, length: 6, span: [-9, -3], pull: 20 });
const LIFETIME = [1, 1, 2, 2];
const COOLDOWN = [6, 5, 4, 3];
const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;

export default registerAbility({
  family: 'mindwing', abilityId: 'PSY-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (ctx.createdFor(self.mid)) { st.banked = false; st.cd = COOLDOWN[self.mastery] ?? COOLDOWN[0]; st.fresh = true; ctx.log(`${$E('sim.s_mind_bend_folds_the_backfield', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-01-F', field: 'Psychic' }); }
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'def' || !scrimmage(ctx)) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; // subsequent participating defensive scrimmage plays; the creation play starts it
      st.fresh = false;
      const personal = ctx.stats.tackler === self.slot || ctx.stats.assistBy === self.slot;
      if (st.cd === 0 && !st.banked && s.receiver && personal && s.result !== 'sack' && !ctx.stats.defensiveScore && ctx.canGainCharge(self)) {
        st.banked = true; ctx.executed(self);
        ctx.queueField({ requireAble: true, owner: self.mid, ownerTeam: ctx.teamSide === 'home' ? 'away' : ctx.teamSide === 'away' ? 'home' : null, side: 'defense', type: 'Psychic', ability: 'PSY-01-F', strength: MIND_BEND.pull,
          lifetime: LIFETIME[self.mastery] ?? LIFETIME[0], clock: 'ownerDefense', width: MIND_BEND.width, length: MIND_BEND.length, span: MIND_BEND.span, centerOn: 'ball' });
        ctx.log(`${$E('sim.banks_a_mind_bend', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-01-F' });
      }
    },
  },
});
