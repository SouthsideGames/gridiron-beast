// DAR-03-C Predator Rhythm (duskrunner: Duskyre; Striker). Batch A.
// Contract (Dex): after two consecutive performed normal attacks damage the SAME enemy monster's HP, the next own normal attack on
// that monster (while it is still the enemy active) deals 140 / 150 / 160 / 170% by mastery. A miss, a shield-only hit, a change of
// target or the target's departure resets the sequence; a Confused redirected hit does not advance it; the sequence cycles to zero
// after the enhanced attempt; no turns timer; the partial sequence pauses in reserve. Strikes 1-2 are ordinary. The third strike's perk
// applicability is silent: when the Striker shield-break would change it (target Shielded), it is AWAITING RULING ('d5-perk') in
// normal gameplay (an ordinary attack; the sequence is kept).
import { registerClashAbility } from '../t8/registry.js';
import { perkTag } from '../t8/flags.js';
import { byTier, perkGate } from './util.js';

const THIRD = [140, 150, 160, 170];
const SHIELD = { id: 'shielded', strength: 999, duration: 2 };

export default registerClashAbility({
  family: 'duskrunner', abilityId: 'DAR-03-C',
  initBattle: () => ({ streak: 0, targetId: null, armed: false }),
  values: (form, tier) => ({ thirdPct: byTier(THIRD, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      const st = self.state; if (!foeId || st.streak < 2 || st.targetId !== foeId) return null;
      const g = perkGate(api, self, foeId, perkTag('DAR-03-C')); if (!g.ok) return null;
      const mult = byTier(THIRD, self.tier) / 100; st.armed = true;
      api.trigger(self, `two consecutive HP-damaging attacks on ${api.get(foeId).name}`, { targetId: foeId });
      api.activate(self, `third strike at ${Math.round(mult * 100)}%`, { targetId: foeId });
      api.executed(self);
      return { kind: 'attack', tag: g.tag, mult, strikeKey: 'third strike', label: 'Predator Rhythm' };
    },
    afterWholeAttack(api, self, info) {
      if (info.attackerId !== self.id || !info.normal) return;
      const st = self.state;
      if (st.armed) { st.armed = false; st.streak = 0; st.targetId = null; api.cleanup(self, 'sequence cycles to zero after the enhanced attempt'); return; }
      const enemyHp = info.redirected ? 0 : info.hits.reduce((s, hit) => s + (hit.losses?.[info.targetId] ?? 0), 0);
      if (enemyHp > 0) {
        if (st.targetId === info.targetId) st.streak = Math.min(2, st.streak + 1); else { st.targetId = info.targetId; st.streak = 1; }
        api.log(self, 'ability_progress', `${self.name}: Predator Rhythm ${st.streak} / 2 on ${api.get(info.targetId).name}`, { streak: st.streak, targetId: info.targetId, stage: 'trigger' });
      } else if (st.streak) { st.streak = 0; st.targetId = null; api.cleanup(self, info.redirected ? 'sequence reset (Confused redirect)' : info.allMissed ? 'sequence reset (miss)' : 'sequence reset (no HP damage)'); }
    },
    anyDeparture(api, self, { id }) { if (self.state.targetId === id && self.state.streak) { self.state.streak = 0; self.state.targetId = null; api.cleanup(self, 'sequence destroyed: the target left the active position'); } },
    anyKO(api, self, { id }) { if (self.state.targetId === id) { self.state.streak = 0; self.state.targetId = null; } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Two HP-damaging attacks on the same enemy, then the empowered third strike; the sequence restarts',
        explain: (c) => `Duskyre's third consecutive attack on the same enemy deals ${c.values.thirdPct}% of a normal attack, then the count cycles to zero.`,
        setup: () => ({ a: [{ species: 'duskrunner' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('third strike on exchange 3 at the mastery power', d.length === 1 && d[0].ex === 3 && d[0].mult === h.values.thirdPct / 100); h.check('exchange 4 is ordinary again', h.has('damage', (e) => e.actor === 'a0' && e.ex === 4 && e.tag === 'ordinary')); h.stages('trigger', 'activation', 'resolution', 'cleanup'); h.executed(1); } },
      { id: 'shield-only-resets', kind: 'blocked', title: 'A shield-only hit does not count: no sequence builds',
        explain: () => 'The enemy carries a large shield: Duskyre\'s hits remove shield HP only, so no sequence builds and no third strike happens.',
        setup: () => ({ a: [{ species: 'duskrunner' }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'shielded', strength: 999, duration: 9 } }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('no empowered strike', h.ab('damage').length === 0); h.check('no sequence built (streak 0)', h.state('a0')?.streak === 0); } },
      { id: 'target-departs', kind: 'rotation', title: 'The enemy rotates out after two hits: the target-specific sequence is destroyed',
        explain: () => 'After two hits the opposing side rotates its active out; the sequence on it is destroyed and the next attack is ordinary.',
        setup: () => ({ a: [{ species: 'duskrunner' }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: { 1: 'stay', 2: 'b1', 3: 'stay', 4: 'stay', 5: 'stay', 6: 'stay', 7: 'stay', 8: 'stay' } } }, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('departure cleanup logged', h.has('cleanup', (e) => e.abilityId === 'DAR-03-C' && /destroyed/.test(e.text))); h.check('no third strike on exchange 3', !h.has('damage', (e) => e.abilityId === 'DAR-03-C' && e.ex === 3)); } },
      { id: 'perk-awaiting', kind: 'blocked', title: 'The armed third strike meets a Shielded target: the Striker perk is decisive, awaiting ruling',
        explain: () => 'Staged (controlled prerequisite): two HP-damaging hits on the target are already counted, and the target is Shielded. Whether the third strike keeps the Striker shield-break awaits a ruling: an ordinary attack is made and the sequence is kept.',
        setup: () => ({ a: [{ species: 'duskrunner', ability: { streak: 2, targetId: 'b0', armed: false } }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.awaiting('d5-perk'); h.check('ordinary attack instead', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); h.check('no third strike', h.ab('damage').length === 0); } },
      { id: 'perk-provisional', kind: 'valid', provisional: true, title: 'PROVISIONAL (plan reading: special): the third strike lands on the Shielded target without the shield-break',
        explain: () => 'Provisional reading T8_FLAGS.ordinaryPerks[DAR-03-C] = special. Not approved; labelled.',
        setup: () => ({ a: [{ species: 'duskrunner', ability: { streak: 2, targetId: 'b0', armed: false } }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.provisionalUsed('d5-perk'); const d = h.ab('damage')[0]; h.check('third strike, break x1', d && d.tag === 'special' && d.shield?.breakMult === 1); } },
    ],
  },
});
