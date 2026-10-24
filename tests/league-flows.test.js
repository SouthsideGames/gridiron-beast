// Persistent AI rosters in play (GDD §42.6, Phase 3): injuries covered within the cap, the owner's market no bigger than
// today's, migration at the offseason and mid-draft, trades moving the real monster, the dev shortcut over a persistent
// league, and a retirement archive that keeps the registry read-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import * as S from '../src/franchise/league-season.js';
import * as L from '../src/franchise/lifecycle.js';
import { AI_POOL_SHARE } from '../src/franchise/league.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';
import { leagueInvariants } from '../tools/league-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { monsterOverall, ROSTER_MAX, ROSTER_MIN } from '../src/data/monsters.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { buildDepthChart, lineupProblems } from '../src/franchise/roster.js';

const clubsOf = (f) => ALL_TEAMS.filter((t) => t !== f.club);
const settle = (f) => { for (const i of F.offseasonPending(f)) if (!F.resolveContract(f, i.id, 'sign').ok) F.resolveContract(f, i.id, 'walk'); if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id); };
const draftAll = (f) => { let g = 0; while (!f.draft.done && g++ < 80) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; } };
const fill = (f) => { let n = 0; while (f.roster.length < ROSTER_MIN && n++ < 20) { const mk = F.offseasonMarket(f); const pick = mk.map((x) => x.monster).sort((a, b) => a.salary - b.salary)[0]; if (!pick || !F.signFreeAgent(f, pick.id).ok) break; } };

test('in-season cover: a club whose quarterbacks are all hurt signs one before the next week, within the cap and the roster limits', () => {
  const f = newFranchise(41); const cap = tierById(f.tier).cap; const club = clubsOf(f)[2]; const r = createRng(1);
  for (const m of R.clubRoster(f, club).filter((m) => m.position === 'QB')) m.injury = { severity: 'Moderate', weeks: 3, type: 'knee' };
  assert.ok(lineupProblems(R.clubRoster(f, club), buildDepthChart(R.clubRoster(f, club))).includes('QB'));
  const n = S.leagueInjuryCover(f, r, { year: 1, cap, targetOf: (c) => F.clubQuality(f, c) });
  assert.ok(n >= 1); const roster = R.clubRoster(f, club);
  assert.deepEqual(lineupProblems(roster, buildDepthChart(roster)), []); assert.ok(roster.length <= ROSTER_MAX); assert.ok(R.clubCapRoom(f, club, cap) >= 0, 'cover never breaks the cap');
  assert.ok(roster.filter((m) => m.position === 'QB' && !m.injury).length >= 1);
  assert.deepEqual(R.verifyLeague(f), []);
});

test('the owner\'s market stays about today\'s size: at most a few AI castoffs per regional pool, and only at market grade', () => {
  const { f } = runFranchise(42, { seasons: 3, difficulty: 'pro', check: leagueInvariants });
  const pooled = Object.values(f.pool || {}).flat();
  for (const [region, list] of Object.entries(f.pool || {})) assert.ok(list.filter((m) => m.poolVia === 'ai').length <= AI_POOL_SHARE, `${region}: ${list.length} AI castoffs`);
  for (const m of pooled.filter((m) => m.poolVia === 'ai')) assert.ok(monsterOverall(m) <= 60 + 8, `${m.name} ${monsterOverall(m)} OVR grew in the pool at most`); // ≤ 60 when he entered
  const market = F.offseasonMarket(f); assert.ok(market.length <= 12 + 8 * AI_POOL_SHARE + f.roster.length, 'the market is not flooded');
  assert.ok(f.league.waivers.length <= 40);
});

