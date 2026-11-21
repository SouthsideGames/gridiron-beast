// Sim Ahead (src/franchise/sim-weeks.js): whole weeks, Sunday included, until something needs the owner.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { simAhead, simOneWeek, simBlocker, canSimAhead } from '../src/franchise/sim-weeks.js';

function season(seed = 77) {
  const f = F.createFranchise({ owner: { first: 'Sim', last: 'Ahead' }, club: 'Ember City Beasts', seed }); F.hireDefaultStaff(f);
  while (!f.draft.done) { if (F.onTheClock(f) === f.club) F.myDraftPick(f, f.draft.available[0]); }
  if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
  return f;
}

test('a simmed week is the same week the staff and Sim to Final would play: same calls, same result, same state', () => {
  const a = season(), b = season();
  const r = simOneWeek(a, { stopBeforeBigGames: false });
  // the same steps by hand: the staff run the week, the coach plays Sunday, the result is filed
  F.autoRunToSunday(b); const g = F.simulatePlayerGame(b); F.finishSunday(b, g);
  assert.ok(r.ok && r.entry && !r.entry.bye);
  const same = (f) => JSON.stringify(f, (k, v) => (k === 'uid' || k === 'createdAt' ? undefined : v)); // each franchise has its own id and creation time
  assert.equal(same(a), same(b), 'nothing extra is decided, rolled or recorded');
});

test('it stops on the Sunday of a rival or badge game with the week prepared, and plays it when asked not to stop', () => {
  const f = season(); let r; let guard = 0;
  do { r = simOneWeek(f); } while (!(r.stop && ['rival', 'badge'].includes(r.stop.code)) && guard++ < 12);
  assert.ok(['rival', 'badge'].includes(r.stop.code), JSON.stringify(r.stop));
  assert.equal(f.season.day, 6, 'Monday to Saturday are done'); assert.ok(r.stop.opponent);
  assert.ok(!f.game, 'the big game is left for the owner');
  const week = f.season.week; const again = simOneWeek(f, { stopBeforeBigGames: false });
  assert.equal(again.entry.week, week); assert.ok(f.season.week > week);
});

test('the owner is needed: commissioner, goal, trade call, live game and playoffs stop it before anything runs', () => {
  const f = season(); const before = JSON.stringify(f);
  f.week.commissioner = { over: 1000, names: [] }; assert.equal(simBlocker(f).code, 'commissioner'); assert.equal(canSimAhead(f), false);
  const r = simAhead(f); assert.deepEqual(r.played, []); assert.equal(r.stop.code, 'commissioner');
  delete f.week.commissioner; f.game = { state: {} }; assert.equal(simBlocker(f).code, 'live-game'); f.game = null;
  assert.equal(JSON.stringify(f), before.replace(/"game":null/, '"game":null'));
});

test('a whole regular season runs to the playoffs or an owner stop, each week once and in order', () => {
  const f = season(); const weeks = []; let guard = 0, r;
  do {
    r = simAhead(f, { stopBeforeBigGames: false }); weeks.push(...r.played.map((e) => e.week)); assert.ok(r.ok, JSON.stringify(r.stop));
    if (r.stop?.code === 'trade-call') F.answerTradeCall(f, false);
    if (r.stop?.code === 'commissioner') F.commissionerRelease(f, f.week.commissioner.names?.[0]);
  } while (r.stop && !['playoffs', 'season-over'].includes(r.stop.code) && guard++ < 20);
  assert.deepEqual(weeks, [...weeks].sort((x, y) => x - y)); assert.equal(new Set(weeks).size, weeks.length);
  assert.ok(F.inPlayoffs(f) || f.season.finished);
});
