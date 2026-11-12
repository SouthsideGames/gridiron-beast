// WIN-03-C Downdraft (skywarden: Aeralis; Disruptor). Batch E.
// Contract (Dex, owner 12A): a ready own normal action replaces the attack when the enemy has an active fighter plus a living first reserve
// and a legal forced exchange (rotation locks / immunity, pacing and just-entered protection respected; otherwise the ordinary attack and
// the use kept). Swap the enemy ACTIVE fighter with its FIRST living reserve in stable lineup order; after the legal swap and the normal
// entry effects, attempt Weakened 15% for 2 recipient normal turns on the incoming fighter (ordinary one-status gate; an incoming Shielded
// can block it). A legal swap spends it even if the status is blocked; the source Stunned prevents it. No damage, extra reserve action or
// fallback stun. Cooldown 6 / 5 / 4 / 3 source owner normal turns by mastery; status 15% and 2 turns fixed. Football carry converts to 15%
// Strength (S12). Mastery execution: the swap.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';

const WEAK = 15; const TURNS = 2; const COOLDOWN = [6, 5, 4, 3];

export default registerClashAbility({
  family: 'skywarden', abilityId: 'WIN-03-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ weakenedPct: WEAK, turns: TURNS, cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || !api.ready(self)) return null; const foe = api.get(foeId);
      if (!api.enemyReserves(self).length) return null;
      const L = api.forcedLegality(foe.side); if (!L.legal) return unmet(...L.unmet.map((u) => ({ ...u, detail: `${u.detail ? `${u.detail}; ` : ''}ordinary attack, use kept` })));
      api.activate(self, `downdraft: ${foe.name} swaps with the first reserve`, { targetId: foeId }); api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      if (api.forcedRotation(self, foe.side, { incoming: 'firstReserve' })) { const inc = api.activeOf(foe.side); api.applyStatus(self, inc.id, { id: 'weakened', strength: WEAK, duration: TURNS }); }
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The enemy active swaps with its first reserve; the incoming fighter is Weakened 15%',
        explain: () => 'Aeralis replaces its attack: the opponent\'s active is forced out, the first reserve comes in and receives Weakened 15% for two of its turns.',
        setup: () => ({ a: [{ species: 'skywarden' }], b: [{ species: 'gravelpup', sparring: true }, { species: 'tinhare', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const rot = h.ev('rotation', (e) => e.abilityId === 'WIN-03-C')[0]; const s = h.ev('status', (e) => e.abilityId === 'WIN-03-C')[0]; h.check('b0 out, b1 in', rot && rot.out === 'b0' && rot.in === 'b1'); h.check('Weakened 15% on b1 for 2 turns', s && s.target === 'b1' && s.slot.strength === 15 && s.slot.remaining === 2); h.executed(1); } },
      { id: 'no-reserve', kind: 'blocked', title: 'No enemy reserve: ordinary attack, use kept',
        explain: () => 'A lone opponent cannot be swapped.',
        setup: () => ({ a: [{ species: 'skywarden' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no swap (use kept)', !h.has('rotation') && !h.has('clock_start', (e) => e.clock === 'WIN-03-C')); } },
      { id: 'illegal-swap', kind: 'blocked', title: 'An illegal forced exchange (pacing / just-entered protection): ordinary attack, use kept',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe makes the opponent force-rotate its own side on exchange 1 before Aeralis acts. The new active just entered and the side-wide pacing is running, so Downdraft is illegal: reported, ordinary attack, no cooldown.',
        setup: () => ({ a: [{ species: 'skywarden' }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }, { species: 'mudlark', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }, { chooseAction: (v, id) => (id === 'b0' ? { kind: 'forcedRotation', side: 'own', abilityId: 'TEST-FORCE' } : null) }] }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /pacing|just-entered/.test(u.condition))); h.check('no Downdraft swap, no cooldown', !h.has('rotation', (e) => e.abilityId === 'WIN-03-C') && !h.has('clock_start', (e) => e.clock === 'WIN-03-C')); } },
    ],
  },
});
