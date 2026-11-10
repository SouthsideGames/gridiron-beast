import test from 'node:test';
import assert from 'node:assert/strict';
import { aiDraftPick, aiDraftKnowledge } from '../src/franchise/draft.js';
import { generateMonster } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { legendSide } from '../src/franchise/fa-legendary.js';
import { buildDepthChart } from '../src/franchise/roster.js';
import { SPECIES_DEX } from '../src/data/species.js';

const draft = () => {
  const a = generateMonster(createRng(1), { position: 'WR', age: 20, yearsPro: 0 });
  const b = generateMonster(createRng(2), { position: 'WR', age: 20, yearsPro: 0 });
  a.boardRank = 1; b.boardRank = 2;
  return { seed: 44, season: { week: 9 }, draft: { year: 1, class: [a, b], available: [a.id, b.id], revealed: {}, picks: [], scoutWeeks: 0 } };
};
test('an unscouted computer draft choice is independent of hidden ratings, ceilings and Temper', () => {
  const f = draft(); const before = aiDraftPick(f, 'Test', createRng(31)).id;
  for (const m of f.draft.class) { m.potential = m.boardRank === 1 ? 1 : 99; for (const k of Object.keys(m.attributes)) m.attributes[k] = m.boardRank === 1 ? 1 : 99; m.temper = 'hidden'; m.dev.apex = !m.dev.apex; }
  assert.equal(aiDraftPick(f, 'Test', createRng(31)).id, before);
  assert.deepEqual(f.draft.revealed, {}, 'computer scouting never reveals the player report');
});
test('computer scouting uses weekly player capacity, persists and stays separate by club', () => {
  const f = draft(); f.draft.class = Array.from({ length: 15 }, (_, i) => ({ ...f.draft.class[i % 2], id: `p${i}`, boardRank: i + 1 }));
  f.draft.scoutWeeks = 1;
  const a = aiDraftKnowledge(f, 'A'); assert.equal(Object.values(a.revealed).filter((n) => n === 6).length, 2);
  assert.equal(Object.values(a.revealed).filter((n) => n > 0 && n < 6).length, 3);
  const copy = JSON.parse(JSON.stringify(f)); assert.deepEqual(aiDraftKnowledge(copy, 'A'), a);
  const b = aiDraftKnowledge(f, 'B'); assert.notEqual(a.revealed, b.revealed);
  f.draft.scoutWeeks = 2; assert.equal(aiDraftKnowledge(f, 'A').weeks, 2);
});
test('Basics may start and a legendary kicker consumes an offensive legendary place', () => {
  const sp = SPECIES_DEX.find((s) => s.rarity === 'basic' && s.position === 'WR'); assert.ok(sp);
  const m = generateMonster(createRng(1), { position: 'WR', species: sp.id });
  assert.equal(buildDepthChart([m]).WR1, m.id);
  const k = generateMonster(createRng(2), { position: 'K', species: 'glacivern' });
  assert.equal(legendSide(k), 'offense');
});