test('migration at the offseason (contracts open) and mid-draft: the registry is built, the draft finishes into real rosters, the next season starts', () => {
  for (const when of ['offseason', 'draft']) {
    const { f } = runFranchise(43, { seasons: 1, legacy: true, stopWeek: 9 }); assert.ok(!F.hasLeague(f));
    let g = 0; while (!f.season.finished && g++ < 40) { if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; } F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const gm = F.simulatePlayerGame(f); if (!gm) break; F.finishSunday(f, gm); }
    assert.ok(f.season.finished); while (f.scenes?.length) F.dismissScene(f);
    settle(f);
    if (when === 'draft') { assert.ok(F.beginDraft(f).ok); assert.ok(f.draft.started && !f.draft.done, 'the owner is on the clock'); }
    const r = F.ensureLeague(f); assert.ok(r.ok, `${when}: ${r.problems.join('; ')}`);
    assert.deepEqual(R.verifyLeague(f), []);
    if (when === 'offseason') assert.ok(F.beginDraft(f).ok);
    draftAll(f); assert.ok(f.draft.done);
    const aiPicks = f.draft.picks.filter((p) => p.team !== f.club && p.id);
    const inRegistry = aiPicks.filter((p) => F.findInLeague(f, p.id)?.where === 'league').length;
    const legacyPicks = Object.values(f.draftResults?.[f.season.year] || {}).flat().length;
    assert.ok(inRegistry + legacyPicks >= aiPicks.length - 2, `${when}: picks made before the capture stayed in draftResults, after it joined rosters (${inRegistry} + ${legacyPicks} of ${aiPicks.length})`);
    fill(f); const sn = F.startNextSeason(f); assert.ok(sn.ok, `${when}: ${sn.reason}`);
    assert.deepEqual(leagueInvariants(f, when), []);
    assert.ok(f.leagueOffseason?.opened === f.season.year && f.leagueOffseason.freeAgency && f.leagueOffseason.nudge);
  }
});

test('a trade moves the real monster: he leaves his club with his books and career, the club is one lighter, and he can be released back into the league', async () => {
  const f = newFranchise(44); const T = await import('../src/franchise/trades.js'); const club = clubsOf(f)[1];
  const m = R.clubRoster(f, club).find((x) => T.tradable(f, x)); assert.ok(m); m.stats.career.reg.games = 9; m.stats.career.reg.tackles = 40;
  const before = R.clubRoster(f, club).length;
  const got = T.executeTrade(f, { team: club, give: [], get: { player: m } }, { club: f.club, year: 1, nextYear: 1 });
  assert.equal(got.player, m, 'the very object'); assert.ok(f.roster.includes(m)); assert.equal(f.league.monsters[m.id], undefined); assert.equal(R.clubRoster(f, club).length, before - 1);
  assert.equal(m.history.at(-1).club, club); assert.equal(m.history.at(-1).reason, 'traded'); assert.equal(m.stats.career.reg.tackles, 40); assert.ok(m.contract && m.traded.from === club);
  assert.equal(f.aiTransfers, undefined, 'no transfer ledger: the roster itself changed');
  assert.deepEqual(R.verifyLeague(f), []);
  const rel = F.releaseMonster(f, m.id); assert.ok(rel.ok); assert.ok(Object.values(f.pool).flat().includes(m)); assert.ok(!m.poolVia, 'the owner\'s castoff is not counted against the AI share');
});

test('the dev shortcut plays a whole season over a persistent league (test builds only); the Season-20 archive keeps the registry read-only', async () => {
  const { f, problems } = runFranchise(45, { seasons: 2, difficulty: 'rookie', check: leagueInvariants }); assert.deepEqual(problems, []);
  // archive it as a voluntary retirement would (the checklist is not the point here: the registry inside the archive is)
  const before = JSON.stringify(f.league); const club = clubsOf(f)[0]; const ids = R.clubRecord(f, club).roster.slice();
  settle(f); while (f.scenes?.length) F.dismissScene(f);
  const r = L.finalizeArchive(f, { reason: 'voluntary', hofCard: null }); assert.ok(r.ok, r.reason);
  assert.ok(F.hasLeague(f)); assert.equal(f.league.waivers, undefined, 'the waivers (working data) are dropped'); assert.deepEqual(R.clubRecord(f, club).roster, ids);
  assert.equal(JSON.stringify({ ...f.league, waivers: undefined }), JSON.stringify({ ...JSON.parse(before), waivers: undefined }), 'rosters, books and legends are the archive\'s');
  assert.throws(() => F.ensureLeague(f), (e) => e.code === 'read-only');
  assert.throws(() => F.startNextSeason(f), (e) => e.code === 'read-only');
  const m = R.clubRoster(f, club)[0]; const prof = (await import('../src/franchise/career-profile.js')).careerProfile(f, m.id); assert.equal(prof.kind, 'full'); assert.equal(prof.club, club);
});
