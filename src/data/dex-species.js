// Task 8 WP1: the game-side species table built from the authoritative Beast Dex (192 families), in the record shape the
// game's species consumers use (id, name, element, rarity, position, sprite spec, personality, evolution). Not yet wired:
// src/data/species.js remains the live table until milestone M1 (fresh-save switch, docs/task8/BUILD_PLAN.md).
//
// Mapping rules:
// - Dex fields win: name, type → element, rarity (Basic included), position, appearance → sprite spec, description → personality,
//   forms → evolution [{ name, level }]. The 7 position and 7 rarity changes against the legacy table are owner-approved (Appendix A).
// - Game metadata the Dex does not carry is kept from the legacy table for the original 72: rare home regions, rare
//   first week and the cornerstone flag (cornerstone eligibility rules still apply, B15). Basics get none of these.
// - Legacy traits and legacy ability effects are NOT carried: traits are retired (N7c B13) and every family's football and Clash
//   abilities come from the Dex contract registry (WP6, WP7). Basics have no unique ability.
import { FAMILIES, formsOf, abilitiesOf } from './beast-dex.js';
import { SPECIES_DEX as LEGACY } from './species-legacy.js';
import { dexLine, dexKey } from '../text/dex.js';

const LEGACY_BY_ID = new Map(LEGACY.map((s) => [s.id, s]));

const spriteSpec = (a) => ({ body: a.body, size: a.size, look: a.look, features: [...a.features], colors: [...a.colors], ...(a.pattern ? { pattern: a.pattern } : {}) });

function speciesFromFamily(f) {
  const old = LEGACY_BY_ID.get(f.id);
  const ab = abilitiesOf(f.id);
  const rec = {
    id: f.id, name: f.name, element: f.type, rarity: f.rarity, position: f.position, clashArchetype: f.clashArchetype,
    // Sprite spec: the original 102 forms keep their approved art exactly (legacy spec); Basics use their Dex recipe.
    ...spriteSpec(old || f.appearance),
    personality: dexLine(dexKey.familyDescription(f.id), f.description),
    evolution: formsOf(f.id).slice(1).map((x) => ({ name: x.name, level: x.evolutionLevel })),
    dexAbilities: { football: ab.football?.id || null, clash: ab.clash?.id || null },
    standalone: f.standalone,
  };
  if (old?.regions) rec.regions = [...old.regions];
  if (old?.fromWeek) rec.fromWeek = old.fromWeek;
  if (old?.cornerstone) rec.cornerstone = true;
  return Object.freeze(rec);
}

export const DEX_SPECIES = Object.freeze(FAMILIES.map(speciesFromFamily));
export const DEX_SPECIES_BY_ID = Object.freeze(Object.fromEntries(DEX_SPECIES.map((s) => [s.id, s])));

/** Differences against the legacy table for the original 72 (for the migration report and tests). */
export function legacyDifferences() {
  const out = [];
  for (const s of LEGACY) {
    const d = DEX_SPECIES_BY_ID[s.id]; if (!d) { out.push({ id: s.id, field: 'missing' }); continue; }
    for (const [field, a, b] of [['name', s.name, d.name], ['element', s.element, d.element], ['position', s.position, d.position], ['rarity', s.rarity, d.rarity],
      ['evolution', JSON.stringify(s.evolution), JSON.stringify(d.evolution)]]) if (a !== b) out.push({ id: s.id, field, legacy: a, dex: b });
  }
  return out;
}
