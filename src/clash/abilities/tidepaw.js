// WAT-01-C Second Tide (tidepaw: Aquip / Aquarrel / Abyssin; Support). Batch C.
// Contract (Dex, owner-approved Task 10 revision 2026-11-13): every second own normal turn on which it is able to act, the support
// effect resolves and the normal attack STILL follows in the same action; it never replaces the attack (the first eligible action attacks only);
// Stunned skips do not build the counter (they still tick status). Target: the living ally, self included, with the largest missing-HP
// percentage; ties: the active ally first, then reserve lineup order; all healthy: the active ally. The healing budget comes from the
// RECIPIENT's max HP and the form x mastery fraction, Healing Reduced applied to the budget FIRST; restore missing HP; 100% of the
// remaining surplus attempts Shielded (three recipient own normal turns, application excluded, reserve pauses, cleared when depleted).
// 100% Healing Reduced: no heal and no surplus shield. The shield goes through the normal gate (a blocked shield loses the surplus; an
// equal Shielded extends without refill; stronger replaces). The support effect deals no damage; the ordinary attack follows it.
// The counter survives rotation and resets per Clash.
// Fractions: Aquip 15/16/17/18%; Aquarrel 18/19/20/21%; Abyssin 21/22/23/24%. Mastery execution: the heal action.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, hpPct } from './util.js';
import { E as $E } from '../../core/english.js';

const FRAC = [[15, 16, 17, 18], [18, 19, 20, 21], [21, 22, 23, 24]]; const SHIELD_TURNS = 3;

export default registerClashAbility({
  family: 'tidepaw', abilityId: 'WAT-01-C',
  initBattle: () => ({ actions: 0 }),
  values: (form, tier) => ({ healPct: byTier(byStage(FRAC, Number(form.split(':')[1])), tier), shieldTurns: SHIELD_TURNS }),
  hooks: {
    chooseAction(api, self) {
      const st = self.state; st.actions += 1; // an eligible own action (chooseAction is asked only when able to act)
      if (st.actions % 2 !== 0) return null; // odd actions attack
      const allies = api.allies(self); const active = allies.find((v) => v.active);
      const order = [active, ...allies.filter((v) => !v.active)].filter(Boolean);
      const missing = (v) => 1 - hpPct(v);
      const t = order.reduce((best, v) => (missing(v) > missing(best) ? v : best), order[0]);
      const pctV = byTier(byStage(FRAC, self.stage), self.tier);
      api.activate(self, `${$E('clashlog.heal_of_its_max_hp_surplus', { name: t.name, pctV })}`, { targetId: t.id }); api.executed(self);
      const r = api.heal(self, t.id, { pctMaxHp: pctV });
      const surplus = r.budget - r.amount;
      if (surplus > 0) api.shield(self, t.id, { pool: surplus, duration: SHIELD_TURNS, noFactors: true });
      else if (r.budget === 0) api.cleanup(self, $E('clashlog.healing_reduced_100_no_heal_and'));
      return null; // Task 10: the normal attack follows the support effect in the same action (engine: a null choice is the ordinary attack)
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Action 1 attacks; action 2 heals the most injured ally (by percentage), turns the surplus into a shield AND attacks',
        explain: (c) => `The reserve is staged at a lower HP percentage: Aquip's second action heals it by ${c.values.healPct}% of its max HP (the part above its missing HP becomes Shielded) and then makes its normal attack in the same action.`,
        setup: () => ({ a: [{ species: 'tidepaw', overall: 40 }, { species: 'lumen', hp: 50 }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('action 1 is an attack', h.has('damage', (e) => e.actor === 'a0' && e.ex === 1)); const hl = h.ev('heal', (e) => e.abilityId === 'WAT-01-C')[0]; h.check('action 2 heals the reserve a1 by the budget', hl && hl.ex === 2 && hl.target === 'a1' && hl.budget === Math.floor(h.line('a1').maxHp * h.values.healPct / 100 + 0.5));
          const atk = h.ev('damage', (e) => e.actor === 'a0' && e.ex === 2 && e.tag === 'ordinary')[0]; h.check('action 2 also makes the normal attack, after the heal', atk && hl && atk.seq > hl.seq); h.executed(1); } },
      { id: 'surplus-shield', kind: 'multiTarget', title: 'All healthy: the active ally is healed 0 and the whole budget becomes its shield',
        explain: () => 'Nobody is injured: the target is the active ally (Aquip itself), the heal restores nothing, and 100% of the budget becomes Shielded for three of its turns.',
        setup: () => ({ a: [{ species: 'tidepaw' }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'WAT-01-C')[0]; const hl = h.ev('heal', (e) => e.abilityId === 'WAT-01-C')[0]; h.check('shield pool = the whole budget, 3 turns', s && hl && s.slot.pool === hl.budget && hl.amount === 0 && s.slot.remaining === 3); h.check('the normal attack still follows', h.has('damage', (e) => e.actor === 'a0' && e.ex === 2 && e.tag === 'ordinary')); } },
      { id: 'healing-reduced-100', kind: 'blocked', title: '100% Healing Reduced on the target: no heal and no surplus shield',
        explain: () => 'Aquip holds a staged 100% Healing Reduced and is the only ally: the budget is cut to 0 first, so nothing is restored and no shield is attempted.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 40, status: { id: 'healingReduced', strength: 100, duration: 5 } }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no heal, no shield', h.ev('heal', (e) => e.abilityId === 'WAT-01-C')[0]?.amount === 0 && !h.has('status', (e) => e.abilityId === 'WAT-01-C')); h.check('the cleanup names it (no surplus)', h.has('cleanup', (e) => e.abilityId === 'WAT-01-C')); } },
    ],
  },
});
