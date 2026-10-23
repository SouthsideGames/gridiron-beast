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

export const ROUND_LABEL = Object.freeze({ 1: 'Wild Card round', 2: 'Conference finals', 3: 'Beast Bowl' });
const winnerOf = (g) => g.winner || (g.homeScore > g.awayScore ? g.home : g.awayScore > g.homeScore ? g.away : null);
const loserOf = (g) => { const w = winnerOf(g); return w ? (w === g.home ? g.away : g.home) : null; };
const scoreLine = (g) => { const w = winnerOf(g); const hi = Math.max(g.homeScore, g.awayScore), lo = Math.min(g.homeScore, g.awayScore); return w ? `${hi}-${lo}` : `${g.homeScore}-${g.awayScore}`; };
/** "Thunder Mesa's", "Ironpeak Rams'". */
export const poss = (team) => (/s$/.test(team) ? `${team}'` : `${team}'s`);
/** The score as a sentence ends it: a tie settled by the Beast Clash says so instead of "beat 16-16". */
const resultTail = (g) => (g.clash && g.homeScore === g.awayScore ? ` after a ${g.homeScore}-${g.awayScore} tie, in a ${g.clash.size}v${g.clash.size} Beast Clash` : ` ${scoreLine(g)}${otTag(g)}`);
const otTag = (g) => (g.clash ? ` (OT, decided by a ${g.clash.size}v${g.clash.size} Beast Clash)` : g.ot ? ' (OT)' : '');

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
  const out = [{ id: id('scores'), year, week, kind: 'scores', tier: 'info', icon: '🏈', text: `Week ${week} scores`, games: thisWeek.map((g) => ({ home: g.home, away: g.away, hs: g.homeScore, as: g.awayScore, ot: !!g.ot, clash: !!g.clash, w: winnerOf(g), mine: g.home === club || g.away === club, rival: !!rival && (g.home === rival || g.away === rival) })) }];
  const heads = [];
  for (const g of thisWeek) {
    const w = winnerOf(g), l = loserOf(g); const margin = Math.abs(g.homeScore - g.awayScore);
    if (!w) { heads.push({ id: id('tie', g.home), kind: 'overtime', tier: 'info', icon: '🤝', text: `${g.home} and ${g.away} tie ${g.homeScore}-${g.awayScore}.` }); continue; }
    const bw = before[w], bl = before[l];
    if (games(bw) >= NEWS_RULES.upsetMinGames && games(bl) >= NEWS_RULES.upsetMinGames && rate(bl) - rate(bw) >= NEWS_RULES.upsetGap) heads.push({ id: id('upset', w), kind: 'upset', tier: 'notable', icon: '😱', text: `Upset: ${w} (${recStr(bw)}) stun ${l} (${recStr(bl)})${resultTail(g)}.` });
    const perfect = after[w].l === 0 && after[w].t === 0;
    if (bl && bl.l === 0 && bl.t === 0 && bl.w >= NEWS_RULES.unbeatenMarks[0] - 1) heads.push({ id: id('firstloss', l), kind: 'unbeaten', tier: 'notable', icon: '💥', text: `${poss(l)} perfect start ends at ${bl.w}-0: ${w} win${resultTail(g)}.` });
    else if (perfect && week === lastWeek && after[w].w >= NEWS_RULES.unbeatenMarks[0]) heads.push({ id: id('unbeaten', w), kind: 'unbeaten', tier: 'notable', icon: '🔥', text: `${w} finish the regular season unbeaten at ${after[w].w}-0.` });
    else if (perfect && NEWS_RULES.unbeatenMarks.includes(after[w].w)) heads.push({ id: id('unbeaten', w), kind: 'unbeaten', tier: 'notable', icon: '🔥', text: `${w} stay perfect at ${after[w].w}-0 after beating ${l}${resultTail(g)}.` });
    else if (!perfect && NEWS_RULES.streakMarks.includes(after[w].streak)) heads.push({ id: id('streak', w), kind: 'streak', tier: 'info', icon: '📈', text: `${w} have won ${after[w].streak} straight (${recStr(after[w])}).` });
    if (NEWS_RULES.streakMarks.includes(-after[l].streak)) heads.push({ id: id('slide', l), kind: 'streak', tier: 'info', icon: '📉', text: `${l} have lost ${-after[l].streak} in a row (${recStr(after[l])}).` });
    if (g.clash || g.ot) heads.push({ id: id('ot', w), kind: 'overtime', tier: 'info', icon: '⏱️', text: g.clash && g.homeScore === g.awayScore ? `${w} beat ${l} in a ${g.clash.size}v${g.clash.size} Beast Clash after a ${g.homeScore}-${g.awayScore} tie.` : `${w} edge ${l} ${scoreLine(g)} in overtime.` });
    else if (Math.min(g.homeScore, g.awayScore) === 0) heads.push({ id: id('shutout', w), kind: 'shutout', tier: 'info', icon: '🧱', text: `${poss(w)} defense shuts out ${l}, ${scoreLine(g)}.` });
    else if (margin >= NEWS_RULES.blowout) heads.push({ id: id('blowout', w), kind: 'blowout', tier: 'info', icon: '💪', text: `${w} rout ${l} ${scoreLine(g)}.` });
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
  const label = ROUND_LABEL[round] || `Round ${round}`; const id = (k) => `${year}|${week}|${k}`;
  const out = [{ id: id(`pscores${round}`), year, week, round, kind: 'scores', tier: 'info', icon: '🏟️', text: `${label} scores`, games: games.map((g) => ({ home: g.home, away: g.away, hs: g.homeScore, as: g.awayScore, ot: !!g.ot, clash: !!g.clash, w: winnerOf(g), mine: g.home === club || g.away === club, rival: !!rival && (g.home === rival || g.away === rival) })) }];
  if (round < 3) for (const g of games) { const w = winnerOf(g); out.push({ id: id(`adv${round}|${w}`), year, week, round, kind: 'playoffs', tier: 'notable', icon: '🎟️', text: `${w} beat ${loserOf(g)}${resultTail(g)} and advance to the ${ROUND_LABEL[round + 1]}.` }); }
  return out;
}
export function championNews({ year, week, final }) {
  if (!final) return [];
  const w = winnerOf(final);
  return [{ id: `${year}|${week}|champion`, year, week, kind: 'champion', tier: 'major', icon: '🏆', text: `${w} win the Beast Bowl, beating ${loserOf(final)}${resultTail(final)}.` }];
}
/** The playoff field, drawn after week 10. `seeds` = { conf: [team, ...] }, `records` the season's standings records. */
export function playoffFieldNews({ year, week, seeds, records }) {
  const parts = Object.entries(seeds).map(([conf, s]) => `${conf}: ${s.map((t, i) => `${i + 1}. ${t} (${recStr(records?.[t])})`).join(', ')}`);
  return [{ id: `${year}|${week}|field`, year, week, kind: 'playoffs', tier: 'notable', icon: '📋', text: `The playoff field is set. ${parts.join(' · ')}.` }];
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
    leaders.push({ award: k, short: AWARDS[k]?.short || k, name: who, team: top.team, second: races[k]?.[1] ? (k === 'coy' ? races[k][1].coach || races[k][1].name : races[k][1].name) : null });
    if (prev[k] && prev[k].key !== key && ['mvp', 'opoy', 'dpoy'].includes(k)) out.push({ id: `${year}|${week}|lead|${k}`, year, week, kind: 'race_lead', tier: 'notable', icon: '🔀', text: `${AWARDS[k].short} race: ${who} (${top.team}) takes the lead from ${prev[k].name}.` });
  }
  (meta.leaders ||= {})[year] = now; for (const y of Object.keys(meta.leaders)) if (Number(y) < year - 1) delete meta.leaders[y];
  if (leaders.length) out.unshift({ id: `${year}|${week}|race`, year, week, kind: 'race', tier: 'info', icon: '🏅', text: 'Award races', leaders });
  return out;
}
/** Award winners (regular-season awards, frozen when the playoffs are drawn). `winners` = { key: finalist | null }. */
export function awardNews({ year, week, winners }) {
  return Object.entries(winners || {}).filter(([, w]) => w).map(([k, w]) => ({ id: `${year}|award|${k}`, year, week, kind: 'award', tier: 'major', icon: '🏆', text: `${AWARDS[k]?.label || k}: ${k === 'coy' ? (w.coach || w.name) : w.name} (${w.team}${w.position ? `, ${w.position}` : ''})${w.record ? `, ${w.record} club` : ''}.` }));
}

