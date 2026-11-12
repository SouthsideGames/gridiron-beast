// ELE-02-C Arc Rebound (voltfin: Volcoil / Eelectra; Balanced). Batch D.
// Contract (Dex): while ready, when its own ORDINARY normal attack is evaded by an explicit miss source (a dodge, decoy or applicable miss
// effect; a shield absorbing a connected attack is not a miss), it rebounds once at the first living enemy reserve in stable lineup order
// for 60% (Volcoil) / 75% (Eelectra) of normal attack damage; the new target resolves its own type, reduction, shield and explicit misses,
// and a second miss ends the sequence. No eligible reserve: readiness kept, no stored damage. Cooldown 5 / 4 / 3 / 2 subsequent owner
// normal turns, starting at the rebound's launch even if it misses (Stunned skips count; reserve and reaction events pause). The rebound is
// reaction damage: no retaliation chain, extra turn, charge consumption, attack-counter progress or ordinary-only perks. Mastery execution:
// the rebound.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [60, 75]; const COOLDOWN = [5, 4, 3, 2];
const MISS_ALL = { missCheck: (v, id, info) => (id === 'b0' && info.attacker === 'a0' && info.tag === 'ordinary' ? { miss: true, source: 'controlled reviewer miss' } : null) };

export default registerClashAbility({
  family: 'voltfin', abilityId: 'ELE-02-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ reboundPct: byStage(POWER, Number(form.split(':')[1])), cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    afterWholeAttack(api, self, info) {
      if (info.attackerId !== self.id || info.tag !== 'ordinary' || !info.allMissed || !info.inAction || !api.ready(self)) return;
      const t = api.enemyReserves(self)[0];
      if (!t) { api.cleanup(self, $E('clashlog.no_living_enemy_reserve_readiness_kept')); return; }
      api.trigger(self, $E('clashlog.the_ordinary_attack_was_evaded')); api.activate(self, `${$E('clashlog.rebound_at', { byStage: byStage(POWER, self.stage), name: t.name })}`, { targetId: t.id });
      api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      api.strike(self, t.id, { tag: 'reaction', mult: byStage(POWER, self.stage) / 100, strikeKey: 'rebound', label: $E('clashlog.arc_rebound') });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'An evaded ordinary attack rebounds once at the first enemy reserve',
        explain: (c) => `CONTROLLED PREREQUISITE (labeled): a reviewer probe supplies the explicit miss on the active. Volcoil's attack rebounds at the first reserve for ${c.values.reboundPct}%; the cooldown starts at the rebound.`,
        setup: () => ({ a: [{ species: 'voltfin' }], b: [{ species: 'gravelpup', sparring: true }, { species: 'tinhare' }, { species: 'mudlark' }], seed: 1, stopAt: { exchange: 1 }, probes: [MISS_ALL] }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('rebound on b1 (first reserve), reaction-tagged', d.length === 1 && d[0].target === 'b1' && d[0].tag === 'reaction' && d[0].mult === h.values.reboundPct / 100); h.check(`cooldown ${h.values.cooldown}`, h.ev('clock_start', (e) => e.clock === 'ELE-02-C')[0]?.left === h.values.cooldown); h.executed(1); } },
      { id: 'no-reserve', kind: 'blocked', title: 'No enemy reserve: readiness kept',
        explain: () => 'Against a lone opponent (controlled miss, labeled) there is nothing to rebound into; the cooldown does not start.',
        setup: () => ({ a: [{ species: 'voltfin' }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 }, probes: [MISS_ALL] }),
        expect: (r, h) => { h.check('no rebound, readiness kept', h.ab('damage').length === 0 && !h.has('clock_start', (e) => e.clock === 'ELE-02-C')); } },
      { id: 'shield-not-miss', kind: 'blocked', title: 'A shield-absorbed attack is not a miss: no rebound',
        explain: () => 'The active holds a large staged shield; the attack is absorbed (connected), so nothing rebounds.',
        setup: () => ({ a: [{ species: 'voltfin' }], b: [{ species: 'gravelpup', sparring: true, status: { id: 'shielded', strength: 999, duration: 5 } }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no rebound', h.ab('damage').length === 0); } },
    ],
  },
});
