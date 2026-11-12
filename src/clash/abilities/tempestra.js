// WIN-06-C Eye of the Storm (tempestra: Tempestra; Disruptor, legendary). Batch F.
// Contract (Dex): once per Clash, its own normal action replaces the attack if the enemy front active has a READY, REPEATABLE signature
// (the ability-kind table's `signature` field, never guessed from an animation; ready = no running cooldown of its own). The current enemy
// active, identity locked: for its next 2 recipient normal turns it must use the ordinary attack instead of a ready signature (the engine
// does not consult that signature, so nothing is spent); its charges and cooldowns continue normally; no forced-rotation prevention; no
// shared status. The countdown follows the target and pauses in reserve; it ends at the actual Clash end and never carries to football.
// It cannot suppress passives, entry effects, reactions, launched effects or once-per-Clash legendary casts. Source Stunned prevents it.
// 2 turns fixed; no mastery power growth. Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { restrictable } from '../t8/ability-kinds.js';
import { E as $E } from '../../core/english.js';

const TURNS = 2;

export default registerClashAbility({
  family: 'tempestra', abilityId: 'WIN-06-C',
  initBattle: () => ({ used: false }),
  values: () => ({ turns: TURNS }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null; const f = api.get(foeId);
      if (!f.abilityId || !restrictable(f.abilityId) || f.clocks.some((k) => k.kind === 'cooldown' && k.id === f.abilityId) || f.sigRestrict) return null;
      self.state.used = true; api.activate(self, `${$E('clashlog.s_is_restricted_for_of_its', { name: f.name, abilityId: f.abilityId, turns: TURNS })}`, { targetId: foeId }); api.executed(self);
      api.restrictSignature(self, foeId, TURNS);
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A ready repeatable signature (Sovereign Balance) is restricted: two ordinary attacks, then it returns',
        explain: () => 'Tempestra restricts Aurodrax: its next two normal turns are ordinary attacks (Sovereign Balance is not consulted, nothing spent); then the signature is available again.',
        setup: () => ({ a: [{ species: 'tempestra', overall: 30, sparring: true }], b: [{ species: 'aurodrax', overall: 30 }], seed: 1, stopAt: { exchange: 4 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('restricted turns are ordinary', h.ev('damage', (e) => e.actor === 'b0' && e.ex <= 2).every((e) => e.tag === 'ordinary')); h.check('restriction ends', h.has('signature_restriction_end', (e) => e.actor === 'b0')); h.check('Sovereign Balance used afterwards', h.has('damage', (e) => e.actor === 'b0' && e.abilityId === 'DRA-06-C' && e.ex >= 3)); h.executed(1); } },
      { id: 'once-use-not-eligible', kind: 'blocked', title: 'A once-per-Clash ability is not a repeatable signature: no cast, use kept',
        explain: () => 'The opponent Pyronix\'s Falling Star is once per Clash: not restrictable; Tempestra attacks.',
        setup: () => ({ a: [{ species: 'tempestra' }], b: [{ species: 'firestorm' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no restriction (use kept)', h.state('a0')?.used === false); } },
      { id: 'on-cooldown', kind: 'blocked', title: 'The signature is recharging (not ready): no cast, use kept',
        explain: () => 'The opponent Drakling pounced on exchange 1 (its cooldown runs): not ready, so Tempestra does not cast on exchange 2.',
        setup: () => ({ a: [{ species: 'tempestra', overall: 30 }], b: [{ species: 'drakeling', overall: 30 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('no cast while the signature recharges', !h.has('signature_restricted', (e) => e.ex === 2 && e.abilityId === 'WIN-06-C')); } },
    ],
  },
});
