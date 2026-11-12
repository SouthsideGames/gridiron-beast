// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// FIR-06-C Faultline (pyroclast: Pyroclast; Disruptor, legendary). Batch F.
// Contract (Dex): once per Clash, create a fissure instead of the normal attack, marking the lineup position occupied by the normal attack
// target (not the monster). It erupts at the end of the following exchange after rotations on the current occupant: single-target direct
// damage 150 / 160 / 170 / 180% by mastery, then an attempt at Healing Reduced 100% for TWO affected-target turns, UNCLEANSABLE, blocking all
// HP restoration while allowing shields; the shared gate's strength / three-application rules apply; a blocked status does not cancel the
// eruption damage. A shield-absorbed connected hit can attempt it; an explicit miss (dodge / decoy) prevents it. Empty marked slot: no
// damage, no status. The pending attack persists through the source's rotation / KO while the Clash goes on (B3 rule 3: the last pre-KO
// strength). The status follows the hit monster, pauses in reserve, starts its decrement on its next normal turn; target KO clears it;
// entering football clears it (no football effect). No splash; no persistent slot suppression. Approved archetype Disruptor (D5 perks do
// not apply to a delayed strike). The marked-position reading when the launch target is no longer active: AWAITING RULING
// ('delayed-slot'), as for Falling Star. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [150, 160, 170, 180]; const HR_TURNS = 2;

export default registerClashAbility({
  family: 'pyroclast', abilityId: 'FIR-06-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ eruptionPct: byTier(POWER, tier), healingReducedPct: 100, turns: HR_TURNS }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used) return null; if (!foeId) return unmet('opposing active fighter');
      self.state.used = true; api.trigger(self, $E('clashlog.normal_action_with_an_opposing_active'), { targetId: foeId });
      api.delay(self, { targetSide: api.get(foeId).side, targetId: foeId, after: 1 });
      api.activate(self, $E('clashlog.fissure_created_in_place_of_the'), { targetId: foeId }); api.executed(self);
      return { kind: 'done' };
    },
    delayedImpact(api, self, item) {
      const f = item.frozen; let target = f.occupantId;
      if (f.disputed) {
        if (!api.provisional(self, 'delayed-slot', `${$E('clashlog.the_launch_target_is_no_longer', { name: api.get(f.launchTargetId).name })}`)) { api.cleanup(self, $E('clashlog.the_eruption_target_is_disputed_awaiting')); return; }
        target = api.flags.delayedSlot.value === 'active-position' ? f.occupantId : f.launchTargetAlive ? f.launchTargetId : null;
      }
      if (!target) { api.cleanup(self, $E('clashlog.empty_marked_slot_no_damage_no')); return; }
      const exception = api.me(self).koed ? 'FIR-06-C' : undefined;
      const r = api.strike(self, target, { tag: 'delayed', mult: byTier(POWER, self.tier) / 100, strikeKey: 'eruption', label: $E('clashlog.faultline_eruption'), exception, normalAction: false });
      if (r.landed && !api.get(target).koed) api.applyStatus(self, target, { id: 'healingReduced', strength: 100, duration: HR_TURNS, payload: { pct: 100, uncleansable: true } });
      api.cleanup(self, $E('clashlog.the_fissure_resolved'));
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The fissure erupts at the end of the next exchange: the damage, then an uncleansable 100% Healing Reduced',
        explain: (c) => `Pyroclast marks the opposing active; at the end of exchange 2 it erupts for ${c.values.eruptionPct}% and applies Healing Reduced 100% (uncleansable) for two of the target's turns.`,
        setup: () => ({ a: [{ species: 'pyroclast', overall: 40 }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check('eruption at the end of exchange 2', d && d.ex === 2 && d.phase === 'end_of_exchange' && d.mult === h.values.eruptionPct / 100); const s = h.ev('status', (e) => e.abilityId === 'FIR-06-C')[0]; h.check('Healing Reduced 100%, uncleansable, 2 turns', s && s.slot.id === 'healingReduced' && s.slot.strength === 100 && s.slot.remaining === 2 && h.line('b0').status?.payload?.uncleansable); h.executed(1); } },
      { id: 'status-blocked', kind: 'blocked', title: 'The target holds another status: the Healing Reduced is blocked, the eruption damage still lands',
        explain: () => 'The target is Weakened (staged): the gate blocks Healing Reduced; the damage resolves and the use is spent.',
        setup: () => ({ a: [{ species: 'pyroclast', overall: 40 }], b: [{ species: 'gravelpup', overall: 99, sparring: true, status: { id: 'weakened', strength: 10, duration: 9 } }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('damage landed', h.ab('damage').length === 1); h.check('Healing Reduced blocked by the gate', h.has('status_blocked', (e) => e.abilityId === 'FIR-06-C')); } },
      { id: 'disputed-provisional', kind: 'valid', title: 'APPROVED N9c (active-position reading): the new occupant takes the eruption',
        explain: () => 'Approved reading T8_FLAGS.delayedSlot = active position. Approved by N9c.',
        setup: () => ({ a: [{ species: 'pyroclast', overall: 40 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: { 1: 'b1', 5: 'stay', 9: 'stay', 13: 'stay', 17: 'stay', 21: 'stay', 25: 'stay', 29: 'stay' } } }, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.rulingUsed('delayed-slot'); h.check('eruption on b1', h.ab('damage')[0]?.target === 'b1'); } },
    ],
  },
});
