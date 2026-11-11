// DRA-03-C Wing Shelter (sablewing: Sablewing; Balanced). Batch C.
// Contract (Dex): while active, after SURVIVING a complete direct enemy attack that removed at least 20% of its own max HP (actual HP
// summed over a multi-hit; shield absorption, damage over time and self damage excluded), trigger if ready, automatically and even while
// Stunned: after the damage and attached effects finish, restore 4 / 6 / 8 / 10% of its own max HP by mastery (ordinary Healing Reduced and
// max HP). A lethal attack cannot trigger it; no protection before the lethal / attached effects finish. Cooldown three subsequent owner
// normal turns after the reaction, the first decrement on its next owner turn; reserve pauses. Preserves the normal action. Mastery
// execution: the heal.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';

const HEAL = [4, 6, 8, 10]; const LINE = 20; const COOLDOWN = 3;

export default registerClashAbility({
  family: 'sablewing', abilityId: 'DRA-03-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ healPct: byTier(HEAL, tier), thresholdPct: LINE, cooldown: COOLDOWN }),
  hooks: {
    afterWholeAttack(api, self, info) {
      const me = api.me(self); if (me.koed || !me.active || !api.ready(self)) return;
      const att = api.get(info.attackerId); if (!att || att.side === self.side || info.tag === 'dot') return;
      const lost = info.hits.reduce((s, h) => s + (h.transferred?.includes(self.id) ? 0 : h.losses?.[self.id] ?? 0), 0);
      if (lost * 100 < LINE * me.maxHp) return;
      api.trigger(self, `survived an attack that took ${lost} HP (at least ${LINE}%)`); api.executed(self);
      api.activate(self, `restore ${byTier(HEAL, self.tier)}% max HP`);
      api.heal(self, self.id, { pctMaxHp: byTier(HEAL, self.tier) });
      api.cooldown(self, COOLDOWN);
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A hit of at least 20% max HP survived: an automatic heal; normal action kept; cooldown three own turns',
        explain: (c) => `A heavy Striker hits Sablewing for at least 20% of its max HP; it heals ${c.values.healPct}% right after and still takes its own turn.`,
        setup: () => ({ a: [{ species: 'sablewing' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const hl = h.ev('heal', (e) => e.abilityId === 'DRA-03-C')[0]; h.check('heal after the hit', hl && hl.ex === 1); h.check('its own normal action still happens', h.has('damage', (e) => e.actor === 'a0' && e.ex === 1)); h.check('cooldown 3 started outside its turn', h.ev('clock_start', (e) => e.clock === 'DRA-03-C')[0]?.excluded === false); h.executed(1); } },
      { id: 'small-hit', kind: 'blocked', title: 'A hit below 20% max HP: no trigger',
        explain: () => 'A light hitter cannot reach the threshold.',
        setup: () => ({ a: [{ species: 'sablewing', overall: 99 }], b: [{ species: 'kindlet', overall: 20 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no heal (threshold not met)', !h.has('heal', (e) => e.abilityId === 'DRA-03-C')); } },
      { id: 'lethal', kind: 'sourceKO', title: 'A lethal attack cannot trigger it',
        explain: () => 'Staged at 1 HP: the hit knocks Sablewing out, so no recovery.',
        setup: () => ({ a: [{ species: 'sablewing', hp: 1 }, { species: 'tidepaw' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('knocked out, no heal', h.has('ko', (e) => e.target === 'a0') && !h.has('heal', (e) => e.abilityId === 'DRA-03-C')); } },
    ],
  },
});
