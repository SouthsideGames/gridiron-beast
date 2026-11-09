// MET-01-C Forge Swipe (ironcub: Ferrcub / Forgursa; Balanced). Batch B.
// Contract (Dex): every third performed normal attack attempts self Empowered +10 / +15% outgoing damage by form AFTER the full attack
// resolves, if alive (normal one-status gate; an equal application extends duration, never strength; no instant bonus on the triggering
// attack, which stays ordinary). Three performed normal attacks per attempt; a blocked status still resets the count. Application turn
// excluded. Duration: Core "for 2 owner normal turns" against Progression "Duration 1 / 2 / 2 / 3 turns by mastery" (a Core-versus-
// Progression conflict found at S7). The texts agree at Practiced and Expert (2); at Developing and Mastered the attempt is AWAITING
// RULING ('forge-swipe-duration') in normal gameplay (the count still resets, as for a blocked attempt). Mastery execution: the attempt.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, SPAR } from './util.js';

const EMP = [10, 15]; const LADDER = [1, 2, 2, 3]; const CORE = 2; const EVERY = 3;

export default registerClashAbility({
  family: 'ironcub', abilityId: 'MET-01-C',
  initBattle: () => ({ count: 0 }),
  values: (form, tier) => ({ empoweredPct: byStage(EMP, Number(form.split(':')[1])), progressionTurns: byTier(LADDER, tier), coreTurns: CORE, every: EVERY }),
  hooks: {
    afterWholeAttack(api, self, info) {
      if (info.attackerId !== self.id || !info.normal || !info.inAction) return;
      const st = self.state; st.count += 1;
      if (st.count < EVERY) return;
      st.count = 0; if (api.me(self).koed) return;
      api.trigger(self, 'third performed normal attack resolved');
      const ladder = byTier(LADDER, self.tier);
      let turns = ladder;
      if (ladder !== CORE) { if (!api.provisional(self, 'forge-swipe-duration', `Core ${CORE} turns against Progression ${ladder} at this tier`)) { api.cleanup(self, 'count reset; the Empowered attempt awaits the duration ruling'); return; } turns = api.flags.coreVsProgression.value === 'core' ? CORE : ladder; }
      api.executed(self); api.activate(self, `self Empowered +${byStage(EMP, self.stage)}% for ${turns} owner turn${turns === 1 ? '' : 's'}`);
      api.applyStatus(self, self.id, { id: 'empowered', strength: byStage(EMP, self.stage), duration: turns });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', tiers: [1, 2], title: 'Third performed attack: self Empowered after the attack, for 2 owner turns (Core and Progression agree)',
        explain: (c) => `At this tier both texts give 2 turns: after its third attack Ferrcub is Empowered +${c.values.empoweredPct}%; the triggering attack itself is ordinary.`,
        setup: () => ({ a: [{ species: 'ironcub', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'MET-01-C')[0]; h.check('Empowered at the form value for 2 turns, after the third attack', s && s.ex === 3 && s.slot.strength === h.values.empoweredPct && s.slot.remaining === 2); const d3 = h.ev('damage', (e) => e.actor === 'a0' && e.ex === 3)[0]; h.check('no instant bonus on the triggering attack', d3 && d3.tag === 'ordinary' && d3.outgoing == null && d3.seq < s.seq); h.check('exchange 4 attack is Empowered', h.has('damage', (e) => e.actor === 'a0' && e.ex === 4 && e.outgoing === 1 + h.values.empoweredPct / 100)); h.executed(1); } },
      { id: 'awaiting-duration', kind: 'blocked', tiers: [0, 3], title: 'Developing / Mastered: the duration texts disagree, the attempt awaits a ruling; the count resets',
        explain: (c) => `At this tier Core says 2 turns and Progression ${c.values.progressionTurns}: normal gameplay reports awaiting ruling instead of guessing; the count resets as for a blocked attempt.`,
        setup: () => ({ a: [{ species: 'ironcub', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.awaiting('forge-swipe-duration'); h.check('no Empowered', !h.has('status', (e) => e.abilityId === 'MET-01-C')); h.check('count reset', h.state('a0')?.count === 1); } },
      { id: 'blocked-resets', kind: 'blocked', tiers: [1, 2], title: 'The Empowered attempt is blocked by another status: the count still resets',
        explain: () => 'Ferrcub is Slowed for the whole sequence (staged): the third attack\'s Empowered attempt is blocked by the gate and the count restarts.',
        setup: () => ({ a: [{ species: 'ironcub', overall: 30, status: { id: 'slowed', strength: 15, duration: 9 } }], b: SPAR(), seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('attempt blocked', h.has('status_blocked', (e) => e.abilityId === 'MET-01-C')); h.check('count restarted', h.state('a0')?.count === 1); } },
      { id: 'provisional-duration', kind: 'valid', provisional: true, tiers: [0, 3], title: 'PROVISIONAL (Progression ladder): Empowered for the ladder\'s turns',
        explain: (c) => `Provisional reading T8_FLAGS.coreVsProgression = progression: ${c.values.progressionTurns} turn(s). Not approved; labelled.`,
        setup: () => ({ a: [{ species: 'ironcub', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.provisionalUsed('forge-swipe-duration'); const s = h.ev('status', (e) => e.abilityId === 'MET-01-C')[0]; h.check('ladder duration', s && s.slot.remaining === h.values.progressionTurns); } },
    ],
  },
});
