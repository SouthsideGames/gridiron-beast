// Achievement review (2026-11-26): every metric the catalogue uses has a positive and a negative case built from realistic franchise
// state; real play earns through the real hooks; founding gifts and creation-draft picks grant nothing; developer-disqualified
// franchises never feed account-wide rows; the queue never drops a Legendary/Mythic reveal; reload, duplicates, franchise
// switching, cloud merge and backfill keep records intact. Targeted: a few weeks of play, no long simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryLocalStorage } from './helpers/cloud-sim.js';
globalThis.localStorage = memoryLocalStorage();
const A = await import('../src/data/achievements.js');
const S = await import('../src/franchise/achievement-store.js');
const F = await import('../src/franchise/franchise.js');
const Save = await import('../src/franchise/save.js');
const W = await import('../src/franchise/sim-weeks.js');
const { newFranchise } = await import('../tools/franchise-soak.mjs');
const { REG_GAMES } = await import('../src/data/league.js');
const { SPECIES_DEX } = await import('../src/data/species.js');
const { resetDex, dexRecordGlobal } = await import('../src/franchise/dex-store.js');
const { STAFF } = await import('../src/data/staff.js');
const { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } = A;

const TEMPLATES = {}; // one founded franchise per seed, cloned per case (founding is the slow part)
const base = (seed = 5) => { const t = (TEMPLATES[seed] ||= newFranchise(seed, { difficulty: 'pro' })); const f = structuredClone(t); f.achievements = {}; f.scenes = []; f.achQueue = []; delete f.achTrack; f.achCatalogue = 1; return f; };
const G = (o = {}) => ({ won: true, tied: false, pts: 14, opp: 10, ot: false, tiebreak: false, home: true, playoff: false, conferenceRound: false, oppClub: 'X', maxDeficit: 0, tos: 1, takeaways: 1, yards: 200, oppYards: 190, passYds: 100, passTd: 1, rushYds: 40, rushTd: 0, recYds: 60, tackles: 5, playerSacks: 0, longPlay: 20, int: 0, sacks: 0, tfl: 0, fgm: 0, fgLong: 0, defTd: 0, krTd: 0, legendInLineup: false, oppLegend: false, formerClub: false, gymWin: false, newBadge: null, lostBadge: null, oppFamilies: [], ...o });
const H = (f) => ({ dexCounts: (x) => F.dexCounts(x), dexCountsGlobal: () => ({ signed: 0 }), isLegendary: (m) => !!m.legendary, badgesWonThisSeason: (x) => x._badgesWon || 0, rival: (x) => x.rivals?.[x.tier]?.team || null, gymCount: 12 });
const sched = (o = {}) => Array.from({ length: REG_GAMES }, (_, i) => ({ week: i + 1, opponent: `C${i}`, home: i % 2 === 0, result: { playerScore: 20, oppScore: 7, won: true, ...o } }));
const hist = (f, o = {}) => ({ year: 1, club: f.club, record: { w: REG_GAMES, l: 0, t: 0 }, champion: f.club, playoffs: true, schedule: sched(), leagueStats: { [f.club]: {} }, awards: { league: {} }, ...o });
const stats = (f, h, p) => { h.leagueStats = { [f.club]: { p } }; return h; };
const mon = (f, o = {}) => ({ id: `m${Math.random().toString(36).slice(2)}`, name: 'X', species: SPECIES_DEX[0].id, position: 'QB', level: 10, stage: 0, attributes: {}, career: { ev: [] }, stats: { career: { reg: { games: 0 }, post: {} } }, ...o });
const track = (f, n = {}, best = {}, set = {}) => { const t = S.achTrack(f); Object.assign(t.n, n); Object.assign(t.best, best); for (const [k, v] of Object.entries(set)) t.set[k] = v; return f; };
const strong = (m) => { for (const k of ['speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'durability', 'kicking']) m.attributes[k] = 99; return m; };
const weak = (m) => { for (const k of ['speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'durability', 'kicking']) m.attributes[k] = 30; return m; };

// metric → [target-bearing row id, positive setup, negative setup]; each setup returns the evaluation context (and may change f).
const g = (o) => () => ({ g: G(o) });
const CASES = {
  g_win_shutout: ['gp_shutout', g({ opp: 0 }), g({ opp: 3 })], g_pts: ['gp_score_30', g({ pts: 30 }), g({ pts: 29 })], g_win_margin: ['gp_blowout_20', g({ pts: 30, opp: 10 }), g({ pts: 29, opp: 10 })],
  g_ot_win: ['gp_ot_win', g({ ot: true }), g({ ot: true, won: false })], g_comeback: ['gp_comeback_14', g({ maxDeficit: 14 }), g({ maxDeficit: 13 })], g_win_no_to: ['gp_no_turnover_win', g({ tos: 0 }), g({ tos: 1 })],
  g_win_opp_yards: ['gp_hold_100', g({ oppYards: 99 }), g({ oppYards: 100 })], g_pass_yds: ['of_pass_250', g({ passYds: 250 }), g({ passYds: 249 })], g_pass_td: ['of_pass_td_4', g({ passTd: 4 }), g({ passTd: 3 })],
  g_rush_yds: ['of_rush_150', g({ rushYds: 150 }), g({ rushYds: 149 })], g_rush_td: ['of_rush_td_3', g({ rushTd: 3 }), g({ rushTd: 2 })], g_rec_yds: ['of_rec_150', g({ recYds: 150 }), g({ recYds: 149 })],
  g_long_play: ['of_long_80', g({ longPlay: 80 }), g({ longPlay: 79 })], g_team_yards: ['of_team_yards_500', g({ yards: 500 }), g({ yards: 499 })], g_team_int: ['df_int_2', g({ int: 2 }), g({ int: 1 })],
  g_team_sacks: ['df_sacks_3', g({ sacks: 3 }), g({ sacks: 2 })], g_team_tfl: ['df_tfl_5', g({ tfl: 5 }), g({ tfl: 4 })], g_tackles: ['df_tackles_12', g({ tackles: 12 }), g({ tackles: 11 })], g_sacks: ['df_player_sacks_4', g({ playerSacks: 4 }), g({ playerSacks: 3 })],
  g_takeaways: ['df_takeaways_4', g({ takeaways: 4 }), g({ takeaways: 3 })], g_fg_long: ['st_fg_50', g({ fgLong: 50 }), g({ fgLong: 49 })], g_fgm: ['st_fg_3_game', g({ fgm: 3 }), g({ fgm: 2 })],
  g_legend_win: ['lg_legend_win', g({ legendInLineup: true }), g({ legendInLineup: true, won: false })], g_faced_legend: ['lg_sighting', g({ oppLegend: true }), g({ oppLegend: false })],
  g_legend_playoff_win: ['lg_legend_playoff', g({ legendInLineup: true, playoff: true }), g({ legendInLineup: true, playoff: false })], g_loss_by: ['hd_one_point', g({ won: false, pts: 13, opp: 14 }), g({ won: false, pts: 12, opp: 14 })],
  g_tiebreak_win: ['hd_tiebreak', g({ tiebreak: true }), g({ tiebreak: true, won: false })], g_win_outgained: ['hd_outgained', g({ yards: 100, oppYards: 300 }), g({ yards: 101, oppYards: 300 })], g_beat_old_club: ['hd_old_club', g({ formerClub: true }), g({ formerClub: false })],
  // tracked counts, driven through the tracking functions
  t_road_wins: ['gp_road_wins', (f) => { for (let i = 0; i < 10; i++) S.trackGame(f, G({ home: false }), `r${i}`); return {}; }, (f) => { for (let i = 0; i < 10; i++) S.trackGame(f, G({ home: i > 0 }), `r${i}`); return {}; }],
  t_shutout_wins: ['df_shutouts_5', (f) => { for (let i = 0; i < 5; i++) S.trackGame(f, G({ opp: 0 }), `s${i}`); return {}; }, (f) => { for (let i = 0; i < 5; i++) S.trackGame(f, G({ opp: 0 }), 's0'); return {}; }],
  t_games: ['fm_games_100', (f) => { for (let i = 0; i < 100; i++) S.trackGame(f, G({ won: i % 2 === 0 }), `g${i}`); return {}; }, (f) => { for (let i = 0; i < 99; i++) S.trackGame(f, G(), `g${i}`); return {}; }],
  t_win_streak: ['gp_streak_5', (f) => { for (let i = 0; i < 5; i++) S.trackGame(f, G(), `w${i}`); return {}; }, (f) => { [1, 1, 1, 1, 0, 1].forEach((w, i) => S.trackGame(f, G({ won: !!w }), `w${i}`)); return {}; }],
  t_win_streak_now: ['gp_streak_5', (f) => { for (let i = 0; i < 5; i++) S.trackGame(f, G(), `w${i}`); return {}; }, (f) => { [1, 1, 1, 1, 1, 0].forEach((w, i) => S.trackGame(f, G({ won: !!w }), `w${i}`)); return {}; }],
  t_clubs_beaten: ['gp_beat_25', (f) => { for (let i = 0; i < 25; i++) S.trackGame(f, G({ oppClub: `C${i}` }), `c${i}`); return {}; }, (f) => { for (let i = 0; i < 25; i++) S.trackGame(f, G({ oppClub: `C${i % 24}` }), `c${i}`); return {}; }],
  t_playoff_wins: ['ch_playoff_win', (f) => { S.trackGame(f, G({ playoff: true }), 'p'); return {}; }, (f) => { S.trackGame(f, G({ playoff: true, won: false }), 'p'); return {}; }],
  t_conf_titles: ['ch_conf_titles_3', (f) => { for (let i = 0; i < 3; i++) S.trackGame(f, G({ playoff: true, conferenceRound: true }), `k${i}`); return {}; }, (f) => { for (let i = 0; i < 3; i++) S.trackGame(f, G({ playoff: true, conferenceRound: i < 2 }), `k${i}`); return {}; }],
  t_def_td: ['df_pick_six', (f) => { S.trackGame(f, G({ defTd: 1 }), 'd'); return {}; }, (f) => { S.trackGame(f, G({ defTd: 0 }), 'd'); return {}; }],
  t_kr_td: ['st_kr_td_3', (f) => { S.trackGame(f, G({ krTd: 3 }), 'k'); return {}; }, (f) => { S.trackGame(f, G({ krTd: 2 }), 'k'); return {}; }],
  t_fgm: ['st_first_fg', (f) => { S.trackGame(f, G({ fgm: 1 }), 'f'); return {}; }, (f) => { S.trackGame(f, G({ fgm: 0 }), 'f'); return {}; }],
  t_gym_wins: ['gy_gym_wins_10', (f) => { for (let i = 0; i < 10; i++) S.trackGame(f, G({ gymWin: true }), `y${i}`); return {}; }, (f) => { for (let i = 0; i < 10; i++) S.trackGame(f, G({ gymWin: i > 0 }), `y${i}`); return {}; }],
  t_badge_regained: ['gy_regained', (f) => { S.trackGame(f, G({ won: false, lostBadge: 'Harbor Anchors' }), 'a'); S.trackGame(f, G({ newBadge: 'Harbor Anchors' }), 'b'); return {}; }, (f) => { S.trackGame(f, G({ newBadge: 'Harbor Anchors' }), 'b'); return {}; }],
  t_clash_wins: ['cl_wins_10', (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17, hpShare: { a: 0.3 } }, { key: `c${i}` }); return {}; }, (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'pregame', { winner: i ? 'a' : 'b', exchanges: 17, hpShare: { a: 0.3 } }, { key: `c${i}` }); return {}; }],
  t_clash_battles: ['cl_battles_25', (f) => { for (let i = 0; i < 25; i++) S.trackClash(f, 'pregame', { winner: 'b', exchanges: 17 }, { key: `c${i}` }); return {}; }, (f) => { for (let i = 0; i < 24; i++) S.trackClash(f, 'pregame', { winner: 'b', exchanges: 17 }, { key: `c${i}` }); return {}; }],
  t_clash_enc: ['cl_enc_wins_10', (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'encounter', { winner: 'a', exchanges: 17 }, { key: `c${i}` }); return {}; }, (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}` }); return {}; }],
  t_clash_pre: ['cl_pre_wins_10', (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}` }); return {}; }, (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'encounter', { winner: 'a', exchanges: 17 }, { key: `c${i}` }); return {}; }],
  t_clash_ot: ['cl_ot_win', (f) => { S.trackClash(f, 'overtime', { winner: 'a', exchanges: 17 }, { key: 'o' }); return {}; }, (f) => { S.trackClash(f, 'overtime', { winner: 'b', exchanges: 17 }, { key: 'o' }); return {}; }],
  t_clash_playoff_ot: ['cl_playoff_ot', (f) => { S.trackClash(f, 'overtime', { winner: 'a', exchanges: 17 }, { key: 'o', playoff: true }); return {}; }, (f) => { S.trackClash(f, 'overtime', { winner: 'a', exchanges: 17 }, { key: 'o', playoff: false }); return {}; }],
  t_clash_close: ['cl_close', (f) => { S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17, hpShare: { a: 0.09 } }, { key: 'c' }); return {}; }, (f) => { S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17, hpShare: { a: 0.1 } }, { key: 'c' }); return {}; }],
  t_clash_flawless: ['cl_dominant', (f) => { S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17, hpShare: { a: 0.6 } }, { key: 'c' }); return {}; }, (f) => { S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17, hpShare: { a: 0.59 } }, { key: 'c' }); return {}; }],
  t_clash_quick: ['cl_quick', (f) => { S.trackClash(f, 'pregame', { winner: 'a', exchanges: 12 }, { key: 'c' }); return {}; }, (f) => { S.trackClash(f, 'pregame', { winner: 'a', exchanges: 13 }, { key: 'c' }); return {}; }],
  t_clash_commanded: ['cl_commanded_25', (f) => { for (let i = 0; i < 25; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}`, commanded: true }); return {}; }, (f) => { for (let i = 0; i < 25; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}`, commanded: i > 0 }); return {}; }],
  t_clash_streak: ['cl_streak_5', (f) => { for (let i = 0; i < 5; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}` }); return {}; }, (f) => { [1, 1, 0, 1, 1, 1].forEach((w, i) => S.trackClash(f, 'pregame', { winner: w ? 'a' : 'b', exchanges: 17 }, { key: `c${i}` })); return {}; }],
  t_clash_streak_now: ['cl_streak_5', (f) => { for (let i = 0; i < 5; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}` }); return {}; }, (f) => { [1, 1, 1, 1, 1, 0].forEach((w, i) => S.trackClash(f, 'pregame', { winner: w ? 'a' : 'b', exchanges: 17 }, { key: `c${i}` })); return {}; }],
  s_clash_unbeaten: ['cl_season_unbeaten', (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'pregame', { winner: 'a', exchanges: 17 }, { key: `c${i}`, year: f.season.year }); return { live: true }; }, (f) => { for (let i = 0; i < 10; i++) S.trackClash(f, 'pregame', { winner: i ? 'a' : 'b', exchanges: 17 }, { key: `c${i}`, year: f.season.year }); return { live: true }; }],
  // owner actions (tracker counts written by the hooks; the hooks themselves are exercised in the play test below)
  t_recruits: ['cl_recruit_first', (f) => track(f, { recruits: 1 }) && {}, (f) => track(f, { recruits: 0 }) && {}], t_evolutions: ['ev_first_evolve', (f) => track(f, { evolutions: 1 }) && {}, () => ({})],
  t_draft_picks: ['dr_first_pick', (f) => track(f, { draftPicks: 1 }) && {}, () => ({})], t_top_pick: ['dr_top_pick', (f) => track(f, { topPick: 1 }) && {}, () => ({})], t_full_scout: ['dr_scout_full', (f) => track(f, { fullScout: 1 }) && {}, () => ({})],
  t_scouts: ['dr_scouts_10', (f) => track(f, { scouts: 10 }) && {}, (f) => track(f, { scouts: 9 }) && {}], t_regions: ['dr_regions', (f) => track(f, {}, {}, { regions: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`R${i}`, 1])) }) && {}, (f) => track(f, {}, {}, { regions: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`R${i}`, 1])) }) && {}],
  t_fa_signed: ['fa_first_sign', (f) => track(f, { faSigned: 1 }) && {}, () => ({})], t_fa_ovr: ['fa_sign_80', (f) => track(f, {}, { faOvr: 80 }) && {}, (f) => track(f, {}, { faOvr: 79 }) && {}],
  t_extensions: ['fa_extend_5', (f) => track(f, { extensions: 5 }) && {}, (f) => track(f, { extensions: 4 }) && {}], t_hires: ['co_first_hire', (f) => track(f, { hires: 1 }) && {}, () => ({})], t_cap_clean: ['fa_cap_clean_5', (f) => track(f, { capClean: 5 }) && {}, (f) => track(f, { capClean: 4 }) && {}],
  t_trades: ['traded_up', (f) => { f.trades = [{ year: 1, team: 'X', got: { picks: [] } }]; return {}; }, (f) => { f.trades = []; return {}; }],
  t_rival_trades: ['tr_rival_trade', (f) => { f.trades = [{ team: f.rivals[f.tier].team, got: { picks: [] } }]; return { H: H(f) }; }, (f) => { f.trades = [{ team: 'Nobody', got: { picks: [] } }]; return { H: H(f) }; }],
  t_trade_ovr: ['tr_trade_80', (f) => { f.trades = [{ got: { player: { ovr: 80 } } }]; return {}; }, (f) => { f.trades = [{ got: { player: { ovr: 79 } } }]; return {}; }],
  t_trade_picks: ['tr_pick_haul', (f) => { f.trades = [{ got: { picks: [1, 2, 3] } }]; return {}; }, (f) => { f.trades = [{ got: { picks: [1, 2] } }]; return {}; }],
  rival_wins: ['hd_rival_10', (f) => { f.campaign.h2h = { [f.rivals[f.tier].team]: { w: 10, l: 0 } }; return { H: H(f) }; }, (f) => { f.campaign.h2h = { [f.rivals[f.tier].team]: { w: 9, l: 0 } }; return { H: H(f) }; }],
  // the franchise's record
  c_wins: ['wins_10', (f) => { f.campaign.wins = 10; return {}; }, (f) => { f.campaign.wins = 9; return {}; }], c_titles: ['first_title', (f) => { f.campaign.titles = 1; return {}; }, (f) => { f.campaign.titles = 0; return {}; }],
  c_awards: ['first_award', (f) => { f.campaign.awards = 1; return {}; }, (f) => { f.campaign.awards = 0; return {}; }], c_badges: ['gy_badges_3', (f) => { f.campaign.badges = { a: {}, b: {}, c: {} }; return {}; }, (f) => { f.campaign.badges = { a: {}, b: {} }; return {}; }],
  c_tracks: ['legend_tracked', (f) => { f.campaign.tracks = { x: 1 }; return {}; }, (f) => { f.campaign.tracks = {}; return {}; }], c_unlocked: ['legend_unlocked', (f) => { f.campaign.unlocked = { x: true }; return {}; }, (f) => { f.campaign.unlocked = {}; return {}; }],
  h_seasons: ['fm_seasons_5', (f) => { f.history = Array.from({ length: 5 }, (_, i) => hist(f, { year: i + 1 })); return {}; }, (f) => { f.history = Array.from({ length: 4 }, (_, i) => hist(f, { year: i + 1 })); return {}; }],
  h_winning_seasons: ['fm_winning_5', (f) => { f.history = Array.from({ length: 5 }, (_, i) => hist(f, { year: i + 1 })); return {}; }, (f) => { f.history = Array.from({ length: 5 }, (_, i) => hist(f, { year: i + 1, record: i ? { w: 9, l: 5 } : { w: 7, l: 7 } })); return {}; }],
  h_winning_run: ['fm_winning_run_3', (f) => { f.history = [8, 9, 10].map((w, i) => hist(f, { year: i + 1, record: { w, l: 14 - w } })); return {}; }, (f) => { f.history = [8, 7, 10, 9].map((w, i) => hist(f, { year: i + 1, record: { w, l: 14 - w } })); return {}; }],
  h_playoffs: ['ch_playoffs_5', (f) => { f.history = Array.from({ length: 5 }, (_, i) => hist(f, { year: i + 1 })); return {}; }, (f) => { f.history = Array.from({ length: 5 }, (_, i) => hist(f, { year: i + 1, playoffs: i > 0 })); return {}; }],
  h_title_run: ['ch_back_to_back', (f) => { f.history = [hist(f, { year: 1 }), hist(f, { year: 2 })]; return {}; }, (f) => { f.history = [hist(f, { year: 1 }), hist(f, { year: 2, champion: 'Other' }), hist(f, { year: 3 })]; return {}; }],
  s_wins: ['fm_twelve_wins', (f) => ({ h: hist(f, { record: { w: 12, l: 2 } }) }), (f) => ({ h: hist(f, { record: { w: 11, l: 3 } }) })],
  s_points: ['fm_points_300', (f) => ({ h: hist(f, { schedule: sched({ playerScore: 22 }) }) }), (f) => ({ h: hist(f, { schedule: sched({ playerScore: 21 }) }) })],
  s_points_allowed: ['df_season_allowed', (f) => ({ h: hist(f, { schedule: sched({ oppScore: 7 }) }) }), (f) => ({ h: hist(f, { schedule: sched({ oppScore: 8 }) }) })],
  s_home_unbeaten: ['gp_home_unbeaten', (f) => ({ h: hist(f) }), (f) => { const h = hist(f); h.schedule[0].result = { playerScore: 3, oppScore: 7, won: false }; return { h }; }],
  s_perfect_title: ['ch_perfect_season', (f) => ({ h: hist(f) }), (f) => ({ h: hist(f, { record: { w: 13, l: 1 } }) })],
  s_pass_yds: ['of_season_pass_3000', (f) => ({ h: stats(f, hist(f), { passYds: 3000 }) }), (f) => ({ h: stats(f, hist(f), { passYds: 2999 }) })], s_rush_yds: ['of_season_rush_1000', (f) => ({ h: stats(f, hist(f), { rushYds: 1000 }) }), (f) => ({ h: stats(f, hist(f), { rushYds: 999 }) })],
  s_rec_yds: ['of_season_rec_1500', (f) => ({ h: stats(f, hist(f), { recYds: 1500 }) }), (f) => ({ h: stats(f, hist(f), { recYds: 1499 }) })], s_pass_td: ['of_season_pass_td_40', (f) => ({ h: stats(f, hist(f), { passTd: 40 }) }), (f) => ({ h: stats(f, hist(f), { passTd: 39 }) })],
  s_sacks: ['df_player_season_sacks', (f) => ({ h: stats(f, hist(f), { sacks: 14 }) }), (f) => ({ h: stats(f, hist(f), { sacks: 13 }) })], s_team_sacks: ['df_season_sacks_25', (f) => ({ h: stats(f, hist(f), { sacks: 25 }) }), (f) => ({ h: stats(f, hist(f), { sacks: 24 }) })],
  s_team_int: ['df_season_int_10', (f) => ({ h: stats(f, hist(f), { int: 10 }) }), (f) => ({ h: stats(f, hist(f), { int: 9 }) })], s_fgm: ['st_season_fg_12', (f) => ({ h: stats(f, hist(f), { fgm: 12 }) }), (f) => ({ h: stats(f, hist(f), { fgm: 11 }) })],
  s_perfect_kicker: ['st_perfect_kicker', (f) => ({ h: stats(f, hist(f), { fga: 10, fgm: 10, xpa: 20, xpm: 20 }) }), (f) => ({ h: stats(f, hist(f), { fga: 10, fgm: 10, xpa: 20, xpm: 19 }) })],
  s_awards: ['aw_season_3', (f) => ({ h: hist(f, { awards: { league: { mvp: { team: f.club }, opoy: { team: f.club }, dpoy: { team: f.club } } } }) }), (f) => ({ h: hist(f, { awards: { league: { mvp: { team: f.club }, opoy: { team: f.club }, dpoy: { team: 'Other' } } } }) })],
  s_title_all_badges: ['hd_badges_title', (f) => { f.campaign.badges = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`G${i}`, {}])); return { live: true, champion: true, H: H(f) }; }, (f) => { f.campaign.badges = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`G${i}`, {}])); return { live: true, champion: true, H: H(f) }; }],
  s_legend_title: ['lg_legend_title', (f) => { f.roster.push(mon(f, { legendary: true })); return { live: true, champion: true, H: H(f) }; }, (f) => ({ live: true, champion: false, H: H(f) })],
  s_badges_won: ['gy_season_4', (f) => { f._badgesWon = 4; return { live: true, H: H(f) }; }, (f) => { f._badgesWon = 3; return { live: true, H: H(f) }; }],
  a_title_franchises: ['ch_two_franchises', () => { S.resetAchievements(); S.recordAchievementGlobal('first_title', { franchise: 'u1' }); S.recordAchievementGlobal('first_title', { franchise: 'u2' }); return {}; }, () => { S.resetAchievements(); S.recordAchievementGlobal('first_title', { franchise: 'u1' }); S.recordAchievementGlobal('first_title', { franchise: 'u2' }); S.markDisqualified('u2'); return {}; }],
  // the roster
  r_level50: ['ev_level_50', (f) => { const m = mon(f, { level: 49 }); f.roster.push(m); S.trackRoster(f); m.level = 50; return {}; }, (f) => { f.roster.push(mon(f, { level: 50 })); S.trackRoster(f); return {}; }],
  r_final_stage: ['ev_final_stage', (f) => { const sp = SPECIES_DEX.find((s) => s.evolution?.length === 1); f.roster.push(mon(f, { species: sp.id, stage: 1, career: { ev: [{ t: 'evolve', c: f.club, x: { stage: 1 } }] } })); return {}; }, (f) => { const sp = SPECIES_DEX.find((s) => s.evolution?.length === 1); f.roster.push(mon(f, { species: sp.id, stage: 1, career: { ev: [{ t: 'evolve', x: { stage: 1, before: 1 } }] } })); return {}; }],
  r_grown_ovr: ['ev_ovr_80', (f) => { const m = weak(mon(f)); f.roster = [m]; S.trackRoster(f); strong(m); return {}; }, (f) => { const m = strong(mon(f)); f.roster = [m]; S.trackRoster(f); return {}; }],
  r_ovr80: ['ev_ovr80_x10', (f) => { f.roster = Array.from({ length: 10 }, () => strong(mon(f))); return {}; }, (f) => { f.roster = Array.from({ length: 9 }, () => strong(mon(f))); return {}; }],
  r_apex: ['ev_apex', (f) => { f.roster.push(mon(f, { apex: true, career: { ev: [{ t: 'join', x: { via: 'signed' } }] } })); return {}; }, (f) => { f.roster.push(mon(f, { apex: true, career: { ev: [{ t: 'join', x: { via: 'founding' } }] } })); return {}; }],
  r_growth: ['ev_growth', (f) => { f.roster.push(mon(f, { career: { ev: [{ t: 'growth', c: f.club, x: { from: 60, to: 70 } }] } })); return {}; }, (f) => { f.roster.push(mon(f, { career: { ev: [{ t: 'growth', c: 'Other', x: { from: 60, to: 70 } }] } })); return {}; }],
  r_drafted_ovr: ['ev_drafted_80', (f) => { f.roster.push(strong(mon(f, { drafted: { year: 2, round: 1, overall: 5, club: f.club } }))); return {}; }, (f) => { f.roster.push(strong(mon(f, { drafted: { year: 0, round: 1, overall: 5, club: f.club } }))); return {}; }],
  r_late_gem: ['dr_late_gem', (f) => { f.roster.push(strong(mon(f, { drafted: { year: 2, round: 3, overall: 70, club: f.club } }))); return {}; }, (f) => { f.roster.push(strong(mon(f, { drafted: { year: 2, round: 2, overall: 40, club: f.club } }))); return {}; }],
  r_drafted_games: ['dr_drafted_games', (f) => { f.roster.push(mon(f, { drafted: { year: 2, round: 1, overall: 5, club: f.club }, stats: { career: { reg: { games: 50 }, post: {} } } })); return {}; }, (f) => { f.roster.push(mon(f, { drafted: { year: 0, round: 1, overall: 5, club: f.club }, stats: { career: { reg: { games: 80 }, post: {} } } })); return {}; }],
  r_draftee_award: ['dr_draftee_award', (f) => { f.roster.push(mon(f, { drafted: { year: 2, round: 1, overall: 5, club: f.club }, career: { ev: [{ t: 'award', c: f.club }] } })); return {}; }, (f) => { f.roster.push(mon(f, { drafted: { year: 0, round: 1, overall: 5, club: f.club }, career: { ev: [{ t: 'award', c: f.club }] } })); return {}; }],
  r_draftee_hof: ['dr_draftee_hof', (f) => { S.achMark(f, 'drafted', 'dX'); f.monsterHallOfFame = { elections: [{ inductees: [{ id: 'dX' }] }] }; return {}; }, (f) => { f.monsterHallOfFame = { elections: [{ inductees: [{ id: 'dY' }] }] }; return {}; }],
  r_legendary: ['lg_signed', (f) => { f.roster.push(mon(f, { legendary: true })); return { H: H(f) }; }, (f) => ({ H: H(f) })],
  r_loyal: ['tr_loyal_10', (f) => { f.season.year = 11; f.season.finished = false; f.roster.push(mon(f, { joined: 1 })); return {}; }, (f) => { f.season.year = 10; f.season.finished = false; f.roster.push(mon(f, { joined: 1 })); return {}; }],
  // collection
  d_faced: ['dx_seen_60', (f) => { S.trackGame(f, G({ oppFamilies: SPECIES_DEX.slice(0, 60).map((s) => s.id) }), 'x'); return {}; }, (f) => { S.trackGame(f, G({ oppFamilies: SPECIES_DEX.slice(0, 59).map((s) => s.id) }), 'x'); return {}; }],
  d_signed: ['dx_signed_10', (f) => { f.dex.signed = Object.fromEntries(SPECIES_DEX.slice(0, 10).map((s) => [s.id, { year: 2, week: 3 }])); return {}; }, (f) => { f.dex.signed = Object.fromEntries(SPECIES_DEX.slice(0, 40).map((s, i) => [s.id, i < 31 ? { year: 1, week: 1 } : { year: 2, week: 3 }])); return {}; }],
  d_original_played: ['dx_original_20', (f) => { f.dex.signed = Object.fromEntries(SPECIES_DEX.filter((s) => s.rarity !== 'basic').slice(0, 20).map((s) => [s.id, { year: 2, week: 3 }])); return {}; }, (f) => { f.dex.signed = Object.fromEntries(SPECIES_DEX.filter((s) => s.rarity !== 'basic').slice(0, 20).map((s, i) => [s.id, { year: 1, week: i ? 3 : 1 }])); return {}; }],
  d_knowledge: ['dx_knowledge_30', (f) => { f.dex.knowledge = Object.fromEntries(SPECIES_DEX.slice(0, 30).map((s) => [s.id, { g: true }])); return {}; }, (f) => { f.dex.knowledge = Object.fromEntries(SPECIES_DEX.slice(0, 29).map((s) => [s.id, { g: true }])); return {}; }],
  d_types_min: ['dx_types_all', (f) => { const by = {}; for (const s of SPECIES_DEX) (by[s.element] ||= []).push(s.id); f.dex.signed = Object.fromEntries(Object.values(by).flatMap((l) => l.slice(0, 2)).map((id) => [id, { year: 3, week: 2 }])); return {}; }, (f) => { const by = {}; for (const s of SPECIES_DEX) (by[s.element] ||= []).push(s.id); f.dex.signed = Object.fromEntries(Object.values(by).flatMap((l, i) => l.slice(0, i ? 2 : 1)).map((id) => [id, { year: 3, week: 2 }])); return {}; }],
  d_original: ['dex_original', (f) => ({ H: { dexCounts: () => ({ original: { seen: 72 } }) } }), () => ({ H: { dexCounts: () => ({ original: { seen: 71 } }) } })], d_basic: ['dex_basic', () => ({ H: { dexCounts: () => ({ basic: { seen: 120 } }) } }), () => ({ H: { dexCounts: () => ({ basic: { seen: 119 } }) } })],
  d_all: ['dex_all', () => ({ H: { dexCounts: () => ({ all: { seen: 192 } }) } }), () => ({ H: { dexCounts: () => ({ all: { seen: 191 } }) } })],
  a_dex: ['dx_account_100', () => { S.resetAchievements(); S.recordAchDex('u1', SPECIES_DEX.slice(0, 100).map((s) => [s.id, false])); return {}; }, () => { S.resetAchievements(); S.recordAchDex('u1', SPECIES_DEX.slice(0, 100).map((s, i) => [s.id, i === 0])); return {}; }],
  l_plays: ['lg_legendary_play', (f) => { f.legendaryPlays = { discovered: { x: 1 } }; return {}; }, (f) => { f.legendaryPlays = { discovered: {} }; return {}; }],
  // management and legacy
  p_calls: ['co_plays_1000', (f) => { f.playStats = { 1: { a: { used: 600 }, b: { used: 400 } } }; return {}; }, (f) => { f.playStats = { 1: { a: { used: 600 }, b: { used: 399 } } }; return {}; }],
  b_conf_years: ['co_board_max', (f) => { (f.board ||= {}).history = [2, 2, 2].map((confidence) => ({ confidence })); return {}; }, (f) => { (f.board ||= {}).history = [2, 2, 1].map((confidence) => ({ confidence })); return {}; }],
  b_goals: ['co_goals_5', (f) => { (f.board ||= {}).history = Array.from({ length: 5 }, () => ({ met: true })); return {}; }, (f) => { (f.board ||= {}).history = Array.from({ length: 5 }, (_, i) => ({ met: i > 0 })); return {}; }],
  gm_moves: ['co_new_club', (f) => { f.history = [hist(f, { club: 'Somewhere Else' })]; return {}; }, (f) => { f.history = [hist(f)]; f.gmCareer = { stints: [] }; return {}; }],
  aw_coy: ['co_coy', (f) => { f.history = [hist(f, { awards: { league: { coy: { team: f.club } } } })]; return {}; }, (f) => { f.history = [hist(f, { awards: { league: { coy: { team: 'Other' } } } })]; return {}; }],
  aw_mvp: ['aw_mvp', (f) => { f.history = [hist(f, { awards: { league: { mvp: { team: f.club } } } })]; return {}; }, (f) => { f.history = [hist(f, { awards: { league: { opoy: { team: f.club } } } })]; return {}; }],
  aw_kinds: ['aw_all_awards', (f) => { f.history = [hist(f, { awards: { league: Object.fromEntries(['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'coy', 'smoy'].map((k) => [k, { team: f.club }])) } })]; return {}; }, (f) => { f.history = [hist(f, { awards: { league: Object.fromEntries(['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'coy'].map((k) => [k, { team: f.club }])) } })]; return {}; }],
  aw_gboot: ['st_golden_boot', (f) => { f.history = [hist(f, { awards: { league: { gboot: { team: f.club } } } })]; return {}; }, (f) => { f.history = [hist(f, { awards: { league: { gboot: { team: 'Other' } } } })]; return {}; }],
  aw_rking: ['st_return_king', (f) => { f.history = [hist(f, { awards: { league: { rking: { team: f.club } } } })]; return {}; }, (f) => { f.history = [hist(f, { awards: { league: { rking: { team: 'Other' } } } })]; return {}; }],
  aw_hof: ['aw_monster_hof', (f) => { f.history = [hist(f, { leagueStats: { [f.club]: { mH: {} } } })]; f.monsterHallOfFame = { elections: [{ inductees: [{ id: 'mH' }] }] }; return {}; }, (f) => { f.history = [hist(f)]; f.monsterHallOfFame = { elections: [{ inductees: [{ id: 'mH' }] }] }; return {}; }],
  // A record counts once a season is in the book and when it beat an earlier mark (the record book's own rule); year-one marks do not.
  aw_record: ['aw_record', (f) => { const y0 = f.season.year; f.history = [{ year: y0, club: f.club }]; f.records = { game: { recYds: { team: f.club, year: y0 + 1, prev: { value: 150 } } } }; return {}; }, (f) => { const y0 = f.season.year; f.history = [{ year: y0, club: f.club }]; f.records = { game: { recYds: { team: f.club, year: y0, prev: null } } }; return {}; }],
};

