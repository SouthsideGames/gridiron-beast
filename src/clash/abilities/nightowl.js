// DAR-02-C Night Swoop (nightowl: Noctlet / Strixen; Striker). Batch A.
// Contract (Dex): the first performed normal attack of each Clash resolves before opponents scheduled in the same round (the
// priority tier: interrupts first, then priority attacks in ordinary initiative / tie order) at 110 / 120% normal damage by form,
// +0 / 5 / 10 / 15 points by mastery. Still evadable; Stunned before scheduling skips it and preserves the opportunity, as does a
// support action. Spent on the performed attack even if it misses; no reset on rotation or revival. Does not beat an explicit
// higher-priority interrupt. Perk applicability is silent in the contract: when the Striker shield-break would change the hit (the
// target is Shielded) the swoop is AWAITING RULING ('d5-perk') in normal gameplay: no priority, an ordinary attack, opportunity kept.
import { registerClashAbility } from '../t8/registry.js';
import { perkTag } from '../t8/flags.js';
import { byTier, byStage, able, perkGate } from './util.js';

const POWER = [110, 120], MASTERY = [0, 5, 10, 15];
const SHIELD = { id: 'shielded', strength: 999, duration: 2 };

export default registerClashAbility({
  family: 'nightowl', abilityId: 'DAR-02-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ formPowerPct: byStage(POWER, Number(form.split(':')[1])), masteryBonusPts: byTier(MASTERY, tier) }),
  hooks: {
    initiative(api, self) {
      if (self.state.used) return null; const me = api.me(self); if (!able(me)) return null;
      const foe = api.foe(self); if (foe && api.perkDecisive(self, foe.id) && !api.provisionalMode()) return null; // reported at the action
      return { priority: 1 };
    },
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null;
      const g = perkGate(api, self, foeId, perkTag('DAR-02-C')); if (!g.ok) return null;
      self.state.used = true;
      const mult = (byStage(POWER, self.stage) + byTier(MASTERY, self.tier)) / 100;
      api.trigger(self, 'first performed normal attack of the Clash', { targetId: foeId });
      api.activate(self, `swoop at ${Math.round(mult * 100)}%, scheduled before the opponent`, { targetId: foeId });
      api.executed(self);
      return { kind: 'attack', tag: g.tag, mult, strikeKey: 'first normal attack', label: 'Night Swoop' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A slower Noctlet acts first on exchange 1 at the boosted power; from exchange 2 ordinary speed decides',
        explain: (c) => `Noctlet's first normal attack is scheduled in the priority tier, before the (faster) opponent, and deals ${(c.values.formPowerPct + c.values.masteryBonusPts)}% of a normal attack. The opportunity is spent; later exchanges use ordinary speed.`,
        setup: () => ({ a: [{ species: 'nightowl', overall: 60 }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => {
          const i1 = h.ev('initiative', (e) => e.ex === 1)[0]; h.check('priority tier on exchange 1', i1 && i1.by === 'priority' && i1.actor === 'a0');
          const d = h.ab('damage', (e) => e.ex === 1)[0]; h.check(`${(h.values.formPowerPct + h.values.masteryBonusPts)}% power`, d && d.mult === (h.values.formPowerPct + h.values.masteryBonusPts) / 100);
          h.check('later exchanges: no priority', h.ev('initiative', (e) => e.ex > 1).every((e) => e.by !== 'priority'));
          h.stages('trigger', 'activation', 'resolution'); h.executed(1);
        } },
      { id: 'stunned-preserves', kind: 'blocked', title: 'Stunned before scheduling: the skip preserves the first-attack opportunity',
        explain: () => 'Noctlet starts Stunned: it skips exchange 1 without spending Night Swoop; on its protected next turn (D4) the first performed attack is the swoop.',
        setup: () => ({ a: [{ species: 'nightowl', overall: 60, status: { id: 'stunned', strength: 1, duration: 1 } }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('skipped exchange 1', h.has('skip', (e) => e.actor === 'a0' && e.ex === 1)); h.check('no priority while Stunned', h.ev('initiative', (e) => e.ex === 1)[0].by !== 'priority'); const d = h.ab('damage')[0]; h.check('the swoop fires on exchange 2', d && d.ex === 2); h.check('priority on exchange 2', h.ev('initiative', (e) => e.ex === 2)[0].by === 'priority'); } },
      { id: 'spent-once', kind: 'depletion', title: 'One use per Clash: every later attack is ordinary',
        explain: () => 'After the swoop, every attack is an ordinary attack at ordinary speed.',
        setup: () => ({ a: [{ species: 'nightowl' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 2, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('exactly one swoop', h.ab('damage').length === 1); h.check('ordinary afterwards', h.ev('damage', (e) => e.actor === 'a0' && e.ex > 1).every((e) => e.tag === 'ordinary')); } },
      { id: 'perk-awaiting', kind: 'blocked', title: 'Against a Shielded target the Striker perk would decide the hit: awaiting ruling, ordinary attack, opportunity kept',
        explain: () => 'The opponent is Shielded, so whether the swoop keeps the ordinary-only Striker shield-break is decisive. In normal gameplay that awaits a ruling: no priority, an ordinary attack, and the first-attack opportunity is kept.',
        setup: () => ({ a: [{ species: 'nightowl', overall: 60 }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.awaiting('d5-perk'); h.check('no priority', h.ev('initiative', (e) => e.ex === 1)[0].by !== 'priority'); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); h.check('opportunity kept', h.state('a0')?.used === false); } },
      { id: 'perk-provisional', kind: 'valid', provisional: true, title: 'PROVISIONAL (plan reading: special, no shield-break): the swoop fires against the Shielded target',
        explain: () => 'Provisional reading T8_FLAGS.ordinaryPerks[DAR-02-C] = special: the swoop gets priority and its power but no Striker shield-break. Not approved; labelled.',
        setup: () => ({ a: [{ species: 'nightowl', overall: 60 }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.provisionalUsed('d5-perk'); const d = h.ab('damage')[0]; h.check('swoop as a special: break x1', d && d.tag === 'special' && d.shield?.breakMult === 1); } },
    ],
  },
});
