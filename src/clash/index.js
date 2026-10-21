// Beast Clash public surface. Phase 2 imports from here and nowhere else.
// Phase 1 boundary: src/clash imports only from src/core/rng.js and src/data/; nothing in src/sim or
// src/franchise imports from src/clash (tests/clash/boundary.test.js enforces both directions).
export { CLASH_VALUES, TAG_LABEL, battleConfig, activeExperiments } from './values.js';
export { BEATS, TYPES, typeFactor, typeEdge, CONDITION_BY_TYPE, CONDITION_LABEL } from './types.js';
export { buildCombatant, archetypeOf, speciesList } from './stats.js';
export { KINDS, TRIGGERS, EFFECTS } from './handlers.js';
export { CONDITION_KINDS, applyCondition, tickCondition, consumeShock, cleanse, pauseCondition, resumeCondition, freshState } from './conditions.js';
export { simulateClash, replayKey, parseReplayKey, logHash, rampFor, rampModelFor } from './engine.js';
export { POLICIES, POLICY_LABEL, chooseSwap, chooseLineup } from './ai.js';
export { battleXp, diminishing, starterRate, sessionXp } from './xp.js';
export { projectWeek, projectSeason, battleWarning, sundayInjury, battleInjury, saturdayRecovery, warningLevel } from './load.js';
export { validateMoves, cardCheck } from './validate.js';
export { CLASH_MOVES, CLASH_MOVE_IDS } from '../data/clash-moves.js';
