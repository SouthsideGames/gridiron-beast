// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// PSY-05-C Mind Game (enigmane: Enigmane; Disruptor). Batch D.
// Contract (Dex, N7b P10): a direct enemy NORMAL attack that misses Enigmane completely (every hit of a multi-hit) earns one trick (at
// most one stored; reactions cannot earn it). While no trick is stored, each enemy normal attack against the active Enigmane has an
// explicit 15% chance to strike an afterimage and miss entirely (one roll for the whole attack; B12 row mind-game-afterimage);
// explicitly undodgeable attacks bypass it without a roll. The next performed normal attack consumes the trick on launch even if it misses;
// a connected hit, shield-absorbed included, attempts Confused under the usual slot rules (no extra accuracy roll; the fixed 25% redirect)
// for 1 / 2 / 2 / 3 recipient normal turns by mastery (application turn excluded). Base attack normal damage. The trick persists in reserve
// and clears on knockout / Clash end. Perks: "Exact enhanced/ordinary archetype policy follows final shared reconciliation" -> AWAITING
// RULING ('d5-perk') when Disruptor pierce is decisive (the target is an active Tank). Mastery execution: the trick attack.
import { registerClashAbility } from '../t8/registry.js';
import { approvedValues } from '../../data/beast-dex.js';
import { mindGameAfterimagePct } from '../../data/approved-values.js';
import { perkTag } from '../t8/flags.js';
import { byTier, isNormal, perkGate } from './util.js';
import { E as $E } from '../../core/english.js';

const TURNS = [1, 2, 2, 3]; const REDIRECT = 25; const AFTERIMAGE = approvedValues('PSY-05-C').afterimageMissPct;

export default registerClashAbility({
  family: 'enigmane', abilityId: 'PSY-05-C',
  initBattle: () => ({ trick: false, rolled: null, armed: false }),
  values: (form, tier) => ({ afterimagePct: AFTERIMAGE, confusedTurns: byTier(TURNS, tier), redirectPct: REDIRECT }),
  hooks: {
    missCheck(api, self, info) {
      const st = self.state; const me = api.me(self);
      if (st.rolled && st.rolled.seq === info.attackSeq) return st.rolled.miss ? { miss: true, source: $E('clashlog.mind_game_afterimage'), abilityId: 'PSY-05-C' } : null;
      if (!me.active || !isNormal(info.tag) || api.get(info.attacker).side === self.side) return null;
      const pctV = mindGameAfterimagePct(st.trick); if (!pctV) return null;
      const miss = api.rng.chance(pctV / 100, self, $E('clashlog.mind_game_afterimage')); st.rolled = { seq: info.attackSeq, miss };
      return miss ? { miss: true, source: $E('clashlog.mind_game_afterimage'), abilityId: 'PSY-05-C' } : null;
    },
    afterWholeAttack(api, self, info) {
      const st = self.state; const att = api.get(info.attackerId);
      if (info.attackerId === self.id && st.armed) { st.armed = false; return; }
      if (st.trick || !att || att.side === self.side || !isNormal(info.tag) || !info.allMissed || !info.hits.every((h) => h.targetId === self.id)) return;
      st.trick = true; api.trigger(self, $E('clashlog.an_enemy_normal_attack_missed_completely'));
    },
    chooseAction(api, self, { foeId }) {
      const st = self.state; if (!st.trick || !foeId) return null;
      const g = perkGate(api, self, foeId, perkTag('PSY-05-C')); if (!g.ok) return null;
      st.trick = false; st.armed = true; api.activate(self, $E('clashlog.the_trick_attack_consumed_on_launch'), { targetId: foeId }); api.executed(self);
      return { kind: 'attack', tag: g.tag, mult: 1, strikeKey: 'trick attack', label: $E('clashlog.mind_game') };
    },
    attached(api, self, info) {
      if (info.attacker !== self.id || info.strikeKey !== 'trick attack' || api.get(info.target).koed || info.target === self.id) return null;
      return { kind: 'status', targetId: info.target, id: 'confused', strength: REDIRECT, duration: byTier(TURNS, self.tier), payload: { redirectPct: REDIRECT }, abilityId: 'PSY-05-C' };
    },
    onKO(api, self) { self.state.trick = false; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'An afterimage miss earns the trick; the next attack Confuses the target (controlled seed selection)',
        explain: (c) => `The opponent's attack strikes an afterimage (15%; controlled seed selection, labeled); Enigmane's next attack carries the trick and Confuses the target for ${c.values.confusedTurns} of its turns.`,
        setup: () => ({ a: [{ species: 'enigmane', overall: 60 }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }], seedSearch: { until: (r) => r.log.some((e) => e.kind === 'status' && e.abilityId === 'PSY-05-C'), max: 300, why: 'an afterimage miss happens before Enigmane\'s next attack' } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'PSY-05-C')[0]; h.check('Confused attempt from the trick attack', s && s.slot.id === 'confused' && s.slot.remaining === h.values.confusedTurns); h.check('the trick came from a miss', h.has('trigger', (e) => e.abilityId === 'PSY-05-C')); h.executed(1); } },
      { id: 'no-trick', kind: 'blocked', title: 'No trick stored: ordinary attacks only',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe makes the opponent undodgeable, so no miss and no trick.',
        setup: () => ({ a: [{ species: 'enigmane' }], b: [{ species: 'charbun' }], seed: 1, stopAt: { exchange: 3 }, probes: [{ chooseAction: (v, id) => (id === 'b0' ? { kind: 'attack', abilityId: 'TEST-UNDODGEABLE', undodgeable: true, mult: 1 } : null) }] }),
        expect: (r, h) => { h.check('no trick (no Confused, no roll)', !h.has('status', (e) => e.abilityId === 'PSY-05-C') && !h.has('roll', (e) => e.abilityId === 'PSY-05-C')); } },
      { id: 'perk-provisional', kind: 'valid', title: 'APPROVED N9c (D5 proposal: ordinary, so pierce applies): the trick attack against the Tank',
        explain: () => 'Approved reading T8_FLAGS.ordinaryPerks[PSY-05-C] = ordinary: the trick attack pierces the Tank guard and attempts Confused. Approved by N9c.',
        setup: () => ({ a: [{ species: 'enigmane', ability: { trick: true, rolled: null, armed: false } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.rulingUsed('d5-perk'); const d = h.ev('damage', (e) => e.actor === 'a0')[0]; h.check('ordinary-tagged trick attack pierces', d && d.tag === 'ordinary' && d.pierce === true); } },
    ],
  },
});
