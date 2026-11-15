// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { PLAYS } from '../../data/playbook.js';
import { stageOf, byMastery, scrimmage } from './common.js';

export const STRENGTH = [15, 20, 25]; // by form
export const COOLDOWN = [6, 5, 4, 3]; // by mastery
export const LIFETIME = [3, 3, 4, 5]; // by mastery
export const RUNWAY = Object.freeze({ width: 6, length: 10 });

/** The most common lateral alignment of each offensive slot across the playbook (pre-choice reference). */
export const SLOT_LATERAL = (() => {
  const count = {};
  for (const p of Object.values(PLAYS)) if (p.side === 'offense' && p.align) for (const [s, xy] of Object.entries(p.align)) { const k = (count[s] ||= {}); k[xy[1]] = (k[xy[1]] || 0) + 1; }
  const out = {}; for (const [s, k] of Object.entries(count)) out[s] = Number(Object.entries(k).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0][0]);
  return Object.freeze(out);
})();

export default registerAbility({
  family: 'gustling', abilityId: 'WIN-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  preSnap(api, self) {
    if (api.fields().some((f) => f.owner === self.mid && f.ability === 'WIN-01-F')) return;
    if (api.side !== 'off') return; const st = api.state(); if (st.cd > 0) return;
    api.queueField({ owner: self.mid, ownerTeam: api.teamSide, type: 'Wind', ability: 'WIN-01-F', strength: STRENGTH[stageOf(self.form)] ?? STRENGTH[0],
      lifetime: byMastery(LIFETIME, self.mastery), clock: 'ownerOffense', width: RUNWAY.width, los: [0, RUNWAY.length], latFromBall: SLOT_LATERAL[self.slot] ?? 0, clipWidth: true });
    st.cd = byMastery(COOLDOWN, self.mastery); st.fresh = true; api.executed();
  },
  hooks: {
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (st.fresh) { st.fresh = false; return; } // the creating play is excluded
      if (st.cd > 0) st.cd -= 1;
    },
  },
});
