// DRA-05-C Dragon Roar (vyrnax: Vyrnax; Striker). Batch A.
// Contract (Dex): the first performed normal attack each Clash, even after a later active entry, becomes the enhanced roar at
// 120 / 130 / 140 / 150% by mastery. A connected hit, including shield absorption, guarantees one Weakened 15% application attempt
// through the normal shared gate (no accuracy roll) for 2 recipient normal turns, application turn excluded. Spent on launch even if
// evaded or the status is blocked; rotation / revival do not refresh it. Support actions and Stunned skips preserve the opportunity.
// Ordinary-only Striker bonuses excluded (explicit: special). Mastery execution: the roar's launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [120, 130, 140, 150]; const WEAK = 15; const TURNS = 2;

export default registerClashAbility({
  family: 'vyrnax', abilityId: 'DRA-05-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ powerPct: byTier(POWER, tier), weakenedPct: WEAK, turns: TURNS }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null;
      self.state.used = true; api.trigger(self, $E('clashlog.first_performed_normal_attack_of_the'), { targetId: foeId }); api.executed(self);
      return { kind: 'attack', tag: 'special', mult: byTier(POWER, self.tier) / 100, strikeKey: 'roar', label: $E('clashlog.dragon_roar') };
    },
    attached(api, self, info) {
      if (info.abilityId !== 'DRA-05-C' || info.attacker !== self.id) return null;
      if (api.get(info.target).koed) return null;
      api.activate(self, `${$E('clashlog.connected_weakened_attempt', { weak: WEAK })}`, { targetId: info.target });
      return { kind: 'status', targetId: info.target, id: 'weakened', strength: WEAK, duration: TURNS, abilityId: 'DRA-05-C' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The roar hits at the mastery power and Weakens the target 15% for two of its turns',
        explain: (c) => `Vyrnax's first attack deals ${c.values.powerPct}% and attempts Weakened 15% (2 recipient normal turns).`,
        setup: () => ({ a: [{ species: 'vyrnax' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('one roar', d.length === 1 && d[0].mult === h.values.powerPct / 100); const s = h.ev('status', (e) => e.abilityId === 'DRA-05-C')[0]; h.check('Weakened 15% for 2 turns', s && s.slot.id === 'weakened' && s.slot.strength === 15 && s.slot.remaining === 2); h.check('the target hits for less while Weakened', h.has('damage', (e) => e.actor === 'b0' && e.outgoing === 0.85)); h.stages('trigger', 'activation', 'resolution'); h.executed(1); } },
      { id: 'status-blocked', kind: 'blocked', title: 'The target already has another status: Weakened is blocked, the damage and the spend stand',
        explain: () => 'The target is Quickened (staged): the Weakened attempt is refused by the shared gate; the roar still dealt its damage and is spent.',
        setup: () => ({ a: [{ species: 'vyrnax' }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'quickened', strength: 10, duration: 5 } }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('blocked by the gate', h.has('status_blocked', (e) => e.abilityId === 'DRA-05-C')); h.check('damage dealt', h.ab('damage').length === 1); h.check('spent', h.state('a0')?.used === true); } },
      { id: 'shield-absorbed-connects', kind: 'interaction', title: 'A fully shield-absorbed roar is connected: the Weakened attempt is still made (and blocked by the Shielded slot)',
        explain: () => 'The target is Shielded with a large pool: the roar is absorbed, which counts as connected; the Weakened attempt is made and the gate blocks it because Shielded holds the slot.',
        setup: () => ({ a: [{ species: 'vyrnax' }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'shielded', strength: 999, duration: 5 } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('absorbed', h.ab('damage')[0]?.damage === 0); h.check('attempt made and blocked', h.has('status_blocked', (e) => e.abilityId === 'DRA-05-C')); } },
    ],
  },
});
