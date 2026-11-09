// ELE-03-C Phase Strike (voltfang: Zappard; Striker). Batch A.
// Contract (Dex): once per Clash, replace a normal attack when the active enemy is Shielded (no eligible target: ordinary attack, use
// kept). Deal 100 / 110 / 120 / 130% normal attack damage directly to HP, bypassing shield absorption ONLY: the pool is neither damaged
// nor stripped. Type, damage reduction, Tank guard, Guarded, hit caps and Last Root still work; damage-triggered retaliation applies;
// shield-break triggers do not. "No ordinary-only Striker shield-break perk on this special" (explicit: special). Normal explicit misses
// apply and a miss spends the use. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';

const POWER = [100, 110, 120, 130];
const SHIELD = { id: 'shielded', strength: 80, duration: 5 };

export default registerClashAbility({
  family: 'voltfang', abilityId: 'ELE-03-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ powerPct: byTier(POWER, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null; const f = api.get(foeId);
      if (f.status?.id !== 'shielded') return unmet({ condition: 'active enemy Shielded', detail: 'ordinary attack, use kept' });
      self.state.used = true; api.activate(self, `phase strike at ${byTier(POWER, self.tier)}% through the shield`, { targetId: foeId }); api.executed(self);
      return { kind: 'attack', tag: 'special', mult: byTier(POWER, self.tier) / 100, strikeKey: 'special', label: 'Phase Strike' };
    },
    shieldRule(api, self, info) { return info.abilityId === 'ELE-03-C' ? { bypass: true } : null; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Through the shield to HP; the pool is untouched',
        explain: (c) => `Zappard's Phase Strike deals ${c.values.powerPct}% straight to HP; the opponent's shield pool stays exactly as it was.`,
        setup: () => ({ a: [{ species: 'voltfang' }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check('HP damage with the shield bypassed', d && d.damage > 0 && d.shield?.bypassed); h.check('pool unchanged (80)', d && d.targetState.status?.pool === 80); h.check('Tank guard still applies', d && d.guard === true); h.executed(1); h.stages('activation', 'resolution'); } },
      { id: 'no-shield', kind: 'blocked', title: 'No shield on the enemy: ordinary attack, use kept',
        explain: () => 'Without a Shielded target Phase Strike reports its unmet condition; Zappard attacks normally and keeps the use.',
        setup: () => ({ a: [{ species: 'voltfang' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported(); h.check('use kept', h.state('a0')?.used === false); } },
      { id: 'once', kind: 'depletion', title: 'Once per Clash: later attacks into the shield are ordinary (Striker break x2)',
        explain: () => 'After the Phase Strike, Zappard\'s ordinary attacks hit the shield with the ordinary Striker break.',
        setup: () => ({ a: [{ species: 'voltfang' }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'shielded', strength: 999, duration: 9 } }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.check('one phase strike', h.ab('damage').length === 1); h.check('later ordinary attacks break x2', h.ev('damage', (e) => e.actor === 'a0' && e.ex > 1).every((e) => e.tag === 'ordinary' && e.shield?.breakMult === 2)); } },
    ],
  },
});
