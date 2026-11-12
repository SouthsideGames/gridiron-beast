// League News (GDD §39): the whole league's week, not the owner's inbox. Every week it writes a scoreboard of every game,
// headlines worth a sentence (upsets, streaks, shutouts, blowouts, overtime finishes), the award races, award winners, league
// records broken, the playoff field and the champion. Read-only: it reads results, the records book and award races after
// they are written, draws no random numbers and changes nothing else, so it cannot move a game, a stat or a save field the
// simulation uses. The owner's own notices (trades, injuries, the commissioner) stay in the club log (f.news).
//
// Items: { id, year, week, kind, tier: 'major' | 'notable' | 'info', icon, text, games?, leaders?, round? }
//   kind: scores · upset · streak · unbeaten · shutout · blowout · overtime · race · race_lead · award · record · playoffs · champion

import { AWARDS } from './awards.js';
import { RECORD_CATEGORIES, TEAM_RECORDS } from './stats.js';
import { yearOf } from '../data/calendar.js';
import { t as $t, line as $L, lineParts as $P, lineText } from '../text/index.js';

export const LEAGUE_NEWS_VERSION = 1;
export const LEAGUE_NEWS_KEEP = 200;        // items kept at most (this season and the last)
export const HEADLINES_PER_WEEK = 6;        // results headlines per week, most important first
export const NEWS_RULES = Object.freeze({
  blowout: 21,          // margin (the league's 95th percentile is about 21)
  upsetGap: 0.3,        // win-rate gap before the game, both clubs with
  upsetMinGames: 4,     //   at least this many games (2-1 beating 1-2 is not an upset)
  streakMarks: [4, 6, 8], // a win or losing streak gets a line when it reaches one of these (not every week it grows)
  unbeatenMarks: [4, 6, 8], // "still perfect" at these records, and when the regular season ends unbeaten
  raceFromWeek: 3,      // award races are reported from this week of the regular season
  recordsAfterSeasons: 1, // league records count once a full season is in the book (week-1 "records" are not news)
});
export const RACE_AWARDS = Object.freeze(['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'smoy', 'coy']);
const PRIORITY = { record: 0, champion: 0, award: 1, playoffs: 1, race_lead: 2, upset: 3, unbeaten: 4, streak: 5, overtime: 6, shutout: 7, blowout: 8 };

export const ROUND_LABEL = Object.freeze({ 1: $t('franchise.wild_card_round'), 2: $t('franchise.conference_finals'), 3: $t('franchise.beast_bowl') });
const ROUND_LINE = Object.freeze({ 1: $L('franchise.wild_card_round'), 2: $L('franchise.conference_finals'), 3: $L('franchise.beast_bowl') });   // the same names as saved lines, for the items below
const winnerOf = (g) => g.winner || (g.homeScore > g.awayScore ? g.home : g.awayScore > g.homeScore ? g.away : null);
const loserOf = (g) => { const w = winnerOf(g); return w ? (w === g.home ? g.away : g.home) : null; };
const scoreLine = (g) => { const w = winnerOf(g); const hi = Math.max(g.homeScore, g.awayScore), lo = Math.min(g.homeScore, g.awayScore); return w ? `${hi}-${lo}` : `${g.homeScore}-${g.awayScore}`; };
/** "Thunder Mesa's", "Ironpeak Rams'". */
export const poss = (team) => (/s$/.test(team) ? `${team}'` : `${team}'s`);
/** The score as a sentence ends it: a tie settled by the Beast Clash says so instead of "beat 16-16". */
// a saved line when it has wording in it: every use is a value inside a saved line
const resultTail = (g) => (g.clash && g.homeScore === g.awayScore ? $P(' ', $L('franchise.after_a_tie_in_a_v', { homeScore: g.homeScore, awayScore: g.awayScore, size: g.clash.size, size2: g.clash.size })) : ` ${scoreLine(g)}${otTag(g)}`);
const otTag = (g) => (g.clash ? ` ${$t('franchise.ot_decided_by_a_v_beast', { size: g.clash.size, size2: g.clash.size })}` : g.ot ? ' (OT)' : '');

export function ensureLeagueNews(f) { if (!Array.isArray(f.leagueNews)) f.leagueNews = []; f.leagueNewsMeta ||= { v: LEAGUE_NEWS_VERSION, leaders: {} }; return f.leagueNews; }
/** Add items (deduplicated by id), newest first, trimmed to LEAGUE_NEWS_KEEP. Returns how many were added. */
export function addLeagueNews(f, items) {
  const list = ensureLeagueNews(f); const have = new Set(list.map((x) => x.id));
  const fresh = []; for (const it of items) { if (!it || have.has(it.id)) continue; have.add(it.id); fresh.push(it); }
  if (!fresh.length) return 0;
  // Newest week first; inside a week, the order the items were written (a stable sort keeps it).
  // This season and the last; last season's scoreboards are dropped (its headlines stay), so the feed stays small in the save.
  const top = Math.max(...fresh.map((x) => x.year), ...list.map((x) => x.year));
  // Only the newest award-race snapshot of a season is kept (the earlier ones are history the race_lead lines already tell).
  const raceSeen = new Set();
  const all = [...fresh, ...list].sort((a, b) => (b.year - a.year) || (b.week - a.week))
    .filter((x) => x.year >= top - 1 && !(x.kind === 'scores' && x.year < top))
    .filter((x) => x.kind !== 'race' || (!raceSeen.has(x.year) && raceSeen.add(x.year)));
  list.length = 0; list.push(...all.slice(0, LEAGUE_NEWS_KEEP));
  return fresh.length;
}

/** Each club's W-L from a list of results, and its current streak (+n wins, -n losses). Results in week order. */
export function recordsFrom(results) {
  const out = {};
  for (const g of results) {
    const w = winnerOf(g); const l = loserOf(g);
    for (const t of [g.home, g.away]) out[t] ||= { w: 0, l: 0, t: 0, streak: 0 };
    if (!w) { out[g.home].t++; out[g.away].t++; out[g.home].streak = 0; out[g.away].streak = 0; continue; }
    out[w].w++; out[l].l++;
    out[w].streak = out[w].streak > 0 ? out[w].streak + 1 : 1; out[l].streak = out[l].streak < 0 ? out[l].streak - 1 : -1;
  }
  return out;
}
const games = (r) => (r ? r.w + r.l + r.t : 0);
const rate = (r) => (games(r) ? (r.w + r.t * 0.5) / games(r) : 0.5);
const recStr = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '0-0');

/**
 * The scoreboard and results headlines for one regular-season week. `results` is every regular-season result so far (this
 * week's included, in week order); `club` is the owner's club and `rival` the rival club, highlighted on the scoreboard.
 */
export function resultsNews({ year, week, results, club = null, rival = null, lastWeek = 10 }) {
  const thisWeek = results.filter((g) => g.week === week);
  if (!thisWeek.length) return [];
  const before = recordsFrom(results.filter((g) => g.week < week)); const after = recordsFrom(results.filter((g) => g.week <= week));
  const id = (k, extra = '') => `${year}|${week}|${k}${extra ? `|${extra}` : ''}`;
  const out = [{ id: id('scores'), year, week, kind: 'scores', tier: 'info', icon: '🏈', ...$L('franchise.week_scores', { week }), games: thisWeek.map((g) => ({ home: g.home, away: g.away, hs: g.homeScore, as: g.awayScore, ot: !!g.ot, clash: !!g.clash, w: winnerOf(g), mine: g.home === club || g.away === club, rival: !!rival && (g.home === rival || g.away === rival) })) }];
  const heads = [];
  for (const g of thisWeek) {
    const w = winnerOf(g), l = loserOf(g); const margin = Math.abs(g.homeScore - g.awayScore);
    if (!w) { heads.push({ id: id('tie', g.home), kind: 'overtime', tier: 'info', icon: '🤝', ...$L('franchise.and_tie', { home: g.home, away: g.away, homeScore: g.homeScore, awayScore: g.awayScore })}); continue; }
    const bw = before[w], bl = before[l];
    if (games(bw) >= NEWS_RULES.upsetMinGames && games(bl) >= NEWS_RULES.upsetMinGames && rate(bl) - rate(bw) >= NEWS_RULES.upsetGap) heads.push({ id: id('upset', w), kind: 'upset', tier: 'notable', icon: '😱', ...$L('franchise.upset_stun', { w, wRecord: recStr(bw), l, lRecord: recStr(bl), resultTail: resultTail(g) }) });
    const perfect = after[w].l === 0 && after[w].t === 0;
    if (bl && bl.l === 0 && bl.t === 0 && bl.w >= NEWS_RULES.unbeatenMarks[0] - 1) heads.push({ id: id('firstloss', l), kind: 'unbeaten', tier: 'notable', icon: '💥', ...$L('franchise.perfect_start_ends_at_0_win', { poss: poss(l), w: bl.w, w2: w, resultTail: resultTail(g) })});
    else if (perfect && week === lastWeek && after[w].w >= NEWS_RULES.unbeatenMarks[0]) heads.push({ id: id('unbeaten', w), kind: 'unbeaten', tier: 'notable', icon: '🔥', ...$L('franchise.finish_the_regular_season_unbeaten_at', { w, w2: after[w].w })});
    else if (perfect && NEWS_RULES.unbeatenMarks.includes(after[w].w)) heads.push({ id: id('unbeaten', w), kind: 'unbeaten', tier: 'notable', icon: '🔥', ...$L('franchise.stay_perfect_at_0_after_beating', { w, w2: after[w].w, l, resultTail: resultTail(g) })});
    else if (!perfect && NEWS_RULES.streakMarks.includes(after[w].streak)) heads.push({ id: id('streak', w), kind: 'streak', tier: 'info', icon: '📈', ...$L('franchise.have_won_straight', { w, streak: after[w].streak, recStr: recStr(after[w]) })});
    if (NEWS_RULES.streakMarks.includes(-after[l].streak)) heads.push({ id: id('slide', l), kind: 'streak', tier: 'info', icon: '📉', ...$L('franchise.have_lost_in_a_row', { l, streak: -after[l].streak, recStr: recStr(after[l]) })});
    if (g.clash || g.ot) heads.push({ id: id('ot', w), kind: 'overtime', tier: 'info', icon: '⏱️', ...g.clash && g.homeScore === g.awayScore ? $L('franchise.beat_in_a_v_beast_clash', { w, l, size: g.clash.size, size2: g.clash.size, homeScore: g.homeScore, awayScore: g.awayScore }) : $L('franchise.edge_in_overtime', { w, l, scoreLine: scoreLine(g) })});
    else if (Math.min(g.homeScore, g.awayScore) === 0) heads.push({ id: id('shutout', w), kind: 'shutout', tier: 'info', icon: '🧱', ...$L('franchise.defense_shuts_out', { poss: poss(w), l, scoreLine: scoreLine(g) })});
    else if (margin >= NEWS_RULES.blowout) heads.push({ id: id('blowout', w), kind: 'blowout', tier: 'info', icon: '💪', ...$L('franchise.rout', { w, l, scoreLine: scoreLine(g) })});
  }
  return [...out, ...pickHeadlines(heads).map((h) => ({ year, week, ...h }))];
}
/** Most important first; at most HEADLINES_PER_WEEK, and one line per club so a single game does not fill the feed. */
function pickHeadlines(heads) {
  const sorted = heads.map((h, i) => ({ h, i })).sort((a, b) => (PRIORITY[a.h.kind] ?? 9) - (PRIORITY[b.h.kind] ?? 9) || a.i - b.i).map((x) => x.h);
  const seen = new Set(); const out = [];
  for (const h of sorted) { const team = h.id.split('|')[3]; if (team && seen.has(team) && h.kind !== 'upset') continue; if (team) seen.add(team); out.push(h); if (out.length >= HEADLINES_PER_WEEK) break; }
  return out;
}

/** Playoff results of one round: a scoreboard and a line per winner. */
export function playoffNews({ year, week, round, results, club = null, rival = null }) {
  const games = results.filter((g) => g.round === round); if (!games.length) return [];
  const label = ROUND_LABEL[round] || `${$t('franchise.round', { round })}`; const id = (k) => `${year}|${week}|${k}`;
  const out = [{ id: id(`pscores${round}`), year, week, round, kind: 'scores', tier: 'info', icon: '🏟️', ...$L('franchise.scores', { label: ROUND_LINE[round] || label }), games: games.map((g) => ({ home: g.home, away: g.away, hs: g.homeScore, as: g.awayScore, ot: !!g.ot, clash: !!g.clash, w: winnerOf(g), mine: g.home === club || g.away === club, rival: !!rival && (g.home === rival || g.away === rival) })) }];
  if (round < 3) for (const g of games) { const w = winnerOf(g); out.push({ id: id(`${`adv${round}|${w}`}`), year, week, round, kind: 'playoffs', tier: 'notable', icon: '🎟️', ...$L('franchise.beat_and_advance_to_the', { w, loser: loserOf(g), resultTail: resultTail(g), roundLabel: ROUND_LINE[round + 1] })}); }
  return out;
}
export function championNews({ year, week, final }) {
  if (!final) return [];
  const w = winnerOf(final);
  return [{ id: `${`${year}|${week}|champion`}`, year, week, kind: 'champion', tier: 'major', icon: '🏆', ...$L('franchise.win_the_beast_bowl_beating', { w, loser: loserOf(final), resultTail: resultTail(final) })}];
}
/** The playoff field, drawn after week 10. `seeds` = { conf: [team, ...] }, `records` the season's standings records. */
export function playoffFieldNews({ year, week, seeds, records }) {
  const parts = Object.entries(seeds).map(([conf, s]) => `${conf}: ${s.map((t, i) => `${i + 1}. ${t} (${recStr(records?.[t])})`).join(', ')}`);
  return [{ id: `${`${year}|${week}|field`}`, year, week, kind: 'playoffs', tier: 'notable', icon: '📋', ...$P($L('franchise.the_playoff_field_is_set'), ` `, parts.join(' · '), `.`)}];
}

/**
 * Award races: the leaders this week, and a headline when a race changes hands. `races` is awardRaces(f) (finalists, best
 * first); `meta.leaders` remembers last week's leaders and is updated here (the only state this module keeps).
 */
export function raceNews({ year, week, races, meta }) {
  if (!races || week < NEWS_RULES.raceFromWeek) return [];
  const prev = meta.leaders?.[year] || {}; const now = {}; const leaders = []; const out = [];
  for (const k of RACE_AWARDS) {
    const top = races[k]?.[0]; if (!top) continue;
    const who = k === 'coy' ? top.coach || top.name : top.name; const key = k === 'coy' ? top.team : top.id;
    now[k] = { key, name: who, team: top.team };
    leaders.push({ award: k, short: AWARDS[k]?.short || k, name: who, team: top.team, mid: k === 'coy' ? null : top.id || null, second: races[k]?.[1] ? (k === 'coy' ? races[k][1].coach || races[k][1].name : races[k][1].name) : null, secondId: k === 'coy' ? null : races[k]?.[1]?.id || null });
    if (prev[k] && prev[k].key !== key && ['mvp', 'opoy', 'dpoy'].includes(k)) out.push({ id: `${`${year}|${week}|lead|${k}`}`, year, week, kind: 'race_lead', tier: 'notable', icon: '🔀', mid: top.id || null, mname: who, ...$L('franchise.race_takes_the_lead_from', { short: AWARDS[k].short, who, team: top.team, name: prev[k].name })});
  }
  (meta.leaders ||= {})[year] = now; for (const y of Object.keys(meta.leaders)) if (Number(y) < year - 1) delete meta.leaders[y];
  if (leaders.length) out.unshift({ id: `${`${year}|${week}|race`}`, year, week, kind: 'race', tier: 'info', icon: '🏅', ...$L('franchise.award_races'), leaders });
  return out;
}
/** Award winners (regular-season awards, frozen when the playoffs are drawn). `winners` = { key: finalist | null }. */
/** `priorOf(id, key)`: how many times this monster won this award before (persistent careers, GDD §46): repeat winners are recognised. */
export function awardNews({ year, week, winners, priorOf = null }) {
  const nth = ['', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
  return Object.entries(winners || {}).filter(([, w]) => w).map(([k, w]) => { const prior = k !== 'coy' && w.id && priorOf ? priorOf(w.id, k) : 0; return { id: `${year}|award|${k}`, year, week, kind: 'award', tier: 'major', icon: '🏆', mid: k === 'coy' ? null : w.id || null, mname: k === 'coy' ? null : w.name, ...$P(AWARDS[k]?.label || k, `: `, k === 'coy' ? (w.coach || w.name) : w.name, ` (`, w.team, w.position ? `, ${w.position}` : '', `)`, (w.record ? $L('franchise.club', { record: w.record }) : ''), (prior ? $P($L('franchise.his'), ` `, nth[prior] || `${prior + 1}th`) : ''), `.`)}; });
}

/**
 * League records broken this week (single game, team) or this season (at season end). A record counts only when it beats one
 * that stood before (`prev`), and only once a full season is in the book. `seasonsInBook` = completed seasons.
 */
export function recordNews({ year, week, records, seasonsInBook, scope = 'game' }) {
  if (!records || seasonsInBook < NEWS_RULES.recordsAfterSeasons) return [];
  const out = []; const fmt = (v) => (Number.isInteger(v) ? v : Number(v).toFixed(1));
  if (scope === 'game') {
    for (const c of RECORD_CATEGORIES) { const r = records.game?.[c.id]; if (!r || r.year !== year || r.week !== week || !r.prev) continue; out.push({ id: `${`${year}|${week}|rec|g|${c.id}`}`, year, week, kind: 'record', tier: 'major', icon: '📜', mid: r.id || null, mname: r.name, ...$P($L('franchise.league_record_sets_the_single_game', { name: r.name, team: r.team, toLowerCase: c.label.toLowerCase(), amount: fmt(r.value), opp: r.opp, id: r.prev.id && r.prev.id === r.id ? $L('franchise.he_breaks_his_own_mark') : $L('franchise.the_old_mark'), amount2: fmt(r.prev.value) }), r.prev.id && r.prev.id === r.id ? '' : ` by ${r.prev.name}`, r.prev.year != null ? ` (${yearOf(r.prev.year)})` : '', `.`)}); }
    for (const c of TEAM_RECORDS) { const r = records.team?.[c.id]; if (!r || r.year !== year || r.week !== week || !r.prev) continue; out.push({ id: `${`${year}|${week}|rec|t|${c.id}`}`, year, week, kind: 'record', tier: 'major', icon: '📜', ...$L('franchise.league_record_set_the_mark_for', { team: r.team, toLowerCase: c.label.toLowerCase(), amount: fmt(r.value), score: r.score, opp: r.opp, amount2: fmt(r.prev.value), team2: r.prev.team })}); }
  } else {
    for (const c of RECORD_CATEGORIES) { const r = records.season?.[c.id]; if (!r || r.year !== year || !r.prev) continue; out.push({ id: `${year}|rec|s|${c.id}`, year, week, kind: 'record', tier: 'major', icon: '📜', mid: r.id || null, mname: r.name, ...$P($L('franchise.season_record_finishes_with_the_most', { name: r.name, team: r.team, amount: fmt(r.value), toLowerCase: c.label.toLowerCase(), id: r.prev.id && r.prev.id === r.id ? $L('franchise.he_breaks_his_own_mark') : $L('franchise.the_old_mark'), amount2: fmt(r.prev.value) }), r.prev.id && r.prev.id === r.id ? '' : ` by ${r.prev.name}`, r.prev.year != null ? ` (${yearOf(r.prev.year)})` : '', `.`)}); }
  }
  return out;
}

/** Group items by week, newest first: [{ year, week, items }]. */
export function newsByWeek(list) {
  const out = []; let cur = null;
  for (const it of list || []) { if (!cur || cur.year !== it.year || cur.week !== it.week) { cur = { year: it.year, week: it.week, items: [] }; out.push(cur); } cur.items.push(it); }
  return out;
}
export const weekLabel = (week) => (week > 10 ? ROUND_LABEL[week - 10] || 'Playoffs' : week === 0 ? 'Preseason' : `${$t('franchise.week_2', { week })}`);

/**
 * Backfill for a save made before League News: the current season's scoreboards and results headlines, rebuilt from the
 * results already recorded (no races or records: those need the week they happened). Returns items added.
 */
export function backfillLeagueNews(f) {
  ensureLeagueNews(f); if (f.leagueNews.length || !f.season?.results?.length) return 0;
  const year = f.season.year; const club = f.club; const rival = f.rivals?.[f.tier]?.team || null;
  const reg = f.season.results.filter((g) => !g.round && g.week <= 10);
  const weeks = [...new Set(reg.map((g) => g.week))].sort((a, b) => a - b);
  const items = weeks.flatMap((week) => resultsNews({ year, week, results: reg, club, rival }));
  const p = f.season.playoffs;
  if (p?.results?.length) for (const round of [1, 2, 3]) items.push(...playoffNews({ year, week: 10 + round, round, results: p.results, club, rival }));
  if (p?.champion) { const fin = p.results.find((x) => x.round === 3); items.push(...championNews({ year, week: 13, final: fin })); }
  return addLeagueNews(f, items);
}

// ------------------------------------------------------------ the league's own moves (GDD §46, Phase 4)
// The persistent clubs sign, release, draft, trade and lose monsters every week. League News reports the moves that matter
// and nothing else: a starter or a 65+ monster, a former monster of the owner's, the owner's rival or division, a first-round
// pick, a decorated veteran leaving the game. At most TRANSACTIONS_PER_WEEK lines a week in season; the offseason's moves
// come as one digest of OFFSEASON_DIGEST lines; a draft comes as one digest. Written after the fact, no random draws.
export const TRANSACTION_KINDS = new Set(['signing', 'release', 'trade', 'draft', 'retire', 'milestone', 'moves']);
export const MOVE_RULES = Object.freeze({ ovr: 65, perWeek: 2, digest: 8, draftTop: 5 });
export const TRANSACTIONS_PER_WEEK = MOVE_RULES.perWeek;
export const OFFSEASON_DIGEST = MOVE_RULES.digest;

/** Is this move worth a line? `e` carries what the writer knew when it happened. */
export function meaningfulMove(e, { club, rival, division = [] }) {
  if (e.kind === 'retire' || e.kind === 'milestone') return true;
  if ((e.ovr || 0) >= MOVE_RULES.ovr || e.starter) return true;
  if (e.formerMine) return true;
  const clubs = [e.club, e.from, e.to].filter(Boolean);
  if (clubs.some((c) => c === rival || division.includes(c) || c === club)) return true;
  if (e.kind === 'draft' && e.round === 1) return true;
  return false;
}
/** Bigger monsters and closer connections first. */
export function moveWeight(e, { rival, division = [] }) {
  const clubs = [e.club, e.from, e.to].filter(Boolean);
  return (e.ovr || 0) + (e.kind === 'retire' ? 30 : e.kind === 'trade' ? 12 : e.kind === 'milestone' ? (e.tier >= 2 ? 12 : 2) : 0) + (e.formerMine ? 10 : 0) + (clubs.some((c) => c === rival) ? 10 : clubs.some((c) => division.includes(c)) ? 5 : 0) + (e.starter ? 6 : 0);
}
const ageOf = (e) => (e.age ? `, ${e.age}` : '');
/** One line of text for a move; the monster's name is linked by the UI through mid/mname. */
export function moveLine(e) {
  const who = $P(e.mname, ' (', e.position, e.ovr ? $L('franchise.ovr_2', { ovr: e.ovr }) : '', ageOf(e), ')');   // a saved line itself: it is a value inside the lines below
  switch (e.kind) {
    case 'signing': return (e.via === 'waivers' ? $P($L('franchise.claim_off_waivers', { club: e.club, who }), (e.from ? $L('franchise.late_of', { from: e.from }) : ''), `.`) : (e.generated ? $L('franchise.sign_a_veteran_out_of', { club: e.club, who, region: e.region || $t('franchise.the_regions') }) : $P(e.club, ` sign free agent `, who, (e.from ? $L('franchise.formerly_of', { from: e.from }) : ''), `.`)));
    case 'release': return e.reason === 'walked' ? $L('franchise.leaves_as_a_free_agent_his', { who, club: e.club }) : $L('franchise.release', { club: e.club, who, why: (e.why === 'cap' ? $L('franchise.to_get_under_the_cap') : (e.why === 'room' ? $L('franchise.to_make_room') : ''))});
    case 'trade': return (e.toOwner ? $L('franchise.trade_to_for', { from: e.from, who, to: e.to, consideration: e.consideration || 'picks' }) : $P($L('franchise.trade_goes_from_to', { who, from: e.from, to: e.to }), e.consideration ? ` for ${e.consideration}` : '', `.`));
    case 'draft': return $L('franchise.draft_at_round', { club: e.club, who, overall: e.overall, e: e.round });
    case 'retire': return $P($L('franchise.retires_at', { mname: e.mname, age: e.age || $t('franchise.the_end_of_a_long_career') }), e.honours ? `: ${e.honours}` : '', '.', e.club ? $P(' ', $L('franchise.he_played_his_last_season_with', { club: e.club })) : '');
    case 'milestone': return $L('franchise.reaches', { mname: e.mname, club: e.club, milestone: e.milestone });
    default: return { text: `${e.mname}: ${e.kind}.` };
  }
}
/** The sentence for a move (English or the chosen language). */
export const moveText = (e) => lineText(moveLine(e));
/**
 * In-season moves for one week: the meaningful ones, the best TRANSACTIONS_PER_WEEK as separate lines. `events` are this
 * week's queued moves; returns News items.
 */
export function movesNews({ year, week, events, club, rival, division }) {
  const ctx = { club, rival, division };
  const keep = latestPerMonster(events).filter((e) => meaningfulMove(e, ctx)).sort((a, b) => moveWeight(b, ctx) - moveWeight(a, ctx)).slice(0, TRANSACTIONS_PER_WEEK);
  return keep.map((e, i) => ({ id: `${year}|${week}|move|${e.kind}|${e.mid || i}`, year, week, kind: e.kind, tier: e.kind === 'retire' ? 'notable' : 'info', icon: ICON[e.kind] || '📰', mid: e.mid || null, mname: e.mname || null, ...moveLine(e) }));
}
/** One line per monster per window: a walk followed by a claim reads as the claim ("late of …"); a retirement always stands. */
export function latestPerMonster(events) { const last = new Map(); for (const e of events || []) { const cur = last.get(e.mid || Symbol()); if (!cur || cur.kind !== 'retire') last.set(e.mid || Symbol(), e); } return [...last.values()]; }
const ICON = Object.freeze({ signing: '✍️', release: '🚪', trade: '🔁', draft: '🎓', retire: '🎖️', milestone: '🏁', moves: '🗞️' });
/** The offseason's moves as one digest item (OFFSEASON_DIGEST lines), written as the new season opens (week 0, "Preseason"). */
export function offseasonDigest({ year, events, club, rival, division }) {
  const ctx = { club, rival, division };
  const keep = latestPerMonster(events).filter((e) => meaningfulMove(e, ctx)).sort((a, b) => moveWeight(b, ctx) - moveWeight(a, ctx)).slice(0, OFFSEASON_DIGEST);
  if (!keep.length) return [];
  const total = (events || []).length;
  return [{ id: `${year}|0|moves`, year, week: 0, kind: 'moves', tier: 'notable', icon: ICON.moves, ...$L('franchise.offseason_moves_transactions_across_the_league', { total, n: total }), lines: keep.map((e) => ({ mid: e.mid || null, mname: e.mname || null, ...moveLine(e) })) }];
}
/** The draft as one digest: the owner's picks, the top MOVE_RULES.draftTop, and AI picks of prospects the owner had scouted. */
export function draftDigest({ year, picks, club, scouted = new Set() }) {
  const made = (picks || []).filter((p) => p.id && !p.passed); if (!made.length) return [];
  const mine = made.filter((p) => p.team === club); const top = made.slice(0, MOVE_RULES.draftTop); const known = made.filter((p) => p.team !== club && scouted.has(p.id) && !top.includes(p));
  const line = (p) => ({ mid: p.id, mname: p.name, ...$P(`#`, p.overall, ` `, p.team, `: `, p.name, ` (`, p.position, `, `, p.ovr, ` OVR)`, (p.team === club ? $L('franchise.yours') : ''))});
  const lines = [...new Set([...mine, ...top, ...known])].sort((a, b) => a.overall - b.overall).slice(0, OFFSEASON_DIGEST + 2).map(line);
  return [{ id: `${year}|0|draft`, year, week: 0, kind: 'draft', tier: 'notable', icon: ICON.draft, ...$P($L('franchise.the_draft_picks', { n: made.length }), ` `, (mine.length ? $P($L('franchise.you_took'), ` `, mine.map((p) => p.name).join(', '), `.`) : $L('franchise.you_made_no_pick'))), lines }];
}
