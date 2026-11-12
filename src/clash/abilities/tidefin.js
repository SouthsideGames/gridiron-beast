// WAT-04-C Wash Away (tidefin: Ripplet; Disruptor). Batch F.
// Contract (Dex): when ready on its own normal turn, wait until the opposing ACTIVE monster (not a reserve) has a beneficial status, then
// attempt the utility instead of attacking (no beneficial status: attack normally and keep the use; this final A overrides the earlier
// waste-on-no-target answer). On success remove the ENTIRE beneficial status: stacked duration and remaining shield HP included. No
// steal, heal or new status; never traits, charges, marks or harmful statuses. Once per separate Clash, the same at all mastery. Explicit
// removal immunity wastes the action AND the use. "Normal evasion check applies": with no universal evasion (N7a) and every explicit miss
// source limited by its own wording to attacks, no miss source applies to this non-attack utility (plan §5a). Mastery execution: the attempt.
import { registerClashAbility } from '../t8/registry.js';
import { BENEFICIAL } from './util.js';
import { E as $E } from '../../core/english.js';

export default registerClashAbility({
  family: 'tidefin', abilityId: 'WAT-04-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null; const f = api.get(foeId);
      if (!f.status || !BENEFICIAL.includes(f.status.id)) return null;
      self.state.used = true; api.activate(self, `${$E('clashlog.wash_away_s', { name: f.name, id: f.status.id })}`, { targetId: foeId }); api.executed(self);
      api.removeStatus(self, foeId, 'washed away');
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The opposing active\'s shield is washed away whole (pool included); no damage',
        explain: () => 'The opponent holds a staged shield: Ripplet removes the entire status, remaining shield HP included, instead of attacking.',
        setup: () => ({ a: [{ species: 'tidefin' }], b: [{ species: 'gravelpup', status: { id: 'shielded', strength: 30, duration: 5 } }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('the shield is removed', h.has('status_end', (e) => e.target === 'b0' && e.abilityId === 'WAT-04-C' && e.status === 'shielded') && h.line('b0').status === null); h.check('no damage from Ripplet', !h.has('damage', (e) => e.actor === 'a0')); h.executed(1); } },
      { id: 'no-benefit', kind: 'blocked', title: 'No beneficial status on the opposing active: ordinary attack, the use is kept',
        explain: () => 'Nothing to wash away.',
        setup: () => ({ a: [{ species: 'tidefin' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no removal (use kept)', h.state('a0')?.used === false && h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'harmful-untouched', kind: 'blocked', title: 'A harmful status is never removed (benefits only)',
        explain: () => 'The opponent is Weakened (staged): Wash Away ignores harmful statuses and Ripplet attacks.',
        setup: () => ({ a: [{ species: 'tidefin' }], b: [{ species: 'gravelpup', status: { id: 'weakened', strength: 10, duration: 5 } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('Weakened kept, no removal', h.line('b0').status?.id === 'weakened' && h.state('a0')?.used === false); } },
    ],
  },
});
