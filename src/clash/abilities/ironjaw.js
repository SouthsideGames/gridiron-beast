// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// MET-04-C Iron Bite (ironjaw: Ferronox; Striker). Batch A.
// Contract (Dex, closeout 13 / G08): a ready own normal action replaces the attack when the enemy active has Shielded with a positive
// pool: 120% normal damage with shield multiplier M = 1.5 / 1.75 / 2 / 2.25 by mastery. With D the ordinary mitigated attack budget
// (type / DR applied before the shield-specific multiplier) and S the pool: remove min(S, D*M) shield HP; if S breaks, the HP budget is
// max(0, D - S/M), otherwise zero (no amplified HP overflow; example D100, M2, S100 gives 100 shield and 50 HP). Cooldown 5 owner turns
// fixed, spent at launch even if evaded. No shield: ordinary attack, readiness kept. No status strip.
// AWAITING RULING ('d5-perk'): Ferronox is a Striker and the target is always Shielded, so whether the ordinary-only shield-break x2
// also applies always decides the hit (plan §5c: special, no x2). In normal gameplay Iron Bite reports awaiting ruling and Ferronox
// attacks normally; the reading runs in provisional mode. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { perkTag } from '../t8/flags.js';
import { byTier, unmet, perkGate } from './util.js';

const MULT = [1.5, 1.75, 2, 2.25]; const POWER = 120; const COOLDOWN = 5;
const SHIELD = { id: 'shielded', strength: 60, duration: 5 };

export default registerClashAbility({
  family: 'ironjaw', abilityId: 'MET-04-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ powerPct: POWER, shieldMult: byTier(MULT, tier), cooldown: COOLDOWN }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || !api.ready(self)) return null; const f = api.get(foeId);
      if (f.status?.id !== 'shielded' || !(f.status.payload?.remaining > 0)) return unmet({ condition: 'enemy active Shielded with a positive pool', detail: 'ordinary attack, readiness kept' });
      const g = perkGate(api, self, foeId, perkTag('MET-04-C')); if (!g.ok) return null;
      api.activate(self, `bite at ${POWER}% with shield multiplier ${byTier(MULT, self.tier)}`, { targetId: foeId }); api.cooldown(self, COOLDOWN); api.executed(self);
      return { kind: 'attack', tag: g.tag, mult: POWER / 100, strikeKey: 'bite', label: 'Iron Bite' };
    },
    shieldRule(api, self, info) { return info.abilityId === 'MET-04-C' ? { mult: byTier(MULT, self.tier) } : null; },
  },
  review: {
    scenarios: [
      { id: 'stunned-source', kind: 'blocked', title: 'Stunned caster cannot use Iron Bite',
        explain: () => 'A Stunned normal turn is skipped without spending the ability cooldown.',
        setup: () => ({ a: [{ species: 'ironjaw', status: { id: 'stunned', strength: 1, duration: 1 } }], b: [{ species: 'gravelpup', sparring: true, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no bite during Stunned skip', !h.has('execution', (e) => e.abilityId === 'MET-04-C')); h.check('no cooldown spent', !h.has('clock_start', (e) => e.clock === 'MET-04-C')); } },
      { id: 'no-shield', kind: 'blocked', title: 'No Shielded target: ordinary attack, readiness kept',
        explain: () => 'The opponent has no shield: Iron Bite reports its unmet condition and Ferronox attacks normally.',
        setup: () => ({ a: [{ species: 'ironjaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /Shielded/.test(u.condition))); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); } },
      { id: 'provisional-bite', kind: 'valid', title: 'APPROVED N9c (plan §5c: special, no x2): the G08 shield formula with the mastery multiplier',
        explain: (c) => `Approved reading: the bite is a special (no Striker x2). It removes min(S, D x ${c.values.shieldMult}) shield HP; if the shield breaks, max(0, D - S / ${c.values.shieldMult}) reaches HP. Approved by N9c.`,
        setup: () => ({ a: [{ species: 'ironjaw', overall: 90 }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => {
          h.rulingUsed('d5-perk'); const d = h.ab('damage')[0];
          h.check('the bite used the shield multiplier', d && d.shield?.ironBite && d.shield.breakMult === h.values.shieldMult && d.mult === 1.2);
          const S = 60; const D = d.raw * (d.type === 'strong' ? 1.05 : d.type === 'weak' ? 0.952 : 1) * 0.88;
          h.check('pool loss = min(S, round(D*M))', d.shield.poolLoss === Math.min(S, Math.floor(D * h.values.shieldMult + 0.5)), `${d.shield.poolLoss} vs D=${D.toFixed(2)}`);
          h.check('HP budget = max(0, D - S/M) only when broken', d.shield.broken ? d.damage === Math.floor(Math.max(0, D - S / h.values.shieldMult) + 0.5) : d.damage === 0, `${d.damage}`);
          h.executed(1);
        } },
    ],
  },
});