test('every metric the catalogue uses has a positive and a negative case', () => {
  const used = new Set(ACHIEVEMENTS.flatMap((a) => [a.metric, a.progress]).filter(Boolean));
  assert.deepEqual([...used].filter((m) => !CASES[m]).sort(), [], 'metrics without a case');
  for (const [metric, [id, pos, neg]] of Object.entries(CASES)) {
    const a = ACHIEVEMENT_BY_ID[id]; assert.ok(a, `${metric}: row ${id}`); const row = { ...a, metric, cmp: a.cmp };
    const fp = base(); const vp = S.metricValue(fp, row, { live: true, ...pos(fp) }); assert.ok(S.meets(row, vp), `${metric} positive (${id}): ${vp}`);
    const fn = base(); const vn = S.metricValue(fn, row, { live: true, ...neg(fn) }); assert.ok(!S.meets(row, vn), `${metric} negative (${id}): ${vn}`);
  }
  S.resetAchievements();
});

test('real play earns through the real hooks: a few weeks tracked once each; owner actions counted by their own functions', () => {
  S.resetAchievements(); resetDex(); const f = newFranchise(11, { difficulty: 'pro' }); f.achievements = {}; f.achQueue = [];
  let evolved = 0;
  for (let i = 0; i < 7; i++) {
    if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
    const r = W.simOneWeek(f, { stopBeforeBigGames: false }); if (!r.ok) break;
    if (r.stop?.code === 'evolution') for (const m of f.roster) if (F.evolveMonster(f, m.id).ok) evolved++;
  }
  if (evolved) assert.ok(S.METRICS.t_evolutions(f) >= evolved, 'evolutions made on the card are counted');
  const t = f.achTrack; assert.ok(t && S.METRICS.t_games(f) >= 3, `games tracked: ${S.METRICS.t_games(f)}`);
  assert.ok(S.METRICS.d_faced(f) > 20, 'families faced in games'); assert.ok(S.METRICS.t_clash_battles(f) >= 3, 'opening Clashes tracked');
  assert.ok(Object.keys(f.achievements).some((id) => !ACHIEVEMENT_BY_ID[id].legacy), 'at least one catalogue achievement earned by play');
  for (const id of Object.keys(f.achievements)) assert.ok(S.achievementsData().earned[id], `${id} recorded in the account store`);
  // replacing a staff member through the Front Office counts as a hire
  const role = Object.keys(f.staff)[0]; const before = S.METRICS.t_hires(f);
  const pick = STAFF.filter((c) => c.role === role && c.id !== f.staff[role]).sort((x, y) => x.salary - y.salary)[0];
  const r = F.replaceStaff(f, pick.id); assert.ok(r.ok, r.reason); assert.equal(S.METRICS.t_hires(f), before + 1, 'a Front Office hire is counted');
});

