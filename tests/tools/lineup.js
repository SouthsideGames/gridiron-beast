// Dev helper: a 7v7 lineup (attributes per slot) for engine batches.
//
// Frozen lineups (tests): Task 8 M1 replaced the monster generator, so the same (seed, quality) now generates different players.
// The football engine did not change, so the engine tests keep their pinned expectations by being fed the SAME players as before:
// for every (seed, quality) the tests use, lineup() returns the lineup computed at dd2245d (the last broadly regression-tested
// build before the switch), frozen in tests/fixtures/legacy-lineups.json. Each call returns a fresh copy.
//
// Generated lineups (dev tools only): any other (seed, quality) — e.g. the batches under tools/ — is generated with today's
// generator, as before. Tests must not rely on this path; pass `{ generate: true }` to force it for a frozen pair.
import fs from 'node:fs';
import { createRng } from '../../src/core/rng.js';
import { generateMonster, effectiveAttributes } from '../../src/data/monsters.js';
import { positionOf, OFFENSE_SLOTS, DEFENSE_SLOTS } from '../../src/data/personnel.js';

const FROZEN = JSON.parse(fs.readFileSync(new URL('../fixtures/legacy-lineups.json', import.meta.url), 'utf8')).lineups;
/** Whether lineup(seed, quality) is a frozen dd2245d lineup. */
export const isFrozenLineup = (seed = 7, quality = 60) => Object.hasOwn(FROZEN, `${seed},${quality}`);

export function lineup(seed = 7, quality = 60, { generate = false } = {}) {
  if (!generate && isFrozenLineup(seed, quality)) return structuredClone(FROZEN[`${seed},${quality}`]);
  return generatedLineup(seed, quality);
}
/** GENERATOR PATH (dev tools): a lineup from today's generator. Not used by the tests. */
export function generatedLineup(seed = 7, quality = 60) {
  const rng = createRng(seed);
  const out = { offense: {}, defense: {} };
  for (const slot of OFFENSE_SLOTS) { const m = generateMonster(rng, { position: positionOf(slot), quality }); out.offense[slot] = { attrs: effectiveAttributes(m), name: m.name }; }
  for (const slot of DEFENSE_SLOTS) { const m = generateMonster(rng, { position: positionOf(slot), quality }); out.defense[slot] = { attrs: effectiveAttributes(m), name: m.name }; }
  return out;
}
