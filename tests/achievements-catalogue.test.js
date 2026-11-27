// The 200-achievement catalogue (achievement overhaul 2026-11): the definitions, the metrics and their boundaries, tracking
// (streaks, duplicates), season and career checks, the franchise integration, the one-time backfill, the account store
// (multi-franchise, cloud merge), eligibility, the unlock queue and the evaluation cost. Targeted: no long simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryLocalStorage } from './helpers/cloud-sim.js';
globalThis.localStorage = memoryLocalStorage();
const A = await import('../src/data/achievements.js');
const S = await import('../src/franchise/achievement-store.js');
const F = await import('../src/franchise/franchise.js');
const { newFranchise } = await import('../tools/franchise-soak.mjs');
const { englishText } = await import('../src/text/index.js');
const { REG_GAMES } = await import('../src/data/league.js');
const { playGame } = await import('../src/sim/game-runner.js');
const { generatedTeam } = await import('../src/franchise/roster.js');
const { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } = A;

const LEGACY_IDS = ['first_win', 'rival_beaten', 'rival_swept', 'first_badge', 'half_badges', 'all_badges', 'winning_season', 'undefeated', 'first_playoffs', 'conference_title', 'first_title', 'second_title', 'first_award', 'wins_10', 'wins_30', 'wins_50', 'legend_tracked', 'legend_unlocked', 'hof_eligible', 'hot_seat_survived', 'traded_up', 'dex_original', 'dex_basic', 'dex_all'];
const tally = (k) => ACHIEVEMENTS.reduce((m, a) => ((m[a[k]] = (m[a[k]] || 0) + 1), m), {});
const fresh = () => { const f = newFranchise(5, { difficulty: 'pro' }); f.achievements = {}; f.scenes = []; f.achQueue = []; delete f.achTrack; f.achCatalogue = 1; return f; };
const game = (o = {}) => ({ won: true, tied: false, pts: 21, opp: 14, ot: false, tiebreak: false, home: true, playoff: false, conferenceRound: false, oppClub: 'X', maxDeficit: 0, tos: 1, takeaways: 1, yards: 250, oppYards: 220, passYds: 180, passTd: 2, rushYds: 60, rushTd: 1, recYds: 90, tackles: 7, playerSacks: 1, longPlay: 30, int: 0, sacks: 1, tfl: 1, fgm: 1, fgLong: 35, defTd: 0, krTd: 0, legendInLineup: false, formerClub: false, gymWin: false, newBadge: null, lostBadge: null, ...o });

test('exactly 200 unique definitions with the brief\'s category and rarity totals, the 24 original ids kept', () => {
  assert.equal(ACHIEVEMENTS.length, 200); assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 200);
  assert.deepEqual(tally('category'), { game: 20, franchise: 15, championship: 12, offense: 15, defense: 15, special: 10, dex: 15, evolution: 15, clash: 20, gym: 10, legendary: 8, draft: 10, trades: 12, coaching: 8, awards: 9, hidden: 6 });
  assert.deepEqual(tally('rarity'), { common: 50, uncommon: 45, rare: 45, epic: 35, legendary: 20, mythic: 5 });
  for (const id of LEGACY_IDS) { const a = ACHIEVEMENT_BY_ID[id]; assert.ok(a?.legacy, id); assert.equal(typeof a.when, 'function', `${id} keeps its own check`); assert.ok(a.beats?.length, `${id} keeps its cutscene`); }
  assert.equal(ACHIEVEMENTS.filter((a) => a.legacy).length, 24);
  const hidden = ACHIEVEMENTS.filter((a) => a.hidden); assert.equal(hidden.length, 6); assert.ok(hidden.every((a) => a.category === 'hidden'));
});

test('every row is complete: a known trigger and metric, a threshold, text for its name and description with every number filled', () => {
  const en = englishText(); const triggers = new Set(['sunday', 'season', 'playoffs', 'legend', 'trade', 'clash', 'recruit', 'evolve', 'draft', 'scout', 'sign', 'staff', 'any']);
  for (const a of ACHIEVEMENTS) {
    assert.ok(triggers.has(a.trigger), `${a.id}: trigger ${a.trigger}`); assert.ok(A.ACH_CATEGORIES.includes(a.category)); assert.ok(A.ACH_RARITIES.includes(a.rarity));
    assert.ok(['scene', 'toast', 'card', 'reveal'].includes(a.presentation), a.id); assert.ok(['franchise', 'account'].includes(a.scope));
    if (a.legacy) continue;
    assert.ok(S.METRICS[a.metric], `${a.id}: metric ${a.metric}`); if (a.progress) assert.ok(S.METRICS[a.progress], `${a.id}: progress ${a.progress}`);
    assert.ok(Number.isFinite(a.target) && a.target > 0, `${a.id}: target`); assert.equal(A.ACHIEVEMENT_THRESHOLDS[a.id], a.target);
    assert.ok(en[a.titleKey] && en[a.descKey], `${a.id}: text keys`); assert.doesNotMatch(A.achievementDesc(a), /\{\w+\}/, `${a.id}: every {value} filled`);
  }
});

