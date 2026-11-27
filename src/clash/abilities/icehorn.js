// ICE-04-C Snowdrift Shelter (icehorn: Glaciram; Tank). Batch B.
// Contract (Dex): at or below 50% HP, while ready and with its own status slot EMPTY, replace the normal attack with preparation
// (otherwise the ordinary attack, readiness kept; Stunned prevents setup). Self Guarded 50% (normal active Tank protection still
// applies): it lasts through the next THREE owner normal turns (R-10; was the next one) and expires at the third turn's END; the setup turn is excluded. On the next turn
// Glaciram emerges and performs an ordinary legal action. No heal, cleanse, shield pool, immunity or attack bonus. Cooldown 5 / 4 / 3 / 2
// subsequent owner normal turns from the setup; protection fixed; reserve pauses status and cooldown. Mastery execution: the setup.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const GUARD = 50; const COOLDOWN = [5, 4, 3, 2]; const HP_LINE = 50;
// R-10 (balance audit, 2026-11-25): the shelter lasts through Glaciram's next THREE owner normal turns (was one). It costs his attack,
// and one halved enemy hit was worth less than that attack: Snowdrift Shelter lost its user 6.2 points in random 3 v 3 teams and 28 in
// isolation. Three turns brings it to even in teams (+0.1, 2,000 battles); the strength (50%) is unchanged.
export const SHELTER_TURNS = 3;

export default registerClashAbility({
  family: 'icehorn', abilityId: 'ICE-04-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ guardedPct: GUARD, cooldown: byTier(COOLDOWN, tier), hpLinePct: HP_LINE }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null; const me = api.me(self);
      if (me.hp * 100 > HP_LINE * me.maxHp) return null;
      if (me.status) return unmet({ condition: 'own status slot empty', detail: `${$E('clashlog.ordinary_attack_readiness_kept', { id: me.status.id })}` });
      api.activate(self, $E('clashlog.shelter_guarded_50_through_the_next')); api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      api.applyStatus(self, self.id, { id: 'guarded', strength: GUARD, duration: SHELTER_TURNS });
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'At 50% HP: Guarded 50% through the next three own turns, gone at the third turn\'s end; ordinary attacks on those turns',
        explain: () => 'Staged at 40% HP: Glaciram shelters on exchange 1 instead of attacking; the opponent\'s hits on exchanges 2 to 4 are halved; at the end of Glaciram\'s exchange-4 turn the Guarded expires (balance audit R-10: three turns, was one).',
        setup: () => ({ a: [{ species: 'icehorn', hp: 25 }], b: [{ species: 'gravelpup', overall: 30 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'ICE-04-C')[0]; h.check('Guarded 50%, 3 turns, setup turn excluded', s && s.slot.strength === 50 && s.slot.remaining === 3 && s.excluded); const end = h.ev('status_end', (e) => e.target === 'a0' && e.status === 'guarded')[0]; h.check('expires at the end of the third own turn', end && end.ex === 4 && end.phase === 'end_of_turn'); h.check('ordinary attack on exchange 2', h.has('damage', (e) => e.actor === 'a0' && e.ex === 2 && e.tag === 'ordinary')); h.executed(1); } },
      { id: 'healthy', kind: 'blocked', title: 'Above 50% HP: no shelter (ordinary attack)',
        explain: () => 'At full HP the threshold is not met.',
        setup: () => ({ a: [{ species: 'icehorn' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no shelter', h.ab('status').length === 0); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'occupied', kind: 'blocked', title: 'Low HP but the slot holds a status: ordinary attack, readiness kept',
        explain: () => 'Staged at 40% HP and Slowed: the empty-slot condition fails and is reported.',
        setup: () => ({ a: [{ species: 'icehorn', hp: 25, status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /empty/.test(u.condition))); h.check('no cooldown', !h.has('clock_start', (e) => e.clock === 'ICE-04-C')); } },
    ],
  },
});
