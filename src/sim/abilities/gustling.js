// WIN-01-F Runway (gustling: Gustling / Squallow / Stratosoar). Task 8 M3 Wind batch (zone; G2 clock).
// Contract (Dex): before both play choices, on his next participating offensive scrimmage snap while ready, whatever his later route
// or blocking assignment and never reading the selected play, a stationary Wind rectangle appears at the upcoming LOS: 6 yards wide,
// 10 long into the defense, centred on his initial receiver lateral alignment, clipped to the legal field, not following routes.
// Non-Wind monsters of BOTH teams inside gain +15 / +20 / +25% maximum speed by form (the Wind field effect, field-effects.js:
// acceleration unchanged, entering / leaving adds / removes it, same-type neutrality). Cooldown 6 / 5 / 4 / 3 subsequent
// participating offensive plays by mastery, starting at creation, the creating play excluded. Lifetime 1 / 1 / 2 / 2 participating
// offensive scrimmage plays by mastery, the spawn play counting; G2: the clock decrements only on plays the creator takes part in on
// offense and the field stays active while paused. Pending readiness carries across possessions and halftime; the created field
// clears at halftime. No special-teams activation. Form changes strength only.
//
// Choices where the contract is silent (documented, minimal):
// - "Initial receiver lateral alignment" without reading the selected play: his depth-chart slot's most common lateral alignment
//   across the playbook's offensive formations (WR1 -18, WR2 +18, ...), from the ball. A fixed, seeded-free geometry snapshot.
// - Created through the pre-snap producer pass (rules.js preSnapContracts), so it exists only in games run by rules.js; two-point
//   tries and kickoffs neither create it nor count for its cooldown (not scrimmage plays).
import { registerAbility } from './registry.js';
import { PLAYS } from '../../data/playbook.js';
import { stageOf, byMastery, scrimmage } from './common.js';

export const STRENGTH = [15, 20, 25]; // by form
export const COOLDOWN = [6, 5, 4, 3]; // by mastery
export const LIFETIME = [1, 1, 2, 2]; // by mastery
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
    if (api.side !== 'off') return; const st = api.state(); if (st.cd > 0) return;
    api.queueField({ owner: self.mid, ownerTeam: api.teamSide, type: 'Wind', ability: 'WIN-01-F', strength: STRENGTH[stageOf(self.form)] ?? STRENGTH[0],
      lifetime: byMastery(LIFETIME, self.mastery), clock: 'creatorOffense', width: RUNWAY.width, los: [0, RUNWAY.length], latFromBall: SLOT_LATERAL[self.slot] ?? 0, clipWidth: true });
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