test('boundaries: at, just below and just above each comparison', () => {
  const ge = { cmp: 'ge', target: 30 }, lt = { cmp: 'lt', target: 100 }, le = { cmp: 'le', target: 100 }, eq = { cmp: 'eq', target: 1 };
  assert.ok(S.meets(ge, 30)); assert.ok(!S.meets(ge, 29)); assert.ok(S.meets(ge, 31));
  assert.ok(S.meets(lt, 99)); assert.ok(!S.meets(lt, 100)); assert.ok(S.meets(le, 100)); assert.ok(!S.meets(le, 101));
  assert.ok(S.meets(eq, 1)); assert.ok(!S.meets(eq, 2)); assert.ok(!S.meets(ge, null), 'a metric that does not apply never meets');
  const f = fresh(); const v = (id, g) => S.metricValue(f, ACHIEVEMENT_BY_ID[id], { g });
  assert.equal(v('gp_score_30', game({ pts: 29 })), 29); assert.ok(!S.meets(ACHIEVEMENT_BY_ID.gp_score_30, 29)); assert.ok(S.meets(ACHIEVEMENT_BY_ID.gp_score_30, v('gp_score_30', game({ pts: 30 }))));
  assert.equal(v('gp_hold_100', game({ won: false, oppYards: 50 })), null, 'holding a club under 100 yards counts only in a win');
  assert.ok(S.meets(ACHIEVEMENT_BY_ID.gp_hold_100, v('gp_hold_100', game({ oppYards: 99 })))); assert.ok(!S.meets(ACHIEVEMENT_BY_ID.gp_hold_100, v('gp_hold_100', game({ oppYards: 100 }))));
  assert.equal(v('hd_one_point', game({ won: false, pts: 13, opp: 14 })), 1); assert.equal(v('hd_one_point', game({ won: true })), null);
  assert.equal(v('gp_comeback_14', game({ maxDeficit: 14 })), 14); assert.equal(v('gp_comeback_14', game({ won: false, maxDeficit: 20 })), null);
});

test('streaks: the best run is kept, the current run resets on a loss; a replayed game is not counted twice', () => {
  const f = fresh(); const seq = [true, true, false, true, true, true];
  seq.forEach((won, i) => S.trackGame(f, game({ won }), `w${i}`));
  assert.equal(S.METRICS.t_win_streak(f), 3); assert.equal(S.METRICS.t_win_streak_now(f), 3); assert.equal(S.METRICS.t_games(f), 6);
  assert.equal(S.trackGame(f, game({ won: true }), 'w5'), false, 'the same game id again is ignored'); assert.equal(S.METRICS.t_games(f), 6);
  S.trackGame(f, game({ won: false }), 'w6'); assert.equal(S.METRICS.t_win_streak_now(f), 0); assert.equal(S.METRICS.t_win_streak(f), 3);
  const pr = S.achievementProgress(f, ACHIEVEMENT_BY_ID.gp_streak_5); assert.equal(pr.value, 0, 'the bar shows the current run, not the best');
  S.trackGame(f, game({ won: true, home: false, opp: 0 }), 'w7'); assert.equal(S.METRICS.t_road_wins(f), 1); assert.equal(S.METRICS.t_shutout_wins(f), 1);
});

test('Clash tracking: by occasion, close and dominant wins, quick wins, the streak, and once per battle', () => {
  const f = fresh(); const win = (o = {}) => ({ winner: 'a', exchanges: 17, hpShare: { a: 0.3, b: 0 }, ...o });
  S.trackClash(f, 'encounter', win(), { key: 'e1', year: 1 }); S.trackClash(f, 'pregame', win({ hpShare: { a: 0.05, b: 0 } }), { key: 'p1', year: 1, watched: true });
  S.trackClash(f, 'overtime', win({ exchanges: 11, hpShare: { a: 0.7, b: 0 } }), { key: 'o1', year: 1, playoff: true });
  assert.equal(S.trackClash(f, 'overtime', win(), { key: 'o1', year: 1 }), null, 'the same battle again is ignored');
  const m = (k) => S.METRICS[k](f);
  assert.deepEqual([m('t_clash_wins'), m('t_clash_enc'), m('t_clash_pre'), m('t_clash_ot'), m('t_clash_playoff_ot'), m('t_clash_watched')], [3, 1, 1, 1, 1, 1]);
  assert.deepEqual([m('t_clash_close'), m('t_clash_flawless'), m('t_clash_quick'), m('t_clash_streak')], [1, 1, 1, 3]);
  S.trackClash(f, 'pregame', { winner: 'b', exchanges: 18, hpShare: { a: 0, b: 0.2 } }, { key: 'p2', year: 1 });
  assert.equal(m('t_clash_streak_now'), 0); assert.equal(m('t_clash_streak'), 3); assert.equal(m('t_clash_battles'), 4);
});

