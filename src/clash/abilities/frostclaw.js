// ICE-03-C Snowbank Shot (frostclaw: Cryolynx; Balanced). Batch B.
// Contract (Dex): replace the normal attack while ready (Stunned prevents activation and keeps readiness). An 80% LAUNCH accuracy check
// first (B12 row 'snowbank-launch'), then the target's ordinary explicit-miss sources; a failed launch does not consume the target's
// dodge / decoy. Connected damage 130% normal; type / shield / DR normal; full absorption by the enemy shield is CONNECTED (no fallback).
// A launch miss or an enemy evasion attempts Shielded worth 20% of the SOURCE's max HP for TWO owner normal turns (application turn
// excluded; reserve pauses), through the normal gate (another status can block it; an equal strength extends without refill). Cooldown
// 5 / 4 / 3 / 2 subsequent owner normal turns, spent on launch. Costs the normal action; no extra attack, ordinary-only perks or second
// attack-charge consumption. Mastery changes the cooldown only. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';

const ACCURACY = 80; const POWER = 130; const FALLBACK = 20; const TURNS = 2; const COOLDOWN = [5, 4, 3, 2];

export default registerClashAbility({
  family: 'frostclaw', abilityId: 'ICE-03-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ accuracyPct: ACCURACY, powerPct: POWER, fallbackShieldPct: FALLBACK, turns: TURNS, cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || !api.ready(self)) return null;
      api.activate(self, 'snowball launched', { targetId: foeId }); api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      return { kind: 'run', run: (a, s) => {
        const r = a.strike(s, foeId, { tag: 'special', mult: POWER / 100, strikeKey: 'snowball', label: 'Snowbank Shot' });
        if (r.decided) return true;
        if (r.cancelled || r.missed) { a.cleanup(s, r.cancelled ? 'launch miss: fallback shield attempt' : 'evaded: fallback shield attempt'); a.shield(s, s.id, { pctMaxHp: FALLBACK, duration: TURNS }); }
        return false;
      } };
    },
    launch(api, self, info) {
      if (info.abilityId !== 'ICE-03-C') return null;
      if (api.rng.chance(ACCURACY / 100, self, 'Snowbank Shot launch accuracy')) return null;
      return { cancel: true, reason: 'launch accuracy (80%) failed', abilityId: 'ICE-03-C' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The launch check passes: 130% snowball, then the cooldown',
        explain: (c) => `Controlled seed selection (labeled) until the 80% launch check passes: the snowball deals 130%; the cooldown is ${c.values.cooldown} owner turns.`,
        setup: () => ({ a: [{ species: 'frostclaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'damage' && e.abilityId === 'ICE-03-C'), why: 'the 80% launch accuracy check passes' } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check('130% special', d && d.mult === 1.3 && d.tag === 'special'); const k = h.ev('clock_start', (e) => e.clock === 'ICE-03-C')[0]; h.check(`cooldown ${h.values.cooldown}`, k && k.left === h.values.cooldown); h.executed(1); } },
      { id: 'launch-miss-shield', kind: 'miss', title: 'The launch check fails: no hit, and a fallback Shielded of 20% source max HP for two owner turns',
        explain: () => 'Controlled seed selection (labeled) until the 80% launch check fails: the shot does not launch at the target, Cryolynx attempts its fallback shield.',
        setup: () => ({ a: [{ species: 'frostclaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'launch_cancelled' && e.actor === 'a0'), why: 'the 80% launch accuracy check fails' } }),
        expect: (r, h) => { h.check('no damage from the shot', h.ab('damage').length === 0); const s = h.ev('status', (e) => e.target === 'a0' && e.abilityId === 'ICE-03-C')[0]; h.check('fallback shield 20% of source max HP, 2 turns, own turn excluded', s && s.slot.pool === Math.floor(h.line('a0').maxHp * 0.2 + 0.5) && s.slot.remaining === 2 && s.excluded); } },
      { id: 'fallback-blocked', kind: 'blocked', title: 'A launch miss with an occupied slot: the fallback shield is blocked by the gate',
        explain: () => 'Cryolynx is Slowed (staged); a failed launch (controlled seed selection) attempts the fallback shield, which the shared gate blocks.',
        setup: () => ({ a: [{ species: 'frostclaw', status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'launch_cancelled' && e.actor === 'a0'), why: 'the 80% launch accuracy check fails' } }),
        expect: (r, h) => { h.check('fallback blocked by the gate', h.has('status_blocked', (e) => e.target === 'a0' && e.abilityId === 'ICE-03-C')); } },
      { id: 'absorbed-connects', kind: 'interaction', title: 'A fully shield-absorbed snowball is connected: no fallback',
        explain: () => 'The target holds a large staged shield; the snowball (launch passes, controlled seed) is absorbed, which counts as connected, so no fallback shield.',
        setup: () => ({ a: [{ species: 'frostclaw' }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'shielded', strength: 999, duration: 5 } }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'damage' && e.abilityId === 'ICE-03-C'), why: 'the 80% launch accuracy check passes' } }),
        expect: (r, h) => { h.check('absorbed', h.ab('damage')[0]?.damage === 0); h.check('no fallback', !h.has('status', (e) => e.target === 'a0')); } },
    ],
  },
});
