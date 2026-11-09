// WAT-03-C Shell Renewal (reefclaw: Crustank; Tank). Batch B.
// Contract (Dex): once per separate Clash, while ACTIVE: right after a harmful status applies, or on entering active already holding
// one, if unused. Automatic, no action cost, and it can trigger while Stunned; no trigger for a beneficial or no status; no reserve-time
// cleanse. Self only: remove the removable harmful status with all its stacked duration and applications; no heal, shield or bonus
// attack. An uncleansable status stays but the ATTEMPT SPENDS the sole use; the incoming ability's other effects still resolve. Same at
// every mastery. Mastery execution: the cleanse attempt.
import { registerClashAbility } from '../t8/registry.js';
import { isHarmful } from './util.js';

function attempt(api, self, why) {
  const st = self.state; const me = api.me(self);
  if (st.used || !me.active || me.koed || !isHarmful(me.status)) return;
  st.used = true; api.trigger(self, why); api.executed(self);
  const ok = api.cleanse(self, self.id);
  if (ok) api.activate(self, 'harmful status shed'); else api.cleanup(self, 'the status is uncleansable: the sole use is spent');
}

export default registerClashAbility({
  family: 'reefclaw', abilityId: 'WAT-03-C',
  initBattle: () => ({ used: false }),
  values: () => ({}), // identical at every mastery (no numeric scaling)
  hooks: {
    statusApplied(api, self) { attempt(api, self, 'a harmful status applied while active'); },
    onEntry(api, self) { attempt(api, self, 'entered active already holding a harmful status'); },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Weakened lands on the active Crustank: it is shed at once; a second one stays (once per Clash)',
        explain: () => 'CONTROLLED PREREQUISITE (labelled): a reviewer probe makes the opponent\'s first two hits attach Weakened. The first is shed immediately; the second stays because the use is spent.',
        setup: () => ({ a: [{ species: 'reefclaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ attached: (v, id, info) => (id === 'b0' && v.ex <= 2 ? { kind: 'status', targetId: info.target, id: 'weakened', strength: 10, duration: 5, abilityId: 'TEST-WEAKEN' } : null) }] }),
        expect: (r, h) => { const ends = h.ev('status_end', (e) => e.target === 'a0' && e.abilityId === 'WAT-03-C'); h.check('shed once', ends.length === 1); h.check('the second Weakened stays', h.ev('status', (e) => e.target === 'a0' && e.status === 'weakened').length === 2 && h.ev('status_end', (e) => e.target === 'a0').length >= 1); h.executed(1); h.stages('trigger', 'resolution', 'activation'); } },
      { id: 'enter-harmful', kind: 'rotation', title: 'Entering active already harmful triggers the shed',
        explain: () => 'Crustank waits in reserve with a staged Slowed; when it enters after a knockout it sheds it on entry.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1 }, { species: 'reefclaw', status: { id: 'slowed', strength: 15, duration: 4 } }], b: [{ species: 'charbun', overall: 90 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const en = h.ev('enter', (e) => e.actor === 'a1')[0]; const end = h.ev('status_end', (e) => e.target === 'a1' && e.abilityId === 'WAT-03-C')[0]; h.check('shed right after entry', en && end && end.seq > en.seq); } },
      { id: 'uncleansable', kind: 'blocked', title: 'An uncleansable status: the attempt is refused and still spends the use',
        explain: () => 'Crustank starts with a staged uncleansable Healing Reduced; on its opening entry the attempt is made, refused, and the once-use is spent.',
        setup: () => ({ a: [{ species: 'reefclaw', status: { id: 'healingReduced', strength: 100, duration: 3, payload: { uncleansable: true } } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('cleanse refused', h.has('cleanse_refused', (e) => e.target === 'a0')); h.check('use spent', h.state('a0')?.used === true); h.check('status kept', h.line('a0').status?.id === 'healingReduced'); } },
      { id: 'reserve-no-trigger', kind: 'blocked', title: 'In reserve: no cleanse (the status waits)',
        explain: () => 'A harmful status on a reserve Crustank is not shed until it enters active (no reserve-time cleanse).',
        setup: () => ({ a: [{ species: 'tidepaw', overall: 99 }, { species: 'reefclaw', status: { id: 'slowed', strength: 15, duration: 4 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no shed in reserve', !h.has('status_end', (e) => e.target === 'a1' && e.abilityId === 'WAT-03-C')); h.check('use preserved', h.state('a1')?.used === false); } },
    ],
  },
});