test('founding gifts and creation-draft picks grant no acquisition, development or drafting achievements', () => {
  S.resetAchievements(); for (const seed of [1, 4, 5, 9]) {
    const f = newFranchise(seed, { difficulty: 'pro' }); f.achievements = {}; f.achQueue = []; delete f.achCatalogue;
    const got = [...F.backfillCatalogue(f), ...F.checkAchievements(f, 'any'), ...F.checkAchievements(f, 'draft'), ...F.checkAchievements(f, 'evolve'), ...F.checkAchievements(f, 'sign')];
    const banned = got.filter((id) => ['dex', 'evolution', 'draft', 'trades', 'legendary'].includes(ACHIEVEMENT_BY_ID[id].category));
    assert.deepEqual(banned, [], `seed ${seed}: ${banned.join(', ')}`);
  }
});

test('a developer-disqualified franchise earns nothing and never feeds account-wide rows; what was earned before stays', () => {
  S.resetAchievements(); resetDex();
  const dev = base(21); F.checkAchievements(dev, 'sunday', { g: G({ opp: 0 }) }); assert.ok(dev.achievements.gp_shutout, 'earned before the shortcut');
  dev.achDev = true; assert.deepEqual(F.checkAchievements(dev, 'sunday', { g: G({ pts: 40 }) }), []); assert.ok(S.achievementsData().earned.gp_shutout, 'kept');
  assert.ok(S.isDisqualified(F.franchiseKey(dev)));
  // its titles and families never count toward the account
  S.recordAchievementGlobal('first_title', { franchise: F.franchiseKey(dev) }); S.recordAchievementGlobal('first_title', { franchise: 'legit-1' });
  assert.equal(S.METRICS.a_title_franchises(), 1);
  for (const s of SPECIES_DEX) dexRecordGlobal(s.id, 'signed', { year: 3, week: 2 }); // the shared Beast Dex now holds everything (as if the dev franchise collected it)
  const ok = base(22); ok.dex.signed = {}; const got = F.checkAchievements(ok, 'any');
  assert.ok(!got.includes('dex_all') && !got.includes('dex_original') && !got.includes('dx_account_100'), 'the shared Beast Dex does not count');
  // the disqualification travels through the cloud copy
  const copy = JSON.parse(JSON.stringify(S.achievementsData())); S.resetAchievements(); S.mergeAchievements(copy); assert.ok(S.isDisqualified(F.franchiseKey(dev)));
  // an imported disqualified franchise is marked on the new device when it is opened
  S.resetAchievements(); F.syncAchievementsToGlobal(dev); assert.ok(S.isDisqualified(F.franchiseKey(dev))); assert.ok(S.achievementsData().earned.gp_shutout, 'its earlier record is copied as before');
  resetDex(); S.resetAchievements();
});

