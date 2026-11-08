// ELE-04-F Static Field (stormlynx: Statyx, S). Task 8 M3 Electric batch (zone).
// Contract (Dex): created automatically before every ready participating defensive scrimmage play, the first included (no
// tackle-earning requirement): an Electric rectangle twelve yards wide by seven long, from five to twelve yards beyond the upcoming
// LOS, centred laterally on Statyx's initial alignment, with the normal inward shift / boundary rules. Each non-Electric monster of
// either team independently rolls 15% Stunned on first entry (starting inside counts; no re-entry reroll; no total cap; Electric
// unaffected; field-effects.js); an accepted Stunned (normal gate) lasts the rest of the play and clears at the whistle. Lifetime one
// completed play including the spawn. Cooldown 5 / 4 / 3 / 2 subsequent defensive plays, starting on creation. Chance and geometry are
// fixed across mastery. The legacy 10% catching restriction is REMOVED (the registered contract replaces the legacy effect key) and
// this is not an Awareness or Coverage debuff.
// Choices where the contract is silent (reported): "initial alignment" = his slot's alignment in the called defensive play (no
// pre-call phase in the engine), computed in the pre-snap step and locked in the field record; created even when he sits the play out
// (the contract lists no source-disabled exception, unlike Crosswind Rescue).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): created
// automatically in the pre-snap step before each ready defensive play (rules.js preSnap: out of play, no in-play start); cooldown
// only, no charge: not gated.
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, spend, countPlay, bandInField } from './nature-electric-common.js';

export const STATIC = Object.freeze({ width: 12, from: 5, to: 12, stun: 15 });

export default registerAbility({
  family: 'stormlynx', abilityId: 'ELE-04-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      const st = pctx.state(self); if (self.team !== 'def' || st.cd > 0) return;
      const [from, to] = bandInField(pctx.ballOn, STATIC.from, STATIC.to);
      pctx.queueField({ owner: self.mid, side: 'defense', type: 'Electric', ability: 'ELE-04-F', strength: STATIC.stun, lifetime: 1, clock: 'scrimmageAny', width: STATIC.width, rect: { from, to, lat: pctx.defensePlay.align[self.slot]?.[1] ?? 0 } });
      spend(st, byMastery(CD_5432, self.mastery)); pctx.executed(self);
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'def'); },
  },
});
