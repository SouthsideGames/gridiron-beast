// ELE-01-C Lightning Rod (flicker: Zippit / Zaptera; Support). Batch C.
// Contract (Dex): once per Clash, automatically BEFORE its own attack (at its turn start, so a transferred Stunned or Confused affects
// that action normally), provided its own shared slot is empty: choose a living RESERVE ally with a removable harmful status (lowest
// current HP percentage, then stable reserve order) and transfer the entire status to itself, keeping its strength, accepted application
// count and remaining duration (and freeze counter), then immediately subtract one turn; at zero it expires before the attack. No second
// decrement at the end of that same turn; the ordinary countdown resumes on its next normal turn; reserve pauses. Uncleansable statuses
// are excluded; the stack cap is not reset. No action replacement, extra turn, heal, damage or retaliation; no eligible ally or an occupied
// own slot keeps the use. No mastery scaling. Mastery execution: the transfer.
import { registerClashAbility } from '../t8/registry.js';
import { removableHarmful, lowestHpPct } from './util.js';

export default registerClashAbility({
  family: 'flicker', abilityId: 'ELE-01-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    turnStart(api, self) {
      const st = self.state; if (st.used) return; const me = api.me(self); if (!me.active || me.status) return;
      const t = lowestHpPct(api.reserves(self).filter((v) => removableHarmful(v.status))); if (!t) return;
      st.used = true; api.trigger(self, `${t.name} holds ${t.status.id}`, { targetId: t.id }); api.executed(self);
      api.activate(self, `transfer ${t.status.id} to itself and shorten it by one turn`, { targetId: t.id });
      api.transferStatus(self, t.id, self.id);
      const left = api.decrementStatus(self, self.id);
      if (left) api.holdStatusTick(self, self.id); else api.cleanup(self, 'the transferred status expired before the attack');
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A reserve\'s Weakened moves to Zippit with one turn removed; Zippit still attacks',
        explain: () => 'The reserve holds a staged Weakened 10% (4 turns): at Zippit\'s turn start it takes the whole episode, minus one turn, and attacks Weakened; no extra decrement that turn.',
        setup: () => ({ a: [{ species: 'flicker' }, { species: 'tidepaw', status: { id: 'weakened', strength: 10, duration: 4 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const t = h.ev('status', (e) => e.abilityId === 'ELE-01-C' && e.from === 'a1')[0]; h.check('transferred with 4 turns and its application count', t && t.slot.remaining === 4 && t.slot.applications === 1); h.check('then 3 turns, held to the end of the turn', h.line('a0').status?.remaining === 3); h.check('the reserve is clear', h.line('a1').status === null); h.check('Zippit attacked Weakened', h.has('damage', (e) => e.actor === 'a0' && e.outgoing === 0.9)); h.executed(1); } },
      { id: 'own-slot-occupied', kind: 'blocked', title: 'Zippit\'s own slot is occupied: no transfer, use kept',
        explain: () => 'Zippit is Quickened (staged): "provided its own shared slot is empty"; nothing moves.',
        setup: () => ({ a: [{ species: 'flicker', status: { id: 'quickened', strength: 10, duration: 5 } }, { species: 'tidepaw', status: { id: 'weakened', strength: 10, duration: 4 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no transfer (use kept)', h.state('a0')?.used === false && h.line('a1').status?.id === 'weakened'); } },
      { id: 'expires-at-once', kind: 'cleanup', title: 'A one-turn status transferred: it expires before the attack',
        explain: () => 'The reserve\'s staged Slowed has one turn left: the transfer removes that turn, so it expires immediately.',
        setup: () => ({ a: [{ species: 'flicker' }, { species: 'tidepaw', status: { id: 'slowed', strength: 15, duration: 1 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('expired before the attack', h.has('cleanup', (e) => e.abilityId === 'ELE-01-C') && h.line('a0').status === null); } },
    ],
  },
});
