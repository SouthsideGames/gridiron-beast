// Evolution report (GDD §51): what an evolution actually changed, for the full-screen evolution scene. Pure and read-only:
// the evolution itself is performed (once) by franchise.evolveMonster → monsters.tryEvolve before anything is shown, so the
// scene only presents the difference between two snapshots. Nothing here is invented: unchanged attributes are not
// improvements, an ability is listed only if it differs, salary follows the contract rule (unchanged until renewal).
import { ATTRIBUTES } from '../data/personnel.js';
import { monsterOverall, speciesEffect, nextEvolution, resolveSpecies } from '../data/monsters.js';
import { ATTR_NAME } from '../data/stat-guide.js';

/** Everything the scene shows about a monster at one moment (deep copy of the values, never a reference). */
export function evolutionSnapshot(m) {
  const eff = speciesEffect(m);
  return {
    id: m.id, name: m.name, species: m.species, stage: m.stage || 0, type: m.type || resolveSpecies(m).element || null, position: m.position,
    level: m.level || 1, overall: monsterOverall(m), potential: m.potential ?? null, salary: m.salary ?? null,
    attributes: Object.fromEntries(ATTRIBUTES.map((k) => [k, m.attributes?.[k] ?? 0])), ability: eff ? { name: eff.name, kind: eff.kind } : null,
  };
}

/** The difference between the snapshots taken just before and just after `evolveMonster`. `ctx` = { year, week, club }. */
export function evolutionReport(before, after, ctx = {}) {
  const all = ATTRIBUTES.map((k) => ({ key: k, label: ATTR_NAME[k] || k, from: before.attributes[k], to: after.attributes[k], delta: after.attributes[k] - before.attributes[k] }));
  const changed = all.filter((a) => a.delta !== 0).sort((a, b) => b.delta - a.delta || ATTRIBUTES.indexOf(a.key) - ATTRIBUTES.indexOf(b.key));
  const abilityChanged = (before.ability?.name || null) !== (after.ability?.name || null);
  const next = nextEvolution({ species: after.species, stage: after.stage, level: after.level, name: after.name });
  return {
    id: after.id, fromName: before.name, toName: after.name, type: after.type, position: after.position,
    fromStage: before.stage, toStage: after.stage, level: after.level,
    overall: { from: before.overall, to: after.overall, delta: after.overall - before.overall },
    potential: before.potential != null && after.potential != null ? { from: before.potential, to: after.potential, delta: after.potential - before.potential } : null,
    changed, all,
    ability: abilityChanged && after.ability ? { from: before.ability?.name || null, to: after.ability.name, kind: after.ability.kind } : null,
    salary: { unchanged: before.salary === after.salary, amount: after.salary },
    next: next ? { name: next.name, level: next.level } : null, // the next form, or null when this is the final form
    milestone: { year: ctx.year ?? null, week: ctx.week ?? null, club: ctx.club ?? null },
  };
}