test('the unlock queue never drops a Legendary or Mythic reveal; overflow is counted; records persist', () => {
  S.resetAchievements();
  const toast = ACHIEVEMENTS.filter((a) => a.presentation === 'toast' && !a.legacy); const card = ACHIEVEMENTS.filter((a) => a.presentation === 'card'); const reveal = ACHIEVEMENTS.filter((a) => a.presentation === 'reveal' && !a.legacy);
  const q = [{ id: reveal[0].id }, { retro: 3 }, ...card.slice(0, 5).map((a) => ({ id: a.id })), ...toast.slice(0, 44).map((a) => ({ id: a.id })), { id: reveal[1].id }];
  F.trimAchQueue(q);
  assert.ok(q.length <= F.ACH_QUEUE_MAX + 1, `queue ${q.length}`);
  assert.ok(q.some((x) => x.id === reveal[0].id) && q.some((x) => x.id === reveal[1].id), 'both reveals survive');
  assert.ok(q.some((x) => x.retro === 3), 'the backfill notice survives'); assert.equal(card.slice(0, 5).filter((a) => q.some((x) => x.id === a.id)).length, 5, 'cards are kept while toasts can fold');
  const more = q.find((x) => x.more); assert.ok(more && more.more >= 12, 'folded toasts are counted, not lost');
  // through the real award path: a burst of unlocks is recorded in full, whatever the queue keeps
  const f = base(); f.achQueue = Array.from({ length: 39 }, (_, i) => ({ id: toast[i].id })); f.achQueue.unshift({ id: reveal[0].id });
  const got = F.checkAchievements(f, 'sunday', { g: G({ pts: 61, opp: 0, tos: 0, oppYards: 50, passYds: 460, passTd: 7, rushYds: 260, rushTd: 3, recYds: 260, longPlay: 90, yards: 520 }) });
  assert.ok(got.length >= 10); assert.ok(f.achQueue.length <= F.ACH_QUEUE_MAX + 1); assert.ok(f.achQueue.some((x) => x.id === reveal[0].id));
  for (const id of got) { assert.ok(f.achievements[id]); assert.ok(S.achievementsData().earned[id], `${id} persists`); }
});

