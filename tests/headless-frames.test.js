// After-game processing (owner 2026-11-23, second set): a league game nobody watches keeps only the latest engine frame. The game is
// the same play for play: score, log, statistics and the final state match a game that kept every frame.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { playGame } from '../src/sim/game-runner.js';

test('a headless league game with only the last frame kept is identical to one that keeps every frame', () => {
  const f = F.createFranchise({ owner: { first: 'H', last: 'F' }, club: 'Goldhaven Royals', seed: 77 });
  for (const [h, a, seed] of [['Aetheria Seers', 'Mistport Veils', 11], ['Cliffhaven Chargers', 'Thunder Mesa Blitz', 12], ['Harbor Anchors', 'Sunfire Solars', 13]]) {
    const run = (frames) => playGame({ home: F.aiTeam(f, h), away: F.aiTeam(f, a), venue: F.gameVenue(f, h, a), seed, quarterLength: 180, frames });
    const full = run(null), last = run('last');
    assert.deepEqual(last.score, full.score, `${h} v ${a}: score`); assert.equal(last.playCount, full.playCount);
    assert.deepEqual(last.log.map((x) => x.text), full.log.map((x) => x.text), 'play by play');
    assert.equal(JSON.stringify(last.stats || null), JSON.stringify(full.stats || null), 'statistics');
    assert.equal(last.frameMode, 'last'); assert.equal(full.frameMode, undefined);
  }
});
