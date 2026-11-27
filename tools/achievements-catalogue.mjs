#!/usr/bin/env node
// Achievement catalogue export (achievement overhaul 2026-11): writes the machine-readable catalogue and the readable list from
// the live definitions (src/data/achievements.js), so the documents always match the game.
//   node tools/achievements-catalogue.mjs [--soak=FILE.txt,...]   → docs/achievements/catalogue.json, docs/achievements/CATALOGUE.md
// --soak: probe outputs whose second line lists achievement ids unlocked in a soak (testing status "observed in a soak").
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const A = await import(path.join(root, 'src/data/achievements.js'));
const S = await import(path.join(root, 'src/franchise/achievement-store.js'));
const { englishText } = await import(path.join(root, 'src/text/index.js'));
const en = englishText();
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const soak = new Set(String(args.soak || '').split(',').filter(Boolean).flatMap((f) => { try { return (fs.readFileSync(f, 'utf8').split('\n')[1] || '').split(/\s+/); } catch { return []; } }));
const metricTests = fs.readFileSync(path.join(root, 'tests/achievements-metrics.test.js'), 'utf8');
const tests = fs.readFileSync(path.join(root, 'tests/achievements-catalogue.test.js'), 'utf8') + fs.readFileSync(path.join(root, 'tests/task8-m6-screens.test.js'), 'utf8');
// What each metric measures, in words (the requirement is "<this> <comparison> <target>").
const M = {
  g_win_shutout: 'a win in which the opponent scores 0', g_pts: 'your points in one game', g_win_margin: 'the winning margin of one game', g_ot_win: 'a win in overtime',
  g_comeback: 'the largest deficit you overcame in a win', g_win_no_to: 'a win with 0 turnovers committed', g_win_opp_yards: 'the opponent\'s total yards in a win',
  g_pass_yds: 'one monster\'s passing yards in a game', g_pass_td: 'one monster\'s touchdown passes in a game', g_rush_yds: 'one monster\'s rushing yards in a game', g_rush_td: 'one monster\'s rushing touchdowns in a game',
  g_rec_yds: 'one monster\'s receiving yards in a game', g_long_play: 'the longest run or reception in a game', g_team_yards: 'your total yards in a game', g_team_int: 'your interceptions in a game',
  g_team_sacks: 'your sacks in a game', g_team_tfl: 'your tackles for loss in a game', g_tackles: 'one monster\'s tackles in a game', g_sacks: 'one monster\'s sacks in a game', g_takeaways: 'turnovers you forced in a game',
  g_fg_long: 'your longest made field goal (yards)', g_fgm: 'field goals made in one game', g_legend_win: 'a win with a legendary monster in the lineup', g_loss_by: 'the margin of a loss',
  g_tiebreak_win: 'a win decided by the overtime Beast Clash', g_win_outgained: 'yards by which the opponent outgained you in a win', g_beat_old_club: 'a win over a club you managed before',
  t_road_wins: 'road wins (tracked)', t_shutout_wins: 'shutout wins (tracked)', t_games: 'games played (tracked)', t_win_streak: 'the longest run of consecutive wins, playoffs included (tracked)',
  t_clubs_beaten: 'different clubs beaten', t_playoff_wins: 'playoff wins (tracked)', t_conf_titles: 'conference championships (tracked)', t_def_td: 'defensive touchdowns (tracked)', t_kr_td: 'kickoff-return touchdowns (tracked)',
  t_fgm: 'field goals made (tracked)', t_gym_wins: 'wins over gym clubs', t_badge_regained: 'gym badges won back after losing them', t_clash_wins: 'Beast Clash wins', t_clash_battles: 'Beast Clashes fought',
  t_clash_enc: 'recruiting Clash wins', t_clash_pre: 'opening Clash wins', t_clash_ot: 'overtime Clash wins', t_clash_playoff_ot: 'playoff overtime Clash wins', t_clash_commanded: 'Clash wins in which you made at least one rotation call (live, not simulated)',
  t_clash_close: 'Clash wins with team health under the stated share', t_clash_quick: 'Clash wins within the stated exchanges', t_clash_flawless: 'Clash wins with team health at or above the stated share (dominant wins)',
  t_clash_streak: 'the longest run of consecutive Clash wins', t_recruits: 'monsters signed after a won recruiting Clash', t_evolutions: 'evolutions made', t_draft_picks: 'draft picks made (season drafts)',
  t_top_pick: 'first overall picks made', t_full_scout: 'prospects fully scouted', t_scouts: 'scouting trips', t_regions: 'different regions scouted', t_fa_signed: 'free agents signed', t_fa_ovr: 'the highest overall of a free agent signed',
  t_extensions: 'contract extensions agreed', t_hires: 'staff hired', t_cap_clean: 'seasons finished under the salary cap', t_trades: 'trades completed', t_rival_trades: 'trades with your rival club',
  t_trade_ovr: 'the highest overall acquired by trade', t_trade_picks: 'draft picks received in one trade', rival_wins: 'wins over your rival club',
  c_wins: 'career wins', c_titles: 'Beast Bowl titles', c_awards: 'league awards won by your monsters', c_badges: 'gym badges held now', c_tracks: 'legend tracks chosen', c_unlocked: 'legendary monsters unlocked',
  h_seasons: 'seasons completed', h_winning_seasons: 'winning regular seasons', h_winning_run: 'consecutive winning regular seasons', h_playoffs: 'playoff appearances', h_title_run: 'consecutive Beast Bowl titles',
  s_wins: 'regular-season wins in one season', s_points: 'points scored in one regular season', s_points_allowed: 'points allowed in one complete regular season', s_home_unbeaten: 'every home game of a regular season won',
  s_pass_yds: 'one monster\'s passing yards in a season', s_rush_yds: 'one monster\'s rushing yards in a season', s_rec_yds: 'one monster\'s receiving yards in a season', s_pass_td: 'one monster\'s touchdown passes in a season',
  s_sacks: 'one monster\'s sacks in a season', s_team_sacks: 'team sacks in a season', s_team_int: 'team interceptions in a season', s_fgm: 'field goals made in a season',
  s_perfect_kicker: 'field-goal attempts in a season with every field goal and extra point made', s_perfect_title: 'an unbeaten regular season ending in the Beast Bowl title', s_awards: 'league awards in one season',
  s_title_all_badges: 'a Beast Bowl title while holding every gym badge', s_legend_title: 'a Beast Bowl title with a legendary on the roster', s_badges_won: 'badges won and still held at the end of a season',
  s_clash_unbeaten: 'Clashes fought in a season with every one won', r_level50: 'monsters on the roster trained to level 50 with you', r_final_stage: 'monsters on the roster that evolved to their final form with you',
  r_grown_ovr: 'the overall of a monster who was below the target when first seen on your roster', r_ovr80: 'monsters at 80 overall or better on the roster at once', r_apex: 'an Apex monster you acquired (not a founding one)',
  r_growth: 'overall gained by one monster in a season', r_drafted_ovr: 'the overall of a monster you drafted', r_late_gem: 'the overall of a third-round pick you drafted', r_drafted_games: 'games played by a monster you drafted',
  r_draftee_awards: 'league awards won by beasts you drafted', r_draftee_hof: 'Hall of Fame inductees you drafted', r_legendary: 'a legendary monster on the roster', r_loyal: 'seasons one monster has spent on your roster',
  d_faced: 'different families faced in games', d_signed: 'different families collected by this franchise in play (founding roster and creation draft excluded)', d_original_played: 'original families collected in play (founding excluded)', d_knowledge: 'different families you have played in games', d_original: 'original families collected', d_basic: 'Basic families collected',
  d_all: 'families collected', d_types_min: 'families collected in play in your least-collected type', a_dex: 'families collected in play across your eligible franchises (achievements dex, not the shared Beast Dex)', a_title_franchises: 'eligible franchises with a Beast Bowl title',
  p_calls: 'offensive plays called', b_conf_years: 'seasons ending at the Board\'s highest confidence', b_goals: 'Board season goals met', gm_moves: 'a general manager job taken at another club', aw_coy: 'Coach of the Year awards',
  aw_mvp: 'MVP awards', aw_gboot: 'Golden Boot awards (from the balance branch)', aw_rking: 'Return King awards (from the balance branch)', g_faced_legend: 'a legendary monster in the opponent\'s lineup', g_legend_playoff_win: 'a playoff win with a legendary monster in your lineup', aw_kinds: 'different league award categories won', aw_hof: 'Monster Hall of Fame inductees who played for you', aw_record: 'a league record held by your monster', l_plays: 'legendary plays discovered',
};
const CMP = { ge: '≥', le: '≤', lt: '<', eq: '=' };
const rows = A.ACHIEVEMENTS.map((a) => {
  const name = a.legacy ? String(en[a.titleKey] || a.title) : en[a.titleKey]; const desc = A.achievementDesc(a);
  const req = a.legacy ? `original check (unchanged): ${desc}` : `${M[a.metric] || a.metric} ${CMP[a.cmp]} ${a.target}${a.params ? ` (${Object.entries(a.params).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`;
  const single = /^(g_|s_)/.test(a.metric || '') || !a.target || a.target <= 1 || a.cmp !== 'ge';
  const progress = a.legacy && !a.metric ? 'met or not (original check)' : single ? 'met or not' : `bar: ${M[a.progress || a.metric] || a.progress || a.metric} / ${a.target}`;
  const unit = a.legacy ? 'original check unchanged; id kept (test)' : (tests.includes(`ACHIEVEMENT_BY_ID.${a.id}`) || tests.includes(`'${a.id}'`) || (a.metric && tests.includes(`METRICS.${a.metric}`) || metricTests.includes(`  ${a.metric}:`) || metricTests.includes(` ${a.metric}: [`))) ? 'unit test (positive and negative)' : null;
  const tested = [soak.has(a.id) ? 'observed in a soak' : null, unit].filter(Boolean);
  return { id: a.id, name, category: a.category, rarity: a.rarity, description: desc, requirement: req, metric: a.metric || null, comparison: a.cmp, target: a.target ?? null, params: a.params, progress,
    trigger: a.trigger, scope: a.scope, history: S.historyCoverage(a), speaker: a.presentation === 'reveal' ? ({ dex: 'commissioner', evolution: 'commissioner', clash: 'commissioner', legendary: 'commissioner', draft: 'commissioner', championship: 'board', franchise: 'board', awards: 'board', coaching: 'board', trades: 'board' }[a.category] || 'rival') : a.legacy ? a.speaker : null, hidden: a.hidden, retroactive: !!a.retro, provisional: !!a.provisional, legacy: !!a.legacy, presentation: a.presentation, nameKey: a.titleKey || null, descKey: a.descKey || null,
    testing: tested.length ? tested.join(' + ') : 'definition and metric checked (catalogue test)' };
});
fs.mkdirSync(path.join(root, 'docs/achievements'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/achievements/catalogue.json'), JSON.stringify({ generated: 'tools/achievements-catalogue.mjs', count: rows.length, achievements: rows }, null, 1) + '\n');
const cats = A.ACH_CATEGORIES; const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
let md = `# Achievement catalogue (${rows.length})\n\nGenerated by \`node tools/achievements-catalogue.mjs\` from \`src/data/achievements.js\`; do not edit by hand. Machine-readable copy: \`catalogue.json\`.\n\n`;
md += 'Columns: requirement (what is measured, comparison, threshold), progress (how the screen shows it), trigger (when it is checked), scope (franchise or account), history (complete / partial / tracked: what an older save can prove), H (hidden), R (may be granted retroactively from a save\'s history), P (provisional threshold), testing.\n\n';
for (const c of cats) {
  const list = rows.filter((r) => r.category === c);
  md += `## ${c} (${list.length})\n\n| id | name | rarity | description | requirement | progress | trigger | scope | history | H | R | P | testing |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of list) md += `| \`${r.id}\`${r.legacy ? ' (original)' : ''} | ${esc(r.name)} | ${r.rarity} | ${esc(r.description)} | ${esc(r.requirement)} | ${esc(r.progress)} | ${r.trigger} | ${r.scope} | ${r.history} | ${r.hidden ? '✓' : ''} | ${r.retroactive ? '✓' : ''} | ${r.provisional ? '✓' : ''} | ${esc(r.testing)} |\n`;
  md += '\n';
}
fs.writeFileSync(path.join(root, 'docs/achievements/CATALOGUE.md'), md);
const miss = rows.filter((r) => r.metric && !M[r.metric]).map((r) => r.metric); if (miss.length) { console.error('undocumented metrics', miss); process.exit(1); }
console.log('wrote', rows.length, 'rows');
