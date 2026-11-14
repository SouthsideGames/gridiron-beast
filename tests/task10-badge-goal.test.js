// Task 10 (owner ruling 2026-11-14): the board's "win a gym badge" goal counts a badge earned or reclaimed during the current season
// only if it is still held at season's end (after the playoffs); a badge carried over from an earlier season counts only if it was
// lost and reclaimed this season. Real seasons with gym results set per club, the goal forced to the badge goal, a save/load round
// trip after every game; the expected count is worked out independently from the games themselves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';

function seasons(seed, pattern, n) {
  const out = []; let cur = null; const seen = {}; const lostOnce = new Set(); // badges given back at some point (a later win is a reclaim)
  runFranchise(seed, { difficulty: 'pro', seasons: n, check: () => [],
    onOffseason: (f) => { if (f.board) { f.board.confidence = 3; f.board.misses = 0; f.board.fired = false; } },
    alterGame: (f, game, m) => {
      const y = f.season.year;
      if (!cur || cur.year !== y) cur = { year: y, earned: new Set(), heldAtStart: new Set(Object.keys(f.campaign.badges || {})), games: [] };
      if (f.board?.goal && f.board.goal.year === y && f.board.goal.id !== 'badges') Object.assign(f.board.goal, { id: 'badges', target: 1 });
      if (!GYM_BY_CLUB[m.opponent]) return;
      const want = pattern[((seen[m.opponent] = (seen[m.opponent] || 0) + 1) - 1) % pattern.length];
      const side = m.playerSide, opp = side === 'home' ? 'away' : 'home';
      game.winner = want === 'W' ? side : opp; game.score[game.winner] = Math.max(game.score.home, game.score.away) + 3;
      const held = !!f.campaign.badges[m.opponent];
      if (want === 'W' && !held) cur.earned.add(m.opponent); // newly earned or reclaimed
      cur.games.push({ club: m.opponent, want, held, playoff: !!m.playoff, reclaim: want === 'W' && !held && lostOnce.has(m.opponent) });
      if (want === 'L' && held) lostOnce.add(m.opponent);
    },
    afterGame: (f) => Save.importJson(Save.exportJson(f)),
    onSeason: (f) => {
      if (!cur || cur.year !== f.season.year) return;
      const heldAtEnd = new Set(Object.keys(f.campaign.badges || {}));
      const expected = [...cur.earned].filter((c) => heldAtEnd.has(c)).length;
      assert.equal(F.badgesWonThisSeason(f), expected, `season ${cur.year}: earned or reclaimed this season and still held at the end`);
      const verdict = (f.board?.history || []).find((h) => h.year === cur.year && h.id === 'badges');
      if (verdict) assert.equal(verdict.met, expected >= 1, `season ${cur.year}: the board verdict follows the rule (${JSON.stringify(cur.games)})`);
      out.push({ year: cur.year, expected, met: verdict?.met ?? null, carriedKept: cur.games.filter((g) => g.held && g.want === 'W').length, lostAfterEarn: cur.games.filter((g) => g.held && g.want === 'L' && cur.earned.has(g.club)).length, reclaimed: cur.games.filter((g) => g.reclaim).length, playoffLoss: cur.games.some((g) => g.playoff && g.want === 'L' && g.held) });
    } });
  return out;
}

test('board badge goal over real seasons: earned and kept counts; earned then lost (regular season or playoffs) does not; carried-over kept does not; reclaimed counts', { timeout: 1500000 }, () => {
  const all = [...seasons(7, 'WLW', 3), ...seasons(21, 'W', 2), ...seasons(33, 'WL', 2), ...seasons(41, 'L', 1)];
  assert.ok(all.some((s) => s.expected >= 1 && s.met === true), 'a badge earned and kept meets the goal');
  assert.ok(all.some((s) => s.lostAfterEarn > 0), 'a badge earned and then lost in the same season was played');
  assert.ok(all.some((s) => s.carriedKept > 0), 'a carried-over badge was kept (and is not counted: checked each season)');
  assert.ok(all.some((s) => s.reclaimed > 0), 'a badge that was lost was reclaimed later (counted when held at the end)');
  assert.ok(all.some((s) => s.playoffLoss), 'a playoff loss took a badge back before the goal was settled');
  assert.ok(all.some((s) => s.met === false), 'the goal can also be missed under the rule');
});

function toGymSunday(seed) {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  F.hireDefaultStaff(f); let g = 0; while (F.creationDraftPending(f) && g++ < 400) F.passDraftPick(f);
  if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
  for (let k = 0; k < 40; k++) {
    if (f.week.commissioner) { const id = f.week.commissioner.names?.[0]; if (id) F.commissionerRelease(f, id); continue; }
    F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; }
    const m = F.sundayMatchup(f); if (GYM_BY_CLUB[m.opponent]) return { f, m };
    F.finishSunday(f, F.simulatePlayerGame(f));
  }
  return null;
}

test('board badge count: a forfeit takes back a badge earned this season; a carried-over badge never counts on its own; old saves fall back', () => {
  const at = toGymSunday(5); assert.ok(at); const { f, m } = at; const y = f.season.year;
  // earned earlier this season, then forfeited to the same gym
  f.campaign.badges[m.opponent] = { year: y, week: 1, score: '21-7' }; f.season.badgesEarned = [m.opponent];
  assert.equal(F.badgesWonThisSeason(f), 1);
  F.forfeitSunday(f); assert.equal(F.badgeOf(f, m.opponent), null); assert.equal(F.badgesWonThisSeason(f), 0, 'lost again before season end: not counted');
  // a badge carried over from last season, held all season: not counted
  f.campaign.badges['Somewhere Gym'] = { year: y - 1, week: 4, score: '14-10' }; assert.equal(F.badgesWonThisSeason(f), 0);
  // the same badge lost and reclaimed this season: counted while held
  f.campaign.badges['Somewhere Gym'] = { year: y, week: 6, score: '17-14' }; f.season.badgesEarned.push('Somewhere Gym'); assert.equal(F.badgesWonThisSeason(f), 1);
  // survives save/load
  const g2 = Save.importJson(Save.exportJson(f)); assert.equal(F.badgesWonThisSeason(g2), 1);
  // a save from before badgesEarned existed: held badges won this year
  delete g2.season.badgesEarned; assert.equal(F.badgesWonThisSeason(g2), 1);
});
