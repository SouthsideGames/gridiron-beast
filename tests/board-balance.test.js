// Board expectations and firing (GDD §29, owner authorization 2026-10-22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../src/franchise/board.js';
import * as F from '../src/franchise/franchise.js';
import { ALL_TEAMS } from '../src/data/league.js';

const season = (b, goal, facts) => B.settleConfidence(b, goal, facts);
const wins = (target, forecastWins = null) => ({ id: 'wins', target, weight: 1, forecastWins });

test('the forecast compares the club with this league, not with a fixed number', () => {
  assert.equal(B.boardForecast({ talent: 64, leagueTalent: 64 }).winPct, 0.5, 'league-average talent is a .500 forecast');
  assert.ok(B.boardForecast({ talent: 66, leagueTalent: 60 }).winPct > B.boardForecast({ talent: 66, leagueTalent: 66 }).winPct, 'the same club is forecast lower in a stronger league');
  const [lo, hi] = B.BOARD_RULES.band; assert.equal(B.boardForecast({ talent: 99, leagueTalent: 50 }).winPct, hi); assert.equal(B.boardForecast({ talent: 30, leagueTalent: 70 }).winPct, lo);
  // In the franchise: a club exactly at the league average is forecast 4.5 of 9.
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 3 });
  for (const t of ALL_TEAMS) f.season.expectations[t].talent = 63;
  assert.equal(F.boardForecastFor(f).wins, 4.5); assert.match(F.commissionerGoals(f)[0].text, /4\.5/);
});

test('the safe goal matches the forecast (rounded), at least two and never more than seven of nine', () => {
  const safe = (p) => B.goalOffers(null, { expectedWinPct: p }).find((o) => o.tier === 'safe').target;
  assert.equal(safe(0.5), 5); assert.equal(safe(0.6), 5); assert.equal(safe(0.7), 6); assert.equal(safe(0.15), 2); assert.equal(safe(0.85), 7);
  assert.equal(B.goalOffers(null, { expectedWinPct: 0.3 })[1].id, "badges", "a rebuilding club gets a badge goal, not the playoffs"); assert.equal(B.goalOffers(null, { expectedWinPct: 0.3 })[1].target, 1);
  assert.equal(B.goalOffers(null, { expectedWinPct: 0.3, gymsThisSeason: 0 })[1].id, "playoffs", "no badge left to win on the schedule: never an impossible badge goal");
});

test('one disappointing season is never a dismissal: a miss from neutral puts the owner on the hot seat', () => {
  const b = { confidence: 0, misses: 0 }; const v = season(b, wins(6, 6.8), { wins: 1 });
  assert.equal(v.fired, false); assert.equal(b.confidence, B.HOT_SEAT);
});

test('on the hot seat a narrow miss is a final warning; a clear miss is a dismissal', () => {
  const narrow = { confidence: -1, misses: 1 }; const v1 = season(narrow, wins(6, 6.8), { wins: 5 });
  assert.equal(v1.fired, false); assert.equal(v1.miss, 'narrow'); assert.equal(narrow.confidence, B.HOT_SEAT); assert.match(v1.reason, /final warning/);
  const atForecast = { confidence: -1, misses: 1 }; assert.equal(season(atForecast, { id: 'playoffs', weight: 1, forecastWins: 5.2 }, { wins: 5, playoffs: false }).fired, false, 'missing the playoffs while playing to the forecast is narrow');
  const clear = { confidence: -1, misses: 1 }; const v2 = season(clear, wins(6, 6.8), { wins: 3 });
  assert.equal(v2.fired, true); assert.equal(v2.miss, 'clear'); assert.match(v2.reason, /clear miss/);
});

test('sustained underperformance still ends a franchise: three missed seasons in a row, even narrow ones and even with winning records', () => {
  const b = { confidence: 0, misses: 0 }; const g = wins(7, 7.4);
  assert.equal(season(b, g, { wins: 6 }).fired, false); assert.equal(season(b, g, { wins: 6 }).fired, false);
  const v = season(b, g, { wins: 6 }); assert.equal(v.fired, true); assert.match(v.reason, /3 missed seasons/);
  const poor = { confidence: 0, misses: 0 }; season(poor, wins(4, 4.5), { wins: 1 }); assert.equal(season(poor, wins(4, 4.5), { wins: 2 }).fired, true, 'two clear misses');
});

test('a met goal clears the deficit and the miss streak; a Beast Bowl title meets any goal', () => {
  const b = { confidence: -1, misses: 2 }; const v = season(b, wins(5, 5.5), { wins: 6 });
  assert.equal(v.met, true); assert.equal(b.confidence, 1); assert.equal(b.misses, 0);
  const c = { confidence: -1, misses: 2 }; assert.equal(season(c, { id: 'title', weight: 2 }, { wins: 4, champion: true }).met, true); assert.equal(c.confidence, 2);
});

test('older saves: the miss streak is rebuilt from the board history; settleGoal records wins, forecast and the reason', () => {
  const f = { board: { confidence: -1, goal: null, history: [{ year: 1, met: true }, { year: 2, met: false }, { year: 3, met: false }], fired: false }, season: { year: 4 } };
  B.ensureBoard(f); assert.equal(f.board.misses, 2);
  f.board.goal = { ...wins(6, 6.6), label: 'Win 6', year: 4 }; const v = B.settleGoal(f, { wins: 5 });
  assert.equal(v.status, 'fired', 'a third straight miss'); const h = f.board.history.at(-1); assert.equal(h.wins, 5); assert.equal(h.forecast, 6.6); assert.match(h.reason, /3 missed/);
  const g = { board: { confidence: -1, goal: { ...wins(6, 6.6), label: 'Win 6', year: 2 }, history: [{ year: 1, met: false }], fired: false }, season: { year: 2 } };
  assert.equal(B.settleGoal(g, { wins: 5 }).status, 'warning');
});
