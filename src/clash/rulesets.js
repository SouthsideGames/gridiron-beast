// Beast Clash rulesets (Task 8 M4 S0). Two engines live side by side:
//   - the FROZEN legacy engine (engine.js, handlers.js, conditions.js, ai.js, stats.js and the legacy move tables), which plays
//     the values 1.1.0 'current' ruleset and the historical 'v1.0.0' ruleset exactly as before, so finished records, replay keys
//     and the golden fixtures keep their meaning;
//   - the Task 8 engine, ruleset 't8' (src/clash/t8/), built step by step through M4 and not used by the franchise until S12.
// This module only routes a battle to the engine its ruleset names. It is not exported from src/clash/index.js yet, so nothing
// the game loads reaches it (no import-map change); S12 wires it into the franchise adapter.
import { simulateClash as simulateLegacy, logHash as legacyLogHash } from './engine.js';
import { CLASH_VALUES } from './values.js';
import { simulateClashT8, t8LogHash } from './t8/engine.js';

export const T8_RULESET = 't8';
/** Rulesets the frozen legacy engine plays (the keys of values.js `rulesets`, minus its tag/default bookkeeping). */
export const LEGACY_RULESETS = Object.freeze(Object.keys(CLASH_VALUES.rulesets).filter((k) => CLASH_VALUES.rulesets[k]?.label));
export const isLegacyRuleset = (r) => r == null || LEGACY_RULESETS.includes(r);
export const isT8Ruleset = (r) => r === T8_RULESET;

/** Run a battle on the engine its `config.ruleset` names (default: the legacy permanent ruleset, unchanged). */
export function simulateByRuleset(args = {}) {
  const r = args.config?.ruleset;
  if (isLegacyRuleset(r)) return simulateLegacy(args);
  if (isT8Ruleset(r)) return simulateClashT8(args);
  throw new Error(`Unknown Clash ruleset ${r}`);
}
export const logHashFor = (result) => (result.ruleset === T8_RULESET ? t8LogHash(result) : legacyLogHash(result));
