// LIG-01-C Glow Mend (glimmer: Lumini / Photara; Support). Batch C.
// Contract (Dex): a ready own normal action replaces the attack if at least two living allies are injured (fewer: the ordinary attack,
// readiness kept). The two lowest HP-percentage living allies, reserves and self included (stable tie order; two distinct recipients
// chosen before resolving; no retarget after the first heal) are each healed 7 / 10% of Glow Mend's OWN max HP by form (normal max-HP cap
// and Healing Reduced; no revive, surplus shield, cleanse or equalization). Spent even if Healing Reduced blocks all healing. Cooldown
// 6 / 5 / 4 / 3 owner turns by mastery. Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, hpPct, injured } from './util.js';

const HEAL = [7, 10]; const COOLDOWN = [6, 5, 4, 3];

export default registerClashAbility({
  family: 'glimmer', abilityId: 'LIG-01-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ healPctOwnMax: byStage(HEAL, Number(form.split(':')[1])), cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null;
      const hurt = api.allies(self).filter(injured); if (hurt.length < 2) return null;
      const two = [...hurt].sort((p, q) => hpPct(p) - hpPct(q)).slice(0, 2); // stable: allies are in lineup order
      const base = (api.me(self).maxHp * byStage(HEAL, self.stage)) / 100;
      api.activate(self, `heal ${two.map((v) => v.name).join(' and ')}`); api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      for (const v of two) api.heal(self, v.id, { base });
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Two injured allies: each is healed by the form share of Lumini\'s own max HP',
        explain: (c) => `Two allies are staged injured: each gets ${c.values.healPctOwnMax}% of Lumini's max HP (capped at its missing HP).`,
        setup: () => ({ a: [{ species: 'glimmer' }, { species: 'tidepaw', hp: 20 }, { species: 'lumen', hp: 25 }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const hs = h.ev('heal', (e) => e.abilityId === 'LIG-01-C'); h.check('two distinct recipients, the two lowest', hs.length === 2 && new Set(hs.map((e) => e.target)).size === 2 && hs.every((e) => ['a1', 'a2'].includes(e.target))); const base = h.line('a0').maxHp * h.values.healPctOwnMax / 100; h.check('budget from the caster\'s max HP', hs.every((e) => Math.abs(e.exact - base) < 1e-9)); h.executed(1); } },
      { id: 'one-injured', kind: 'blocked', title: 'Only one injured ally: ordinary attack, readiness kept',
        explain: () => 'It cannot heal the same ally twice: with one injured ally, no cast.',
        setup: () => ({ a: [{ species: 'glimmer' }, { species: 'tidepaw', hp: 20 }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('no cast (readiness kept)', !h.has('heal', (e) => e.abilityId === 'LIG-01-C') && !h.has('clock_start', (e) => e.clock === 'LIG-01-C')); } },
      { id: 'blocked-spends', kind: 'interaction', title: 'Healing Reduced 100% on both: the cast is spent anyway',
        explain: () => 'Both recipients hold a staged 100% Healing Reduced: nothing is restored, but the cooldown runs.',
        setup: () => ({ a: [{ species: 'glimmer' }, { species: 'tidepaw', hp: 20, status: { id: 'healingReduced', strength: 100, duration: 5 } }, { species: 'lumen', hp: 25, status: { id: 'healingReduced', strength: 100, duration: 5 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('nothing restored', h.ev('heal', (e) => e.abilityId === 'LIG-01-C').every((e) => e.amount === 0)); h.check('cooldown started', h.has('clock_start', (e) => e.clock === 'LIG-01-C')); } },
    ],
  },
});
