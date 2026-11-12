// DRA-01-C Dragon Pounce (drakeling: Drakling / Drakyra / Dracolossus; Striker). Batch A.
// Contract (Dex): a ready own normal action may perform an HP-cost enhanced attack when the source is able and can pay the full cost
// (10% of its maximum HP, rounded up: R1 item 18) while keeping at least 1 HP; otherwise the ordinary attack and readiness is kept.
// Damage by form and mastery: Drakling 140/145/150/155%, Drakyra 155/160/165/170%, Dracolossus 170/175/180/185%. Ordinary evasion /
// type / shields / reduction; ordinary-only Striker bonuses excluded (explicit: special). The cost is a resource debit, spent on launch
// even if evaded or absorbed, never reduced by its own Shielded or Guarded. Cooldown: three subsequent owner normal turns, paused in
// reserve. A skipped action preserves HP and readiness. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, unmet, SPAR } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [[140, 145, 150, 155], [155, 160, 165, 170], [170, 175, 180, 185]]; const COST_PCT = 10; const COOLDOWN = 3;

export default registerClashAbility({
  family: 'drakeling', abilityId: 'DRA-01-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ powerPct: byTier(byStage(POWER, Number(form.split(':')[1])), tier), costPct: COST_PCT, cooldown: COOLDOWN }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || !api.ready(self)) return null;
      const me = api.me(self); const cost = Math.ceil((me.maxHp * COST_PCT) / 100);
      if (me.hp - cost < 1) return unmet({ condition: $E('clashlog.full_hp_cost_payable_keeping_1'), detail: `${$E('clashlog.hp_cost', { hp: me.hp, cost })}` });
      const pctV = byTier(byStage(POWER, self.stage), self.tier);
      api.activate(self, `${$E('clashlog.pounce_at_for_hp', { pctV, cost })}`, { targetId: foeId });
      api.hpCost(self, cost); api.cooldown(self, COOLDOWN); api.executed(self);
      return { kind: 'attack', tag: 'special', mult: pctV / 100, strikeKey: 'enhanced attack', label: $E('clashlog.dragon_pounce') };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Pay 10% max HP (rounded up), pounce at the form x mastery power, then three owner turns of cooldown',
        explain: (c) => `The pounce costs 10% of max HP (rounded up) and deals ${c.values.powerPct}%; it is ready again after three owner normal turns.`,
        setup: () => ({ a: [{ species: 'drakeling', overall: 40 }], b: SPAR(), seed: 1, stopAt: { exchange: 5 } }),
        expect: (r, h) => { const cost = h.ab('hp_cost'); const max = h.line('a0').maxHp; h.check('cost = ceil(10% max HP)', cost.length >= 1 && cost[0].amount === Math.ceil(max / 10)); const d = h.ab('damage'); h.check('pounces on exchanges 1 and 5 (three-turn cooldown)', d.map((e) => e.ex).join(',') === '1,5', d.map((e) => e.ex)); h.check(`power ${h.values.powerPct}%`, d[0]?.mult === h.values.powerPct / 100); h.executed(2); } },
      { id: 'cannot-pay', kind: 'blocked', title: 'Cannot pay the full cost and keep 1 HP: ordinary attack, readiness kept',
        explain: () => 'Staged at 3 HP, the cost would leave less than 1 HP: Dragon Pounce reports the unmet condition and an ordinary attack follows; no HP is paid.',
        setup: () => ({ a: [{ species: 'drakeling', hp: 3 }], b: [{ species: 'gravelpup', overall: 50 }], seed: 1, stopAt: { exchange: 1, turn: 2 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /HP cost/.test(u.condition))); h.check('no HP paid', h.ab('hp_cost').length === 0); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); } },
      { id: 'miss-still-pays', kind: 'miss', title: 'An explicit miss still spends the cost and starts the cooldown',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe supplies an explicit miss on the pounce (the outcome of a miss source, not Dragon Pounce\'s own result). The cost is paid and the cooldown runs anyway.',
        setup: () => ({ a: [{ species: 'drakeling' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ missCheck: (v, id, info) => (id === 'b0' && info.abilityId === 'DRA-01-C' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('the pounce missed', h.has('miss', (e) => e.actor === 'a0')); h.check('cost paid', h.ab('hp_cost').length === 1); h.check('cooldown started', h.has('clock_start', (e) => e.actor === 'a0' && e.clock === 'DRA-01-C')); } },
    ],
  },
});
