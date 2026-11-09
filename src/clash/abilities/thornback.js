// NAT-05-C Shell Harvest (thornback: Thornback; Tank). Batch B.
// Contract (Dex): ONCE, on its first ACTIVE entry, attempt Shielded with a pool of 20 / 22 / 24 / 26% max HP by mastery for THREE subsequent
// own normal turns (application excluded, reserve pauses, Stunned skips count); a gate block spends the attempt; no refresh on re-entry
// or revival. A SUCCESSFUL VOLUNTARY departure consumes the entire remaining ORIGINAL Shell Harvest shield and heals 100% of it, capped at
// missing HP (excess lost). Pre-departure damage (Riptide Pursuit) resolves first (engine order). A replacement from another source is
// ineligible; an equal extension keeps the origin. A forced exit keeps the shield and its duration with no heal; depleted, stripped or
// expired: no heal; a refused or failed swap does not convert; normal Healing Reduced applies.
// A Feather Relay departure: AWAITING RULING ('feather-relay-voluntary'; flags.js). Mastery execution: the entry grant.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { decisionsPlan } from '../t8/review.js';

const POOL = [20, 22, 24, 26]; const TURNS = 3;

export default registerClashAbility({
  family: 'thornback', abilityId: 'NAT-05-C',
  initBattle: () => ({ granted: false, ownPool: 0 }),
  values: (form, tier) => ({ poolPct: byTier(POOL, tier), turns: TURNS }),
  hooks: {
    onEntry(api, self) {
      const st = self.state; if (st.granted) return; st.granted = true;
      api.trigger(self, 'first active entry'); api.executed(self);
      const ok = api.shield(self, self.id, { pctMaxHp: byTier(POOL, self.tier), duration: TURNS });
      if (ok) { st.ownPool = api.me(self).status.originalStrength; api.activate(self, `Shell Harvest shield ${st.ownPool} HP`); } else api.cleanup(self, 'the entry shield was blocked: the attempt is spent');
    },
    cashOut(api, self, { out, reason }) {
      if (out !== self.id) return null; const st = self.state; const me = api.me(self);
      const slot = me.status; const own = slot?.id === 'shielded' && st.ownPool && slot.originalStrength === st.ownPool && slot.payload?.remaining > 0;
      if (!own) return null;
      if (reason === 'relay' && !api.provisional(self, 'feather-relay-voluntary', 'a Feather Relay departure')) return null;
      if (reason !== 'voluntary' && reason !== 'relay') return null;
      const left = slot.payload.remaining;
      api.activate(self, `voluntary departure cashes out ${left} shield HP`);
      api.removeStatus(self, self.id, 'cashed out (Shell Harvest)');
      api.heal(self, self.id, { base: left, kind: 'cash-out' });
      st.ownPool = 0;
      return null;
    },
    statusApplied(api, self, slot) { if (self.state.ownPool && slot.id === 'shielded' && slot.strength !== self.state.ownPool) { self.state.ownPool = 0; api.cleanup(self, 'replaced by another source: no longer eligible'); } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Opening shield; a voluntary rotation out converts the remaining pool to healing',
        explain: (c) => `Thornback opens with a ${c.values.poolPct}% max-HP shield; when its side rotates it out at the first rotation phase the remaining original pool becomes healing, capped at missing HP.`,
        setup: () => ({ a: [{ species: 'thornback', hp: 30 }, { species: 'tidepaw', overall: 90 }], b: [{ species: 'kindlet', overall: 20 }], seed: 1, config: { policies: { a: 'manual', b: 'none' }, decisions: { a: decisionsPlan({ 1: 'a1' }) } }, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.target === 'a0' && e.abilityId === 'NAT-05-C')[0]; h.check(`shield ${h.values.poolPct}% of max HP`, s && s.slot.pool === Math.floor(h.line('a0').maxHp * h.values.poolPct / 100 + 0.5)); const end = h.ev('status_end', (e) => e.target === 'a0' && /cashed out/.test(e.reason))[0]; const heal = h.ev('heal', (e) => e.target === 'a0' && e.abilityId === 'NAT-05-C')[0]; h.check('cash-out on the voluntary departure heals the remaining original pool', end && heal && heal.seq > end.seq && heal.budget > 0); h.executed(1); } },
      { id: 'forced-keeps', kind: 'blocked', title: 'A forced exit keeps the shield, with no heal',
        explain: () => 'CONTROLLED PREREQUISITE (labelled): a reviewer probe forces Thornback out on exchange 2. A forced exit is not voluntary: the shield and its duration stay, no heal.',
        setup: () => ({ a: [{ species: 'thornback' }, { species: 'tidepaw' }], b: [{ species: 'gravelpup', overall: 60 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ chooseAction: (v, id) => (id === 'b0' && v.ex === 2 ? { kind: 'forcedRotation', side: 'foe', abilityId: 'TEST-FORCE' } : null) }] }),
        expect: (r, h) => { h.check('forced out', h.has('rotation', (e) => e.forced && e.out === 'a0')); h.check('no cash-out heal', !h.has('heal', (e) => e.abilityId === 'NAT-05-C')); h.check('shield kept in reserve', h.line('a0').status?.id === 'shielded'); } },
      { id: 'once', kind: 'depletion', title: 'Re-entry grants no second shield',
        explain: () => 'Thornback rotates out and back in: only its first active entry granted a shield.',
        setup: () => ({ a: [{ species: 'thornback' }, { species: 'tidepaw', overall: 90 }], b: [{ species: 'gravelpup', overall: 60 }], seed: 2, config: { policies: { a: 'manual', b: 'none' }, decisions: { a: { 1: 'a1', 5: 'a0', 9: 'stay', 13: 'stay', 17: 'stay', 21: 'stay', 25: 'stay', 29: 'stay' } } }, stopAt: { exchange: 6 } }),
        expect: (r, h) => { h.check('one grant', h.ev('status', (e) => e.abilityId === 'NAT-05-C').length === 1); } },
    ],
  },
});
