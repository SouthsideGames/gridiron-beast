// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// ELE-04-C Circuit Breaker (stormlynx: Statyx; Disruptor). Batch F.
// Contract (Dex, owner 2B): once per Clash, automatically replace the normal attack when the active opponent has an ability currently
// recharging (a running cooldown; otherwise attack normally and keep the use). Deal 100 / 110 / 120 / 130% normal attack damage by mastery;
// a connected hit (shield absorption counts) adds TWO of the target's own normal turns to the running cooldown with the LEAST time
// remaining (not limited to its signature; ties by the stable clock ordering), which then continues its ordinary schedule (no grace round).
// Normal explicit misses; a miss spends the use without delay. It never restores spent once-per-battle uses, removes charges or disables
// passives; no status slot; no instant action. The extension is fixed; mastery scales the damage only. Perks: silent -> AWAITING RULING
// ('d5-perk') when Disruptor pierce is decisive (the target is an active Tank). Mastery execution: the strike.
import { registerClashAbility } from '../t8/registry.js';
import { perkTag } from '../t8/flags.js';
import { byTier, perkGate } from './util.js';

const POWER = [100, 110, 120, 130]; const EXTEND = 2;

export default registerClashAbility({
  family: 'stormlynx', abilityId: 'ELE-04-C',
  initBattle: () => ({ used: false, pending: false }),
  values: (form, tier) => ({ powerPct: byTier(POWER, tier), extension: EXTEND }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null;
      if (!api.cooldownsOf(foeId).length) return null;
      const g = perkGate(api, self, foeId, perkTag('ELE-04-C')); if (!g.ok) return null;
      self.state.used = true; self.state.pending = true; api.activate(self, `circuit breaker at ${byTier(POWER, self.tier)}%`, { targetId: foeId }); api.executed(self);
      return { kind: 'attack', tag: g.tag, mult: byTier(POWER, self.tier) / 100, strikeKey: 'attack', label: 'Circuit Breaker' };
    },
    attached(api, self, info) {
      if (info.attacker !== self.id || info.strikeKey !== 'attack' || !self.state.pending) return null; self.state.pending = false;
      const ks = api.cooldownsOf(info.target).sort((p, q) => p.left - q.left || p.id.localeCompare(q.id));
      if (!ks.length || api.get(info.target).koed) return null;
      api.adjustCooldown(self, info.target, ks[0].id, +EXTEND);
      return null;
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The opponent\'s running cooldown is extended by two of its own turns on a connected hit',
        explain: (c) => `The opponent Drakling pounced on exchange 1 (a real cooldown). Statyx's Circuit Breaker hits it for ${c.values.powerPct}% and adds two turns to that cooldown.`,
        setup: () => ({ a: [{ species: 'stormlynx', overall: 30 }], b: [{ species: 'drakeling', overall: 40 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const adj = h.ev('clock_adjust', (e) => e.abilityId === 'ELE-04-C')[0]; h.check('Dragon Pounce cooldown +2', adj && adj.clock === 'DRA-01-C' && adj.after - adj.before === 2); h.check(`${h.values.powerPct}% strike`, (h.ab('damage')[0]?.mult ?? 1) === h.values.powerPct / 100); h.executed(1); } },
      { id: 'nothing-recharging', kind: 'blocked', title: 'No running cooldown on the opponent: ordinary attack, the use is kept',
        explain: () => 'Nothing to extend.',
        setup: () => ({ a: [{ species: 'stormlynx' }], b: [{ species: 'kindlet' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no strike (use kept)', h.state('a0')?.used === false && h.ab('damage').length === 0); } },
      { id: 'perk-provisional', kind: 'valid', title: 'APPROVED N9c (plan reading: special, no pierce): the strike against the Tank extends its cooldown',
        explain: () => 'Approved reading T8_FLAGS.ordinaryPerks[ELE-04-C] = special. Approved by N9c.',
        setup: () => ({ a: [{ species: 'stormlynx' }], b: [{ species: 'steelpaw' }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.rulingUsed('d5-perk'); const d = h.ab('damage')[0]; h.check('special, no pierce', d && d.tag === 'special' && d.pierce === false); h.check('cooldown extended', h.has('clock_adjust', (e) => e.abilityId === 'ELE-04-C')); } },
    ],
  },
});
