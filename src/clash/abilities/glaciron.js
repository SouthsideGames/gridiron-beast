// ICE-05-C Glacier Wall (glaciron: Shardok; Tank). Batch B.
// Contract (Dex, spec §10): the first ACTIVE entry, the opening included, attempts Shielded worth 20% max HP for THREE owner normal turns
// (application excluded, reserve pauses); a blocked application spends the entry opportunity. Only the original Glacier Wall shield can
// trigger the rebuild: a stronger other-source replacement removes eligibility; an equal duration extension keeps ownership. After each
// COMPLETE individual enemy direct hit and its attached effects, a surviving Shardok whose original pool was depleted attempts the ONE
// rebuild per Clash: 10 / 12 / 14 / 16% max HP by mastery for two recipient normal turns. It can protect against later strikes of the same
// action, never the triggering hit's overflow, and cannot prevent an already-caused KO. A blocked rebuild is spent; a rebuilt shield
// never rebuilds; no rebuild for expiry or status removal; rotation / revival restore neither. Mastery execution: the entry grant (and the
// rebuild, a separate valid execution).
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const INITIAL = 20; const INITIAL_TURNS = 3; const REBUILD = [10, 12, 14, 16]; const REBUILD_TURNS = 2;

export default registerClashAbility({
  family: 'glaciron', abilityId: 'ICE-05-C',
  initBattle: () => ({ granted: false, ownPool: 0, depleted: false, rebuildUsed: false }),
  values: (form, tier) => ({ initialPct: INITIAL, initialTurns: INITIAL_TURNS, rebuildPct: byTier(REBUILD, tier), rebuildTurns: REBUILD_TURNS }),
  hooks: {
    onEntry(api, self) {
      const st = self.state; if (st.granted) return; st.granted = true;
      api.trigger(self, 'first active entry'); api.executed(self);
      if (api.shield(self, self.id, { pctMaxHp: INITIAL, duration: INITIAL_TURNS })) { st.ownPool = api.me(self).status.originalStrength; api.activate(self, `${$E('clashlog.glacier_wall_hp', { ownPool: st.ownPool })}`); }
      else api.cleanup(self, $E('clashlog.entry_shield_blocked_the_opportunity_is'));
    },
    statusApplied(api, self, slot) { if (self.state.ownPool && slot.id === 'shielded' && slot.strength !== self.state.ownPool) self.state.ownPool = 0; },
    statusEnded(api, self, { id, reason }) {
      const st = self.state; if (id !== 'shielded' || !st.ownPool) return;
      if (reason === 'broken') st.depleted = true; // only a depleted original pool qualifies; expiry / removal do not
      st.ownPool = 0;
    },
    afterWholeHit(api, self, info) {
      const st = self.state; if (!st.depleted || st.rebuildUsed) return;
      if (!info.landed.some((l) => l.id === self.id) || api.get(info.attacker).side === self.side) return;
      st.rebuildUsed = true; st.depleted = false;
      api.trigger(self, $E('clashlog.the_original_pool_was_depleted_by')); api.executed(self);
      if (api.shield(self, self.id, { pctMaxHp: byTier(REBUILD, self.tier), duration: REBUILD_TURNS })) api.activate(self, `${$E('clashlog.rebuilt_hp_once', { originalStrength: api.me(self).status.originalStrength })}`);
      else api.cleanup(self, $E('clashlog.rebuild_blocked_the_opportunity_is_spent'));
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The opening shield breaks under a hit; after that hit Shardok rebuilds once at the mastery size',
        explain: (c) => `Shardok opens with a 20% shield. When an enemy hit depletes it, the overflow lands, then the once-per-Clash rebuild of ${c.values.rebuildPct}% max HP follows.`,
        setup: () => ({ a: [{ species: 'glaciron' }], b: [{ species: 'voltfang', overall: 99 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const br = h.ev('status_end', (e) => e.target === 'a0' && e.reason === 'broken')[0]; const re = h.ev('status', (e) => e.target === 'a0' && e.abilityId === 'ICE-05-C')[1]; h.check('the original pool broke, then the rebuild', br && re && re.seq > br.seq && re.hit === br.hit); h.check(`rebuild ${h.values.rebuildPct}% for 2 turns`, re && re.slot.pool === Math.floor(h.line('a0').maxHp * h.values.rebuildPct / 100 + 0.5) && re.slot.remaining === 2); h.executed(2); } },
      { id: 'expiry-no-rebuild', kind: 'blocked', title: 'The original shield expires unbroken: no rebuild',
        explain: () => 'Against a sparring partner (labeled) nothing breaks the pool; it expires after three owner turns and no rebuild follows.',
        setup: () => ({ a: [{ species: 'glaciron', overall: 30 }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 5 } }),
        expect: (r, h) => { h.check('expired, not broken', h.has('status_end', (e) => e.target === 'a0' && e.reason === 'expired')); h.check('no rebuild', h.ev('status', (e) => e.abilityId === 'ICE-05-C').length === 1); } },
      { id: 'once', kind: 'depletion', title: 'The rebuilt shield never rebuilds again',
        explain: () => 'Against heavy hitting both the original and the rebuilt pool break; only one rebuild happens.',
        setup: () => ({ a: [{ species: 'glaciron', overall: 99 }, { species: 'tidepaw' }], b: [{ species: 'voltfang', overall: 99 }, { species: 'charbun', overall: 99 }], seed: 2, stopAt: { exchange: 8 } }),
        expect: (r, h) => { h.check('at most one rebuild', h.ev('status', (e) => e.target === 'a0' && e.abilityId === 'ICE-05-C').length <= 2); } },
    ],
  },
});
