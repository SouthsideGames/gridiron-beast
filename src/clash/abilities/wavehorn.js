// WAT-05-C Riptide Charge (wavehorn: Tideram; Balanced). Batch E.
// Contract (Dex): every SECOND performed normal attack becomes charged (skipped turns and reactions build nothing; the counter survives
// own rotations and resets per Clash): 130 / 135 / 140 / 145% normal attack by mastery. A connected hit, even one a shield absorbs fully,
// forces a SURVIVING target into reserve, and the opposing team chooses the living replacement (recorded for player and AI). An explicit
// miss prevents the damage AND the rotation, and the charge is spent. A KO uses the ordinary replacement. No living reserve: damage, no
// rotation. Explicit forced-rotation immunity blocks the lineup change but not the damage. The existing side-wide forced-rotation pacing
// and just-entered protection are kept (engine forcedRotation). The departing target keeps its status and remaining duration.
// The replacement choice: the first living reserve in lineup order for every side (T8_PROVISIONAL 'riptide-replacement-choice'; a player
// prompt is the D1 battle-screen work, S13/S14). Mastery execution: the charged attack.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, isNormal, SPAR } from './util.js';

const POWER = [130, 135, 140, 145];

export default registerClashAbility({
  family: 'wavehorn', abilityId: 'WAT-05-C',
  initBattle: () => ({ count: 0 }),
  values: (form, tier) => ({ chargedPct: byTier(POWER, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || self.state.count % 2 !== 1) return null;
      api.activate(self, `charged attack at ${byTier(POWER, self.tier)}%`, { targetId: foeId }); api.executed(self);
      return { kind: 'run', run: (a, s) => {
        const r = a.strike(s, foeId, { tag: 'special', mult: byTier(POWER, s.tier) / 100, strikeKey: 'charged', label: 'Riptide Charge' });
        if (r.decided) return true;
        const t = a.get(foeId);
        if (!r.landed) { a.cleanup(s, 'evaded: no rotation, the charge is spent'); return false; }
        if (t.koed) return false; // ordinary KO replacement already happened
        if (!a.enemyReserves(s).length) { a.cleanup(s, 'no living reserve: damage only'); return false; }
        a.forcedRotation(s, t.side, { incoming: 'firstReserve' });
        return false;
      } };
    },
    afterWholeAttack(api, self, info) { if (info.attackerId === self.id && info.normal && info.inAction) self.state.count += 1; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The second performed attack is charged and forces the surviving target out; the first reserve comes in',
        explain: (c) => `Tideram's second attack deals ${c.values.chargedPct}% and sends the surviving target to reserve; the opponent's first living reserve enters.`,
        setup: () => ({ a: [{ species: 'wavehorn', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check('charged on exchange 2', d && d.ex === 2 && d.mult === h.values.chargedPct / 100); const rot = h.ev('rotation', (e) => e.forced && e.abilityId === 'WAT-05-C')[0]; h.check('b0 forced out, b1 in', rot && rot.out === 'b0' && rot.in === 'b1'); h.executed(1); } },
      { id: 'evaded', kind: 'miss', title: 'An explicit miss on the charged attack: no damage, no rotation, the charge spent (controlled miss)',
        explain: () => 'CONTROLLED PREREQUISITE (labelled): a reviewer probe supplies a miss on the charged attack.',
        setup: () => ({ a: [{ species: 'wavehorn', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 3 }, probes: [{ missCheck: (v, id, info) => (info.abilityId === 'WAT-05-C' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('no forced rotation', !h.has('rotation', (e) => e.forced)); h.check('the next attack is ordinary (charge spent)', h.has('damage', (e) => e.actor === 'a0' && e.ex === 3 && e.tag === 'ordinary')); } },
      { id: 'no-reserve', kind: 'blocked', title: 'No living reserve: the charged damage lands and nobody rotates',
        explain: () => 'A lone opponent takes the charged hit; with no reserve there is no rotation.',
        setup: () => ({ a: [{ species: 'wavehorn', overall: 30 }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('charged hit, no rotation', h.ab('damage').length === 1 && !h.has('rotation')); h.check('the cleanup names it (no reserve)', h.has('cleanup', (e) => e.abilityId === 'WAT-05-C')); } },
    ],
  },
});
