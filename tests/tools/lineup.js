// Dev helper: a generated 7v7 lineup (attributes per slot) for engine batches.
import { createRng } from '../../src/core/rng.js';
import { generateMonster, effectiveAttributes } from '../../src/data/monsters.js';
import { positionOf, OFFENSE_SLOTS, DEFENSE_SLOTS } from '../../src/data/personnel.js';
export function lineup(seed = 7, quality = 60) {
  const rng = createRng(seed);
  const out = { offense: {}, defense: {} };
  for (const slot of OFFENSE_SLOTS) { const m = generateMonster(rng, { position: positionOf(slot), quality }); out.offense[slot] = { attrs: effectiveAttributes(m), name: m.name }; }
  for (const slot of DEFENSE_SLOTS) { const m = generateMonster(rng, { position: positionOf(slot), quality }); out.defense[slot] = { attrs: effectiveAttributes(m), name: m.name }; }
  return out;
}
