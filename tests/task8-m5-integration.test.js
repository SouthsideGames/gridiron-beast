import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMonster } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { afterGame } from '../src/franchise/progression.js';
import { applyBattleEffects } from '../src/franchise/clash-link.js';
import { createRewardLedger } from '../src/franchise/reward-ledger.js';
import { buildTeam } from '../src/franchise/roster.js';
const mk = () => generateMonster(createRng(42), { position: 'QB', age: 20, yearsPro: 0 });
test('football mastery settles once alongside rewards, including after JSON reload', () => {
  let m = mk(), ledger = createRewardLedger();
  const settle = () => afterGame([m], { QB: m.id }, { QB: { snapsOff: 10 } }, createRng(1), { ledger, activityId: 'fb:1:w1:r:test', mastery: { [m.id]: { executions: 3, passiveCredited: false } } });
  settle(); assert.equal(m.dev.mastery.football, 2); assert.equal(m.dev.mastery.clash, 0);
  ({ m, ledger } = JSON.parse(JSON.stringify({ m, ledger })));
  settle(); assert.equal(m.dev.mastery.football, 2);
});
test('Clash passive cap persists across opening/OT while valid active uses still count', () => {
  const m = mk(), ledger = createRewardLedger();
  const result = { ruleset: 't8', lines: { a: [{ combatant: { monsterId: m.id } }] }, mastery: { [m.id]: { executions: 1, passiveCredited: true } } };
  const settle = (activityId, scope = 'game:1:w1:test', r = result) => applyBattleEffects([m], r, 'a', 'pregame', createRng(1), { ledger, activityId, masteryScope: scope });
  settle('opening'); settle('overtime'); assert.equal(m.dev.mastery.clash, 1);
  settle('standalone', 'clash:encounter'); assert.equal(m.dev.mastery.clash, 2);
  settle('active', 'clash:active', { ...result, mastery: { [m.id]: { executions: 2, passiveCredited: false } } });
  settle('active'); assert.equal(m.dev.mastery.clash, 4); assert.equal(m.dev.mastery.football, 0);
});
test('pending, staged, probed and provisional Clash results cannot award progression', () => {
  const m = mk(); const before = JSON.stringify(m);
  for (const flag of ['pending', 'staged', 'probed', 'provisional']) assert.deepEqual(applyBattleEffects([m], { [flag]: true }, 'a', 'encounter', createRng(1)), []);
  assert.equal(JSON.stringify(m), before);
});
test('football lineups pass the mastery tier, not the raw use count, to ability contracts', () => {
  const m = mk();
  for (const [credits, tier] of [[0, 0], [9, 0], [10, 1], [30, 2], [60, 3], [100, 3]]) {
    m.dev.mastery.football = credits;
    const t = buildTeam({ id: 'test', name: 'test', roster: [m] });
    assert.equal(t.offense.QB.mastery, tier);
  }
});
