// WIN-04-C Second Wind (windlynx: Galyx; Support). Batch E.
// Contract (Dex, owner 13A): once per Clash FROM RESERVE, before the round's initiative resolves (the pre-initiative opening), if the living
// ACTIVE ally would act second and has an action it can legally perform: advance that ally's EXISTING normal action before the opponent this
// round. No extra action, heal, damage boost or Stunned bypass; the source takes no normal attack. Spent only when the order actually
// changes: if the ally already acts first, is Stunned (would skip), or the source is unable (Stunned), the use is kept. Current round only;
// a target that becomes KO / unable before acting follows normal cancellation with no replacement attack. It does not interrupt an
// already-resolving action. "Resolve simultaneous priority with ordinary stable initiative / ties": an explicit INTERRUPT tier on the
// opponent is not overtaken (reading; T8_PROVISIONAL 'second-wind-vs-interrupt'). No mastery scaling. Mastery execution: the advance.
import { registerClashAbility } from '../t8/registry.js';
import { E as $E } from '../../core/english.js';

export default registerClashAbility({
  family: 'windlynx', abilityId: 'WIN-04-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    preInitiative(api, self, { activeId, by }) {
      const st = self.state; const me = api.me(self); const act = api.get(activeId);
      if (st.used || me.active || me.koed || me.stunned || act.side !== self.side) return null;
      if (act.stunned && !act.stunProtected) { api.cleanup(self, `${$E('clashlog.would_skip_stunned_use_kept', { name: act.name })}`); return null; }
      if (by === 'interrupt') return null;
      st.used = true; api.trigger(self, `${act.name} would act second`, { targetId: activeId }); api.activate(self, `${$E('clashlog.advance_s_action_before_the_opponent', { name: act.name })}`, { targetId: activeId }); api.executed(self);
      return { advance: activeId };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The slower active ally is advanced before the opponent this round; the use is spent',
        explain: () => 'The active ally is slower than the opponent; Galyx in reserve advances its action for exchange 1 only.',
        setup: () => ({ a: [{ species: 'gravelpup', overall: 40 }, { species: 'windlynx' }], b: [{ species: 'voltfang', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const i1 = h.ev('initiative', (e) => e.ex === 1)[0]; h.check('a0 first on exchange 1 (advanced)', i1 && i1.actor === 'a0' && /advanced/.test(i1.by)); h.check('exchange 2 back to ordinary speed', h.ev('initiative', (e) => e.ex === 2)[0]?.actor === 'b0'); h.executed(1); } },
      { id: 'already-first', kind: 'blocked', title: 'The ally already acts first: nothing changes, the use is kept',
        explain: () => 'A faster active ally needs no advance.',
        setup: () => ({ a: [{ species: 'voltfang', overall: 99 }, { species: 'windlynx' }], b: [{ species: 'gravelpup', overall: 40, sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no advance (use kept)', h.state('a1')?.used === false); } },
      { id: 'ally-stunned', kind: 'blocked', title: 'The ally is Stunned (would skip): no advance, the use is kept',
        explain: () => 'The slower active ally holds a staged Stunned: there is no action to advance.',
        setup: () => ({ a: [{ species: 'gravelpup', overall: 40, status: { id: 'stunned', strength: 1, duration: 1 } }, { species: 'windlynx' }], b: [{ species: 'voltfang', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no advance (use kept)', h.state('a1')?.used === false && h.has('cleanup', (e) => e.abilityId === 'WIN-04-C')); } },
    ],
  },
});
