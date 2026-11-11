// Beast Clash public surface. Phase 2 imports from here and nowhere else.
// Phase 1 boundary: src/clash imports only from src/core/rng.js and src/data/; nothing in src/sim or
// src/franchise imports from src/clash (tests/clash/boundary.test.js enforces both directions).
export { CLASH_VALUES, TAG_LABEL, battleConfig, activeExperiments } from './values.js';
export { BEATS, TYPES, typeFactor, typeEdge, CONDITION_BY_TYPE, CONDITION_LABEL } from './types.js';
export { buildCombatant, archetypeOf, speciesList, labMoveOf } from './stats.js';
export { KINDS, TRIGGERS, EFFECTS } from './handlers.js';
export { CONDITION_KINDS, applyCondition, tickCondition, consumeShock, cleanse, pauseCondition, resumeCondition, freshState } from './conditions.js';
export { simulateClash, replayKey, parseReplayKey, logHash, rampFor, rampModelFor } from './engine.js';
export { POLICIES, POLICY_LABEL, chooseSwap, chooseLineup } from './ai.js';
export { battleXp, diminishing, starterRate, sessionXp } from './xp.js';
export { projectWeek, projectSeason, battleWarning, sundayInjury, battleInjury, saturdayRecovery, warningLevel } from './load.js';
export { validateMoves, cardCheck } from './validate.js';
export { CLASH_MOVES, CLASH_MOVE_IDS } from '../data/clash-moves.js';
// Task 8 M4 S12: the ruleset router and the Task 8 engine's surface. New franchise battles play ruleset 't8'; records from before
// M4 name no ruleset and replay on the frozen legacy engine above (D19). Importing this registers all 72 Clash contracts.
export { simulateByRuleset, logHashFor, T8_RULESET, LEGACY_RULESETS, isLegacyRuleset, isT8Ruleset } from './rulesets.js';
export { T8_VALUES, T8_CONTEXTS, t8Config, t8LogHash, T8_POLICIES, T8_POLICY_LABEL, buildT8Combatant } from './t8/index.js';
