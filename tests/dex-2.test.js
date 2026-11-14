import test from 'node:test';
import assert from 'node:assert/strict';
import { resetDex, dexKnowledgeGame, dexKnowledge, dexData, mergeDex } from '../src/franchise/dex-store.js';
import { speciesSheet } from '../src/ui/screens/dex.js';
import { SPECIES_DEX } from '../src/data/species.js';
test('species knowledge deduplicates individuals, replays and cloud merges at all thresholds', () => {
  resetDex();
  for (let n = 0; n < 30; n++) {
    dexKnowledgeGame(['flaroo', 'flaroo'], `save-a:game-${n}`);
    dexKnowledgeGame(['flaroo'], `save-a:game-${n}`);
    const snapshot = JSON.parse(JSON.stringify(dexData())); mergeDex(snapshot);
    assert.equal(dexKnowledge('flaroo').games, n + 1);
    assert.deepEqual(dexKnowledge('flaroo').unlocked, [5,15,30].filter(x => x <= n + 1));
  }
  dexKnowledgeGame(['flaroo'], 'save-b:game-0');
  assert.equal(dexKnowledge('flaroo').games, 31);
  mergeDex({ seen: {}, signed: {} });
  assert.equal(dexKnowledge('flaroo').games, 31);
});
test('every family renders four sections with one portrait and no source mutations', () => {
  for (const s of SPECIES_DEX) {
    const before = JSON.stringify(s);
    const html = speciesSheet(s, null, { revealAll: true, previewGames: 30 });
    assert.equal((html.match(/role="tabpanel"/g) || []).length, 4);
    assert.equal((html.match(/data-dex-portrait/g) || []).length, 1);
    assert.equal(JSON.stringify(s), before);
  }
});
