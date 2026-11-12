// WAT-06-C Riptide Pursuit (tsunarok: Tsunarok; Disruptor, legendary). Batch E.
// Contract (Dex): the opening active entry and EVERY later active entry grant ONE ready pursuit (re-entry replaces an unused one; never
// accumulates). While active and able (Stunned prevents it and keeps the unused opportunity), react to the first OPPOSING VOLUNTARY
// rotation before the target departs: 75 / 85 / 95 / 105% normal attack damage by mastery, UNDODGEABLE; normal type, reduction and shield
// HP apply; it costs no normal action; no additional status. A surviving target completes the rotation; a knockout resolves the ordinary
// replacement. Forced rotations and KO replacements do not trigger it. It triggers no counterattack, retaliation or further chain
// (reaction; an extra strike for Stone Divide). Not a post-KO exception (N7c). A Feather Relay rotation: AWAITING RULING
// ('feather-relay-voluntary'). Mastery execution: the pursuit.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { decisionsPlan } from '../t8/review.js';
import { E as $E } from '../../core/english.js';

const POWER = [75, 85, 95, 105];

export default registerClashAbility({
  family: 'tsunarok', abilityId: 'WAT-06-C',
  initBattle: () => ({ ready: false }),
  values: (form, tier) => ({ pursuitPct: byTier(POWER, tier) }),
  hooks: {
    onEntry(api, self) { self.state.ready = true; },
    onDeparture(api, self) { self.state.ready = false; },
    pursuit(api, self, { side, out, reason }) {
      const st = self.state; const me = api.me(self); if (!st.ready || !me.active || me.koed || side === self.side) return null;
      if (reason === 'relay' && !api.provisional(self, 'feather-relay-voluntary', $E('clashlog.a_feather_relay_rotation'))) return null;
      if (reason !== 'voluntary' && reason !== 'relay') return null;
      if (me.stunned) { api.cleanup(self, $E('clashlog.stunned_the_pursuit_opportunity_is_kept')); return null; }
      st.ready = false; api.trigger(self, `${api.get(out).name} rotates out voluntarily`, { targetId: out }); api.executed(self);
      api.activate(self, `${$E('clashlog.pursuit_at_undodgeable', { byTier: byTier(POWER, self.tier) })}`, { targetId: out });
      api.strike(self, out, { tag: 'reaction', mult: byTier(POWER, self.tier) / 100, undodgeable: true, strikeKey: 'pursuit', label: $E('clashlog.riptide_pursuit') });
      return null;
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The opponent rotates voluntarily: an undodgeable pursuit hits the departing monster first',
        explain: (c) => `The opposing side rotates at exchange 1; Tsunarok hits the departing monster for ${c.values.pursuitPct}% before it leaves; it then completes the rotation.`,
        setup: () => ({ a: [{ species: 'tsunarok', overall: 30 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: decisionsPlan({ 1: 'b1' }) } }, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; const rot = h.ev('rotation', (e) => e.out === 'b0')[0]; h.check('pursuit before the departure', d && rot && d.seq < rot.seq && d.target === 'b0' && d.tag === 'reaction'); h.check(`${h.values.pursuitPct}%`, d?.mult === h.values.pursuitPct / 100); h.executed(1); } },
      { id: 'forced-no-trigger', kind: 'blocked', title: 'A forced rotation does not trigger it',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe forces the opponent out; no pursuit.',
        setup: () => ({ a: [{ species: 'tsunarok', overall: 30 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ chooseAction: (v, id) => (id === 'b0' ? { kind: 'forcedRotation', side: 'own', abilityId: 'TEST-FORCE' } : null) }] }),
        expect: (r, h) => { h.check('no pursuit (forced rotation)', h.ab('damage').length === 0); } },
      { id: 'once-per-entry', kind: 'depletion', title: 'One pursuit per active entry: a second enemy rotation is not punished',
        explain: () => 'The opponent rotates twice (exchanges 1 and 5): only the first is pursued; Tsunarok has not re-entered.',
        setup: () => ({ a: [{ species: 'tsunarok', overall: 30 }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'shielded', strength: 999, duration: 20 } }, { species: 'tinhare', overall: 99, status: { id: 'shielded', strength: 999, duration: 20 } }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: decisionsPlan({ 1: 'b1', 5: 'b0' }) } }, stopAt: { exchange: 5 } }),
        expect: (r, h) => { h.check('one pursuit across two rotations', h.ab('damage').length === 1 && h.ev('rotation', (e) => e.voluntary && e.side === 'b').length === 2); } },
    ],
  },
});
