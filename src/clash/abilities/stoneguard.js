// EAR-04-C Bank Shot (stoneguard: Granigor; Striker). Batch A.
// Contract (Dex): once per Clash, replace the normal attack when the enemy active is Shielded and has a living reserve (otherwise the
// ordinary attack and the use is kept). Primary: 100% normal attack with normal defences / evasion. If it removes at least one shield HP
// (the shield need not break), a ricochet at the LAST living enemy reserve for 50 / 60 / 70 / 80% by mastery. Launching the primary
// spends the use even if it misses or no ricochet follows. The primary's retaliation resolves before the bounce; if the source is then
// knocked out or Stunned the ricochet is cancelled; at most one bounce, no extra normal action. The secondary has its own type /
// evasion / shield / DR and no active-only Tank guard in reserve; no secondary retaliation chains. "Neither hit receives ordinary-only
// Striker perks" (explicit). The ricochet is a contested Stone Divide target (PROVISIONAL_POINTS['stone-divide-scope']).
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';

const RICOCHET = [50, 60, 70, 80];
const SHIELD = { id: 'shielded', strength: 40, duration: 5 };

export default registerClashAbility({
  family: 'stoneguard', abilityId: 'EAR-04-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ primaryPct: 100, ricochetPct: byTier(RICOCHET, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null; const f = api.get(foeId);
      const conds = []; if (f.status?.id !== 'shielded') conds.push('enemy active Shielded'); if (!api.enemyReserves(self).length) conds.push('a living enemy reserve');
      if (conds.length) return unmet(...conds.map((c) => ({ condition: c, detail: 'ordinary attack, use kept' })));
      self.state.used = true; api.activate(self, 'bank shot: primary into the shield', { targetId: foeId }); api.executed(self);
      return { kind: 'run', run: (a, s) => {
        const p = a.strike(s, foeId, { tag: 'special', mult: 1, strikeKey: 'primary', label: 'Bank Shot primary' });
        if (p.decided) return true;
        const me = a.me(s);
        if (!(p.shieldDamage >= 1)) { a.cleanup(s, 'no ricochet: the primary removed no shield HP'); return false; }
        if (me.koed || (me.stunned && !me.stunProtected)) { a.cleanup(s, 'ricochet canceled: the source is knocked out or Stunned'); return false; }
        const last = a.enemyReserves(s).slice(-1)[0]; if (!last) { a.cleanup(s, 'no ricochet: no living enemy reserve'); return false; }
        a.activate(s, `ricochet ${byTier(RICOCHET, s.tier)}% at the last enemy reserve ${last.name}`, { targetId: last.id });
        return a.strike(s, last.id, { tag: 'followUp', mult: byTier(RICOCHET, s.tier) / 100, strikeKey: 'ricochet', label: 'Bank Shot ricochet' }).decided;
      } };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The primary chips the shield; the ricochet hits the LAST living enemy reserve',
        explain: (c) => `Granigor's primary takes shield HP off the active; the bounce then hits the last living reserve for ${c.values.ricochetPct}%, with no Tank guard on a reserve.`,
        setup: () => ({ a: [{ species: 'stoneguard' }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }, { species: 'tinhare', overall: 99 }, { species: 'mudlark', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('primary on b0, ricochet on b2 (the last reserve)', d.length === 2 && d[0].target === 'b0' && d[0].shield?.poolLoss >= 1 && d[1].target === 'b2' && d[1].tag === 'followUp', d.map((e) => e.target)); h.check('no Striker break on the primary', d[0]?.shield?.breakMult === 1); h.check(`ricochet ${h.values.ricochetPct}%, no Tank guard`, d[1]?.mult === h.values.ricochetPct / 100 && !d[1].guard); h.executed(1); } },
      { id: 'no-shield', kind: 'blocked', title: 'The enemy active is not Shielded: ordinary attack, use kept',
        explain: () => 'Without a shield on the active the bank shot cannot be set up: unmet reported, ordinary attack.',
        setup: () => ({ a: [{ species: 'stoneguard' }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /Shielded/.test(u.condition))); h.check('use kept', h.state('a0')?.used === false); } },
      { id: 'no-reserve', kind: 'blocked', title: 'A Shielded enemy with no living reserve: ordinary attack, use kept',
        explain: () => 'With no reserve to bounce into, the bank shot is not used.',
        setup: () => ({ a: [{ species: 'stoneguard' }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /reserve/.test(u.condition))); h.check('use kept', h.state('a0')?.used === false); } },
      { id: 'missed-primary', kind: 'miss', title: 'The primary misses (controlled miss): no ricochet, the use is still spent',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe supplies an explicit miss on the primary. No shield HP is removed, so no bounce; the once-use is spent on launch.',
        setup: () => ({ a: [{ species: 'stoneguard' }], b: [{ species: 'gravelpup', overall: 99, status: SHIELD }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 }, probes: [{ missCheck: (v, id, info) => (id === 'b0' && info.abilityId === 'EAR-04-C' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('primary missed', h.has('miss', (e) => e.actor === 'a0')); h.check('no ricochet', h.ab('damage').length === 0); h.check('use spent', h.state('a0')?.used === true); } },
    ],
  },
});
