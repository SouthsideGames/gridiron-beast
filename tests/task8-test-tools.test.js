// The Task 8 test tools are developer shortcuts for the private test build only: in the repository (and any release) build every
// one refuses and changes nothing, so normal gameplay never reaches them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/franchise/t8-dev.js';
import { BUILD } from '../src/version.js';

test('Task 8 test tools are off unless BUILD.test: every shortcut refuses and nothing changes', () => {
  assert.equal(BUILD.test, false); assert.equal(T.t8ToolsEnabled(), false);
  const f = { roster: [{ id: 'x', dev: {} }], season: { year: 1 } }; const before = JSON.stringify(f);
  for (const r of [T.generationSample(), T.devAddMonster(f, { kind: 'apex' }), T.devLevelUp(f, 'x'), T.devToEvolutionLevel(f, 'x'), T.devBankPoints(f, 'x'), T.devAgeOneSeason(f, 'x'), T.devBasicProspect(f), T.devApexProspect(f), T.devRevealProspect(f), T.devSaveRoundTrip(f)]) assert.equal(r.ok, false);
  assert.equal(JSON.stringify(f), before);
});
