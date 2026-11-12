// EAR-03-C Unbroken Charge (boulderox: Bouldrox; Tank). Batch D.
// Contract (Dex): ACTUALLY losing a normal action to Stunned (merely receiving Stunned is not enough) arms the once-per-Clash charge; the use
// is committed when it first arms. The next PERFORMED normal attack (against the enemy active then) is the charge: 150 / 160 / 170 / 180%
// normal attack by mastery, UNDODGEABLE including decoys; normal type, shield, Guarded, active Tank protection and survival abilities
// apply. It costs that normal action and counts as a performed attack for normal attack counters; no ordinary-only perks (special);
// normal retaliation applies. Further Stunned skips keep it armed; the armed charge survives rotation; a KO destroys it (and revival cannot
// restore it). No stun immunity, cleanse, bonus action or permanent boost; never converted into an immediate reaction. Mastery execution:
// the arming (the committed use).
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [150, 160, 170, 180];
const STUN = { id: 'stunned', strength: 1, duration: 1 };

export default registerClashAbility({
  family: 'boulderox', abilityId: 'EAR-03-C',
  initBattle: () => ({ committed: false, armed: false }),
  values: (form, tier) => ({ chargePct: byTier(POWER, tier) }),
  hooks: {
    stunnedSkip(api, self) {
      const st = self.state; if (st.committed) return;
      st.committed = true; st.armed = true; api.trigger(self, $E('clashlog.a_normal_action_was_lost_to')); api.executed(self);
    },
    chooseAction(api, self, { foeId }) {
      const st = self.state; if (!st.armed || !foeId) return null;
      st.armed = false; api.activate(self, `${$E('clashlog.unbroken_charge_at_undodgeable', { byTier: byTier(POWER, self.tier) })}`, { targetId: foeId });
      return { kind: 'attack', tag: 'special', mult: byTier(POWER, self.tier) / 100, undodgeable: true, strikeKey: 'charge', label: $E('clashlog.unbroken_charge') };
    },
    onKO(api, self) { if (self.state.armed) { self.state.armed = false; api.cleanup(self, $E('clashlog.the_knockout_destroys_the_armed_charge')); } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A Stunned skip arms the charge; the next performed attack is the undodgeable charge',
        explain: (c) => `Bouldrox starts Stunned (staged) and loses exchange 1; on exchange 2 it charges for ${c.values.chargePct}%, undodgeable.`,
        setup: () => ({ a: [{ species: 'boulderox', status: STUN }], b: [{ species: 'pyrelynx', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check('the charge on exchange 2', d && d.ex === 2 && d.mult === h.values.chargePct / 100); h.check('undodgeable: the opposing Heat Mirage decoy did not roll', !h.has('roll', (e) => e.abilityId === 'FIR-05-C' && e.ex === 2)); h.executed(1); h.stages('trigger', 'activation', 'resolution'); } },
      { id: 'not-skipped', kind: 'blocked', title: 'Never actually skipping a turn: nothing arms',
        explain: () => 'Without a Stunned skip the charge never arms; Bouldrox attacks normally.',
        setup: () => ({ a: [{ species: 'boulderox' }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('not armed, no charge', h.state('a0')?.committed === false && h.ab('damage').length === 0); } },
      { id: 'ko-destroys', kind: 'sourceKO', title: 'A knockout destroys an armed charge',
        explain: () => 'Bouldrox (1 HP, Stunned, staged) loses its turn and is knocked out before it can charge.',
        setup: () => ({ a: [{ species: 'boulderox', hp: 1, status: STUN }, { species: 'tidepaw' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('armed, then destroyed at the KO', h.has('cleanup', (e) => e.abilityId === 'EAR-03-C')); } },
    ],
  },
});
