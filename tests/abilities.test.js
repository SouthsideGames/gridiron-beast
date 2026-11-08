// Signature abilities do what their cards say (GDD §23.9, §23.11): once-per scopes, memory, key mechanics.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { manKeyTargets, PLAYS } from '../src/data/playbook.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { createRng } from '../src/core/rng.js';
import { generateMonster, effectiveAttributes } from '../src/data/monsters.js';
import { positionOf } from '../src/data/personnel.js';
import { abilityMemory, rememberAbilities } from '../src/sim/rules.js';

const plain = (pos) => SPECIES_DEX.find((s) => s.position === pos && !s.ability) || SPECIES_DEX.find((s) => s.position === pos && s.rarity === 'uncommon');
function side(play, overrides, seed) {
  const rng = createRng(seed); const out = {};
  for (const s of play.onField) { const pos = positionOf(s); const sp = overrides[s] ? SPECIES_DEX.find((x) => x.id === overrides[s]) : plain(pos); const m = generateMonster(rng, { position: pos, quality: 72, species: plain(pos).id }); out[s] = { attrs: effectiveAttributes(m), name: sp.name, species: sp.id, id: `${s}-${seed}` }; }
  return out;
}
const sim = (o, d, off, def, i, memory) => simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], offense: side(PLAYS[o], off, 1), defense: side(PLAYS[d], def, 2), ballOn: 35, seed: 100 + i, options: memory ? { memory } : {} });

// Task 8 M3 is complete: all 72 Dex football abilities are registered contracts (src/sim/abilities/, tested per element batch in
// tests/task8-abilities-*.test.js) and the legacy signature effects these tests used to pin (Whiteout, Eruption, Landslide, Night Veil,
// Permafrost, Vanishing Cut, Precision Gears, Ancient Grove, Blink, Sovereign Arm, ...) are retired: no stacking. What remains here is
// the guarantee that none of them still acts.

test('abilities: no legacy signature effect acts any more (Task 8 M3 complete; no stacking)', () => {
  const legacyKinds = new Set(['roared', 'pinched', 'flattened', 'thorned', 'riptide', 'whiteout', 'blink', 'eclipse', 'cyclone']);
  for (const [i, [o, d, off, def]] of [['power_right', 'run_wall', { TE: 'pyroclast' }, {}], ['pass_pro' in PLAYS ? 'pass_pro' : 'mesh', 'cover_2_zone', { QB: 'aurodrax', RB: 'astralux' }, { DL1: 'glaciron', CB1: 'nocturne' }],
    ['deep_post', 'cover_1', { WR1: 'tempestra' }, { LB1: 'elderoot', SS: 'nyxshade' }], ['inside_zone', 'bear_front', { OL1: 'titanolith', RB: 'duskrunner' }, { DL2: 'icehorn' }]].entries()) {
    for (let k = 0; k < 6; k++) {
      const s = sim(o, d, off, def, i * 10 + k, { drive: `D${k}`, half: 'h1', quarter: 4, used: {} });
      assert.deepEqual(s.memoryUsed || [], [], 'no legacy once-per memory is used');
      for (const e of s.events) {
        assert.ok(!(e.kind === 'ability' && e.key), `no legacy ability event (${e.text || e.key})`);
        assert.ok(!legacyKinds.has(e.kind), `no legacy outcome label ${e.kind}`);
      }
    }
  }
});

test('abilities: the kicker carries no legacy kicking boost or long-kick bonus (Precision Gears is Gear Grid, MET-03-F)', async () => {
  const { lineupFromChart } = await import('../src/franchise/roster.js');
  const m = generateMonster(createRng(5), { position: 'K', quality: 70, species: 'gearwing' });
  const { kicker } = lineupFromChart([m], { K: m.id });
  assert.equal(kicker.longKick, undefined); assert.equal(kicker.attrs.kicking, effectiveAttributes(m, { slotPosition: 'K' }).kicking);
});
