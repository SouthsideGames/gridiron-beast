// Frozen Clash test monsters: the exact monsters an earlier build's generator made for fixed (species, seed, overall) inputs.
//
// Several Clash engine tests pin log hashes for lineups built from `mon(id, seed, { overall })` / `syntheticMonster(species,
// { seed, overall })`. Task 8 M1 replaced the monster generator (Dex individuals, level 1, prior careers), so the same seeds now
// give different monsters. The Clash engine did not change, so these tests keep their pinned expectations by feeding the engine
// the SAME monsters as when the expectation was pinned, frozen as data in fixtures/legacy-monsters.json:
//   'dd2245d'  the last broadly regression-tested build before the generator switch (original 72 species at their original
//              positions). Expectations pinned before Task 8 M1: pre-1.1.0-snapshot.json, golden-v1.0.0.json, Gate B.4.
//   '75f2a27'  the species-table switch (Dex positions for the 7 moved species, old generator). golden.json was re-pinned there.
// Each entry, keyed `${species}|${seed}|${overall}`, is that build's generateMonster(createRng(seed), { species, position:
// <that build's species position>, quality: overall, type: <element> }) reduced to the fields a Clash combatant and a replay
// key read (engine.js replayKey snap(): id, name, species, position, nature, level, stage, potential, fatigue, attributes).
// helpers.js mon() and batch.js syntheticMonster() made identical monsters on those builds (nature null = drawn), so one key
// space serves both. A missing key throws: add it by recomputing on that build, never by generating with today's generator.
import fs from 'node:fs';
import { SPECIES_DEX as ORIGINAL_72 } from '../../src/data/species-legacy.js';

const FIX = JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-monsters.json', import.meta.url), 'utf8'));
const key = (species, seed, overall) => `${species}|${seed}|${overall}`;

/** Frozen counterparts of helpers.js mon() / randomLineup() and batch.js syntheticMonster(), bound to one build's monsters. */
export function legacyMonsters(build) {
  const table = FIX.builds[build]; if (!table) throw new Error(`No frozen monsters for build ${build}`);
  const frozen = (species, seed, overall) => {
    const s = table[key(species, seed, overall)];
    if (!s) throw new Error(`No frozen ${build} monster for ${key(species, seed, overall)} (tests/clash/fixtures/legacy-monsters.json)`);
    return structuredClone(s);
  };
  // nature overrides and durability offsets are not supported: none of the frozen inputs used them.
  const mon = (id, seed = 1, { overall = 65, fatigue = 0, stage = 0 } = {}) => { const m = frozen(id, seed, overall); m.fatigue = fatigue; if (stage) m.stage = stage; return m; };
  const synthetic = (species, { seed = 1, overall = 65 } = {}) => frozen(species, seed, overall);
  // identical draws from `rng` to helpers.js randomLineup()
  const randomLineup = (rng, n, pool = ORIGINAL_72.map((s) => s.id)) => Array.from({ length: n }, () => mon(pool[rng.int(pool.length)], rng.seed(), { overall: 60 + rng.int(10) }));
  return { mon, synthetic, randomLineup };
}
