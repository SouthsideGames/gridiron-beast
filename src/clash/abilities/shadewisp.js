// PSY-02-C Mirage Veil (shadewisp: Wispira / Mirageist; Tank). Batch B.
// Contract (Dex): while active and ready, two completed enemy direct normal attacks from the SAME attacker that damage Wispira's HP
// (each whole attack counted once, multi-hit included) trigger, after the whole second attack and its attached effects resolve, an
// attempt at self Guarded 25 / 30 / 35 / 40% by mastery for 2 owner normal turns (application turn excluded; the normal shared gate).
// A different attacker's HP hit starts the count at 1 for that attacker; a miss or shield-only attack neither counts nor resets; the
// enemy attacker's departure resets the progress. It must survive and remain able: an unable source keeps readiness, discards the
// trigger and queues nothing. Cooldown five subsequent owner normal turns, paused in reserve, with no charging during cooldown; a
// qualifying attempt spends readiness even if the status is blocked. No new pool, decoy or retaliation. Mastery execution: the attempt.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, isNormal, able } from './util.js';

const GUARD = [25, 30, 35, 40]; const TURNS = 2; const COOLDOWN = 5; const NEEDED = 2;

export default registerClashAbility({
  family: 'shadewisp', abilityId: 'PSY-02-C',
  initBattle: () => ({ attackerId: null, count: 0 }),
  values: (form, tier) => ({ guardedPct: byTier(GUARD, tier), turns: TURNS, cooldown: COOLDOWN, needed: NEEDED }),
  hooks: {
    afterWholeAttack(api, self, info) {
      const me = api.me(self); if (!me.active || me.koed || !api.ready(self)) return;
      const att = api.get(info.attackerId); if (!att || att.side === self.side || !isNormal(info.tag)) return;
      const hp = info.hits.reduce((s, h) => s + (h.losses?.[self.id] ?? 0), 0); if (hp <= 0) return; // miss / shield-only: no count, no reset
      const st = self.state;
      if (st.attackerId !== info.attackerId) { st.attackerId = info.attackerId; st.count = 1; } else st.count += 1;
      api.log(self, 'ability_progress', `${self.name}: Mirage Veil ${st.count} / ${NEEDED} (${att.name})`, { count: st.count, stage: 'trigger' });
      if (st.count < NEEDED) return;
      st.count = 0; st.attackerId = null;
      if (!able(me)) { api.cleanup(self, 'source unable: the trigger is discarded, readiness kept'); return; }
      api.activate(self, `veil: Guarded ${byTier(GUARD, self.tier)}%`); api.cooldown(self, COOLDOWN); api.executed(self);
      api.applyStatus(self, self.id, { id: 'guarded', strength: byTier(GUARD, self.tier), duration: TURNS });
    },
    anyDeparture(api, self, { id }) { if (self.state.attackerId === id) { self.state.attackerId = null; self.state.count = 0; } },
    anyKO(api, self, { id }) { if (self.state.attackerId === id) { self.state.attackerId = null; self.state.count = 0; } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Two HP-damaging attacks from the same attacker: Guarded after the second, for two owner turns',
        explain: (c) => `After the second attack from the same opponent resolves, Wispira attempts Guarded ${c.values.guardedPct}%; it protects from the next attack on.`,
        setup: () => ({ a: [{ species: 'shadewisp', overall: 30 }], b: [{ species: 'charbun', overall: 60 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'PSY-02-C')[0]; h.check('Guarded after the second hit', s && s.ex === 2 && s.slot.strength === h.values.guardedPct && s.slot.remaining === 2); h.check('the second hit itself was not reduced', h.ev('damage', (e) => e.target === 'a0' && e.ex === 2)[0]?.guarded == null); h.check('exchange 3 hit is reduced', h.has('damage', (e) => e.target === 'a0' && e.ex === 3 && e.guarded === 1 - h.values.guardedPct / 100)); h.executed(1); } },
      { id: 'shield-only', kind: 'blocked', title: 'Shield-only hits neither count nor reset: no veil',
        explain: () => 'Wispira holds a large staged shield: the hits never reach HP, so the count stays at zero.',
        setup: () => ({ a: [{ species: 'shadewisp', status: { id: 'shielded', strength: 999, duration: 9 } }], b: [{ species: 'charbun', overall: 60 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.check('no veil, no count', h.ev('status', (e) => e.abilityId === 'PSY-02-C').length === 0 && h.state('a0')?.count === 0); } },
      { id: 'cooldown', kind: 'depletion', title: 'No charging during the five-turn cooldown',
        explain: () => 'After the first veil, further hits from the same attacker during the cooldown do not count.',
        setup: () => ({ a: [{ species: 'shadewisp', overall: 99 }], b: [{ species: 'kindlet', overall: 30 }], seed: 1, stopAt: { exchange: 6 } }),
        expect: (r, h) => { h.check('one veil in six exchanges', h.ev('status', (e) => e.abilityId === 'PSY-02-C').length === 1); } },
    ],
  },
});
