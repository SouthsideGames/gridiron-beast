// FIR-02-C Cinder Clamp (ashkit: Cindruff / Magmaul; Disruptor). Batch E.
// Contract (Dex): a connected normal direct attack dealing HP or shield damage applies the grip when ready (no miss, fully prevented zero
// damage, counter or reaction application). The grip is a NON-status mark on the attacked opponent: it lasts the marked TARGET's own normal
// turns, Cindruff 3 / 4 / 5 / 6, Magmaul 4 / 5 / 6 / 7 by mastery (application turn excluded; Stunned skips count; reserve pauses). The
// target side's NEXT VOLUNTARY rotation request consumes the grip and waits until AFTER the marked target's NEXT NORMAL TURN, then executes
// at the next legal rotation opportunity (engine queue); the same request cannot be delayed twice; no seconds or exchange countdown.
// Recharge: THREE subsequent OWNER normal turns, application turn excluded, Stunned skips count, reserve / reactions do not; no new grip
// while a grip or a delayed rotation is pending. A forced swap removes the grip and cancels the pending request. The owner's KO removes
// the grip; a pending rotation is released at the next legal rotation phase without its remaining delay (B3 rule 3). The owner rotating out
// does not remove it. The grip rides an ordinary attack (D5 perks unchanged). A Feather Relay rotation: AWAITING RULING
// ('feather-relay-voluntary'). Mastery execution: the grip application.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, isNormal } from './util.js';
import { decisionsPlan } from '../t8/review.js';

const GRIP = [[3, 4, 5, 6], [4, 5, 6, 7]]; const COOLDOWN = 3;

export default registerClashAbility({
  family: 'ashkit', abilityId: 'FIR-02-C',
  initBattle: () => ({ markId: null, gripLeft: 0, pending: null }),
  values: (form, tier) => ({ gripTurns: byTier(byStage(GRIP, Number(form.split(':')[1])), tier), cooldown: COOLDOWN }),
  hooks: {
    attached(api, self, info) {
      const st = self.state; if (info.attacker !== self.id || !isNormal(info.tag) || st.markId || st.pending || !api.ready(self)) return null;
      const l = info.landed.find((x) => x.id === info.target); const t = api.get(info.target);
      if (!l || (l.loss <= 0 && l.poolLoss <= 0) || t.koed || t.side === self.side) return null;
      st.markId = t.id; st.gripLeft = byTier(byStage(GRIP, self.stage), self.tier); api.cooldown(self, COOLDOWN); api.executed(self);
      api.activate(self, `${t.name} is gripped (${st.gripLeft} of its turns)`, { targetId: t.id });
      return null;
    },
    anyEndOfTurn(api, self, { id }) {
      const st = self.state;
      if (st.pending && id === st.pending.targetId && api.get(id).turns > st.pending.waitFor) { const p = st.pending; st.pending = null; api.queueRotation(self, p.side, p.outId, p.inId); }
      if (st.markId && id === st.markId) { st.gripLeft -= 1; if (st.gripLeft <= 0) { st.markId = null; api.cleanup(self, 'the unused grip expires'); } }
    },
    rotationDelay(api, self, { side, out, in: inId, reason }) {
      const st = self.state; if (!st.markId || out !== st.markId) return null;
      if (reason === 'relay' && !api.provisional(self, 'feather-relay-voluntary', 'a Feather Relay rotation of the gripped monster')) return null;
      st.pending = { side, outId: out, inId, targetId: out, waitFor: api.get(out).turns }; st.markId = null;
      api.activate(self, `the grip delays ${api.get(out).name}'s rotation until after its next normal turn`, { targetId: out });
      return { delay: true, abilityId: 'FIR-02-C' };
    },
    anyDeparture(api, self, { id, reason }) {
      const st = self.state; if (reason !== 'forced') return;
      if (st.markId === id) { st.markId = null; api.cleanup(self, 'a forced swap removes the grip'); }
      if (st.pending?.outId === id) { st.pending = null; api.cleanup(self, 'a forced swap cancels the pending rotation'); }
    },
    onKO(api, self) { const st = self.state; st.markId = null; if (st.pending) { const p = st.pending; st.pending = null; api.queueRotation(self, p.side, p.outId, p.inId); } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The grip delays the target side\'s voluntary rotation until after the target\'s next normal turn, then it executes',
        explain: () => 'Cindruff grips the opponent on exchange 1; the opponent\'s side asks to rotate at exchange 1\'s rotation phase: delayed; after the gripped monster\'s exchange-2 turn, the rotation runs at the next legal phase.',
        setup: () => ({ a: [{ species: 'ashkit', overall: 30 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: decisionsPlan({ 1: 'b1' }) } }, stopAt: { exchange: 3 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const dl = h.ev('rotation_delayed')[0]; const rot = h.ev('rotation', (e) => e.out === 'b0')[0]; h.check('delayed at exchange 1', dl && dl.ex === 1); h.check('executed at exchange 2 after b0\'s turn', rot && rot.ex === 2 && rot.by === 'delayed' && h.ev('turn_start', (e) => e.actor === 'b0' && e.ex === 2)[0]?.seq < rot.seq); h.executed(1); } },
      { id: 'no-grip-on-miss', kind: 'blocked', title: 'A missed attack applies no grip (controlled miss): the rotation is not delayed',
        explain: () => 'CONTROLLED PREREQUISITE (labelled): a reviewer probe makes Cindruff\'s attack miss; no grip, so the opponent rotates at once.',
        setup: () => ({ a: [{ species: 'ashkit', overall: 30 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: decisionsPlan({ 1: 'b1' }) } }, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }, { missCheck: (v, id, info) => (id === 'b0' && info.attacker === 'a0' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('no grip, no delay', !h.has('rotation_delayed') && h.has('rotation', (e) => e.out === 'b0' && e.ex === 1)); } },
      { id: 'expires', kind: 'depletion', title: 'An unused grip lapses after the target\'s own normal turns',
        explain: (c) => `Nobody rotates: the grip lapses after ${c.values.gripTurns} of the target's normal turns.`,
        setup: () => ({ a: [{ species: 'ashkit', overall: 30 }], b: [{ species: 'gravelpup', overall: 99, sparring: true, status: { id: 'shielded', strength: 999, duration: 20 } }], seed: 1, stopAt: { exchange: 9 } }),
        expect: (r, h) => { h.check('the grip expires', h.has('cleanup', (e) => e.abilityId === 'FIR-02-C' && /expires/.test(e.text))); } },
    ],
  },
});
