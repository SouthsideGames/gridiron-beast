// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// WIN-01-C Feather Relay (gustling: Gustling / Squallow / Stratosoar; Support). Batch E.
// Contract (Dex) with the owner's reconciled D3 ruling (2026-11-09 01:03, rule 2): once per Clash, while living and able in RESERVE, at its
// own team's normal action opportunity, if the current active ally is below 50% HP and a legal rotation is available. This SUPPORT ACTION
// replaces the team attack (not another simultaneous active fighter; not a bonus reserve normal turn). The injured active ally rotates with
// the FIRST living reserve in stable lineup order (Gustling may be it), respecting rotation locks, legal availability and the 4-exchange
// cadence (the contract does not exempt it), WITHOUT the P8 entry penalty (D3). Rotate first, then heal the DEPARTING ally 8 / 10 / 12% of
// its max HP by form (same at all mastery; Healing Reduced and the max-HP cap normal; no shield, cleanse or revive). The incoming ally gets
// NO normal attack that team turn. It cannot bypass the active ally's Stunned skip (only a normal action it could legally perform). One
// successful legal rotation commits the use even if the heal is prevented; a failed or blocked rotation keeps it; a Stunned source keeps
// it; no reset on rotation / revival. Whether this rotation is "voluntary" for Cinder Clamp, Riptide Pursuit, Cold Welcome and Shell
// Harvest is unaddressed: those four report `awaiting ruling` ('feather-relay-voluntary'). Mastery execution: the relay.
import { registerClashAbility } from '../t8/registry.js';
import { byStage } from './util.js';

const HEAL = [8, 10, 12]; const LINE = 50;

export default registerClashAbility({
  family: 'gustling', abilityId: 'WIN-01-C',
  initBattle: () => ({ used: false }),
  values: (form) => ({ healPct: byStage(HEAL, Number(form.split(':')[1])), hpLinePct: LINE }),
  hooks: {
    teamAction(api, self, { activeId }) {
      const st = self.state; const me = api.me(self); const act = api.get(activeId);
      if (st.used || me.active || me.koed || me.stunned || act.hp * 100 >= LINE * act.maxHp) return null;
      const L = api.rotationLegality(self.side); if (!L.legal) return api.unmet(self, L.unmet.map((u) => ({ ...u, detail: `${u.detail ? `${u.detail}; ` : ''}the use is kept` })), { hook: 'teamAction' });
      return { run: (a, s) => {
        const inc = a.reserves(s)[0];
        a.trigger(s, `${act.name} is below ${LINE}% HP`, { targetId: activeId }); a.activate(s, `relay: ${act.name} rotates with ${inc.name} (no entry penalty)`, { targetId: inc.id });
        const r = a.teamRotation(s, s.side, inc.id);
        if (!r.rotated) { if (r.unmet.length) a.unmet(s, r.unmet, { hook: 'teamAction' }); return { acted: false, decided: r.decided }; }
        s.state.used = true; a.executed(s);
        if (!a.get(activeId).koed) a.heal(s, activeId, { pctMaxHp: byStage(HEAL, s.stage) });
        return { acted: true, decided: r.decided };
      } };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The active ally below 50%: the relay rotates it out with no entry penalty, heals it, and the team makes no attack this turn',
        explain: (c) => `The active ally is staged at 40% HP. On its turn Gustling (reserve) relays: the ally swaps with the first reserve, is healed ${c.values.healPct}% of its max HP, and the team's attack is spent. The entrant gets no P8 penalty.`,
        setup: () => ({ a: [{ species: 'tidepaw', hp: 25 }, { species: 'gustling' }, { species: 'lumen' }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const rot = h.ev('rotation', (e) => e.abilityId === 'WIN-01-C')[0]; h.check('relay rotation a0 -> a1, no penalty', rot && rot.out === 'a0' && rot.in === 'a1' && rot.noPenalty); const hl = h.ev('heal', (e) => e.abilityId === 'WIN-01-C')[0]; h.check(`departing ally healed ${h.values.healPct}%`, hl && hl.target === 'a0' && Math.abs(hl.exact - h.line('a0').maxHp * h.values.healPct / 100) < 1e-9); h.check('no team attack that turn', !h.has('damage', (e) => e.actor[0] === 'a' && e.ex === 1)); h.check('no entry penalty on the entrant\'s first turn', !h.has('entry_penalty', (e) => e.actor === 'a1')); h.executed(1); } },
      { id: 'healthy', kind: 'blocked', title: 'The active ally is at or above 50%: no relay',
        explain: () => 'A healthy active ally does not qualify.',
        setup: () => ({ a: [{ species: 'tidepaw' }, { species: 'gustling' }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no relay (use kept)', h.state('a1')?.used === false && !h.has('rotation')); } },
      { id: 'cadence', kind: 'blocked', title: 'The cadence is not available (a voluntary rotation two exchanges ago): unmet reported, use kept',
        explain: () => 'The side rotated voluntarily on exchange 1; on exchange 2 the 4-exchange cadence makes a rotation illegal, so the relay reports the unmet condition and keeps its use.',
        setup: () => ({ a: [{ species: 'lumen' }, { species: 'tidepaw', hp: 25 }, { species: 'gustling' }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, config: { policies: { a: 'manual', b: 'none' }, decisions: { a: { 1: 'a1', 5: 'stay', 9: 'stay', 13: 'stay', 17: 'stay', 21: 'stay', 25: 'stay', 29: 'stay' } } }, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => u.condition === 'rotation cadence')); h.check('use kept', h.state('a2')?.used === false); } },
      { id: 'failed-relay-keeps', kind: 'sourceKO', title: 'APPROVED N9c: the pursuit knocks the departing ally out: the relay failed, its use is kept',
        explain: () => 'Approved reading (relay = voluntary): the enemy Tsunarok\'s pursuit knocks the 1-HP departing ally out before it leaves. A failed rotation keeps the relay\'s use. Approved by N9c.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1 }, { species: 'gustling' }, { species: 'lumen' }], b: [{ species: 'tsunarok', overall: 30 }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('knocked out by the pursuit', h.has('ko', (e) => e.target === 'a0' && e.actor === 'b0')); h.check('the relay use is kept, no execution', h.state('a1')?.used === false && h.line('a1').executions === 0); } },
      { id: 'voluntary-provisional', kind: 'interaction', title: 'APPROVED N9c (plan D3: a voluntary rotation): the enemy Riptide Pursuit punishes the relay',
        explain: () => 'Approved reading T8_FLAGS.featherRelayVoluntary = voluntary: Tsunarok pursues the departing ally before the relay completes. Approved by N9c.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 30 }, { species: 'gustling' }], b: [{ species: 'tsunarok', overall: 30 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const p = h.ev('damage', (e) => e.abilityId === 'WAT-06-C')[0]; const rot = h.ev('rotation', (e) => e.abilityId === 'WIN-01-C')[0]; h.check('pursuit before the relay departure', p && rot && p.seq < rot.seq && p.target === 'a0'); h.rulingUsed('feather-relay-voluntary'); } },
    ],
  },
});
