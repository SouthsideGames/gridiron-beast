// Task 8 WP1: read-only access to the authoritative Beast Dex (192 families, 222 forms, 144 mode abilities).
// Data comes from beast-dex.generated.js (tools/build-beast-dex.mjs). This module is not yet wired into gameplay: the running
// game still reads src/data/species.js until the Task 8 generator and fresh-save schema replace it.
import { FAMILIES, FORMS, ABILITIES, RULES, SOURCE, APPROVED_RULINGS } from './beast-dex.generated.js';

const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };
deepFreeze(FAMILIES); deepFreeze(FORMS); deepFreeze(ABILITIES); deepFreeze(RULES); deepFreeze(APPROVED_RULINGS);

export { FAMILIES, FORMS, ABILITIES, RULES, SOURCE, APPROVED_RULINGS };

/** Rarities from lowest to highest. Basic sits below Common (APPROVED_RULES.md). Apex is an individual designation, not a rarity. */
export const RARITY_ORDER = Object.freeze(['basic', 'common', 'uncommon', 'rare', 'legendary']);
export const POSITIONS = Object.freeze(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']);
export const ARCHETYPES = Object.freeze(['Striker', 'Tank', 'Support', 'Disruptor', 'Balanced']);
export const ATTRIBUTES = RULES.attributeOrder;

const FAMILY_BY_ID = new Map(FAMILIES.map((f) => [f.id, f]));
const FORM_BY_ID = new Map(FORMS.map((f) => [f.id, f]));
const ABILITY_BY_ID = new Map(ABILITIES.map((a) => [a.id, a]));
const FORMS_BY_FAMILY = new Map();
for (const f of FORMS) { if (!FORMS_BY_FAMILY.has(f.familyId)) FORMS_BY_FAMILY.set(f.familyId, []); FORMS_BY_FAMILY.get(f.familyId).push(f); }
for (const list of FORMS_BY_FAMILY.values()) list.sort((a, b) => a.stage - b.stage);

/** The family record, or null. Never falls back to another family (unlike the legacy resolveSpecies hash fallback). */
export const familyById = (id) => FAMILY_BY_ID.get(id) || null;
/** A form by its `family:stage` id, or null. */
export const formById = (id) => FORM_BY_ID.get(id) || null;
export const formId = (familyId, stage) => `${familyId}:${stage}`;
/** Forms of a family, ordered by stage. Basic families have exactly one (stage 0). */
export const formsOf = (familyId) => FORMS_BY_FAMILY.get(familyId) || [];
export const abilityById = (id) => ABILITY_BY_ID.get(id) || null;
/** Approved numeric values attached by an owner ruling (task8-overrides.json), or null. Throws for an unknown ability. */
export function approvedValues(abilityId) { const a = abilityById(abilityId); if (!a) throw new Error(`unknown ability ${abilityId}`); return a.values || null; }
/** An approved global ruling by id (e.g. 'clash-rotation'). Throws if missing, so callers never run on an unapproved rule. */
export function approvedRule(id) { const r = APPROVED_RULINGS.rules.find((x) => x.id === id); if (!r) throw new Error(`no approved ruling "${id}"`); return r; }
/** The family's mode abilities: { football, clash } records, each null when the family has none (all Basics). */
export function abilitiesOf(familyId) {
  const f = familyById(familyId); if (!f) return null;
  return { football: f.abilities.football ? abilityById(f.abilities.football) : null, clash: f.abilities.clash ? abilityById(f.abilities.clash) : null };
}
/** Clash archetype lives on the family (BASIC_AUDIT §4.3), so families without a unique move still have one. */
export const archetypeOf = (familyId) => familyById(familyId)?.clashArchetype || null;
export const isBasic = (familyId) => familyById(familyId)?.rarity === 'basic';
/** Whether a family evolves (has a form beyond stage 0). Basics never do. */
export const evolves = (familyId) => formsOf(familyId).length > 1;
/** The next form a family can evolve into from `stage`, or null. */
export function nextForm(familyId, stage) { return formsOf(familyId).find((f) => f.stage === stage + 1) || null; }
export const familiesAt = (position) => FAMILIES.filter((f) => f.position === position);

/** Counts used by validation and the reviewers. */
export function dexCounts() {
  const by = (list, key) => list.reduce((m, x) => ((m[x[key]] = (m[x[key]] || 0) + 1), m), {});
  return { families: FAMILIES.length, forms: FORMS.length, abilities: ABILITIES.length, byRarity: by(FAMILIES, 'rarity'), byMode: by(ABILITIES, 'mode'), byArchetype: by(FAMILIES, 'clashArchetype') };
}