test('season checks read one season\'s record: home games, points allowed only over a full season, a perfect kicker', () => {
  const f = fresh(); const sched = Array.from({ length: REG_GAMES }, (_, i) => ({ week: i + 1, opponent: `C${i}`, home: i % 2 === 0, result: { playerScore: 20, oppScore: 7, won: true } }));
  const h = { year: 1, club: f.club, record: { w: REG_GAMES, l: 0, t: 0 }, champion: f.club, schedule: sched, leagueStats: { [f.club]: { k: { fga: 12, fgm: 12, xpa: 30, xpm: 30, fgLong: 52 }, qb: { passYds: 3100, passTd: 41 } } }, awards: { league: { mvp: { id: 'qb', team: f.club } } } };
  const v = (id) => S.metricValue(f, ACHIEVEMENT_BY_ID[id], { h });
  assert.equal(v('gp_home_unbeaten'), 1); assert.equal(v('df_season_allowed'), 7 * REG_GAMES); assert.equal(v('st_perfect_kicker'), 12); assert.equal(v('ch_perfect_season'), 1); assert.equal(v('of_season_pass_td_40'), 41);
  const partial = { ...h, schedule: sched.map((g, i) => (i < 5 ? g : { ...g, result: null })) };
  assert.equal(S.metricValue(f, ACHIEVEMENT_BY_ID.df_season_allowed, { h: partial }), null, 'not before the season is complete');
  h.leagueStats[f.club].k.xpm = 29; assert.equal(v('st_perfect_kicker'), 0, 'one missed extra point spoils it');
});

test('franchise integration: earned once, queued once, in the account store; a developer-shortcut franchise earns nothing', () => {
  S.resetAchievements(); const f = fresh(); f.achTrack = undefined;
  const g = game({ pts: 31, opp: 0 }); S.trackGame(f, g, 'k1');
  const got = F.checkAchievements(f, 'sunday', { g, won: true });
  for (const id of ['gp_shutout', 'gp_score_30']) { assert.ok(got.includes(id), id); assert.ok(f.achievements[id]); assert.ok(S.achievementsData().earned[id], `${id} in the account store`); }
  assert.ok(f.achQueue.some((x) => x.id === 'gp_shutout')); const q = f.achQueue.length;
  assert.deepEqual(F.checkAchievements(f, 'sunday', { g, won: true }).filter((id) => !ACHIEVEMENT_BY_ID[id].legacy), [], 'never twice'); assert.equal(f.achQueue.length, q);
  F.dismissAchievementUnlocks(f, q); assert.equal(f.achQueue.length, 0);
  const d = fresh(); d.achDev = true; assert.equal(S.achEligible(d), false); assert.deepEqual(F.checkAchievements(d, 'sunday', { g, won: true }), []);
  const before = S.METRICS.t_games(d); F.gameFacts; assert.equal(before, 0);
});

test('backfill: only what the save proves, once, announced as one notice; seasons already tracked are not counted again', () => {
  S.resetAchievements(); const f = fresh(); delete f.achCatalogue; delete f.achTrack; f.season.year = 3;
  const sched = (won, opp = 0) => Array.from({ length: REG_GAMES }, (_, i) => ({ week: i + 1, opponent: `C${i}`, home: i % 2 === 1, result: { playerScore: won ? 35 : 3, oppScore: opp, won } }));
  f.history = [{ year: 1, club: f.club, record: { w: REG_GAMES, l: 0, t: 0 }, champion: f.club, schedule: sched(true), leagueStats: {}, awards: { league: {} } }, { year: 2, club: f.club, record: { w: 0, l: REG_GAMES, t: 0 }, champion: 'Other', schedule: sched(false, 10), leagueStats: {}, awards: { league: {} } }];
  const got = F.backfillCatalogue(f);
  for (const id of ['gp_shutout', 'gp_score_30', 'gp_streak_10', 'gp_home_unbeaten', 'ch_perfect_season']) assert.ok(got.includes(id), id);
  for (const id of ['ev_final_stage', 'ev_final_x5', 'ev_apex', 'ev_level_50', 'dr_first_pick']) assert.ok(!got.includes(id), `${id}: a founding roster proves nothing`);
  assert.ok(!got.includes('fm_games_100'), '28 games is not 100'); assert.ok(!got.includes('of_pass_250'), 'a single-game passing feat is not in the history: not granted');
  assert.equal(S.METRICS.t_games(f), 2 * REG_GAMES); assert.equal(S.METRICS.t_conf_titles(f), 1, 'a title proves its conference final');
  assert.ok(got.every((id) => f.achievements[id].backfilled)); assert.deepEqual(f.achQueue, [{ retro: got.length }], 'one notice, not one toast each');
  assert.deepEqual(F.backfillCatalogue(f), [], 'once'); assert.equal(S.METRICS.t_games(f), 2 * REG_GAMES, 'and the tracker is not seeded twice');
});

