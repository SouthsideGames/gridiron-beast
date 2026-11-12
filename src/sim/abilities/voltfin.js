// ELE-02-F Charge Strip (voltfin: Volcoil / Eelectra, RB). Task 8 M3 Electric batch (zone).
// Contract (Dex): personally earning a rushing first down while ready earns one pending token (touchdowns, receptions, returns and
// two-point attempts do not qualify; at most one pending; it carries through possession changes and halftime; the end of the game
// clears it). At his next participating offensive scrimmage pre-play: an Electric rectangle eight yards wide (sideline to sideline) by
// five long, from the LOS to the fixed five-yard LB reference, centred laterally on Volcoil's initial alignment, shifted inward to keep
// its width. Every non-Electric monster of either team rolls Volcoil 20% / Eelectra 30% to be Stunned on its first entry that play
// (starting inside counts; one roll per monster; no re-entry reroll; no total cap; Electric immune; field-effects.js). Accepted Stunned
// (shared gate) lasts the rest of that play and clears at the whistle. Lifetime one completed play including the spawn; cooldown
// 5 / 4 / 3 / 2 subsequent offensive plays from spawn; no new token during the spawn play. Duration and chance do not scale with mastery.
// Choices where the contract is silent (reported):
// - "Initial alignment" = his slot's alignment in the called offensive play (the engine has no pre-call phase); placement is computed
//   in the pre-snap step and locked in the field record.
// - "Rushing first down": he is the ball carrier without a reception and the gain reaches the line to gain (the engine's whistle
//   summary); a fumble or interception never qualifies.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the strip is
// created in the pre-snap step (out of play: not gated); the rushing first down's token is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, stageOf, scrimmage, ready, spend, countPlay, bandInField } from './nature-electric-common.js';
import { E as $E } from '../../core/english.js';

export const STUN = [20, 30]; // % by form
export const STRIP = Object.freeze({ width: 8, from: 0, to: 5 });

export default registerAbility({
  family: 'voltfin', abilityId: 'ELE-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, token: false, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      const st = pctx.state(self); if (self.team !== 'off' || !st.token) return;
      const [from, to] = bandInField(pctx.ballOn, STRIP.from, STRIP.to);
      pctx.queueField({ owner: self.mid, type: 'Electric', ability: 'ELE-02-F', strength: STUN[stageOf(self.form)] ?? STUN[0], lifetime: 1, clock: 'scrimmageAny', width: STRIP.width, rect: { from, to, lat: pctx.offensePlay.align[self.slot]?.[1] ?? 0 } });
      st.token = false; spend(st, byMastery(CD_5432, self.mastery));
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self);
      if (self.team === 'off' && scrimmage(ctx) && ready(st) && s.carrier === self.slot && !s.receiver && s.firstDown && s.result !== 'touchdown' && ctx.canGainCharge(self)) {
        st.token = true; ctx.executed(self);
        ctx.log(`${$E('sim.charges_a_charge_strip', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ELE-02-F' });
      }
      countPlay(ctx, self, st, 'off');
    },
  },
});
