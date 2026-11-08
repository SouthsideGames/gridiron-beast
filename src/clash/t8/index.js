// Beast Clash ruleset 't8' (Task 8 M4): the public surface of the Task 8 engine. Not exported from src/clash/index.js and not
// reachable from the game yet; src/clash/rulesets.js routes `ruleset: 't8'` here, and S12 connects the franchise.
export { T8_VALUES, T8_PROVISIONAL } from './values.js';
export { buildT8Combatant, perksOf } from './combatant.js';
export { CLOCK_KINDS, addClock, tickClocks, clearClocks } from './clock.js';
export { simulateClashT8, t8Config, t8ReplayKey, parseT8ReplayKey, t8LogHash, roundHalfUp } from './engine.js';
export { T8_CONTEXTS } from './engine.js';
export { resolveAmount, splitRaw, ROUNDING } from './arith.js';
export { applyClash, orderAttempts, endOfTurn as statusEndOfTurn, clashEffect, afflictedTick, absorb, cleanse, replaceWith, toFootball, fromFootball, CLASH_STATUS_VALUES } from './status.js';
export { B12_TOLERANCES, toleranceFor, b12SampleSize } from './tolerances.js';
