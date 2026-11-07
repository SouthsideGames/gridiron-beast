// Task 8 WP10 (catalogue shell): the complete list the football and Beast Clash ability reviewers must cover (spec §13:
// "Enumerate all 144 mode abilities and every approved form/mastery variant with no silent missing entries").
// Pure data built from the Beast Dex; no rendering, no engine, no franchise access. The reviewers' scenario and rendering layers
// are later work packages and will consume this list.
import { ABILITIES, FAMILIES, formsOf, familyById } from '../data/beast-dex.js';

/** Approved mastery tiers (spec §6), in order. Thresholds are owned by the progression package, not the catalogue. */
export const MASTERY_TIERS = Object.freeze(['Developing', 'Practiced', 'Expert', 'Mastered']);
export const MODES = Object.freeze(['football', 'clash']);

/** One reviewable variant per ability × form × mastery tier. */
export function buildCatalogue() {
  const entries = ABILITIES.map((a) => {
    const fam = familyById(a.familyId);
    const forms = formsOf(a.familyId);
    const variants = forms.flatMap((f) => MASTERY_TIERS.map((tier) => Object.freeze({ id: `${a.id}:${f.id}:${tier}`, abilityId: a.id, formId: f.id, formName: f.name, stage: f.stage, tier })));
    return Object.freeze({
      id: a.id, mode: a.mode, name: a.name, familyId: a.familyId, familyName: fam.name, type: fam.type, rarity: fam.rarity, position: fam.position, archetype: fam.clashArchetype,
      category: a.category, activation: a.activation, designStatus: a.designStatus, forms: Object.freeze(forms.map((f) => f.id)), variants: Object.freeze(variants),
    });
  });
  const noUnique = FAMILIES.filter((f) => !f.abilities.football && !f.abilities.clash).map((f) => f.id);
  return Object.freeze({ entries: Object.freeze(entries), familiesWithoutUniqueAbilities: Object.freeze(noUnique) });
}

/** Completeness check used by tests and, later, by both reviewer screens: every family is accounted for exactly once per mode. */
export function catalogueProblems(cat = buildCatalogue()) {
  const p = [];
  for (const mode of MODES) {
    const list = cat.entries.filter((e) => e.mode === mode);
    const fams = new Set(list.map((e) => e.familyId));
    if (fams.size !== list.length) p.push(`${mode}: a family has more than one ability`);
    for (const f of FAMILIES) {
      const has = fams.has(f.id); const expected = !!(mode === 'football' ? f.abilities.football : f.abilities.clash);
      if (has !== expected) p.push(`${mode}: family ${f.id} ${expected ? 'missing from' : 'unexpectedly in'} the catalogue`);
    }
  }
  const ids = cat.entries.flatMap((e) => e.variants.map((v) => v.id));
  if (new Set(ids).size !== ids.length) p.push('duplicate variant ids');
  for (const e of cat.entries) if (e.variants.length !== e.forms.length * MASTERY_TIERS.length) p.push(`${e.id}: variant count mismatch`);
  return p;
}
