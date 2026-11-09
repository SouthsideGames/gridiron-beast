// LIG-03-C Clear Light (lumen: Lumen; Support). Batch C.
// Contract (Dex): a ready own normal action replaces the attack when ANOTHER living ally has a removable harmful status: the lowest
// HP-percentage eligible ally, reserves included, never self (an uncleansable status cannot be selected). Remove the harmful status
// first, then heal (atomic cleanse-before-heal: an ordinary Healing Reduced is removed so the heal works); if the status cannot be
// removed, no cast and no generic heal fallback. A Stunned source cannot cast; a successful cleanse spends it even if the heal is capped.
// No revive. Heal: Core 10% max HP against Progression 8 / 10 / 12 / 14% by mastery (D13, OPEN); "cooldown 5 turns fixed" names no unit.
// AWAITING RULING in normal gameplay: 'clear-light-cooldown-unit' at every tier (the recharge cannot be counted without it) and
// 'd13-values' at Developing / Expert / Mastered. Provisional mode: owner normal turns and the Progression ladder (T8_FLAGS).
import { registerClashAbility } from '../t8/registry.js';
import { byTier, removableHarmful, lowestHpPct } from './util.js';

const LADDER = [8, 10, 12, 14]; const CORE = 10; const COOLDOWN = 5;

export default registerClashAbility({
  family: 'lumen', abilityId: 'LIG-03-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ progressionHealPct: byTier(LADDER, tier), coreHealPct: CORE, cooldown: COOLDOWN }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null;
      const t = lowestHpPct(api.allies(self).filter((v) => v.id !== self.id && removableHarmful(v.status))); if (!t) return null;
      if (!api.provisional(self, 'clear-light-cooldown-unit', '"cooldown 5 turns fixed": whose turns?')) return null;
      const ladder = byTier(LADDER, self.tier); let pctV = ladder;
      if (ladder !== CORE) { if (!api.provisional(self, 'd13-values', `Core ${CORE}% against Progression ${ladder}%`)) return null; pctV = api.flags.d13ValuePrecedence.value === 'core' ? CORE : ladder; }
      api.activate(self, `cleanse ${t.name}'s ${t.status.id}, then heal ${pctV}%`, { targetId: t.id });
      if (!api.cleanse(self, t.id)) return null;
      api.cooldown(self, COOLDOWN); api.executed(self);
      api.heal(self, t.id, { pctMaxHp: pctV });
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'awaiting', kind: 'blocked', title: 'Normal gameplay: Clear Light awaits its rulings (cooldown unit; D13 at three tiers); ordinary attack',
        explain: () => 'An ally holds a removable harmful status, but Clear Light\'s recharge unit is unstated (and its heal value is open at three tiers): awaiting ruling is reported and Lumen attacks.',
        setup: () => ({ a: [{ species: 'lumen' }, { species: 'tidepaw', hp: 30, status: { id: 'weakened', strength: 10, duration: 4 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.awaiting('clear-light-cooldown-unit'); h.check('status kept, ordinary attack', h.line('a1').status?.id === 'weakened' && h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'provisional-cast', kind: 'valid', provisional: true, title: 'PROVISIONAL: cleanse first, then heal (ladder value); cooldown in owner turns',
        explain: (c) => `Provisional readings: owner-turn cooldown and the Progression heal (${c.values.progressionHealPct}%). The ally's Weakened is removed, then it is healed. Not approved; labelled.`,
        setup: () => ({ a: [{ species: 'lumen' }, { species: 'tidepaw', hp: 30, status: { id: 'weakened', strength: 10, duration: 4 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.provisionalUsed('clear-light-cooldown-unit'); const end = h.ev('status_end', (e) => e.target === 'a1' && e.abilityId === 'LIG-03-C')[0]; const hl = h.ev('heal', (e) => e.abilityId === 'LIG-03-C')[0]; h.check('cleanse before heal', end && hl && end.seq < hl.seq); h.check('heal at the ladder value', hl && Math.abs(hl.exact - h.line('a1').maxHp * h.values.progressionHealPct / 100) < 1e-9); } },
      { id: 'uncleansable', kind: 'blocked', title: 'Only an uncleansable status: not selectable, no cast',
        explain: () => 'The ally\'s staged Healing Reduced is uncleansable (Faultline-type): it cannot be selected, so there is no cast and no heal fallback.',
        setup: () => ({ a: [{ species: 'lumen' }, { species: 'tidepaw', hp: 30, status: { id: 'healingReduced', strength: 100, duration: 4, payload: { uncleansable: true } } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no cast, no heal fallback', !h.has('heal', (e) => e.abilityId === 'LIG-03-C') && !h.has('unmet', (e) => e.abilityId === 'LIG-03-C')); } },
    ],
  },
});
