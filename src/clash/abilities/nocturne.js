// DAR-05-C Eclipse Call (nocturne: Nocturne; Disruptor). Batch F.
// Contract (Dex): from RESERVE, an able Nocturne automatically attempts Eclipse Call at the first eligible start-of-round opportunity
// (normal entry effects resolve before eligibility; a Stunned source waits and keeps the use). Target: the opposing single active fighter
// if its shared slot is empty, or it holds Confused that can accept another application under the three-application cap; otherwise wait
// (no overwrite of another status; an incoming Shielded can prevent eligibility). Application chance 60 / 70 / 80 / 90% by mastery (B12
// rows eclipse-call-t0..t3); Confused then has its separate approved 25% normal-attack self-side redirect chance; 2 recipient normal turns
// fixed (same-status extension under the shared duration and cap rules). Once per Clash: an actual application roll consumes the use even
// when it fails; no eligible target or a disabled source keeps it. No damage or extra attack; no cost to the allied active fighter's action;
// no reset on rotation or revival. Not an attack, so no explicit-miss source applies. Cross-mode: the Confused football Awareness penalty
// (D10). Mastery execution: the roll.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const CHANCE = [60, 70, 80, 90]; const TURNS = 2; const REDIRECT = 25;

export default registerClashAbility({
  family: 'nocturne', abilityId: 'DAR-05-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ chancePct: byTier(CHANCE, tier), turns: TURNS, redirectPct: REDIRECT }),
  hooks: {
    roundStart(api, self) {
      const st = self.state; const me = api.me(self); if (st.used || me.active || me.koed || me.stunned) return;
      const foe = api.foe(self); if (!foe) return;
      const ok = !foe.status || (foe.status.id === 'confused' && foe.status.applications < 3);
      if (!ok) return;
      st.used = true; api.trigger(self, `${$E('clashlog.can_accept_confused', { name: foe.name })}`, { targetId: foe.id }); api.executed(self);
      if (api.rng.chance(byTier(CHANCE, self.tier) / 100, self, $E('clashlog.eclipse_call_application'))) { api.activate(self, $E('clashlog.confused_application'), { targetId: foe.id }); api.applyStatus(self, foe.id, { id: 'confused', strength: REDIRECT, duration: TURNS, payload: { redirectPct: REDIRECT } }); }
      else api.cleanup(self, $E('clashlog.the_application_roll_failed_the_use'));
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'From reserve at round start: the roll succeeds (controlled seed selection) and the opposing active is Confused for two turns',
        explain: (c) => `Nocturne waits in reserve; at the start of exchange 1 it rolls its ${c.values.chancePct}% chance (controlled seed selection until it succeeds, labeled).`,
        setup: () => ({ a: [{ species: 'gravelpup', sparring: true }, { species: 'nocturne' }], b: [{ species: 'kindlet' }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'status' && e.abilityId === 'DAR-05-C'), why: 'the application roll succeeds' } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'DAR-05-C')[0]; h.check('Confused 2 turns at round start', s && s.phase === 'round_start' && s.slot.remaining === 2 && s.target === 'b0'); h.check('the active ally still acts', h.has('turn_start', (e) => e.actor === 'a0')); h.executed(1); } },
      { id: 'roll-fails', kind: 'miss', title: 'The roll fails (controlled seed selection): the use is still consumed',
        explain: () => 'Controlled seed selection until the roll fails; Nocturne makes no second attempt.',
        setup: () => ({ a: [{ species: 'gravelpup', sparring: true }, { species: 'nocturne', tier: 0 }], b: [{ species: 'kindlet' }], seed: 1, stopAt: { exchange: 3 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'roll' && e.abilityId === 'DAR-05-C' && !e.success), max: 200, why: 'the application roll fails' } }),
        expect: (r, h) => { h.check('one roll only', h.ev('roll', (e) => e.abilityId === 'DAR-05-C').length === 1); } },
      { id: 'occupied-waits', kind: 'blocked', title: 'The opposing active holds another status: Nocturne waits, the use is kept',
        explain: () => 'The opponent is Shielded (staged): not eligible, so no roll.',
        setup: () => ({ a: [{ species: 'gravelpup', sparring: true }, { species: 'nocturne' }], b: [{ species: 'kindlet', status: { id: 'shielded', strength: 20, duration: 5 } }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no roll (use kept)', !h.has('roll', (e) => e.abilityId === 'DAR-05-C') && h.state('a1')?.used === false); } },
    ],
  },
});