test('reload, duplicates, franchise switching and cloud sync keep records intact', () => {
  S.resetAchievements(); const a = base(31), b = base(32);
  F.checkAchievements(a, 'sunday', { g: G({ opp: 0 }) }); const ka = F.franchiseKey(a), kb = F.franchiseKey(b);
  // reload: export and import the franchise, earned records, queue and tracker survive; nothing is earned twice
  const back = Save.importJson(Save.exportJson(a)); const r = back.franchise || back.f || back;
  assert.ok(r.achievements?.gp_shutout); assert.deepEqual(r.achQueue, a.achQueue); assert.deepEqual(r.achTrack, a.achTrack);
  assert.deepEqual(F.checkAchievements(r, 'sunday', { g: G({ opp: 0 }) }).filter((id) => id === 'gp_shutout'), []);
  // switching franchise: b does not inherit a's records; when b earns it, the account lists both franchises once each
  assert.ok(!b.achievements.gp_shutout); F.checkAchievements(b, 'sunday', { g: G({ opp: 0 }) });
  assert.deepEqual([...S.achievementsData().earned.gp_shutout.franchises].sort(), [ka, kb].sort());
  F.checkAchievements(b, 'sunday', { g: G({ opp: 0 }) }); assert.equal(S.achievementsData().earned.gp_shutout.count, 2);
  // cloud: merging the same copy twice changes nothing
  const copy = JSON.parse(JSON.stringify(S.achievementsData())); S.mergeAchievements(copy); S.mergeAchievements(copy);
  assert.equal(S.achievementsData().earned.gp_shutout.count, 2);
});

test('history coverage: complete rows show no notice; tracked rows show the tracking start in a franchise that predates it', () => {
  assert.equal(S.historyCoverage(ACHIEVEMENT_BY_ID.gp_shutout), 'complete'); assert.equal(S.historyCoverage(ACHIEVEMENT_BY_ID.gp_streak_5), 'partial'); assert.equal(S.historyCoverage(ACHIEVEMENT_BY_ID.of_pass_250), 'tracked');
  assert.equal(S.historyCoverage(ACHIEVEMENT_BY_ID.first_win), 'complete'); assert.equal(S.historyCoverage(ACHIEVEMENT_BY_ID.ch_two_franchises), 'complete');
  const fresh = base(); fresh.achCatalogue = 0; F.backfillCatalogue(fresh); assert.equal(S.trackingStart(fresh), null, 'a franchise tracked from its first week has no notice');
  const old = base(); old.achCatalogue = 0; old.season.year = 4; old.history = [hist(old)]; F.backfillCatalogue(old); assert.deepEqual(S.trackingStart(old), { year: 4, week: old.season.week });
});