/**
 * League records broken this week (single game, team) or this season (at season end). A record counts only when it beats one
 * that stood before (`prev`), and only once a full season is in the book. `seasonsInBook` = completed seasons.
 */
export function recordNews({ year, week, records, seasonsInBook, scope = 'game' }) {
  if (!records || seasonsInBook < NEWS_RULES.recordsAfterSeasons) return [];
  const out = []; const fmt = (v) => (Number.isInteger(v) ? v : Number(v).toFixed(1));
  if (scope === 'game') {
    for (const c of RECORD_CATEGORIES) { const r = records.game?.[c.id]; if (!r || r.year !== year || r.week !== week || !r.prev) continue; out.push({ id: `${year}|${week}|rec|g|${c.id}`, year, week, kind: 'record', tier: 'major', icon: '📜', text: `League record: ${r.name} (${r.team}) sets the single-game mark for ${c.label.toLowerCase()} with ${fmt(r.value)} against ${r.opp}. The old mark: ${fmt(r.prev.value)} by ${r.prev.name}${r.prev.year != null ? ` (${yearOf(r.prev.year)})` : ''}.` }); }
    for (const c of TEAM_RECORDS) { const r = records.team?.[c.id]; if (!r || r.year !== year || r.week !== week || !r.prev) continue; out.push({ id: `${year}|${week}|rec|t|${c.id}`, year, week, kind: 'record', tier: 'major', icon: '📜', text: `League record: ${r.team} set the mark for ${c.label.toLowerCase()} (${fmt(r.value)}) in a ${r.score} game against ${r.opp}. The old mark: ${fmt(r.prev.value)} by ${r.prev.team}.` }); }
  } else {
    for (const c of RECORD_CATEGORIES) { const r = records.season?.[c.id]; if (!r || r.year !== year || !r.prev) continue; out.push({ id: `${year}|rec|s|${c.id}`, year, week, kind: 'record', tier: 'major', icon: '📜', text: `Season record: ${r.name} (${r.team}) finishes with ${fmt(r.value)} ${c.label.toLowerCase()}, the most in league history. The old mark: ${fmt(r.prev.value)} by ${r.prev.name}${r.prev.year != null ? ` (${yearOf(r.prev.year)})` : ''}.` }); }
  }
  return out;
}

/** Group items by week, newest first: [{ year, week, items }]. */
export function newsByWeek(list) {
  const out = []; let cur = null;
  for (const it of list || []) { if (!cur || cur.year !== it.year || cur.week !== it.week) { cur = { year: it.year, week: it.week, items: [] }; out.push(cur); } cur.items.push(it); }
  return out;
}
export const weekLabel = (week) => (week > 10 ? ROUND_LABEL[week - 10] || 'Playoffs' : week === 0 ? 'Preseason' : `Week ${week}`);

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
