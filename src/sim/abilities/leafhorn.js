// NAT-04-F Surefoot Canopy (leafhorn: Florant, S). Task 8 M3 Nature batch (targeted effect).
// Contract (Dex): before EACH defensive scrimmage snap (no cooldown, no charges, no mastery scaling) one OTHER participating defensive
// teammate is chosen with equal chance, every type eligible, Florant excluded; repeats allowed. The choice is recorded and a reload
// cannot reroll it. That teammate cannot receive ANY Stumbled application during the play, from any source at any distance; every
// attempt is refused, not only the first. No other immunity, cleanse or attribute change. The protection ends at the whistle and is
// not a shared status (it occupies no status slot). Both teams see the target before the snap (a pre-snap event). No range or aura.
// Engine capability used (M3 hook): an actor's per-play status immunity (`immune`), honoured by the shared-gate application in the
// engine and by field-inflicted statuses (field-effects.js).
// Choices where the contract is silent (reported):
// - "Exclude Florant": no Florant (this family) is ever a target, the source included.
// - The choice is made in the pre-snap step (rules.js) and recorded in his game-scope state with the play index; the same play index
//   always reuses the recorded choice. Labs that call the engine directly have no pre-snap step and no protection.
// - Already-active Stumbled: Stumbled is a within-play status (clears at every whistle), so none can be active at a snap; the protection
//   only refuses new applications and never removes a status.
// - The execution (mastery event) is each play's granted protection.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): an automatic
// protection chosen in the pre-snap step before every defensive snap, with no readiness, charge or cooldown (nothing to deny or keep):
// treated as a passive grant, not gated.
import { registerAbility } from './registry.js';
import { E as $E } from '../../core/english.js';

export default registerAbility({
  family: 'leafhorn', abilityId: 'NAT-04-F',
  initGame: () => ({ pick: null }),
  hooks: {
    preSnap(pctx, self) {
      if (self.team !== 'def') return; const st = pctx.state(self);
      if (st.pick?.play === pctx.playIndex) return; // recorded: a reload cannot reroll
      const cands = pctx.defensePlay.onField.map((slot) => pctx.slots.def[slot]).filter((p) => p?.id && p.id !== self.mid && p.species !== 'leafhorn');
      st.pick = cands.length ? { play: pctx.playIndex, mid: cands[pctx.rng.int(cands.length)].id } : { play: pctx.playIndex, mid: null };
    },
    playStart(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || ctx.kickoff || ctx.twoPoint || !st.pick?.mid) return;
      const tgt = ctx.actors.find((a) => a.team === self.team && a.mid === st.pick.mid && !a.temp); if (!tgt) return;
      (tgt.immune ||= new Set()).add('stumbled'); ctx.executed(self);
      ctx.log(`${$E('sim.s_surefoot_canopy_covers', { name: self.name, name2: tgt.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-04-F', target: tgt.slot });
    },
  },
});
