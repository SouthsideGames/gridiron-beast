// Task 8 M3 (owner 22:23): a player-selectable signature is not player-exclusive. The AI calls Dragon Roar (DRA-05-F) under the
// player's eligibility, chart and once-per-game rule (PROVISIONAL policy in src/sim/coach-ai.js: in range at the ordinary 45% bar,
// activated when it improves the chance by more than the margin).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playGame } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { fgSignatureDecision, fgSignatureInRange, AI_SIGNATURE_MARGIN } from '../src/sim/coach-ai.js';
import { roarChance } from '../src/sim/abilities/vyrnax.js';
import { reviewAbility } from '../src/sim/abilities/review.js';

test('the AI decision uses only an available signature, at the player\'s chart, and not where the ordinary kick is as good', () => {
  assert.equal(fgSignatureDecision(null, 0.3), false); assert.equal(fgSignatureDecision({ available: false, chance: 1 }, 0.3), false, 'spent or above 90: never');
  assert.equal(fgSignatureDecision({ available: true, chance: roarChance(60) }, 0.97), false, 'a chip shot keeps the use');
  assert.equal(fgSignatureDecision({ available: true, chance: roarChance(60) }, 1 - AI_SIGNATURE_MARGIN - 0.01), true);
  assert.equal(fgSignatureInRange({ available: true, chance: roarChance(80) }), true, '80 yards: 45%, the ordinary range bar');
  assert.equal(fgSignatureInRange({ available: true, chance: roarChance(85) }), false, '85 yards: 40%, out of the AI\'s range');
});

test('AI clubs with Vyrnax call Dragon Roar in real games: once per game at most, under the chart, recorded as one ordinary attempt', () => {
  let games = 0, used = 0;
  for (let k = 0; k < 8; k++) {
    const home = generatedTeam(700 + k, { id: 'H', name: 'H', abbr: 'H', quality: 62 }), away = generatedTeam(760 + k, { id: 'A', name: 'A', abbr: 'A', quality: 62 });
    Object.assign(home.kicker, { id: 'VYR', species: 'vyrnax', form: 'vyrnax:0', mastery: 0, type: 'Dragon' });
    const roars = []; const g = playGame({ home, away, seed: 31 + k, onStep: (ev) => { if (ev?.kind === 'field_goal' && ev.res?.signature === 'DRA-05-F') roars.push(ev.res); } });
    games++; assert.ok(roars.length <= 1, 'once per game'); used += roars.length;
    for (const r of roars) { assert.ok(r.distance <= 90); assert.equal(r.chance, roarChance(r.distance)); }
    if (roars.length) assert.equal(g.t8.ability.VYR.used, true);
  }
  assert.ok(used >= 1, `the AI used it in ${used} of ${games} games`);
});

test('the reviewer reaches Dragon Roar without staging now that the AI calls it', () => {
  const r = reviewAbility({ family: 'vyrnax', primed: false, games: 6 }); assert.ok(r.found, r.reason); assert.equal(r.kind, 'field_goal');
});

test('desperation attempts (owner N8b, provisional): the last play of a half, or late trailing by 3 or less, lets the AI use the signature up to 90 yd', async () => {
  const { fgSignatureDesperation, fourthDownDecision } = await import('../src/sim/coach-ai.js');
  const st = (o) => ({ quarter: 4, clock: 5, quarterLength: 180, possession: 'home', score: { home: 10, away: 12 }, down: 4, toGo: 9, ballOn: 18, timeouts: { home: 0, away: 0 }, ot: null, ...o });
  const far = { available: true, chance: roarChance(89) }; // 89 yd: 32%
  assert.equal(fgSignatureDesperation(st(), far), true, 'last seconds, trailing by 2');
  assert.equal(fgSignatureDesperation(st({ quarter: 2, clock: 4, score: { home: 20, away: 0 } }), far), true, 'the last play of the first half, even ahead');
  assert.equal(fgSignatureDesperation(st({ clock: 300, quarter: 3 }), far), false, 'not late');
  assert.equal(fgSignatureDesperation(st({ score: { home: 0, away: 7 }, clock: 90 }), far), false, 'down 7 with time left: a field goal is not enough');
  assert.equal(fgSignatureDesperation(st(), { available: false, chance: 1 }), false, 'spent: never');
  assert.equal(fgSignatureDesperation(st(), { available: true, chance: null }), false, 'above 90: never');
  assert.equal(fourthDownDecision(st(), { coach: { aggression: 0.5 }, offense: {}, defense: {}, kicker: { attrs: { kicking: 60 } }, roster: [] }, far), 'fg', 'the AI kicks it');
});
