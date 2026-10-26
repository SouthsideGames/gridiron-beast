// Evolution Preview (Developer Tools): the real evolution scene for any valid transition, on throwaway data. The transitions are
// read from the species dex (a species' own `evolution` list: stage 0 → 1, and 1 → 2 where a second form exists); Legendaries and
// standalone species have none and are never offered. A preview builds a temporary monster of that species and stage, snapshots
// it, applies the REAL `tryEvolve` to a deep copy, and builds the REAL `evolutionReport` from the two snapshots: exactly what the
// roster's Evolve button hands the scene, minus `franchise.evolveMonster`'s bookkeeping (Career Timeline, Dex, news). Pure: no
// franchise, roster, save, collection, achievement or resource is read or written, and the returned objects are fresh each call.
import { SPECIES_DEX } from '../data/species.js';
import { generateMonster, tryEvolve, resolveSpecies } from '../data/monsters.js';
import { evolutionSnapshot, evolutionReport } from '../franchise/evolution-report.js';
import { createRng, hashString } from '../core/rng.js';

/** Every valid evolution transition in the dex: [{ species, fromStage, toStage, fromName, toName, level, position, element, rarity }]. */
export function previewTransitions() {
  const out = [];
  for (const sp of SPECIES_DEX) {
    const chain = sp.evolution || [];
    if (sp.rarity === 'legendary' || !chain.length) continue; // Legendaries and standalone species do not evolve
    chain.forEach((next, i) => out.push({ species: sp.id, fromStage: i, toStage: i + 1, fromName: i === 0 ? sp.name : chain[i - 1].name, toName: next.name, level: next.level, position: sp.position, element: sp.element, rarity: sp.rarity }));
  }
  return out;
}
/** Species with at least one transition, in dex order: [{ species, name, element, rarity, stages }]. */
export function previewSpecies() {
  const seen = new Map();
  for (const t of previewTransitions()) { const sp = resolveSpecies(t.species); if (!seen.has(t.species)) seen.set(t.species, { species: t.species, name: sp.name, element: sp.element, rarity: sp.rarity, stages: 0 }); seen.get(t.species).stages++; }
  return [...seen.values()];
}
/** Is `fromStage` → `fromStage + 1` a real transition for this species? */
export function isValidTransition(speciesId, fromStage) { return previewTransitions().some((t) => t.species === speciesId && t.fromStage === fromStage); }

/**
 * Build one preview: { transition, beforeMon, afterMon, report } for the scene, or null for an invalid transition.
 * `seed` fixes the temporary monster's ratings (the same seed gives the same preview).
 */
export function buildPreview(speciesId, fromStage = 0, { seed = 1 } = {}) {
  const t = previewTransitions().find((x) => x.species === speciesId && x.fromStage === fromStage); if (!t) return null;
  const m = generateMonster(createRng(hashString(`evo-preview|${speciesId}|${fromStage}|${seed}`)), { species: speciesId, quality: 62, id: `preview_${speciesId}_${fromStage}` });
  m.stage = fromStage; m.name = t.fromName; m.level = t.level; m.xp = 0; m.potential = m.potential ?? 72; m.salary = m.salary ?? null; m.fatigue = 0; m.injury = null;
  const before = evolutionSnapshot(m);
  const beforeMon = structuredClone(m);
  const afterMon = structuredClone(m);
  const ev = tryEvolve(afterMon); // the real evolution rule, on a copy that nothing keeps
  if (!ev) return null;
  const report = evolutionReport(before, evolutionSnapshot(afterMon), {}); // no year/week/club: nothing was recorded anywhere
  return { transition: t, beforeMon, afterMon, report };
}
