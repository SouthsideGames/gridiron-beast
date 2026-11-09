// LIG-05-C Radiant Pursuit (halofang: Haloryx; Striker). Batch A.
// Contract (Dex): own normal attack when the enemy target's HP is below 35% at action commit deals 115 / 125 / 135 / 145% by mastery;
// no auto-KO, healing or extra hit; passive, no cooldown or charge; the intended active enemy only. Normal evasion / shield / Guarded /
// Tank apply; Last Root and guaranteed survival are not bypassed. Perks: "retain normal-attack identity for ordinary archetype perks
// only where global perk policy permits (G06)" -> AWAITING RULING ('d5-perk') when the Striker shield-break is decisive (target
// Shielded). Mastery: a passive conditional attack, one credit per cap scope (spec §6).
import { registerClashAbility } from '../t8/registry.js';
import { perkTag } from '../t8/flags.js';
import { byTier, perkGate } from './util.js';

const POWER = [115, 125, 135, 145]; const THRESHOLD = 35;
const SHIELD = { id: 'shielded', strength: 5, duration: 2 };

export default registerClashAbility({
  family: 'halofang', abilityId: 'LIG-05-C', passive: true,
  initBattle: () => ({}),
  values: (form, tier) => ({ powerPct: byTier(POWER, tier), thresholdPct: THRESHOLD }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId) return null; const f = api.get(foeId);
      if (f.hp * 100 >= THRESHOLD * f.maxHp) return null; // the ordinary attack; nothing to report (a passive condition)
      const g = perkGate(api, self, foeId, perkTag('LIG-05-C')); if (!g.ok) return null;
      api.trigger(self, `${f.name} is below ${THRESHOLD}% HP at commit`, { targetId: foeId });
      api.activate(self, `${byTier(POWER, self.tier)}% conditional attack`, { targetId: foeId }); api.executed(self, { passive: true });
      return { kind: 'attack', tag: g.tag, mult: byTier(POWER, self.tier) / 100, strikeKey: 'conditional attack', label: 'Radiant Pursuit' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The target below 35% HP: the attack deals the mastery multiplier; one passive credit per battle',
        explain: (c) => `The opponent is staged at 30% HP: each of Haloryx's attacks while it stays below 35% deals ${c.values.powerPct}%.`,
        setup: () => ({ a: [{ species: 'halofang' }], b: [{ species: 'gravelpup', overall: 99, hp: 20 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('the boosted attack fires', d.length >= 1 && d[0].mult === h.values.powerPct / 100); h.executed(1); h.stages('trigger', 'resolution'); } },
      { id: 'above-threshold', kind: 'blocked', title: 'Target at or above 35%: an ordinary attack (no condition met)',
        explain: () => 'At full HP the target does not meet the condition: Haloryx attacks normally.',
        setup: () => ({ a: [{ species: 'halofang' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no boosted attack (condition not met)', h.ab('damage').length === 0); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); } },
      { id: 'perk-awaiting', kind: 'blocked', title: 'A Shielded target below 35%: the Striker perk is decisive, awaiting ruling',
        explain: () => 'G06 is unresolved: against a Shielded target, whether the boosted attack keeps the Striker shield-break decides the hit. Normal gameplay reports awaiting ruling and attacks normally.',
        setup: () => ({ a: [{ species: 'halofang' }], b: [{ species: 'gravelpup', overall: 99, hp: 20, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.awaiting('d5-perk'); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); } },
      { id: 'perk-provisional', kind: 'valid', provisional: true, title: 'PROVISIONAL (plan reading: special): the boosted attack without the shield-break',
        explain: () => 'Provisional reading T8_FLAGS.ordinaryPerks[LIG-05-C] = special. Not approved; labelled.',
        setup: () => ({ a: [{ species: 'halofang' }], b: [{ species: 'gravelpup', overall: 99, hp: 20, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.provisionalUsed('d5-perk'); const d = h.ab('damage')[0]; h.check('special, break x1', d && d.tag === 'special' && d.shield?.breakMult === 1); } },
    ],
  },
});
