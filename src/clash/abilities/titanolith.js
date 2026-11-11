// EAR-06-C Mountain Shelter (titanolith: Titanolith; Tank, legendary). Batch B.
// Contract (Dex): once per Clash, replace the normal action when any living teammate INCLUDING self is at or below 50% HP (otherwise
// the ordinary attack, use kept; Stunned prevents activation and keeps readiness). EVERY living teammate, the source and the reserves
// included, GUARANTEED: Guarded 30 / 35 / 40 / 45% by mastery for TWO recipient normal turns (application turn excluded; reserve pauses;
// Stunned skips count). Explicit owner exception: REPLACE any existing harmful or beneficial status, even an uncleansable one, removing a
// replaced Shielded pool; an already Guarded ally gets a FRESH episode at Titanolith's strength and two turns (no additive duration;
// bypasses the old episode's application cap). Protection is independent after the source leaves or is knocked out (B3 rule 3).
// No reflection, healing or shield. Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';

const GUARD = [30, 35, 40, 45]; const TURNS = 2; const HP_LINE = 50;

export default registerClashAbility({
  family: 'titanolith', abilityId: 'EAR-06-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ guardedPct: byTier(GUARD, tier), turns: TURNS, hpLinePct: HP_LINE }),
  hooks: {
    chooseAction(api, self) {
      if (self.state.used) return null;
      const allies = api.allies(self); const low = allies.filter((v) => v.hp * 100 <= HP_LINE * v.maxHp);
      if (!low.length) return null;
      self.state.used = true; api.trigger(self, `${low.map((v) => v.name).join(', ')} at or below ${HP_LINE}% HP`); api.executed(self);
      api.activate(self, `team Guarded ${byTier(GUARD, self.tier)}% for every living teammate, replacing any status`);
      for (const v of allies) api.replaceStatus(self, v.id, { id: 'guarded', strength: byTier(GUARD, self.tier), duration: TURNS }, { overridesUncleansable: true });
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A teammate at 50% HP: every living teammate, reserves included, gets a fresh Guarded episode, replacing what they held',
        explain: (c) => `A reserve is at 40% HP (staged) and another holds an uncleansable Healing Reduced (staged): all three get Guarded ${c.values.guardedPct}% for two of their own normal turns.`,
        setup: () => ({ a: [{ species: 'titanolith' }, { species: 'tidepaw', hp: 20 }, { species: 'lumen', status: { id: 'healingReduced', strength: 100, duration: 4, payload: { uncleansable: true } } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const st = h.ev('status', (e) => e.abilityId === 'EAR-06-C'); h.check('three fresh Guarded episodes', st.length === 3 && st.every((e) => e.slot.id === 'guarded' && e.slot.strength === h.values.guardedPct && e.slot.remaining === 2 && e.slot.applications === 1)); h.check('the uncleansable status was replaced', st.some((e) => e.target === 'a2' && e.replaced === 'healingReduced')); h.executed(1); h.stages('trigger', 'activation', 'resolution'); } },
      { id: 'no-trigger', kind: 'blocked', title: 'Nobody at or below 50%: ordinary attack, use kept',
        explain: () => 'With the whole side healthy, Mountain Shelter is not cast.',
        setup: () => ({ a: [{ species: 'titanolith' }, { species: 'tidepaw' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no cast (use kept)', h.state('a0')?.used === false && h.ab('status').length === 0); } },
      { id: 'refresh-guarded', kind: 'interaction', title: 'An ally already Guarded (stronger, longer, at three applications) still gets a fresh episode at Titanolith\'s strength',
        explain: () => 'The reserve holds a staged Guarded 60% for 5 turns: the shelter replaces it with a fresh episode (two turns), as the explicit exception says.',
        setup: () => ({ a: [{ species: 'titanolith', hp: 40 }, { species: 'tidepaw', status: { id: 'guarded', strength: 60, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const e = h.ev('status', (x) => x.abilityId === 'EAR-06-C' && x.target === 'a1')[0]; h.check('fresh weaker episode replaces the stronger one', e && e.replaced === 'guarded' && e.slot.strength === h.values.guardedPct && e.slot.remaining === 2); } },
    ],
  },
});
