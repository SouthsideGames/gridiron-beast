// DAR-06-C Eclipse Theft (nyxshade: Nyxshade; Disruptor, legendary). Batch F.
// Contract (Dex): Nyxshade spends its own normal action, once per Clash, to steal an eligible benefit from the opposing single active
// fighter (Shielded, Guarded, Empowered, Quickened), provided its own shared slot is empty; no eligible target or an occupied own slot falls
// back to the ordinary attack and keeps the use; a Stunned source cannot activate. Guaranteed atomic transfer on legal eligibility: the
// benefit leaves the foe only when Nyxshade accepts it; strength, remaining duration, remaining shield HP and accepted application count
// are preserved (the existing episode and clock, no extra tick, refresh or cap reset). Only the basic status transfers: no source ability
// uses, riders or flags (Glacier Wall rebuild ownership, Tempered Guard cap, Fortress storage, Dragonhide conversion stay behind). The
// transfer is not shield depletion. No damage or extra attack. Mastery execution: the steal.
import { registerClashAbility } from '../t8/registry.js';

const STEALABLE = ['shielded', 'guarded', 'empowered', 'quickened'];

export default registerClashAbility({
  family: 'nyxshade', abilityId: 'DAR-06-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null; const me = api.me(self); const f = api.get(foeId);
      if (me.status || !f.status || !STEALABLE.includes(f.status.id)) return null;
      api.activate(self, `steal ${f.name}'s ${f.status.id}`, { targetId: foeId });
      if (!api.transferStatus(self, foeId, self.id, { reason: 'stolen', stripRiders: true })) return null;
      self.state.used = true; api.executed(self);
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The foe\'s shield moves to Nyxshade with its remaining pool, duration and application count',
        explain: () => 'The opposing active holds a staged shield: Nyxshade takes the whole episode as it stands; the foe is left with nothing.',
        setup: () => ({ a: [{ species: 'nyxshade' }], b: [{ species: 'gravelpup', status: { id: 'shielded', strength: 30, duration: 4 } }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const t = h.ev('status', (e) => e.abilityId === 'DAR-06-C')[0]; h.check('pool 30, 4 turns, 1 application moved', t && t.slot.pool === 30 && t.slot.remaining === 4 && t.slot.applications === 1); h.check('the foe is left without it', h.line('b0').status === null); h.executed(1); } },
      { id: 'own-slot', kind: 'blocked', title: 'Nyxshade\'s own slot is occupied: ordinary attack, use kept',
        explain: () => 'Nyxshade is Slowed (staged): "provided Nyxshade shared status slot is empty".',
        setup: () => ({ a: [{ species: 'nyxshade', status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup', status: { id: 'shielded', strength: 30, duration: 4 } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no steal (use kept)', h.state('a0')?.used === false && h.line('b0').status?.id === 'shielded'); } },
      { id: 'riders-stay', kind: 'interaction', title: 'Riders do not transfer: a stolen Tempered Guard Guarded arrives without its hit cap',
        explain: () => 'The opponent Steelpaw sets up Tempered Guard; Nyxshade steals the Guarded on its next turn; the Tempered Guard cap is a source rider and stays behind.',
        setup: () => ({ a: [{ species: 'nyxshade' }], b: [{ species: 'steelpaw' }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const t = h.ev('status', (e) => e.abilityId === 'DAR-06-C')[0]; h.check('Guarded stolen without the cap rider', t && t.slot.id === 'guarded' && !h.line('a0').status?.payload?.temperedCap); } },
    ],
  },
});
