// DRA-05-F Dragon Roar (vyrnax, K). Task 8 M3 (special action; player-activated, formula kick).
// Contract (Dex): the player chooses one field-goal attempt per game to activate before the kick; an eligible chosen attempt is up to
// 90 yards. The activated kick uses this exact success chart at every mastery: 90 yd 30%, 85 yd 40%, 80 yd 45%, 75 yd 50%, 70 yd 55%,
// 65 yd or less 100%, with smooth linear interpolation between the listed distances; it supplies the range up to 90 and uses the chart
// directly (it replaces the original distance-relief, floor and automatic 45-yard proposals). Once per game, spent on the activated
// kick's launch whether it is made or missed; the spent state survives halftime and overtime (game-scope state). Cancelling before the
// launch keeps the use. Extra points, punts, kickoffs and every other kick use the ordinary calculation. One actual kick at the real
// distance (recorded as an ordinary attempt with its distance and result); no retry, fake short distance, field or status. Above 90
// is outside this chart: the activation is unavailable there. Normal activation availability applies.
// Wiring: rules.js doFieldGoal(state, teams, { signature: true }) and fieldGoalSignature(state, teams) (the decision UI's availability
// and chance). The chart is data (CHART), checked against the contract text by the tests.
import { registerAbility } from './registry.js';

export const CHART = Object.freeze([[65, 1], [70, 0.55], [75, 0.5], [80, 0.45], [85, 0.4], [90, 0.3]]); // [distance, chance]
/** The activated success chance at `distance` yards (null above 90). */
export function roarChance(distance) {
  if (distance <= CHART[0][0]) return 1;
  for (let i = 1; i < CHART.length; i++) { const [d1, p1] = CHART[i], [d0, p0] = CHART[i - 1]; if (distance <= d1) return p0 + ((p1 - p0) * (distance - d0)) / (d1 - d0); }
  return null;
}

export default registerAbility({
  family: 'vyrnax', abilityId: 'DRA-05-F',
  initGame: () => ({ used: false }),
  review: { choices: (state) => (state.phase === 'scrimmage' && state.possession === 'home' && state.down === 4 ? { fourthDown: 'fg', fgSignature: true } : null) }, // reviewer staging: the player's Dragon Roar call (the AI never activates it)
  fieldGoal: Object.freeze({
    label: 'Dragon Roar',
    chance: (distance) => roarChance(distance),
    available: (st, distance) => !st.used && roarChance(distance) != null,
    spend: (st) => { st.used = true; },
  }),
  hooks: {},
});
