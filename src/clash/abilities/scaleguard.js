// DRA-04-C Dragonhide (scaleguard: Scalor; Balanced). Batch B.
// Contract (Dex): the first active entry, once per Clash, attempts its own Guarded 20 / 25 / 30 / 35% by mastery for 2 owner normal turns
// (application turn excluded); an existing different status blocks and spends the entry opportunity. Only that original Dragonhide
// episode is eligible: on its own normal action in the FINAL remaining protected turn it consumes the protection for an enhanced attack
// on the current active enemy at 100% + the full Guarded percentage (120 / 125 / 130 / 135%); ordinary evasion / type / shields /
// reduction; ordinary-only bonuses excluded (special). Consumed protection stays spent even if evaded. Removal or replacement loses the
// conversion; if the Guarded expires, nothing is queued; an unable conversion turn follows the normal skip and decrement. At most one
// application and one conversion per Clash. Mastery execution: the entry attempt and the conversion.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const GUARD = [20, 25, 30, 35]; const TURNS = 2;

export default registerClashAbility({
  family: 'scaleguard', abilityId: 'DRA-04-C',
  initBattle: () => ({ entered: false, ownStrength: 0, converted: false }),
  values: (form, tier) => ({ guardedPct: byTier(GUARD, tier), turns: TURNS, attackPct: 100 + byTier(GUARD, tier) }),
  hooks: {
    onEntry(api, self) {
      const st = self.state; if (st.entered) return; st.entered = true;
      api.trigger(self, 'first active entry'); api.executed(self);
      const r = api.applyStatus(self, self.id, { id: 'guarded', strength: byTier(GUARD, self.tier), duration: TURNS, payload: { pct: byTier(GUARD, self.tier), dragonhide: self.id } });
      if (r.accepted) { st.ownStrength = byTier(GUARD, self.tier); api.activate(self, `${$E('clashlog.dragonhide_guarded', { ownStrength: st.ownStrength })}`); } else api.cleanup(self, $E('clashlog.blocked_by_an_existing_status_the'));
    },
    chooseAction(api, self, { foeId }) {
      const st = self.state; const me = api.me(self);
      if (st.converted || !st.ownStrength || !foeId) return null;
      const own = me.status?.id === 'guarded' && me.status.payload?.dragonhide === self.id && me.status.originalStrength === st.ownStrength;
      if (!own) { st.ownStrength = 0; return null; }
      if (me.status.remaining !== 1) return null; // not yet the final protected turn
      st.converted = true; const pctV = 100 + st.ownStrength;
      api.activate(self, `${$E('clashlog.final_protected_turn_the_guarded_becomes', { pctV })}`, { targetId: foeId }); api.executed(self);
      api.removeStatus(self, self.id, $E('clashlog.consumed_dragonhide_conversion'));
      return { kind: 'attack', tag: 'special', mult: pctV / 100, strikeKey: 'conversion', label: 'Dragonhide' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Entry Guarded; on the final protected turn it is converted into the enhanced attack',
        explain: (c) => `Scalor opens Guarded ${c.values.guardedPct}%; on its second own turn (the last protected one) the Guarded is consumed for a ${c.values.attackPct}% attack.`,
        setup: () => ({ a: [{ species: 'scaleguard' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'DRA-04-C')[0]; h.check(`Guarded ${h.values.guardedPct}% on entry`, s && s.slot.strength === h.values.guardedPct && s.ex === 0); const d = h.ab('damage'); h.check(`conversion attack at ${h.values.attackPct}% on exchange 2`, d.length === 1 && d[0].ex === 2 && d[0].mult === h.values.attackPct / 100 && d[0].tag === 'special'); h.check('the Guarded is consumed', h.has('status_end', (e) => e.target === 'a0' && /consumed/.test(e.reason))); h.executed(2); } },
      { id: 'entry-blocked', kind: 'blocked', title: 'Entering with another status: the entry attempt is blocked and spent; no conversion',
        explain: () => 'Scalor starts Slowed (staged): the Guarded attempt is blocked by the gate and the opportunity is spent.',
        setup: () => ({ a: [{ species: 'scaleguard', status: { id: 'slowed', strength: 15, duration: 1 } }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('blocked by the gate', h.has('status_blocked', (e) => e.abilityId === 'DRA-04-C')); h.check('no conversion', h.ab('damage').length === 0); h.check('no second attempt', h.ev('status_blocked', (e) => e.abilityId === 'DRA-04-C').length === 1); } },
      { id: 'replaced-loses', kind: 'cleanup', title: 'The Guarded is replaced before the final turn: the conversion is lost',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe replaces Scalor\'s Guarded on exchange 1. Only the original episode is eligible; no conversion follows.',
        setup: () => ({ a: [{ species: 'scaleguard' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ turnStart: (v, id) => { if (id === 'b0' && v.ex === 1) v.replaceStatus('a0', { id: 'quickened', strength: 10, duration: 3 }); } }] }),
        expect: (r, h) => { h.check('no conversion', h.ab('damage').length === 0); } },
    ],
  },
});
