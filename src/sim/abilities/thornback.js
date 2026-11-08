// NAT-05-F Bramble Trap (thornback: Thornback, TE). Task 8 M3 Nature batch (zone).
// Contract (Dex): his first successfully broken tackle AFTER A RECEPTION while ready earns ONE pending activation (no rushing carries,
// returns or two-point attempts; no accumulation). Before his next eligible on-field offensive snap (G3) one participating NON-NATURE
// defender of the initial pre-play formation is chosen uniformly; a stationary 8-wide x 6-long Nature patch is centred on that
// defender's INITIAL position, shifted inward at the boundaries to keep its size; with no eligible defender the activation stays
// pending. Later formation or play changes neither reroll the target nor move the zone; the fixed 5 / 12-yard bands do not replace this
// defender-centred placement. Nature turning-rate reduction 25 / 30 / 35 / 40% by mastery (straight speed and acceleration unchanged;
// non-Nature monsters of both teams; no immobilisation, vines, damage or shared status). Lifetime ONE completed play including the
// spawn play, all outcomes; clears at the whistle (or halftime). Cooldown THREE subsequent offensive plays from spawn; no re-earning on
// the spawn play or while unavailable. The pending activation survives possession changes and halftime.
// Engine capability used (M3 hook): `tackleBroken`.
// Choices where the contract is silent (reported):
// - "Initial pre-play formation" = the called defensive play's formation alignment (before the engine's pre-snap man adjustments); the
//   engine has no pre-call phase, so the target is drawn in the pre-snap step after both calls and recorded in the field (locked).
// - A tackle broken by a teammate's contract does not count; any broken attempt against him while he carries after his own catch does.
// - The execution (mastery event) is the earned activation.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the patch is
// created in the pre-snap step (out of play: not gated); the token earned by the broken tackle is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, ready, spend, countPlay, bandInField } from './nature-electric-common.js';

export const TURN = [25, 30, 35, 40]; // % by mastery
export const TRAP = Object.freeze({ width: 8, length: 6, cooldown: 3 });

export default registerAbility({
  family: 'thornback', abilityId: 'NAT-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, token: false, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      const st = pctx.state(self); if (self.team !== 'off' || !st.token) return;
      const cands = pctx.defensePlay.onField.filter((slot) => pctx.slots.def[slot]?.id && pctx.slots.def[slot].type !== 'Nature');
      if (!cands.length) return; // no eligible defender: the activation stays pending
      const slot = cands[pctx.rng.int(cands.length)]; const [x, y] = pctx.defensePlay.align[slot];
      const [from, to] = bandInField(pctx.ballOn, x - TRAP.length / 2, x + TRAP.length / 2);
      pctx.queueField({ owner: self.mid, type: 'Nature', ability: 'NAT-05-F', strength: byMastery(TURN, self.mastery), lifetime: 1, clock: 'scrimmageAny', width: TRAP.width, rect: { from, to, lat: y }, payload: { target: slot, targetId: pctx.slots.def[slot].id } });
      st.token = false; spend(st, TRAP.cooldown);
    },
    playStart(ctx, self) { self.bt = { done: false }; },
    tackleBroken(ctx, self) {
      const st = ctx.state(self);
      if (self.bt.done || self.team !== 'off' || !scrimmage(ctx) || ctx.stats.receiver !== self.slot || ctx.ball.holder !== self || !ready(st) || !ctx.canGainCharge(self)) return;
      self.bt.done = true; st.token = true; ctx.executed(self);
      ctx.log(`${self.name} earns a Bramble Trap`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-05-F' });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
