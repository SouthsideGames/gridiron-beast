// PSY-04-C Echo Strike (echolot: Echolot; Balanced). Batch A.
// Contract (Dex): memory = the most recent qualifying individual actual HP damage Echolot took from a direct enemy hit (each hit of a
// multi-hit replaces it; not the maximum or the sum); DOT, self damage and shield-absorbed damage are excluded (transferred shares
// too: not a direct hit). A ready own normal action with a memory makes ONE enhanced normal attack: 100% normal damage plus 35 / 50 / 65 /
// 80% of the stored HP damage by mastery, the bonus capped at 15% of the target's max HP, added to the raw budget BEFORE the target's
// evasion / type / Guarded / shield apply to the combined budget. Memory is consumed on launch even if evaded; cooldown five owner normal
// turns (paused in reserve); new hits update memory during cooldown. No memory or an unable source keeps readiness. Memory survives
// rotation; it clears on knockout and at the Clash end. Balanced: the ordinary-only perk question is moot. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';

const FACTOR = [35, 50, 65, 80]; const CAP = 15; const COOLDOWN = 5;

export default registerClashAbility({
  family: 'echolot', abilityId: 'PSY-04-C',
  initBattle: () => ({ memory: 0, pendingBonus: 0 }),
  values: (form, tier) => ({ factorPct: byTier(FACTOR, tier), capPct: CAP, cooldown: COOLDOWN }),
  hooks: {
    afterWholeAttack(api, self, info) {
      const att = api.get(info.attackerId); if (!att || att.side === self.side || info.tag === 'dot') return;
      let last = null; for (const h of info.hits) { const loss = h.losses?.[self.id] ?? 0; if (loss > 0 && !h.transferred?.includes(self.id)) last = loss; }
      if (last != null) { self.state.memory = last; api.log(self, 'ability_progress', `${self.name}: Echo Strike remembers ${last} HP`, { memory: last, stage: 'trigger' }); }
    },
    chooseAction(api, self, { foeId }) {
      if (!foeId || !api.ready(self) || !self.state.memory) return null;
      const f = api.get(foeId); const bonus = Math.min((self.state.memory * byTier(FACTOR, self.tier)) / 100, (f.maxHp * CAP) / 100);
      api.activate(self, `echo of ${self.state.memory} HP: +${bonus.toFixed(2)} raw (cap ${CAP}% of ${f.name}'s max HP)`, { targetId: foeId, memory: self.state.memory, bonus });
      self.state.pendingBonus = bonus; self.state.memory = 0; api.cooldown(self, COOLDOWN); api.executed(self);
      return { kind: 'attack', tag: 'special', mult: 1, strikeKey: 'enhanced normal attack', label: 'Echo Strike' };
    },
    rawModifiers(api, self, info) { if (info.abilityId !== 'PSY-04-C' || !self.state.pendingBonus) return null; const add = self.state.pendingBonus; self.state.pendingBonus = 0; return { add }; },
    onKO(api, self) { self.state.memory = 0; self.state.pendingBonus = 0; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A remembered hit returns as a bonus on the next ready attack (capped at 15% of the target max HP)',
        explain: (c) => `Echolot remembers the last HP damage it took; its next attack adds ${c.values.factorPct}% of it (capped at 15% of the target's max HP) to the raw budget before the target's defenses.`,
        setup: () => ({ a: [{ species: 'echolot', overall: 60 }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => {
          const act = h.ab('ability').find((e) => e.bonus != null); h.check('activated with a memory', !!act);
          const d = h.ab('damage')[0]; const bmax = h.line('b0').maxHp * 0.15;
          h.check('bonus = min(factor x memory, 15% target max HP)', act && Math.abs(act.bonus - Math.min(act.memory * h.values.factorPct / 100, bmax)) < 1e-9);
          h.check('the enhanced attack carries the added raw budget', d && d.raw > 0 && d.ex === act.ex); h.executed(1);
        } },
      { id: 'no-memory', kind: 'blocked', title: 'Echolot acts first with no memory: ordinary attack, readiness kept',
        explain: () => 'Nothing has hit Echolot yet, so there is no memory: it attacks normally and no cooldown starts.',
        setup: () => ({ a: [{ species: 'echolot', overall: 99 }], b: [{ species: 'gravelpup', overall: 50 }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('no echo without a memory', h.ab('damage').length === 0); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); h.check('no cooldown', !h.has('clock_start', (e) => e.clock === 'PSY-04-C')); } },
      { id: 'shield-absorbed-excluded', kind: 'interaction', title: 'Damage the shield absorbed is not remembered',
        explain: () => 'Echolot is staged Shielded with a large pool: the absorbed hits leave no memory, so no echo fires.',
        setup: () => ({ a: [{ species: 'echolot', status: { id: 'shielded', strength: 999, duration: 9 } }], b: [{ species: 'charbun', overall: 70 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.check('hits were fully absorbed', h.ev('damage', (e) => e.target === 'a0').every((e) => e.damage === 0)); h.check('no memory, no echo', h.state('a0')?.memory === 0 && h.ab('damage').length === 0); } },
    ],
  },
});
