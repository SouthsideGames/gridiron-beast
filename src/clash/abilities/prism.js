// LIG-04-C Refraction (prism: Prismara; Disruptor). Batch A.
// Contract (Dex): every third performed normal attack becomes refracted: the primary is a 100% normal attack on the current active
// enemy; then, only if the primary connects, a secondary 30 / 40 / 50 / 60% by mastery against the first living enemy reserve. Target
// IDs are captured at launch; no secondary without a living reserve; no replacement retarget after the primary knocks out. Independent
// secondary evasion; normal shields / type / reduction; no ordinary-only archetype bonus on either hit (explicit: special / follow-up).
// One Confused redirect for the whole target set: if the primary turns on Prismara itself, the secondary goes to its own side's first
// living reserve. The count pauses in reserve and gains nothing from a Stunned skip. Mastery execution: the refracted attack.
// The secondary is a contested Stone Divide target (PROVISIONAL_POINTS['stone-divide-scope']).
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const SECONDARY = [30, 40, 50, 60]; const EVERY = 3;

export default registerClashAbility({
  family: 'prism', abilityId: 'LIG-04-C',
  initBattle: () => ({ count: 0 }),
  values: (form, tier) => ({ primaryPct: 100, secondaryPct: byTier(SECONDARY, tier), every: EVERY }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (!foeId || self.state.count < EVERY - 1) return null;
      const enemyReserve = api.enemyReserves(self)[0]?.id ?? null; const ownReserve = api.reserves(self)[0]?.id ?? null;
      api.trigger(self, 'third performed normal attack', { targetId: foeId }); api.executed(self);
      self.state.count = -1;
      return { kind: 'run', run: (a, s) => {
        const p = a.strike(s, foeId, { tag: 'special', mult: 1, strikeKey: 'primary', label: $E('clashlog.refraction_primary') });
        if (p.decided) return true;
        const secondaryId = p.redirected ? ownReserve : enemyReserve;
        if (!p.landed) { a.cleanup(s, $E('clashlog.no_secondary_the_primary_did_not')); return false; }
        if (!secondaryId || a.get(secondaryId).koed) { a.cleanup(s, $E('clashlog.no_secondary_no_living_reserve_captured')); return false; }
        a.activate(s, `${$E('clashlog.secondary_at', { byTier: byTier(SECONDARY, s.tier), name: a.get(secondaryId).name, redirected: p.redirected ? $E('clashlog.confused_own_side') : '' })}`, { targetId: secondaryId });
        return a.strike(s, secondaryId, { tag: 'followUp', mult: byTier(SECONDARY, s.tier) / 100, strikeKey: 'secondary', label: $E('clashlog.refraction_secondary') }).decided;
      } };
    },
    afterWholeAttack(api, self, info) { if (info.attackerId === self.id && info.normal && info.inAction) self.state.count += 1; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The third attack refracts: 100% primary, then the secondary on the first enemy reserve',
        explain: (c) => `On its third performed attack Prismara hits the active for 100% and, because it connected, the first enemy reserve for ${c.values.secondaryPct}%.`,
        setup: () => ({ a: [{ species: 'prism' }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }, { species: 'mudlark', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('primary on b0 then secondary on b1 (exchange 3)', d.length === 2 && d[0].target === 'b0' && d[0].tag === 'special' && d[1].target === 'b1' && d[1].tag === 'followUp' && d.every((e) => e.ex === 3), d.map((e) => `${e.target}:${e.tag}`)); h.check(`secondary ${h.values.secondaryPct}%`, d[1]?.mult === h.values.secondaryPct / 100); h.check('the reserve gets no Tank guard', d[1] && !d[1].guard); h.executed(1); h.stages('trigger', 'activation', 'resolution'); } },
      { id: 'no-reserve', kind: 'blocked', title: 'No living enemy reserve: the primary only',
        explain: () => 'Against a lone opponent the refracted attack has no secondary target: the primary resolves, and the cleanup names the missing reserve.',
        setup: () => ({ a: [{ species: 'prism' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.check('primary only', h.ab('damage').length === 1); h.check('no secondary is reported', h.has('cleanup', (e) => e.abilityId === 'LIG-04-C' && /no living reserve/.test(e.text))); } },
      { id: 'confused-own-side', kind: 'interaction', title: 'Confused: the whole target set turns to its own side (self primary, own first reserve secondary)',
        explain: () => 'Staged: the count is at two and Prismara is Confused. Controlled seed selection until the single Confused roll redirects: the primary hits Prismara and the secondary its own first reserve.',
        setup: () => ({ a: [{ species: 'prism', status: { id: 'confused', strength: 1, duration: 3 }, ability: { count: 2 } }, { species: 'tidepaw', overall: 99 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'confused_roll' && e.actor === 'a0' && e.redirected), why: 'the one Confused roll redirects the refracted attack' } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('one Confused roll for the set', h.ev('confused_roll', (e) => e.actor === 'a0').length === 1); h.check('primary on itself, secondary on its own first reserve', d.length === 2 && d[0].target === 'a0' && d[1].target === 'a1', d.map((e) => e.target)); } },
    ],
  },
});
