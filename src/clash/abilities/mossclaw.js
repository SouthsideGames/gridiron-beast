// NAT-02-C Spore Detonation (mossclaw: Mossmaw / Fungorilla; Balanced). Batch A.
// Contract (Dex): an own normal attack when ready and the opposing active has a REMOVABLE harmful status (otherwise the ordinary attack;
// readiness kept; an uncleansable status is not consumed). Snapshot the status and its remaining turns before the attack; the connected
// attack, calculated WITH the existing status, deals +10% per remaining turn (Mossmaw) or +15% (Fungorilla), at most 3 counted turns
// (130% / 145% at 3). After connected damage the entire harmful status is removed BEFORE retaliation (the attacker's attached step).
// Evasion prevents the damage and the removal and still spends readiness. Cooldown 5 / 4 / 3 / 2 subsequent own normal turns (launch turn
// excluded, Stunned skips count, reserve pauses). Fixed per-form conversion; mastery changes the cooldown only. No new status. Mastery
// execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, removableHarmful, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const PER_TURN = [10, 15]; const MAX_TURNS = 3; const COOLDOWN = [5, 4, 3, 2];
const WEAK = { id: 'weakened', strength: 10, duration: 5 };

export default registerClashAbility({
  family: 'mossclaw', abilityId: 'NAT-02-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ perTurnPct: byStage(PER_TURN, Number(form.split(':')[1])), maxTurns: MAX_TURNS, cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || !api.ready(self)) return null; const f = api.get(foeId);
      if (!removableHarmful(f.status)) return f.status ? unmet({ condition: $E('clashlog.removable_harmful_status_on_the_opposing'), detail: `${$E('clashlog.not_consumed', { id: f.status.id, payload: f.status.payload?.uncleansable ? ' (uncleansable)' : '' })}` }) : null;
      const n = Math.min(MAX_TURNS, f.status.remaining); const mult = 1 + (n * byStage(PER_TURN, self.stage)) / 100;
      api.activate(self, `${$E('clashlog.detonate_counted_turns', { id: f.status.id, n, n3: Math.round(mult * 100) })}`, { targetId: foeId, counted: n, status: f.status.id });
      api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      return { kind: 'attack', tag: 'special', mult, strikeKey: 'connected attack', label: $E('clashlog.spore_detonation') };
    },
    attached(api, self, info) {
      if (info.abilityId !== 'NAT-02-C' || info.attacker !== self.id) return null;
      const t = api.get(info.target); if (!t.koed && removableHarmful(t.status)) api.cleanse(self, info.target);
      return null;
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A Weakened target (5 turns, 3 counted): the detonation hits harder and removes the whole status before retaliation',
        explain: (c) => `The opponent is Weakened with 5 turns left (staged): 3 turns count, so the hit deals ${100 + 3 * c.values.perTurnPct}%, and the status is removed right after the damage.`,
        setup: () => ({ a: [{ species: 'mossclaw' }], b: [{ species: 'gravelpup', overall: 99, status: WEAK }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check(`mult ${100 + 3 * h.values.perTurnPct}%`, d && Math.abs(d.mult - (1 + 3 * h.values.perTurnPct / 100)) < 1e-9); const end = h.ev('status_end', (e) => e.target === 'b0' && e.abilityId === 'NAT-02-C')[0]; h.check('status removed in the attached step', end && end.hit === d.hit); h.executed(1); h.stages('activation', 'resolution'); } },
      { id: 'no-status', kind: 'blocked', title: 'No harmful status on the target: ordinary attack, readiness kept',
        explain: () => 'With nothing to detonate, Mossmaw attacks normally and the cooldown does not start.',
        setup: () => ({ a: [{ species: 'mossclaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no detonation', h.ab('damage').length === 0); h.check('no cooldown', !h.has('clock_start', (e) => e.clock === 'NAT-02-C')); } },
      { id: 'uncleansable', kind: 'blocked', title: 'An uncleansable harmful status (Faultline-type) is not consumed: ordinary attack, readiness kept',
        explain: () => 'The target holds an uncleansable Healing Reduced (staged): it is not eligible, the unmet condition is reported.',
        setup: () => ({ a: [{ species: 'mossclaw' }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'healingReduced', strength: 100, duration: 2, payload: { uncleansable: true } } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /removable/.test(u.condition))); h.check('status kept', h.line('b0').status?.id === 'healingReduced'); } },
      { id: 'cooldown', kind: 'depletion', title: 'The cooldown runs the mastery number of own turns before the next detonation',
        explain: (c) => `After a detonation the next one waits ${c.values.cooldown} own normal turns, even with a fresh status on the target.`,
        setup: () => ({ a: [{ species: 'mossclaw' }], b: [{ species: 'gravelpup', overall: 99, status: WEAK }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const k = h.ev('clock_start', (e) => e.clock === 'NAT-02-C')[0]; h.check(`cooldown ${h.values.cooldown}`, k && k.left === h.values.cooldown && k.excluded === true); } },
    ],
  },
});
