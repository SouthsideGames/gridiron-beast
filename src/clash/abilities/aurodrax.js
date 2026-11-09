// DRA-06-C Sovereign Balance (aurodrax: Aurodrax; Balanced, legendary). Batch A.
// Contract (Dex): the ready own normal action selects its branch from the source HP at commitment. Above 50% HP: attack at 130 / 140 /
// 150 / 160% by mastery against the current enemy active (special; ordinary-only bonuses excluded). At 50% or below: replace the attack
// with self Guarded 25 / 30 / 35 / 40% for 2 owner normal turns (application turn excluded) if the shared slot is empty; with the slot
// occupied, an ordinary attack and readiness is kept. One shared cooldown of five owner normal turns for either branch (paused in
// reserve); repeatable; a missed enhanced attack still spends. Mastery execution: either branch's use.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet, SPAR } from './util.js';

const ATTACK = [130, 140, 150, 160]; const GUARD = [25, 30, 35, 40]; const COOLDOWN = 5; const TURNS = 2; const HP_LINE = 50;

export default registerClashAbility({
  family: 'aurodrax', abilityId: 'DRA-06-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ attackPct: byTier(ATTACK, tier), guardedPct: byTier(GUARD, tier), cooldown: COOLDOWN, turns: TURNS, hpLinePct: HP_LINE }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!api.ready(self)) return null; const me = api.me(self);
      if (me.hp * 100 > HP_LINE * me.maxHp) {
        if (!foeId) return null;
        api.activate(self, `HighHP branch: attack at ${byTier(ATTACK, self.tier)}%`, { targetId: foeId }); api.cooldown(self, COOLDOWN); api.executed(self);
        return { kind: 'attack', tag: 'special', mult: byTier(ATTACK, self.tier) / 100, strikeKey: 'HighHP attack', label: 'Sovereign Balance' };
      }
      if (me.status) return unmet({ condition: 'empty status slot (LowHP branch)', detail: `${me.status.id}: ordinary attack, readiness kept` });
      api.activate(self, `LowHP branch: self Guarded ${byTier(GUARD, self.tier)}%`); api.cooldown(self, COOLDOWN); api.executed(self);
      api.applyStatus(self, self.id, { id: 'guarded', strength: byTier(GUARD, self.tier), duration: TURNS });
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'high-hp', kind: 'valid', title: 'Above 50% HP: the enhanced attack, then a five-turn shared cooldown',
        explain: (c) => `At full HP Aurodrax attacks at ${c.values.attackPct}%; the shared cooldown then runs five owner normal turns.`,
        setup: () => ({ a: [{ species: 'aurodrax', overall: 40 }], b: SPAR(), seed: 1, stopAt: { exchange: 7 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('enhanced attacks on exchanges 1 and 7', d.map((e) => e.ex).join(',') === '1,7', d.map((e) => e.ex)); h.check(`power ${h.values.attackPct}%`, d[0]?.mult === h.values.attackPct / 100); h.executed(2); } },
      { id: 'low-hp', kind: 'valid', title: 'At or below 50% HP with an empty slot: self Guarded for two owner turns instead of attacking',
        explain: (c) => `Staged at 40% HP: Aurodrax prepares Guarded ${c.values.guardedPct}% on itself (application turn excluded), then the shared cooldown runs.`,
        setup: () => ({ a: [{ species: 'aurodrax', hp: 38 }], b: [{ species: 'gravelpup', overall: 70 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'DRA-06-C')[0]; h.check('Guarded at the mastery value, 2 turns, own turn excluded', s && s.slot.id === 'guarded' && s.slot.strength === h.values.guardedPct && s.slot.remaining === 2 && s.excluded === true); h.check('no attack that turn', !h.has('damage', (e) => e.actor === 'a0' && e.ex === 1)); h.check('incoming damage reduced on exchange 2', h.has('damage', (e) => e.target === 'a0' && e.ex === 2 && e.guarded === 1 - h.values.guardedPct / 100)); } },
      { id: 'low-hp-occupied', kind: 'blocked', title: 'Low HP with an occupied slot: ordinary attack, readiness kept',
        explain: () => 'Staged at 40% HP and Weakened: the LowHP branch needs an empty slot, so Aurodrax attacks normally and the cooldown does not start.',
        setup: () => ({ a: [{ species: 'aurodrax', hp: 38, status: { id: 'weakened', strength: 10, duration: 5 } }], b: [{ species: 'gravelpup', overall: 50 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /empty status slot/.test(u.condition))); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); h.check('no cooldown', !h.has('clock_start', (e) => e.clock === 'DRA-06-C')); } },
    ],
  },
});
