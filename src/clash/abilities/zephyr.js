// WIN-05-C Tailwind Pact (zephyr: Zephiro; Support). Batch B.
// Contract (Dex): once per Clash on its own normal action, when at least two living allies (self included) have EMPTY slots, replace the
// attack: attempt Empowered +15 / 18 / 21 / 24% by mastery for 2 recipient normal turns on every living ally, self and reserves included,
// with an empty slot (no replacement, cleanse or overwrite). Committed on cast even if some are blocked. Application turn excluded;
// reserve pauses. The football carry converts to the same-percent Strength (S12). Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';

const EMP = [15, 18, 21, 24]; const TURNS = 2; const MIN_EMPTY = 2;

export default registerClashAbility({
  family: 'zephyr', abilityId: 'WIN-05-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ empoweredPct: byTier(EMP, tier), turns: TURNS, minEmpty: MIN_EMPTY }),
  hooks: {
    chooseAction(api, self) {
      if (self.state.used) return null;
      const empty = api.allies(self).filter((v) => !v.status);
      if (empty.length < MIN_EMPTY) return null;
      self.state.used = true; api.trigger(self, `${empty.length} living allies with empty slots`); api.executed(self);
      api.activate(self, `team Empowered +${byTier(EMP, self.tier)}%`);
      api.applyStatuses(self, empty.map((v, i) => ({ targetId: v.id, order: i, id: 'empowered', strength: byTier(EMP, self.tier), duration: TURNS })));
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Every living ally with an empty slot, reserves included, is Empowered for two of its turns',
        explain: (c) => `All three allies have empty slots: each gets Empowered +${c.values.empoweredPct}% (2 recipient normal turns).`,
        setup: () => ({ a: [{ species: 'zephyr' }, { species: 'tidepaw' }, { species: 'lumen' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const st = h.ev('status', (e) => e.abilityId === 'WIN-05-C'); h.check('three Empowered episodes', st.length === 3 && st.every((e) => e.slot.id === 'empowered' && e.slot.strength === h.values.empoweredPct && e.slot.remaining === 2)); h.check('Zephiro\'s own next attack is Empowered', h.has('damage', (e) => e.actor === 'a0' && e.ex === 2 && e.outgoing === 1 + h.values.empoweredPct / 100)); h.executed(1); } },
      { id: 'too-few', kind: 'blocked', title: 'Fewer than two empty slots: no cast (ordinary attack, use kept)',
        explain: () => 'The only ally is Slowed (staged), so only Zephiro has an empty slot.',
        setup: () => ({ a: [{ species: 'zephyr' }, { species: 'tidepaw', status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no cast (use kept)', h.state('a0')?.used === false); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'partial', kind: 'multiTarget', title: 'Occupied allies are skipped, not overwritten; the cast is committed',
        explain: () => 'Two of three allies are empty: they are Empowered; the Slowed one keeps its status.',
        setup: () => ({ a: [{ species: 'zephyr' }, { species: 'tidepaw' }, { species: 'lumen', status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('two Empowered', h.ev('status', (e) => e.abilityId === 'WIN-05-C').length === 2); h.check('Slowed kept', h.line('a2').status?.id === 'slowed'); h.check('use spent', h.state('a0')?.used === true); } },
    ],
  },
});