test('account store: several franchises, cloud merge without duplicates, earliest first-earn kept, account-scope checks', () => {
  S.resetAchievements();
  S.recordAchievementGlobal('first_title', { club: 'A', franchise: 'u1', year: 2, scene: null }); S.recordAchievementGlobal('first_title', { club: 'B', franchise: 'u2', year: 5, scene: null });
  assert.equal(S.recordAchievementGlobal('first_title', { club: 'B', franchise: 'u2', year: 6, scene: null }), false, 'the same franchise twice is one entry');
  assert.deepEqual(S.achievementsData().earned.first_title.franchises, ['u1', 'u2']); assert.equal(S.METRICS.a_title_franchises(), 2);
  const at = S.achievementsData().earned.first_title.at;
  S.mergeAchievements({ earned: { first_title: { club: 'C', franchise: 'u3', at: at - 1000, franchises: ['u3', 'u1'] }, gp_shutout: { club: 'C', franchise: 'u3', at: 5, franchises: ['u3'] } } });
  const e = S.achievementsData().earned; assert.equal(e.first_title.club, 'C', 'the earlier first earn wins'); assert.deepEqual([...e.first_title.franchises].sort(), ['u1', 'u2', 'u3']); assert.ok(e.gp_shutout);
  const n = Object.keys(e).length; S.mergeAchievements(JSON.parse(JSON.stringify(S.achievementsData()))); assert.equal(Object.keys(S.achievementsData().earned).length, n, 'merging a copy of itself adds nothing');
});

test('hidden achievements are flagged for placeholders; the unlock queue keeps at most 40 entries', () => {
  for (const a of ACHIEVEMENTS.filter((x) => x.hidden)) { assert.equal(a.category, 'hidden'); assert.ok(a.titleKey && a.descKey); }
  const f = fresh(); f.achQueue = Array.from({ length: 45 }, (_, i) => ({ id: 'gp_shutout', i })); F.dismissAchievementUnlocks(f, 5); assert.equal(f.achQueue.length, 40);
  assert.deepEqual(F.pendingAchievementUnlocks(f).length, 40);
});

test('the comeback tracker records each side\'s largest deficit and leaves the game itself unchanged', () => {
  const home = generatedTeam(71, { id: 'h', name: 'H', quality: 58 }), away = generatedTeam(72, { id: 'a', name: 'A', quality: 58 });
  const g = playGame({ home, away, seed: 9, quarterLength: 180, frames: 'last' });
  assert.ok(g.maxDeficit && g.maxDeficit.home >= 0 && g.maxDeficit.away >= 0);
  const loser = g.score.home < g.score.away ? 'home' : g.score.away < g.score.home ? 'away' : null;
  if (loser) assert.ok(g.maxDeficit[loser] >= Math.abs(g.score.home - g.score.away), 'the loser trailed at least by the final margin');
  const again = playGame({ home: generatedTeam(71, { id: 'h', name: 'H', quality: 58 }), away: generatedTeam(72, { id: 'a', name: 'A', quality: 58 }), seed: 9, quarterLength: 180, frames: 'last' });
  assert.deepEqual(again.score, g.score); assert.equal(again.rngState, g.rngState);
});

test('evaluation cost: a full check of every row stays well under a millisecond-scale budget', () => {
  const f = fresh(); const H = { dexCounts: (x) => F.dexCounts(x), dexCountsGlobal: () => ({ signed: 0 }), isLegendary: () => false, badgesWonThisSeason: () => 0, rival: () => null, gymCount: 12 };
  const t0 = performance.now(); for (let i = 0; i < 200; i++) S.evaluateCatalogue(f, 'sunday', { g: game(), live: true, H }); const per = (performance.now() - t0) / 200;
  assert.ok(per < 5, `${per.toFixed(3)} ms per check`);
});
