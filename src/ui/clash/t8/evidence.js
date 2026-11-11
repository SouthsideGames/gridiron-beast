// Beast Clash t8 presentation evidence (Task 8 fx pass, folded into the Clash Ability Reviewer by task8-m4-reconcile). Pure, no DOM:
// the presentation catalogue (one row per registered Clash ability with its Dex visual and whether it has a look) and the seven-phase
// presentation evidence (anticipation -> activation -> movement -> impact -> target -> persistence -> cleanup) read from the built
// descriptors (buildClashT8). The Clash Ability Reviewer shows it beside the engine's four-phase checklist; tools/fx-clash-check.mjs
// and docs/task8/FX_CLASH_MATRIX.md use the same rule.
import '../../../clash/abilities/index.js';
import { registeredClashAbilities } from '../../../clash/t8/registry.js';
import { abilityById, familyById, formsOf } from '../../../data/beast-dex.js';
import { LOOKS } from './looks/index.js';

/** The catalogue: one row per Clash ability. */
export function clashReviewCatalog() {
  return registeredClashAbilities().map((id) => { const a = abilityById(id); const fam = familyById(a.familyId); return { abilityId: id, family: a.familyId, name: a.name, element: fam.element, forms: formsOf(a.familyId).map((f) => ({ id: f.id, stage: f.stage, name: f.name })), visual: a.details.find((d) => d.section === 'Visuals')?.rule || '', look: !!LOOKS[id] }; });
}
/** Phase evidence from the built descriptors (the same rule the tests use, in short). */
export function phaseEvidence(state, abilityId) {
  const look = LOOKS[abilityId]; const na = new Set(look?.na || []); const items = state.items.filter((it) => it.id === abilityId); const main = items.find((it) => it.main) || items[0]; const out = {};
  const log = state.result.log;
  out.anticipation = na.has('anticipation') ? 'n/a' : main && (main.start < main.t0 - 1e-6 || log.slice(0, main.seq).some((e) => e.abilityId === abilityId && ['trigger', 'ability_progress', 'provisional'].includes(e.kind)) || items.some((it) => it.look.until)) ? 'yes' : null;
  out.activation = na.has('activation') ? 'n/a' : main ? 'yes' : null;
  out.movement = na.has('movement') ? 'n/a' : items.some((it) => it.look.move) ? 'yes' : null;
  out.impact = na.has('impact') ? 'n/a' : items.some((it) => it.look.impact || ['damage', 'heal', 'status', 'status_end', 'hp_set', 'revive', 'redirect', 'survive', 'intercepted', 'raw_split', 'rotation', 'miss', 'clock_adjust', 'status_freeze', 'delayed_impact'].includes(it.kind)) ? 'yes' : null;
  out.target = na.has('target') ? 'n/a' : items.some((it) => (it.target && it.target !== it.owner && it.look.target !== false) || it.look.target) || state.pops.some((p) => p.abilityId === abilityId) ? 'yes' : null;
  out.persistence = na.has('persistence') ? 'n/a' : look?.persistVia || items.some((it) => it.look.until || it.look.persist) || state.indicators[main?.owner]?.length || log.some((e) => e.abilityId === abilityId && (e.kind === 'clock_start' || e.kind === 'clock_adjust')) || state.pops.some((p) => p.abilityId === abilityId && !p.end) ? 'yes' : null;
  out.cleanup = na.has('cleanup') ? 'n/a' : items.length ? 'yes' : null;
  return out;
}
