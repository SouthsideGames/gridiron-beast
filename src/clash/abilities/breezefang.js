// WIN-02-C Gust Hop (breezefang: Zephyroo / Mistralope; Balanced). Batch A.
// Contract (Dex): every third performed normal attack is replaced by a two-hit leap: two separately evadable hits on the same target
// (locked at launch, no retarget if the first knocks it out), EACH 60 / 65 / 70 / 75% by mastery (both forms the same). One performed
// attack; Stunned skips and support actions do not build the count; no time cooldown. Confused rolls once at launch for the whole move.
// Each hit has normal shield / DR; standard retaliation after each connected hit (no recursion); no ordinary-only perks on special hits.
// The partial count carries through reserve and clears at the Clash end. Mastery execution: the leap.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, SPAR } from './util.js';

const PER_HIT = [60, 65, 70, 75]; const EVERY = 3;

export default registerClashAbility({
  family: 'breezefang', abilityId: 'WIN-02-C',
  initBattle: () => ({ count: 0 }),
  values: (form, tier) => ({ perHitPct: byTier(PER_HIT, tier), every: EVERY }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || self.state.count < EVERY - 1) return null;
      api.trigger(self, `third performed normal attack (${self.state.count} performed)`, { targetId: foeId }); api.activate(self, `two-hit leap at ${byTier(PER_HIT, self.tier)}% each`, { targetId: foeId }); api.executed(self);
      self.state.count = -1; // the leap itself is the third performed attack; the count restarts after it
      return { kind: 'attack', tag: 'special', mult: byTier(PER_HIT, self.tier) / 100, hits: 2, strikeKey: 'two-hit leap', label: 'Gust Hop' };
    },
    afterWholeAttack(api, self, info) {
      if (info.attackerId !== self.id || !info.normal || !info.inAction) return;
      self.state.count += 1;
      if (info.abilityId === 'WIN-02-C') api.cleanup(self, `leap resolved (${info.hits.length} hit${info.hits.length === 1 ? '' : 's'}); count restarts`);
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Attacks 1 and 2 ordinary, attack 3 is the two-hit leap at the per-hit power',
        explain: (c) => `Every third performed attack becomes two separately evadable hits of ${c.values.perHitPct}% each.`,
        setup: () => ({ a: [{ species: 'breezefang', overall: 20 }], b: SPAR(), seed: 1, stopAt: { exchange: 6 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('two hits on exchange 3; the next leap on exchange 6', d.filter((e) => e.ex === 3).length === 2 && d.some((e) => e.ex === 6) && d.every((e) => e.ex === 3 || e.ex === 6), d.map((e) => e.ex)); h.check('each hit at the per-hit power', d.every((e) => e.mult === h.values.perHitPct / 100)); h.check('one Confused-free launch, hitNo 1 and 2', d[1]?.hitNo === 2); h.executed(2); h.stages('trigger', 'activation', 'resolution', 'cleanup'); } },
      { id: 'stun-no-progress', kind: 'blocked', title: 'A Stunned skip builds no count',
        explain: () => 'Zephyroo starts Stunned (staged): its skipped turn does not count; the leap comes on the third PERFORMED attack (exchange 4).',
        setup: () => ({ a: [{ species: 'breezefang', status: { id: 'stunned', strength: 1, duration: 1 } }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('skipped exchange 1 (no count)', h.has('skip', (e) => e.actor === 'a0' && e.ex === 1)); h.check('the leap on exchange 4', h.ab('damage').every((e) => e.ex === 4) && h.ab('damage').length === 2); } },
      { id: 'first-hit-ko', kind: 'multiTarget', title: 'The first hit knocks the target out: the second hit is canceled (no retarget)',
        explain: () => 'Staged (controlled prerequisite): the count is at two and the target at 1 HP. The first hit knocks it out; the second hit does not move to the replacement.',
        setup: () => ({ a: [{ species: 'breezefang', ability: { count: 2 } }], b: [{ species: 'gravelpup', hp: 1 }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('one hit landed', h.ab('damage').length === 1); h.check('the remaining hit is canceled', h.has('hits_cancelled', (e) => e.actor === 'a0')); h.check('the replacement was not hit by the leap', !h.has('damage', (e) => e.abilityId === 'WIN-02-C' && e.target === 'b1')); } },
    ],
  },
});
