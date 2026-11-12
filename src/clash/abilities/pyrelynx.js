// FIR-05-C Heat Mirage (pyrelynx: Flarynx; Tank). Batch D.
// Contract (Dex): an eligible starting-active or later entry creates ONE decoy, even if Flarynx cannot act (an automatic entry effect, not
// an action), but only when ready: the recharge is THREE subsequent owner normal turns after decoy creation (creation turn excluded;
// Stunned skips count; reserve / reactions do not); the opening entry starts ready; no automatic creation merely because the cooldown
// expires while already active. The decoy lasts until a direct attack consumes it or Flarynx leaves the active position. Normal direct
// attacks and delayed offensive attacks trigger ONE diversion roll for the entire attack, all hits included (30 / 35 / 40 / 45% by mastery;
// B12 rows heat-mirage-t0..t3): success diverts the whole attack, failure resolves normally; both consume the decoy. Counters, reaction
// damage and damage over time neither roll nor consume it; explicitly undodgeable attacks bypass it without consuming. Other targets of
// an area attack resolve independently. "Normal direct attacks" is read literally as normal-action attacks (ordinary / special), plus the
// delayed attacks the text names; follow-ups and commanded / assist strikes do not roll. Mastery execution: the decoy creation.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';

const CHANCE = [30, 35, 40, 45]; const COOLDOWN = 3; const ROLLS = new Set(['ordinary', 'special', 'delayed']);

export default registerClashAbility({
  family: 'pyrelynx', abilityId: 'FIR-05-C',
  initBattle: () => ({ decoy: false, rolled: null }),
  values: (form, tier) => ({ diversionPct: byTier(CHANCE, tier), cooldown: COOLDOWN }),
  hooks: {
    onEntry(api, self) {
      if (self.state.decoy || !api.ready(self)) return;
      self.state.decoy = true; api.cooldown(self, COOLDOWN); api.executed(self);
      api.activate(self, `decoy created (${byTier(CHANCE, self.tier)}% diversion)`);
    },
    onDeparture(api, self) { if (self.state.decoy) { self.state.decoy = false; api.cleanup(self, 'the unused decoy ends as Flarynx leaves the active position'); } },
    missCheck(api, self, info) {
      const st = self.state;
      if (st.rolled && st.rolled.seq === info.attackSeq) return st.rolled.miss ? { miss: true, source: 'Heat Mirage decoy', abilityId: 'FIR-05-C' } : null; // one roll per whole attack
      if (!st.decoy || !ROLLS.has(info.tag)) return null;
      st.decoy = false;
      const miss = api.rng.chance(byTier(CHANCE, self.tier) / 100, self, 'Heat Mirage diversion');
      st.rolled = { seq: info.attackSeq, miss };
      if (!miss) api.cleanup(self, 'the decoy is consumed: the attack resolves normally');
      return miss ? { miss: true, source: 'Heat Mirage decoy', abilityId: 'FIR-05-C' } : null;
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Opening decoy; the first attack rolls once and is diverted (controlled seed selection)',
        explain: (c) => `Flarynx opens with a decoy; the opponent's first attack rolls the ${c.values.diversionPct}% diversion; controlled seed selection (labeled) until it diverts. The decoy is consumed either way.`,
        setup: () => ({ a: [{ species: 'pyrelynx', sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'miss' && e.abilityId === 'FIR-05-C'), why: 'the diversion roll succeeds' } }),
        expect: (r, h) => { h.check('decoy on opening entry', h.ab('ability').some((e) => e.ex === 0)); h.check('one roll for the attack', h.ev('roll', (e) => e.abilityId === 'FIR-05-C').length === 1); h.check('diverted: no damage', h.has('miss', (e) => e.abilityId === 'FIR-05-C') && !h.has('damage', (e) => e.target === 'a0')); h.executed(1); } },
      { id: 'roll-fails', kind: 'miss', title: 'The diversion roll fails: the attack resolves normally and the decoy is still consumed',
        explain: () => 'Controlled seed selection (labeled) until the roll fails: the hit lands and the next attack does not roll.',
        setup: () => ({ a: [{ species: 'pyrelynx', overall: 99, sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 2 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'roll' && e.abilityId === 'FIR-05-C' && !e.success), why: 'the diversion roll fails' } }),
        expect: (r, h) => { h.check('one roll only over two attacks', h.ev('roll', (e) => e.abilityId === 'FIR-05-C').length === 1); h.check('both attacks landed', h.ev('damage', (e) => e.target === 'a0').length === 2); } },
      { id: 'reactions-no-roll', kind: 'blocked', title: 'Undodgeable / reaction strikes neither roll nor consume the decoy',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe makes the opponent\'s attack undodgeable: no roll, the decoy stays.',
        setup: () => ({ a: [{ species: 'pyrelynx', overall: 99, sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ chooseAction: (v, id) => (id === 'b0' ? { kind: 'attack', abilityId: 'TEST-UNDODGEABLE', undodgeable: true, mult: 1 } : null) }] }),
        expect: (r, h) => { h.check('no roll (decoy kept)', !h.has('roll', (e) => e.abilityId === 'FIR-05-C') && h.state('a0')?.decoy === true); } },
      { id: 'no-auto-recreate', kind: 'depletion', title: 'The cooldown expiring while active does not create a new decoy',
        explain: () => 'After the opening decoy is consumed, three owner turns pass while Flarynx stays active: no new decoy (only an entry creates one).',
        setup: () => ({ a: [{ species: 'pyrelynx', overall: 99, sparring: true }], b: [{ species: 'kindlet', overall: 30 }], seed: 1, stopAt: { exchange: 6 } }),
        expect: (r, h) => { h.check('exactly one decoy created', h.ab('ability').length === 1); } },
    ],
  },
});
