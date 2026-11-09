// ELE-06-C Twin Thunder (stormcrown: Voltarch; Striker, legendary). Batch D.
// Contract (Dex; closeouts 9B, 10A): once per Clash, replace the first eligible own normal action with summoning TWO guards (Stunned
// postpones the setup). After a qualifying normal attack of Voltarch that deals actual HP damage, ONE guard bolts the SAME surviving ACTIVE
// enemy for 40 / 50 / 60 / 70% normal attack damage by mastery; a miss or full shield absorption of the attack preserves the guard; if the
// target is knocked out, removed or replaced before the launch, the guard is kept (no redirect, no follow into reserve). Retaliation from
// the original attack resolves FIRST; if Voltarch is then knocked out or Stunned it does not launch (a surviving Stunned Voltarch keeps its
// guard). Each bolt has its own explicit misses, type, shield and reduction, and launching spends it even if it misses. Unused guards
// persist in reserve with no countdown; Voltarch's KO removes them; revival does not restore them. Constructs have no HP, slot or turns.
// Bolts grant no extra turn, attack-counter progress or ordinary-only perks, and cannot chain (tag followUp; an extra strike for Stone
// Divide). P9 diagnostic: two constructs per battle. Mastery execution: the summon.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, isNormal, SPAR } from './util.js';

const BOLT = [40, 50, 60, 70]; const GUARDS = 2;

export default registerClashAbility({
  family: 'stormcrown', abilityId: 'ELE-06-C',
  initBattle: () => ({ summoned: false, guards: 0 }),
  values: (form, tier) => ({ boltPct: byTier(BOLT, tier), guards: GUARDS }),
  hooks: {
    chooseAction(api, self) {
      const st = self.state; if (st.summoned) return null;
      st.summoned = true; st.guards = GUARDS; api.construct(self, GUARDS);
      api.activate(self, 'two guards summoned instead of the normal action'); api.executed(self);
      return { kind: 'done' };
    },
    followUp(api, self, info) {
      const st = self.state; if (!st.guards || info.attackerId !== self.id || !isNormal(info.tag) || !info.inAction) return;
      const hp = info.hits.reduce((s, h) => s + (h.losses?.[info.targetId] ?? 0), 0);
      if (hp <= 0) return; // a miss or full absorption keeps the guard
      const me = api.me(self); const t = api.get(info.targetId);
      if (me.koed) return;
      if (me.stunned) { api.cleanup(self, 'Stunned after the retaliation: the guard is kept'); return; }
      if (t.koed || !t.active || t.side === self.side) { api.cleanup(self, 'the target is gone: the guard is kept (no redirect)'); return; }
      st.guards -= 1; api.construct(self, -1);
      api.activate(self, `a guard bolts ${t.name} (${st.guards} left)`, { targetId: t.id });
      api.strike(self, t.id, { tag: 'followUp', mult: byTier(BOLT, self.tier) / 100, strikeKey: 'bolt', label: 'Twin Thunder bolt' });
    },
    onKO(api, self) { if (self.state.guards) { api.construct(self, -self.state.guards); self.state.guards = 0; api.cleanup(self, 'Voltarch\'s knockout removes its guards'); } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Summon on turn 1; each of the next two HP-damaging attacks launches one bolt at the same target',
        explain: (c) => `Voltarch summons two guards, then each of its attacks that deals HP damage sends one ${c.values.boltPct}% bolt at the same active enemy.`,
        setup: () => ({ a: [{ species: 'stormcrown', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const b = h.ab('damage', (e) => e.tag === 'followUp'); h.check('bolts on exchanges 2 and 3', b.map((e) => e.ex).join(',') === '2,3', b.map((e) => e.ex)); h.check(`${h.values.boltPct}%`, b.every((e) => e.mult === h.values.boltPct / 100)); h.check('constructs diagnostic within 2', r.diagnostics.constructs === 0 && r.diagnostics.overflow.length === 0); h.executed(1); } },
      { id: 'absorbed-keeps', kind: 'blocked', title: 'Full shield absorption: no HP damage, the guards are kept',
        explain: () => 'The opponent holds a large staged shield: no attack reaches HP, so no bolt launches.',
        setup: () => ({ a: [{ species: 'stormcrown', overall: 30 }], b: [{ species: 'gravelpup', overall: 99, sparring: true, status: { id: 'shielded', strength: 999, duration: 9 } }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('no bolt, two guards kept', h.ab('damage', (e) => e.tag === 'followUp').length === 0 && h.state('a0')?.guards === 2); } },
      { id: 'source-ko', kind: 'sourceKO', title: 'Voltarch\'s knockout removes the unused guards',
        explain: () => 'Staged: Voltarch has summoned (controlled prerequisite) and is at 1 HP; it is knocked out and its guards vanish.',
        setup: () => ({ a: [{ species: 'stormcrown', hp: 1, ability: { summoned: true, guards: 2 } }, { species: 'tidepaw' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('cleanup on the knockout', h.has('cleanup', (e) => e.abilityId === 'ELE-06-C' && /removes its guards/.test(e.text))); } },
    ],
  },
});
