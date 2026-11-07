// Beast Clash data: the 72 moves validate, map to every species, and football data is untouched.
import { test } from 'node:test';
import { moveTableFor } from '../../src/clash/stats.js';
import { SPECIES_DEX as LEGACY_72 } from '../../src/data/species-legacy.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CLASH_MOVES, CLASH_MOVE_IDS } from '../../src/data/clash-moves.js';
import { validateMoves, cardCheck } from '../../src/clash/validate.js';
import { SPECIES_DEX, TRAITS } from '../../src/data/species.js';
import { KINDS, TRIGGERS, EFFECTS } from '../../src/clash/handlers.js';
import { abilityFingerprint } from '../../src/ui/dev-review.js';

test('72 of 72 moves validate: schema, bands, unique names, card text equals numbers', () => {
  assert.deepEqual(validateMoves(), []);
  assert.equal(CLASH_MOVE_IDS.length, 72);
  assert.deepEqual(new Set(CLASH_MOVE_IDS), new Set(SPECIES_DEX.filter((s) => s.rarity !== 'basic').map((s) => s.id)), 'keys equal the original species IDs exactly (Basics use the ordinary Strike, R1 item 37)');
  const names = new Set(Object.values(CLASH_MOVES).map((m) => m.name)); assert.equal(names.size, 72);
  for (const id of CLASH_MOVE_IDS) assert.deepEqual(cardCheck(id), [], id);
  assert.ok(Object.isFrozen(CLASH_MOVES) && Object.isFrozen(CLASH_MOVES.emberfox) && Object.isFrozen(CLASH_MOVES.emberfox.trigger));
});

test('archetype counts match the approved assignment and kickers are eligible', () => {
  const counts = {}; for (const m of Object.values(CLASH_MOVES)) counts[m.archetype] = (counts[m.archetype] || 0) + 1;
  assert.deepEqual(counts, { Striker: 15, Balanced: 16, Disruptor: 16, Support: 15, Tank: 10 });
  for (const k of SPECIES_DEX.filter((s) => s.position === 'K')) assert.ok(k.rarity === 'basic' ? moveTableFor({})[k.id]?.basic : CLASH_MOVES[k.id], `${k.id} (kicker) has a move`);
});

test('registries are closed: every kind, trigger and effect key a move uses is registered', () => {
  for (const [id, m] of Object.entries(CLASH_MOVES)) {
    assert.ok(KINDS.includes(m.kind), `${id} kind`); assert.ok(TRIGGERS.includes(m.trigger.kind), `${id} trigger`);
    for (const k of Object.keys(m)) if (!['name', 'archetype', 'text', 'kind', 'trigger'].includes(k)) assert.ok(EFFECTS[k], `${id}: ${k}`);
  }
});

test('football abilities and traits are unchanged by Beast Clash (fingerprints equal the stored snapshot)', () => {
  const file = new URL('./fixtures/football-abilities.json', import.meta.url);
  const now = Object.fromEntries(LEGACY_72.map((s) => [s.id, abilityFingerprint(s)])); // the original 72's stored football data (traits retired from play, N7c B13, but unchanged as data)
  now.__traits = JSON.stringify(TRAITS);
  if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(now, null, 1)); }
  const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(now, stored, 'a football ability or trait changed; Phase 1 must not touch them');
});
