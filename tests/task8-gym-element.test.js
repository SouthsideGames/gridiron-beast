// Owner ruling N8a (2026-11-08, D9): gyms prefer matching-element monsters among similarly useful candidates; legendary rules and
// legal rosters first; no quota. The draft and free-agency tie-breaks (R4, 1.5 OVR-equivalent) existed; AI trades gain the same.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gymTradeRank, GYM_ELEMENT_TRADE_TIE } from '../src/franchise/league-trades.js';
import { GYM_ELEMENT_BONUS } from '../src/franchise/draft.js';
import { FA_STRATEGY } from '../src/franchise/fa-strategy.js';

test('a gym ranks a matching-element trade target above an equally useful one, never above a clearly better one; ordinary clubs never', () => {
  const water = { type: 'Water' }, fire = { type: 'Fire' };
  assert.ok(gymTradeRank('Harbor Sentinels', water, 10) > gymTradeRank('Harbor Sentinels', fire, 10), 'equal gain: the element wins');
  assert.ok(gymTradeRank('Harbor Sentinels', water, 10) < gymTradeRank('Harbor Sentinels', fire, 10 + GYM_ELEMENT_TRADE_TIE + 1), 'a clearly better off-element target still wins');
  assert.equal(gymTradeRank('Not A Gym', water, 10), gymTradeRank('Not A Gym', fire, 10), 'ordinary clubs: no preference');
  assert.ok(GYM_ELEMENT_TRADE_TIE < 8 / 2, 'a tie-break well under the minimum deal gain (8): no forced trade');
  assert.equal(GYM_ELEMENT_BONUS, 1.5); assert.equal(FA_STRATEGY.element, 1.5, 'the draft and free-agency tie-breaks are unchanged');
});
