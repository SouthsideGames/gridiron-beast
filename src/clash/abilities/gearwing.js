// MET-03-C Gear Shot (gearwing: Coglet; Balanced). Batch A.
// Contract (Dex): on every performed normal attack, clamp the random base-damage variance floor to 0.95 / 1.00 / 1.05 / 1.10 by mastery,
// never above the configured upper variance (1.1). Evasion, type, shield, Guarded / Tank remain ordinary. Variance is evaluated per own
// normal attack, not reactions or special moves. Passive, no cooldown; no extra attack or status. Seeded draw consumption is preserved
// even when clamped (the engine draws the spread first). A Confused redirect still uses the clamped variance. D5 names it ordinary.
// Mastery: passive, one credit per cap scope when it actually raises a roll.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, SPAR } from './util.js';

const FLOOR = [0.95, 1.00, 1.05, 1.10];

export default registerClashAbility({
  family: 'gearwing', abilityId: 'MET-03-C', passive: true,
  initBattle: () => ({ raised: 0 }),
  values: (form, tier) => ({ floor: byTier(FLOOR, tier) }),
  hooks: {
    variance(api, self, { tag, spread }) {
      if (tag !== 'ordinary') return null; const fl = byTier(FLOOR, self.tier);
      if (spread < fl) { self.state.raised += 1; api.log(self, 'ability', `${self.name}: Gear Shot raises the variance roll ${spread.toFixed(3)} to ${fl.toFixed(2)}`, { stage: 'activation', spread, floor: fl }); api.executed(self, { passive: true }); }
      return { floor: fl };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Low variance rolls are raised to the mastery floor; the seeded draw count is unchanged',
        explain: (c) => `Every ordinary attack's spread is at least ${c.values.floor}; rolls above it are untouched; the random stream advances exactly as without Gear Shot.`,
        setup: () => ({ a: [{ species: 'gearwing', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 12 } }),
        expect: (r, h) => { const raised = h.ab('ability'); h.check('at least one roll raised over 12 attacks', raised.length >= 1 || h.values.floor <= 0.95); h.check('every raise lands on the floor', raised.every((e) => e.floor === h.values.floor && e.spread < e.floor)); h.check('one passive credit at most', h.line('a0').executions <= 1); } },
      { id: 'not-on-specials', kind: 'blocked', title: 'Reactions and specials keep the ordinary variance (no clamp outside its own ordinary attack)',
        explain: () => 'The floor applies only to Coglet\'s own ordinary attacks: the opponent\'s rolls are untouched (the hook is asked only for Coglet\'s strikes with the ordinary tag).',
        setup: () => ({ a: [{ species: 'gearwing' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 2, stopAt: { exchange: 6 } }),
        expect: (r, h) => { h.check('no raise is logged for anyone else (no clamp outside its own ordinary attack)', h.ab('ability').every((e) => e.actor === 'a0')); } },
      { id: 'draws-preserved', kind: 'interaction', title: 'The clamp never changes the random stream: same draw count as the same battle with abilities off',
        explain: () => 'Gear Shot replaces the drawn value after the draw, so the battle consumes the same number of random draws.',
        setup: () => ({ a: [{ species: 'gearwing' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 3, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const spreads = h.ev('damage').length; const coins = h.ev('initiative', (e) => e.by === 'coin').length; h.check('draws = one spread per hit + coins', r.rngDraws === spreads + coins, `${r.rngDraws} vs ${spreads}+${coins}`); } },
    ],
  },
});
