// Task 10 (owner clarification 2026-11-13, GDD "Reclaimable Gym Badges"): every counting game against a gym club puts its badge at
// stake. A win earns or keeps it, a loss gives it back to the gym if held, a later win earns it again; regular season and playoffs
// alike; badge progress is the badges held now; achievements already awarded are never taken back; save/load and later seasons work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import { lineText } from '../src/text/index.js';

const BADGE_ACH = ['first_badge', 'half_badges', 'all_badges'];

test('gym badges over three seasons: win earns or keeps, loss gives back, a later win earns again; playoffs count; save/load after every game', { timeout: 900000 }, () => {
  const seen = {}; const rows = []; let pending = null; const earnedAch = new Set();
  runFranchise(7, { difficulty: 'pro', seasons: 3, check: () => [],
    onOffseason: (f) => { if (f.board) { f.board.confidence = 3; f.board.misses = 0; } },
    alterGame: (f, game, m) => {
      if (!GYM_BY_CLUB[m.opponent]) return;
      const want = 'WLW'[((seen[m.opponent] = (seen[m.opponent] || 0) + 1) - 1) % 3];
      const side = m.playerSide, opp = side === 'home' ? 'away' : 'home';
      game.winner = want === 'W' ? side : opp; game.score[game.winner] = Math.max(game.score.home, game.score.away) + 3;
      pending = { club: m.opponent, want, playoff: !!m.playoff, before: !!f.campaign.badges[m.opponent], year: f.season.year };
    },
    afterGame: (f) => {
      if (pending) {
        const p = pending; pending = null; const held = !!f.campaign.badges[p.club];
        assert.equal(held, p.want === 'W', `${p.year} ${p.club} ${p.want}: the badge is held after a win and not after a loss`);
        assert.equal(F.badgeOf(f, p.club) != null, held, 'badgeOf agrees');
        assert.equal(F.hallOfFameProgress(f).rows.find((r) => r.key === 'badges').have, Object.keys(f.campaign.badges).length, 'badge progress is the badges held now');
        const top = lineText(f.news[0]?.text ?? f.news[0]);
        if (p.before && p.want === 'L') assert.match(f.news.map((n) => lineText(n.text ?? n)).join('\n'), /BADGE LOST: .* take back the /, 'a lost badge is in the news');
        rows.push({ ...p, held, top });
      }
      for (const a of BADGE_ACH) if (f.achievements?.[a]) earnedAch.add(a);
      for (const a of earnedAch) assert.ok(f.achievements[a], `${a} stays awarded after a badge is lost`);
      return Save.importJson(Save.exportJson(f)); // continue on the reloaded franchise
    } });
  const reclaimed = rows.filter((r) => r.want === 'W' && rows.some((q) => q.club === r.club && q.want === 'L' && q.before && rows.indexOf(q) < rows.indexOf(r)));
  assert.ok(rows.some((r) => r.want === 'L' && r.before), 'a held badge was lost');
  assert.ok(reclaimed.length > 0, 'a lost badge was won again');
  assert.ok(rows.some((r) => r.playoff), 'playoff games against a gym club were played and counted');
  assert.ok(rows.some((r) => r.playoff && r.want === 'L' && r.before), 'a playoff loss gives the badge back too');
  assert.ok(earnedAch.has('half_badges'), 'the four-badge achievement was earned (and stayed, above)');
  assert.ok(new Set(rows.map((r) => r.year)).size === 3, 'three seasons');
});

function toGymSunday(seed) {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  F.hireDefaultStaff(f); let g = 0; while (F.creationDraftPending(f) && g++ < 400) F.passDraftPick(f);
  if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
  for (let k = 0; k < 40; k++) {
    if (f.week.commissioner) { const id = f.week.commissioner.names?.[0]; if (id) F.commissionerRelease(f, id); continue; }
    F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; }
    const m = F.sundayMatchup(f); if (GYM_BY_CLUB[m.opponent]) return { f, m };
    const game = F.simulatePlayerGame(f); F.finishSunday(f, game);
  }
  return null;
}

test('a forfeit to a gym club is a counted loss: a held badge goes back to the gym; the badge taken this season stays on the season record (the board goal counts it)', () => {
  const at = toGymSunday(5); assert.ok(at, 'reached a Sunday against a gym club');
  const { f, m } = at;
  f.campaign.badges[m.opponent] = { year: f.season.year, week: 1, score: '21-7' }; (f.season.badgesEarned ||= []).push(m.opponent);
  const r = F.forfeitSunday(f); assert.equal(r.ok, true);
  assert.equal(F.badgeOf(f, m.opponent), null, 'the forfeit gave the badge back');
  assert.match(lineText(f.news.find((n) => /BADGE LOST/.test(lineText(n.text ?? n)))?.text ?? ''), /take back the /);
  assert.deepEqual(f.season.badgesEarned, [m.opponent], 'the badge taken this season is still on the season record');
});

test('a gym game the player wins after a tie goes to the tiebreak first: a tie never costs a badge', () => {
  const at = toGymSunday(6); assert.ok(at); const { f, m } = at;
  f.campaign.badges[m.opponent] = { year: f.season.year, week: 1, score: '21-7' };
  const game = F.simulatePlayerGame(f); assert.ok(game.winner, 'a counted game always has a winner (a tie is settled by the tiebreak)');
  const won = game.winner === m.playerSide; F.finishSunday(f, game);
  assert.equal(!!F.badgeOf(f, m.opponent), won, 'held after a win, given back after a loss');
});
