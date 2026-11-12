// MET-02-C Tempered Guard (steelpaw: Steelpaw / Chromane; Tank). Batch B.
// Contract (Dex): on its own ready normal action, with HP above 50% and no status, replace the attack: self Guarded 25 / 30 / 35 / 40% by
// mastery for the next 2 owner normal turns. While this OWN Guarded episode exists, an enemy direct HP hit cannot exceed 30% of max HP
// per individual hit (a source payload, not another status; a multi-hit attack gets 30% per hit and can still KO; DOT unaffected). An
// equal extension keeps the payload; a stronger OTHER-source Guarded replacement loses the cap. Cooldown 6 owner turns, setup turn
// excluded; reserve pauses. Cannot set up below the threshold or overwrite. The cap is a bound ("cannot exceed"), so it is floored to
// whole HP. Mastery execution: the setup.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const GUARD = [25, 30, 35, 40]; const TURNS = 2; const CAP = 30; const COOLDOWN = 6; const HP_LINE = 50;

export default registerClashAbility({
  family: 'steelpaw', abilityId: 'MET-02-C',
  initBattle: () => ({ capStrength: 0 }),
  values: (form, tier) => ({ guardedPct: byTier(GUARD, tier), turns: TURNS, capPct: CAP, cooldown: COOLDOWN, hpLinePct: HP_LINE }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null; const me = api.me(self);
      if (me.hp * 100 <= HP_LINE * me.maxHp) return null;
      if (me.status) return unmet({ condition: $E('clashlog.no_status'), detail: `${$E('clashlog.ordinary_attack_readiness_kept', { id: me.status.id })}` });
      api.activate(self, `${$E('clashlog.guarded_with_a_per_hit_cap', { byTier: byTier(GUARD, self.tier), cap: CAP })}`); api.cooldown(self, COOLDOWN); api.executed(self); self.state.capStrength = byTier(GUARD, self.tier);
      api.applyStatus(self, self.id, { id: 'guarded', strength: byTier(GUARD, self.tier), duration: TURNS, payload: { pct: byTier(GUARD, self.tier), temperedCap: self.id } });
      return { kind: 'done' };
    },
    mitigate(api, self, info) {
      const me = api.me(self); if (me.status?.id !== 'guarded' || me.status.payload?.temperedCap !== self.id || me.status.originalStrength !== self.state.capStrength) return null; // a stronger other-source replacement loses the cap
      const att = api.get(info.attacker); if (!att || att.side === self.side || info.tag === 'dot') return null;
      return { capHp: Math.floor((me.maxHp * CAP) / 100) };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Guarded with the 30% per-hit cap: a big hit is clamped',
        explain: (c) => `Steelpaw sets up Guarded ${c.values.guardedPct}%; a heavy Striker's next hit cannot take more than 30% of its max HP.`,
        setup: () => ({ a: [{ species: 'steelpaw', overall: 40 }], b: [{ species: 'charbun', overall: 99, status: { id: 'empowered', strength: 200, duration: 9 } }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'MET-02-C')[0]; h.check(`Guarded ${h.values.guardedPct}% for 2 turns`, s && s.slot.strength === h.values.guardedPct && s.slot.remaining === 2); const max = h.line('a0').maxHp; const hits = h.ev('damage', (e) => e.target === 'a0' && e.ex <= 2); h.check('no hit above 30% of max HP while the episode lasts', hits.length && hits.every((e) => e.damage <= Math.floor(max * 0.3))); h.check('at least one hit was capped', hits.some((e) => e.capped)); h.executed(1); } },
      { id: 'low-hp', kind: 'blocked', title: 'At or below 50% HP: no setup (ordinary attack)',
        explain: () => 'Staged at 40% HP: the threshold fails; Steelpaw attacks.',
        setup: () => ({ a: [{ species: 'steelpaw', hp: 20 }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no setup', h.ab('status').length === 0); } },
      { id: 'occupied', kind: 'blocked', title: 'A status already present: no setup, readiness kept',
        explain: () => 'Steelpaw is Slowed (staged): "cannot set up ... or overwrite"; unmet reported.',
        setup: () => ({ a: [{ species: 'steelpaw', status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported(); h.check('no cooldown', !h.has('clock_start', (e) => e.clock === 'MET-02-C')); } },
    ],
  },
});
