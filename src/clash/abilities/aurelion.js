// LIG-06-C Daybreak Lance (aurelion: Aurelion; Striker, legendary). Batch A.
// Contract (Dex): once per Clash on its own ready normal action, replacing the attack: a strike at the Core 160% / Progression
// 145 / 160 / 175 / 190% by mastery (D13, OPEN), standard evasion / shield / DR. It suppresses only ATTACK retaliation caused by this
// strike; passive damage auras and attached status responses still resolve; no skipped enemy turn. Spent on launch even on a miss;
// Stunned preserves. Confused can redirect the whole strike, and the suppression stays part of it.
// AWAITING RULING in normal gameplay: 'd13-values' (which value) and, against a Shielded target, 'd5-perk'. With config.provisional
// 'on' the ladder in T8_FLAGS.d13ValuePrecedence applies ('progression' default; 'core' = 160% at every tier, one switch away).
// Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { perkTag } from '../t8/flags.js';
import { byTier, perkGate } from './util.js';

const LADDER = [145, 160, 175, 190]; const CORE = 160;

export default registerClashAbility({
  family: 'aurelion', abilityId: 'LIG-06-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ progressionPct: byTier(LADDER, tier), corePct: CORE }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null;
      if (!api.provisional(self, 'd13-values', `Core ${CORE}% against Progression ${LADDER.join('/')}%`)) return null;
      const g = perkGate(api, self, foeId, perkTag('LIG-06-C')); if (!g.ok) return null;
      const pctV = api.flags.d13ValuePrecedence.value === 'core' ? CORE : byTier(LADDER, self.tier);
      self.state.used = true; api.activate(self, `lance at ${pctV}%: attack retaliation suppressed`, { targetId: foeId }); api.executed(self);
      return { kind: 'attack', tag: g.tag, mult: pctV / 100, strikeKey: 'lance', label: 'Daybreak Lance', suppressRetaliation: true };
    },
  },
  review: {
    scenarios: [
      { id: 'awaiting-d13', kind: 'blocked', title: 'Normal gameplay: the lance awaits the D13 ruling (Core 160% or the Progression ladder); ordinary attack, use kept',
        explain: () => 'Daybreak Lance\'s damage value is open (D13). In normal gameplay it reports awaiting ruling and Aurelion attacks normally; the once-use is kept.',
        setup: () => ({ a: [{ species: 'aurelion' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.awaiting('d13-values'); h.check('ordinary attacks', h.ev('damage', (e) => e.actor === 'a0').every((e) => e.tag === 'ordinary')); h.check('use kept', h.state('a0')?.used === false); h.check('no execution', h.line('a0').executions === 0); } },
      { id: 'provisional-ladder', kind: 'valid', provisional: true, title: 'PROVISIONAL (Progression ladder): the lance at the mastery value, once',
        explain: (c) => `Provisional reading: the Progression ladder, ${c.values.progressionPct}% at this tier. Not approved; labelled.`,
        setup: () => ({ a: [{ species: 'aurelion' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.provisionalUsed('d13-values'); const d = h.ab('damage'); h.check('one lance at the ladder value', d.length === 1 && d[0].mult === h.values.progressionPct / 100); h.executed(1); } },
      { id: 'provisional-miss-spends', kind: 'miss', provisional: true, title: 'PROVISIONAL: a missed lance is still spent (controlled miss)',
        explain: () => 'CONTROLLED PREREQUISITE (labelled): a reviewer probe supplies an explicit miss. "Once per Clash, spent on launch even miss": no second lance follows. Provisional because the lance never fires in normal gameplay until D13 is ruled.',
        setup: () => ({ a: [{ species: 'aurelion' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ missCheck: (v, id, info) => (id === 'b0' && info.abilityId === 'LIG-06-C' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('the lance missed', h.has('miss', (e) => e.actor === 'a0' && e.ex === 1)); h.check('spent: ordinary attacks afterwards', h.state('a0')?.used === true && h.ev('damage', (e) => e.actor === 'a0').every((e) => e.tag === 'ordinary')); } },
    ],
  },
});
