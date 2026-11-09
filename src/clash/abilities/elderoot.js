// NAT-06-C Root Communion (elderoot: Elderoot; Support, legendary). Batch C.
// Contract (Dex, spec §9): on its own normal turn while unused, when a living ally is at 25% max HP or less and redistribution would
// increase that ally's HP (otherwise the ordinary attack, use kept; Stunned skips cannot activate it). ALL living allies, Elderoot and
// the reserves included (KO allies excluded; no revival; shields not pooled or changed). The common target percentage = sum of CURRENT
// HP / sum of MAX HP; current HP is redistributed toward it simultaneously with the pinned whole-HP apportionment (src/clash/t8/apportion.js):
// the total is conserved, each member stays >= 1 and <= max, fractional ties by stable id. Contributions are not attacks; shields do not
// absorb; donor reductions are not damage and trigger nothing. Healing Reduced applies to the allocated GAINS only (floored); blocked
// healing is LOST and is not redistributed. Once per Clash; same at every mastery. Mastery execution: the redistribution.
import { registerClashAbility } from '../t8/registry.js';
import { apportionHp } from '../t8/apportion.js';

const LINE = 25;

export default registerClashAbility({
  family: 'elderoot', abilityId: 'NAT-06-C',
  initBattle: () => ({ used: false }),
  values: () => ({ thresholdPct: LINE }),
  hooks: {
    chooseAction(api, self) {
      if (self.state.used) return null;
      const allies = api.allies(self); if (allies.length < 2) return null;
      const low = allies.filter((v) => v.hp * 100 <= LINE * v.maxHp);
      if (!low.length) return null;
      const plan = apportionHp(allies.map((v) => ({ id: v.id, hp: v.hp, maxHp: v.maxHp, healFactor: api.healFactor(v.id) })));
      if (!low.some((v) => plan.find((p) => p.id === v.id).after > v.hp)) return null;
      self.state.used = true; api.trigger(self, `${low.map((v) => v.name).join(', ')} at or below ${LINE}% max HP`); api.executed(self);
      api.activate(self, 'redistribute current HP toward the common percentage');
      for (const p of plan) if (p.after !== p.before) api.setHp(self, p.id, p.after, p.lost ? `apportioned; ${p.lost} healing lost to Healing Reduced` : 'apportioned');
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'An ally at 20% HP: all living allies move to the common percentage; the total HP is conserved',
        explain: () => 'A reserve is staged at about 20% HP: the side\'s current HP is pooled and spread to the same percentage, whole HP, total conserved.',
        setup: () => ({ a: [{ species: 'elderoot' }, { species: 'tidepaw', hp: 12 }, { species: 'lumen' }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const sets = h.ev('hp_set', (e) => e.abilityId === 'NAT-06-C'); h.check('HP moved', sets.length >= 2); h.check('total conserved (no Healing Reduced)', sets.reduce((s, e) => s + e.delta, 0) === 0); const after = r.lines.a.map((x) => x.hp / x.maxHp); h.check('percentages within one HP of each other', Math.max(...after) - Math.min(...after) < 0.05); h.executed(1); } },
      { id: 'nobody-low', kind: 'blocked', title: 'No ally at or below 25%: ordinary attack, use kept',
        explain: () => 'Everyone is healthy.',
        setup: () => ({ a: [{ species: 'elderoot' }, { species: 'tidepaw' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no redistribution (use kept)', h.state('a0')?.used === false && !h.has('hp_set')); } },
      { id: 'healing-reduced-lost', kind: 'interaction', title: 'Healing Reduced on the low ally: its gain is cut and the lost healing is not redistributed (the total drops)',
        explain: () => 'The low reserve holds a staged Healing Reduced 50%: it receives half its allocated gain; donors still give their share; the side\'s total HP falls by the lost healing.',
        setup: () => ({ a: [{ species: 'elderoot' }, { species: 'tidepaw', hp: 12, status: { id: 'healingReduced', strength: 50, duration: 5 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const sets = h.ev('hp_set', (e) => e.abilityId === 'NAT-06-C'); h.check('the total fell by the lost healing', sets.reduce((s, e) => s + e.delta, 0) < 0); h.check('the loss is named', sets.some((e) => /lost to Healing Reduced/.test(e.why))); } },
    ],
  },
});
