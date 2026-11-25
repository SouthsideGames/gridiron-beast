// Pre-franchise league archive: the eight seasons played before the owner arrived (years -7 … 0; season 1 is the first he plays).
//
// The archive is generated once, at franchise creation, from the franchise seed alone. It is presentation data:
//  - it never reads or advances the franchise's game generator (every draw is a hash of the seed and a key);
//  - it is never written into a monster's statistics ledger, the playable season history, the record book, the Hall of Fame
//    vote or a GM's career, so nothing a previous manager "did" is credited to the incoming one and no game calculation sees it;
//  - retired legends exist only here. They are never in a roster, the league registry, a draft class, a pool or a ballot.
//
// 32-club league (owner specification, 2026-11-23): THE LEAGUE'S PAST IS CANON. The seasons (tables, brackets, champions) and the
// retired legends are drawn from one fixed key, CANON, so they are the same in every franchise and are not re-rolled with a new
// save; among them are the years Aria Gale's Skyvale Cyclones and Rowan Thorne's Thornwood Wildroots were the league's best, and
// their decline since both coaches left. What still follows the save is what belongs to its own monsters: the careers of the
// veterans on its rosters. A season is 14 games, not nine.
// Award winners are canon too (owner ruling 2026-11-23, second set): each season's MVP, OPOY and DPOY are chosen by the game's own
// award rules among the canon players of that season only, the six retired legends and twelve retired stars (ARCHIVE_STARS), all
// drawn from CANON with canon-only names, so every new franchise has the same award history. A save's own veterans keep their
// per-save careers but never take a canon award.
//
// It follows the game's own rules instead of inventing a format: the fixtures come from leagueSeasonFixtures (nine games and a
// bye), the tables from applyResult/standings (the real tiebreakers), the bracket from playoffRound (four seeds per
// conference: Conference Semifinals, Conference Championships, the Beast Bowl), the statistic names from the stats ledger, and
// the award winners from computeAwards run on each season's league table. Season totals are calibrated to what the game's
// own simulated seasons produce (tools/preleague-study.mjs), not to another sport's numbers.

import { legacyPlayoffRound, LEAGUE_LAYOUTS, ACTIVE_LAYOUT, useLeagueLayout, ALL_TEAMS, DIVISIONS, STARTER_CLUBS, REG_GAMES, CONFERENCE_NAMES, conferenceFor, divisionOf, leagueSeasonFixtures, blankRecord, applyResult, standings, playoffRound } from '../data/league.js';
import { hashString } from '../core/rng.js';
import { isGymClub } from '../data/gyms.js';
import { SPECIES_DEX } from '../data/species.js';
import { monsterOverall } from '../data/monsters.js';
import { individualName } from '../data/individual-names.js';
import { addInto, withDerived, MAX_KEYS, RECORD_CATEGORIES, OFFENSE_POSITIONS, DEFENSE_POSITIONS } from './stats.js';
import { computeAwards } from './awards.js';

export const ARCHIVE_VERSION = 3;
export const ARCHIVE_SEASONS = 8;
export const ARCHIVE_LEGENDS = 6;
/** Retired stars of the canon era: the award races of the past are run among them and the legends. Six of an early era, six of a late one. */
export const ARCHIVE_STARS = Object.freeze([
  { pos: 'QB', era: 'early' }, { pos: 'RB', era: 'early' }, { pos: 'WR', era: 'early' }, { pos: 'DL', era: 'early' }, { pos: 'LB', era: 'early' }, { pos: 'CB', era: 'early' },
  { pos: 'QB', era: 'late' }, { pos: 'WR', era: 'late' }, { pos: 'TE', era: 'late' }, { pos: 'DL', era: 'late' }, { pos: 'LB', era: 'late' }, { pos: 'S', era: 'late' },
]);
export const ARCHIVE_AWARDS = Object.freeze(['mvp', 'opoy', 'dpoy']); // Signature Monster of the Year needs ability impact, which a past season cannot prove
export const REGULAR_GAMES = REG_GAMES;
/** Playoff rounds of an archive season: the old three-round bracket (the Beast Bowl is round 3 there, round 4 in a live season). */
export const ARCHIVE_ROUNDS = 3;
/** The season lines below were measured on nine-game seasons; a longer season keeps their per-game rates. */
const STUDY_GAMES = 9;
/** The key every franchise's league history is drawn from. Changing it rewrites the league's past for new franchises. */
export const CANON = 'beast-league-canon-63';
/**
 * The two fallen powers (owner specification). `rise` is the club's strength, in standard deviations, in each archive year from
 * the oldest to the newest: the best club in the league under the coach who has since left, then the slide to where the owner
 * finds it.
 */
/** The league layout the archive's seasons were played in (data/league.js LEAGUE_LAYOUTS). */
export const ARCHIVE_LAYOUT = 1;
export const FALLEN_POWERS = Object.freeze({
  'Skyvale Cyclones': { coach: 'Aria Gale', now: 'Cliffhaven Chargers', left: -3, rise: [1.9, 2.1, 2.2, 1.8, 0.5, -0.3, -0.8, -1.1] },
  'Thornwood Wildroots': { coach: 'Rowan Thorne', now: 'Westhaven Pirates', left: -2, rise: [1.4, 1.9, 2.1, 2.2, 1.7, 0.3, -0.6, -1.1] },
});
/** Retired legends carry this id prefix; no live monster id ("m_…") can collide with it. */
export const LEGEND_PREFIX = 'historical_';
export const isArchiveLegendId = (id) => String(id ?? '').startsWith(LEGEND_PREFIX);
/** The fixture rotation repeats every 70 seasons, so year y is played on the schedule of season y + 70 and season 1 follows on. */
const FIXTURE_CYCLE = 70;
/** The schedule seed of the canon seasons (a franchise's own seasons are drawn from its own seed). */
const CANON_FIXTURES = 0x5eed;

// ------------------------------------------------------------ draws (hash only: no generator state)
const makeDraws = (seed) => {
  const u = (key) => (hashString(`${seed}|pre|${key}`) + 0.5) / 4294967296;
  const n = (key) => { const a = u(`${key}|a`), b = u(`${key}|b`); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
  return { u, n, int: (key, max) => Math.min(max - 1, Math.floor(u(key) * max)) };
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const R = (v) => Math.max(0, Math.round(v));

// ------------------------------------------------------------ seasons
/** Football-shaped points: touchdowns (7) and field goals (3) around a mean that follows the club's strength. */
function points(D, key, mean) {
  const target = clamp(mean + D.n(`${key}|pts`) * 5.5, 0, 45);
  const tds = clamp(Math.round((target - 3 * D.u(`${key}|fgshare`) * 2) / 7), 0, 6);
  const fgs = clamp(Math.round((target - tds * 7) / 3), 0, 4);
  return tds * 7 + fgs * 3;
}
function scoreGame(D, key, winnerStrength, loserStrength) {
  const edge = clamp((winnerStrength - loserStrength) * 4, -6, 6);
  let w = points(D, `${key}|w`, 17 + edge), l = points(D, `${key}|l`, 10 - edge * 0.5);
  if (w <= l) w = l + (D.u(`${key}|margin`) < 0.55 ? 3 : 7);
  return [w, l];
}
/** Year-0 winners for the clubs the owner could take: their records are the ones the club picker shows ("last season 2-7"). */
function pinnedWinners(D, games, fixed) {
  const pinned = new Map();
  const clubs = Object.keys(fixed); if (!clubs.length) return pinned;
  const inner = games.filter((g) => fixed[g.home] && fixed[g.away]);
  const outer = Object.fromEntries(clubs.map((c) => [c, games.filter((g) => (g.home === c || g.away === c) && !(fixed[g.home] && fixed[g.away]))]));
  // Eight clubs in two divisions play each other 24 times or more, too many to try every outcome. Hand each game to the club with
  // more wins still owed to it, in a drawn order, and draw again if a club is left owing more wins than it has other games.
  let chosen = null;
  for (let attempt = 0; attempt < 400 && !chosen; attempt++) {
    const wins = Object.fromEntries(clubs.map((c) => [c, 0])); const left = (c) => fixed[c].w - wins[c]; const winners = new Map();
    const order = inner.slice().sort((a, b) => D.u(`pin|${attempt}|${a.week}|${a.home}|${a.away}`) - D.u(`pin|${attempt}|${b.week}|${b.home}|${b.away}`));
    let ok = true;
    for (const g of order) {
      const h = left(g.home), a = left(g.away); if (h <= 0 && a <= 0) { ok = false; break; }
      const w = h === a ? (D.u(`pin|${attempt}|coin|${g.week}|${g.home}|${g.away}`) < 0.5 ? g.home : g.away) : h > a ? g.home : g.away;
      wins[w]++; winners.set(g, w);
    }
    if (ok && clubs.every((c) => left(c) >= 0 && left(c) <= outer[c].length && fixed[c].w + fixed[c].l === inner.filter((g) => g.home === c || g.away === c).length + outer[c].length)) chosen = { wins, winners };
  }
  if (!chosen) return pinned; // the pinned records do not fit this year's fixtures: leave the season to the strengths
  for (const [g, w] of chosen.winners) pinned.set(g, w);
  for (const c of clubs) {
    const need = fixed[c].w - chosen.wins[c];
    const order = outer[c].slice().sort((a, b) => D.u(`pin|${c}|${a.home}|${a.away}`) - D.u(`pin|${c}|${b.home}|${b.away}`));
    order.forEach((g, i) => pinned.set(g, i < need ? c : (g.home === c ? g.away : g.home)));
  }
  return pinned;
}
/** How much a standard deviation of club strength moves a game: the better club wins about two games in three, not nine in ten. */
const SLOPE = 0.62;
function playSeason(D, year, strength, fixed) {
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()]));
  const weeks = leagueSeasonFixtures(year + FIXTURE_CYCLE, CANON_FIXTURES);
  const games = weeks.flatMap((w) => w.games.map((g) => ({ ...g, week: w.week })));
  const pinned = pinnedWinners(D, games, fixed || {});
  for (const g of games) {
    const key = `${year}|${g.week}|${g.home}|${g.away}`;
    const pHome = 1 / (1 + Math.exp(-((strength[g.home] - strength[g.away]) * SLOPE + 0.18)));
    const winner = pinned.get(g) || (D.u(`${key}|win`) < pHome ? g.home : g.away);
    const loser = winner === g.home ? g.away : g.home;
    const [w, l] = scoreGame(D, key, strength[winner], strength[loser]);
    applyResult(records, { home: g.home, away: g.away, homeScore: winner === g.home ? w : l, awayScore: winner === g.home ? l : w });
  }
  const table = standings(records);
  // The archive's seasons were played in the league's old bracket (eight clubs, the four division champions of each conference,
  // three rounds) and are kept exactly as they were: the 14-club playoffs begin with the owner's first season (owner, 2026-11-23).
  const seeds = Object.fromEntries(Object.entries(table.conferences).map(([conf, c]) => [conf, c.champions.slice()]));
  const results = [];
  for (let round = 1; round <= ARCHIVE_ROUNDS; round++) {
    for (const g of legacyPlayoffRound(round, results, seeds)) {
      const key = `${year}|po${round}|${g.home}|${g.away}`;
      const pHome = 1 / (1 + Math.exp(-((strength[g.home] - strength[g.away]) * SLOPE + 0.22)));
      const winner = D.u(`${key}|win`) < pHome ? g.home : g.away; const loser = winner === g.home ? g.away : g.home;
      const [w, l] = scoreGame(D, key, strength[winner], strength[loser]);
      results.push({ round, tag: g.tag, conf: g.conf, home: g.home, away: g.away, homeScore: winner === g.home ? w : l, awayScore: winner === g.home ? l : w, winner });
    }
  }
  const final = results[results.length - 1];
  return {
    year, champion: final.winner, runnerUp: final.winner === final.home ? final.away : final.home,
    standings: table.overall.map((club) => ({ club, w: records[club].w, l: records[club].l, pf: records[club].pf, pa: records[club].pa })),
    divisions: Object.fromEntries(Object.entries(table.divisions).map(([d, clubs]) => [d, clubs.slice()])),
    seeds, playoffs: results, awards: { league: {} },
  };
}

// ------------------------------------------------------------ season lines
// (Since the 32-club league a season is 14 games; the per-game rates are those of the nine-game study.)
// A starter's nine-game season at the middle of the league, from the game's own simulated seasons (medians of monsters with
// six or more starts over six simulated seasons; tools/preleague-study.mjs prints the comparison). `z` is how good the season
// was for the position (talent, age and luck); rates move with it so a bigger season is also a better one.
const SPREAD = { QB: 0.36, RB: 0.7, WR: 0.72, TE: 0.75, OL: 0.22, DL: 0.4, LB: 0.5, CB: 0.3, S: 0.28, K: 0.4 };
function fullLine(D, key, position, z, games) {
  const share = games / STUDY_GAMES * 0.93; z = 2.1 * Math.tanh(z / 2.1); // the tails flatten: a great season is about three times a middling one, not ten
  const e = (s) => Math.exp(s * z); const j = (k, s = 0.12) => Math.exp(D.n(`${key}|${k}`) * s);
  const line = {};
  if (position === 'QB') {
    const att = R(150 * e(0.22) * j('att') * share), comp = Math.min(att, R(att * clamp(0.565 + 0.035 * z + D.n(`${key}|cp`) * 0.02, 0.4, 0.74)));
    Object.assign(line, { snapsOff: R(215 * share * j('sn', 0.06)), att, comp, passYds: R(att * clamp(7.6 + 0.85 * z + D.n(`${key}|ypa`) * 0.4, 4.5, 11)), passTd: R(att * clamp(0.055 + 0.02 * z, 0.01, 0.105) * j('td', 0.2)), intThrown: R(att * clamp(0.014 - 0.004 * z, 0.002, 0.04) * j('int', 0.35)), sacked: R(4 * share * j('sk', 0.5)), longPass: R(clamp(48 + 9 * z + D.n(`${key}|lp`) * 9, 22, 92)) });
    const rush = R(18 * j('ru', 0.55) * share); Object.assign(line, { rush, rushYds: R(rush * clamp(2.4 + D.n(`${key}|rypc`) * 2.2, 0, 9)), rushTd: R(rush * 0.03 * j('rtd', 0.6)), fumLost: R(0.5 * j('fl', 0.8) * share) });
  } else if (position === 'RB') {
    const rush = R(Math.min(150, 36 * e(0.62) * j('ru')) * share), targets = R(11 * e(0.5) * j('tg', 0.4) * share), rec = Math.min(targets, R(targets * clamp(0.63 + D.n(`${key}|cp`) * 0.06, 0.4, 0.85)));
    Object.assign(line, { snapsOff: R(190 * share * j('sn', 0.08)), rush, rushYds: R(rush * clamp(5.2 + 0.3 * z + D.n(`${key}|ypc`) * 0.6, 2.5, 8.5)), rushTd: R(rush * clamp(0.04 + 0.008 * z, 0.005, 0.07) * j('td', 0.3)), longRush: rush ? R(clamp(22 + 8 * z + D.n(`${key}|lr`) * 9, 8, 80)) : 0, targets, rec, recYds: R(rec * clamp(8.6 + D.n(`${key}|ypr`) * 1.4, 4, 14)), recTd: R(rec * 0.05 * j('rtd', 0.5)), fumLost: R(0.5 * j('fl', 0.8) * share) });
  } else if (position === 'WR' || position === 'TE') {
    const wr = position === 'WR';
    const targets = R(Math.min(wr ? 125 : 140, (wr ? 32 : 35) * e(wr ? 0.56 : 0.6) * j('tg')) * share), rec = Math.min(targets, R(targets * clamp((wr ? 0.5 : 0.56) + 0.05 * z + D.n(`${key}|cp`) * 0.04, 0.3, 0.82)));
    const recYds = R(rec * clamp((wr ? 15 : 12.2) + 0.6 * z + D.n(`${key}|ypr`) * 1.5, 7, 22));
    Object.assign(line, { snapsOff: R((wr ? 190 : 200) * share * j('sn', 0.08)), targets, rec, recYds, recTd: R(rec * clamp((wr ? 0.13 : 0.06) + 0.02 * z, 0.01, 0.22) * j('td', 0.3)), longRec: rec ? R(clamp((wr ? 38 : 30) + 8 * z + D.n(`${key}|lr`) * 9, 9, 88)) : 0, yac: R(recYds * clamp(0.38 + D.n(`${key}|yac`) * 0.06, 0.15, 0.6)), drops: R(targets * 0.035 * j('dr', 0.6)) });
    if (!wr) { const rbSnaps = R(32 * j('rb', 0.25) * share), pbSnaps = R(8 * j('pb', 0.6) * share); Object.assign(line, { rbSnaps, pbSnaps, blocksLost: Math.min(rbSnaps + pbSnaps, R((rbSnaps + pbSnaps) * clamp(0.26 - 0.05 * z, 0.05, 0.6))) }); }
  } else if (position === 'OL') {
    const pbSnaps = R(125 * j('pb', 0.3) * share), rbSnaps = R(60 * j('rb', 0.42) * share);
    Object.assign(line, { snapsOff: R(215 * share * j('sn', 0.06)), pbSnaps, rbSnaps, blocksLost: Math.min(pbSnaps + rbSnaps, R((pbSnaps + rbSnaps) * clamp(0.55 - 0.1 * z + D.n(`${key}|bl`) * 0.08, 0.15, 0.95))), pancakes: R(6 * e(0.5) * j('pk', 0.4) * share), sacksAllowed: R(clamp(1 - 0.6 * z, 0, 5) * j('sa', 0.5) * share), pressuresAllowed: R(clamp(3 - 1.2 * z, 0, 9) * j('pa', 0.4) * share) });
  } else if (DEFENSE_POSITIONS.has(position)) {
    const base = { DL: { tackles: 11, assists: 2.2, tfl: 3.1, sacks: 1.25, pressures: 15, ff: 0.3, fr: 0.3, pd: 0.4, int: 0.02, cov: 1, yds: 6 }, LB: { tackles: 19, assists: 2.3, tfl: 0.8, sacks: 0.2, pressures: 1, ff: 0.35, fr: 0.3, pd: 2.6, int: 0.22, cov: 10, yds: 6.2 }, CB: { tackles: 17, assists: 1.3, tfl: 0.4, sacks: 0.04, pressures: 0.4, ff: 0.3, fr: 0.3, pd: 3.2, int: 0.35, cov: 26, yds: 8.6 }, S: { tackles: 28, assists: 2.1, tfl: 0.3, sacks: 0.06, pressures: 0.4, ff: 0.3, fr: 0.3, pd: 2.4, int: 0.32, cov: 5.5, yds: 7.4 } }[position];
    const vol = e(SPREAD[position]) * share;
    const covTargets = R(base.cov * j('cov', position === 'LB' ? 0.5 : 0.3) * share * (position === 'LB' ? e(0.45) : 1)), recAllowed = Math.min(covTargets, R(covTargets * clamp(0.55 - 0.05 * z + D.n(`${key}|ca`) * 0.05, 0.25, 0.85)));
    Object.assign(line, { snapsDef: R(235 * share * j('sn', 0.06)), tackles: R(base.tackles * vol * j('tk')), assists: R(base.assists * vol * j('as', 0.4)), tfl: R(base.tfl * vol * j('tfl', 0.4)), sacks: R(base.sacks * vol * j('sk', 0.5)), pressures: R(base.pressures * vol * j('pr', 0.25)), ff: R(Math.min(4, base.ff * vol * j('ff', 0.7))), fr: R(base.fr * share * j('fr', 0.8)), pd: R(base.pd * vol * j('pd', 0.4)), int: R(Math.min(position === 'DL' ? 1 : 4, base.int * vol * j('int', 0.7))) });
    if (covTargets) Object.assign(line, { covTargets, recAllowed, ydsAllowed: R(recAllowed * clamp(base.yds * 1.9 - 1.2 * z + D.n(`${key}|ya`) * 1.5, 5, 22)), tdAllowed: R(covTargets * clamp(0.07 - 0.02 * z, 0, 0.2) * j('tda', 0.5)) });
  } else if (position === 'K') {
    const xpa = R(Math.min(40, 12 * j('xpa', 0.5)) * share), fga = R(7 * j('fga', 0.3) * share);
    const fgm = Math.min(fga, R(fga * clamp(0.72 + 0.07 * z + D.n(`${key}|fgp`) * 0.05, 0.35, 1)));
    Object.assign(line, { xpa, xpm: Math.min(xpa, R(xpa * clamp(0.92 + 0.03 * z + D.n(`${key}|xpp`) * 0.03, 0.6, 1))), fga, fgm, fgLong: fgm ? R(clamp(50 + 5 * z + D.n(`${key}|fl`) * 9, 24, 79)) : 0 });
  }
  return line;
}
const BENCH_SCALE = { QB: 0.2, RB: 0.28, WR: 0.22, TE: 0.2, OL: 0.2, DL: 0.2, LB: 0.12, CB: 0.16, S: 0.4, K: 0.25 };
/** One regular-season line with the ledger's own keys. A reserve plays some games, starts few and gets a share of a starter's work. */
function seasonLine(D, key, position, { starter, z, missed = 0 }) {
  if (starter) { const games = REGULAR_GAMES - missed; return clean({ games, starts: games, ...fullLine(D, key, position, z, games) }); }
  const games = clamp(6 + D.int(`${key}|gp`, 9), 1, REGULAR_GAMES), starts = D.u(`${key}|gs`) < 0.2 ? 1 : 0;
  const full = fullLine(D, `${key}|bench`, position, z - 0.6, games); const scale = BENCH_SCALE[position] * Math.exp(D.n(`${key}|role`) * 0.3);
  const line = { games, starts };
  for (const [k, v] of Object.entries(full)) line[k] = MAX_KEYS.has(k) ? R(v * 0.7) : R(v * scale);
  return clean(repair(line));
}
/** A playoff line: the club's playoff games at the season's own per-game rates. */
function postLine(D, key, reg, played) {
  const games = Math.min(played, reg.games || 0); if (!games) return {};
  const line = { games, starts: reg.starts >= reg.games ? games : 0 };
  // one factor for the whole line (a good or a quiet playoff run), so its rates stay those of the season it follows
  const factor = (games / reg.games) * Math.exp(D.n(`${key}|run`) * 0.22);
  for (const [k, v] of Object.entries(reg)) { if (k === 'games' || k === 'starts') continue; line[k] = MAX_KEYS.has(k) ? R(v * clamp(0.7 + D.u(`${key}|${k}`) * 0.3, 0, 1)) : R(v * factor); }
  return clean(repair(line));
}
/** The relations a real line always keeps (a scaled or rounded line is brought back inside them). */
function repair(l) {
  if (l.comp > l.att) l.comp = l.att; if (l.rec > l.targets) l.rec = l.targets; if (l.fgm > l.fga) l.fgm = l.fga; if (l.xpm > l.xpa) l.xpm = l.xpa;
  if (l.recAllowed > l.covTargets) l.recAllowed = l.covTargets; if (l.starts > l.games) l.starts = l.games;
  if ((l.blocksLost || 0) > (l.pbSnaps || 0) + (l.rbSnaps || 0)) l.blocksLost = (l.pbSnaps || 0) + (l.rbSnaps || 0);
  if (!l.comp) { if (l.passYds) l.passYds = 0; if (l.passTd) l.passTd = 0; if (l.longPass) l.longPass = 0; }
  if (!l.rec) { for (const k of ['recYds', 'recTd', 'longRec', 'yac']) if (l[k]) l[k] = 0; }
  if (!l.rush) { for (const k of ['rushYds', 'rushTd', 'longRush']) if (l[k]) l[k] = 0; }
  if (!l.fgm && l.fgLong) l.fgLong = 0;
  if (!l.recAllowed) { if (l.ydsAllowed) l.ydsAllowed = 0; if (l.tdAllowed) l.tdAllowed = 0; }
  if (l.passTd > l.comp) l.passTd = l.comp; if (l.recTd > l.rec) l.recTd = l.rec; if (l.rushTd > l.rush) l.rushTd = l.rush;
  if (l.longPass > l.passYds) l.longPass = l.passYds; if (l.longRec > l.recYds) l.longRec = l.recYds; if (l.longRush > Math.max(0, l.rushYds)) l.longRush = Math.max(0, l.rushYds);
  if (l.sacks > l.tackles + (l.assists || 0)) l.sacks = l.tackles + (l.assists || 0);
  return l;
}
/** Like the ledger, a line holds only what happened: zero is not stored. */
function clean(l) { repair(l); const o = {}; for (const [k, v] of Object.entries(l)) if (v) o[k] = v; if (!o.games) o.games = l.games || 0; return o; }

// ------------------------------------------------------------ careers
const STARTERS = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 2, DL: 2, LB: 2, CB: 2, S: 1, K: 1 }; // the base seven-a-side lineups (data/personnel.js) and the kicker
const isAgeless = (m) => !!(m?.legendary || m?.signature || m?.dev?.apex);
const safeOverall = (m) => { try { const v = monsterOverall(m); return Number.isFinite(v) ? v : 50; } catch { return 50; } };
/** How much of his present ability a monster had in a past season: he arrived raw and grew into his prime. */
function maturity(experience, age) { return (experience <= 0 ? 0.86 : experience === 1 ? 0.93 : experience === 2 ? 0.975 : 1) * (age != null && age >= 31 ? 1 - (age - 30) * 0.03 : 1); }

/**
 * The canon cast: the six retired legends and the twelve retired stars, with ids, names, positions, species and career spans drawn
 * from `canon` alone. Names are chosen against each other only, never against a save's monsters, so they are the same in every
 * franchise (franchise.js reserves them before any monster of the save is named).
 */
export function canonCast(canon = CANON, seasons = ARCHIVE_SEASONS) {
  const C = makeDraws(canon); const firstYear = 1 - seasons; const taken = new Set(); const out = [];
  const pick = (key, position) => { const pool = SPECIES_DEX.filter((s) => s.position === position && ['uncommon', 'rare'].includes(s.rarity)); return pool[C.int(key, pool.length)] || SPECIES_DEX.find((s) => s.position === position); };
  const legendPositions = ['QB', 'RB', 'WR', 'DL', 'LB', 'CB'];
  for (let i = 0; i < ARCHIVE_LEGENDS; i++) {
    const id = `${LEGEND_PREFIX}${hashString(`${canon}:legend:${i}`).toString(36)}`; const position = legendPositions[i % legendPositions.length]; const sp = pick(`legend-species|${i}`, position);
    const name = individualName(id, taken); taken.add(name.toLowerCase());
    out.push({ id, name, position, species: sp?.id || null, type: sp?.element || null, stage: Math.min(2, sp?.evolution?.length || 0), legend: true, canon: true, i,
      debut: firstYear, last: 0 - C.int(`legend-retired|${i}`, 3), ageAtDebut: 23 + C.int(`legend-age|${i}`, 3) });
  }
  ARCHIVE_STARS.forEach(({ pos, era }, i) => {
    const id = `${LEGEND_PREFIX}s${hashString(`${canon}:star:${i}`).toString(36)}`; const sp = pick(`star-species|${i}`, pos);
    const name = individualName(id, taken); taken.add(name.toLowerCase());
    const debut = era === 'early' ? firstYear + C.int(`star-debut|${i}`, 2) : firstYear + 3 + C.int(`star-debut|${i}`, 2);
    const last = era === 'early' ? Math.min(-1, debut + 4 + C.int(`star-retired|${i}`, 2)) : 0;
    out.push({ id, name, position: pos, species: sp?.id || null, type: sp?.element || null, stage: Math.min(2, sp?.evolution?.length || 0), legend: false, canon: true, i, debut, last, ageAtDebut: 22 + C.int(`star-age|${i}`, 4) });
  });
  return out;
}

/**
 * Build the archive for a new franchise. Pure: reads the franchise, changes nothing.
 * `quality(club)` is the club's present strength (franchise.js clubQuality); last season's table leans on it, so the clubs the
 * draft order calls weak were the ones that lost.
 */
export function generateLeagueArchive(f, { seasons = ARCHIVE_SEASONS, quality = null, canon = CANON } = {}) {
  const seed = (f?.seed ?? 0) >>> 0; const DS = makeDraws(seed); const D = DS;
  const firstYear = 1 - seasons;
  const live = [...new Map([...Object.values(f?.league?.monsters || {}), ...(f?.roster || [])].filter((m) => m?.id != null).map((m) => [String(m.id), m])).values()]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const clubOf = new Map();
  for (const [club, data] of Object.entries(f?.league?.clubs || {})) for (const id of data.roster || []) clubOf.set(String(id), club);
  for (const m of f?.roster || []) if (m?.id != null) clubOf.set(String(m.id), f.club); // the owner's roster wins over a stale registry row

  // --- club strengths. Canon: every franchise sees the same past, so nothing here reads the save (`quality` is no longer used).
  // Gym Leader clubs are the league's establishment and the eight starter clubs are at the bottom when the owner arrives; the
  // rest drift as the years go back (a dynasty fades, a doormat was not always one). The two fallen powers follow their own arc.
  const C = makeDraws(canon);
  // `quality` is still asked once for every club, and its answers ignored: asking is what settles each AI club's lineup (and so its
  // monsters' ratings) at creation, as it always has, so an archive generated later from the same franchise is the same archive.
  if (quality) for (const t of ALL_TEAMS) quality(t);
  // The clubs that were at the bottom in the canon past are layout 1's starters, whatever layout the franchise plays in, so every
  // franchise sees the same seasons before the last one; the franchise's own starter clubs are pinned to their records in year 0.
  const starters = new Set(LEAGUE_LAYOUTS[ARCHIVE_LAYOUT].starters.map((c) => c.name));
  const strengthOf = {}; let walk = Object.fromEntries(ALL_TEAMS.map((t) => [t, C.n(`q|${t}`) * 0.8 + (isGymClub(t) ? 0.55 : 0) - (starters.has(t) ? 1.1 : 0)]));
  for (let year = 0; year >= firstYear; year--) {
    strengthOf[year] = { ...walk };
    for (const [club, arc] of Object.entries(FALLEN_POWERS)) { const v = arc.rise[arc.rise.length - 1 + year]; if (v != null) strengthOf[year][club] = v; }
    walk = Object.fromEntries(ALL_TEAMS.map((t) => [t, walk[t] * 0.7 + C.n(`drift|${year}|${t}`) * 0.7]));
  }
  const fixed = Object.fromEntries(STARTER_CLUBS.map((c) => { const [w, l] = String(c.record).split('-').map(Number); return [c.name, { w, l }]; }).filter(([, r]) => r.w + r.l === REGULAR_GAMES));
  // The archive's seasons were played in the league's first divisions (layout 1): a franchise of a later layout arrives the year
  // the league realigned (owner 2026-11-24), so every franchise keeps the same past. Its own starter clubs (above, from the layout
  // in play) are the ones at the bottom, with exactly the records its club picker showed.
  const years = []; const playedIn = ACTIVE_LAYOUT; useLeagueLayout(ARCHIVE_LAYOUT);
  try { for (let year = firstYear; year <= 0; year++) years.push(playSeason(C, year, strengthOf[year], year === 0 ? fixed : null)); } finally { useLeagueLayout(playedIn); }
  const seasonOf = new Map(years.map((s) => [s.year, s]));
  const recordOf = (year, club) => seasonOf.get(year).standings.find((r) => r.club === club);
  const playoffGames = (year, club) => seasonOf.get(year).playoffs.filter((g) => g.home === club || g.away === club).length;

  // --- identities: every veteran in the league, and six retired legends who exist only here
  const people = [];
  for (const m of live) {
    const count = Math.min(seasons, Math.max(0, Math.floor(Number(m.yearsPro) || 0)));
    if (!count || !m.position) continue;
    const club = clubOf.get(String(m.id)); if (!club || !ALL_TEAMS.includes(club)) continue; // unsigned veterans have no club to place their past with
    const ageless = isAgeless(m); const debut = 1 - count;
    // Gym legendaries, rival signatures and the owner's cornerstones are one-club monsters; others may have changed clubs.
    const moves = [];
    if (!m.legendary && !m.signature && !m.cornerstone && count >= 3 && D.u(`move|${m.id}`) < 0.2 + 0.03 * count) {
      const at = debut + 1 + D.int(`move-year|${m.id}`, count - 1); const from = ALL_TEAMS.filter((t) => t !== club)[D.int(`move-club|${m.id}`, ALL_TEAMS.length - 1)];
      moves.push({ year: at, from, to: club });
      if (count >= 6 && at - debut >= 3 && D.u(`move2|${m.id}`) < 0.3) { const at0 = debut + 1 + D.int(`move2-year|${m.id}`, at - debut - 1); const from0 = ALL_TEAMS.filter((t) => t !== from)[D.int(`move2-club|${m.id}`, ALL_TEAMS.length - 1)]; moves.unshift({ year: at0, from: from0, to: from }); }
    }
    people.push({ id: m.id, name: m.name, species: m.species, type: m.type, position: m.position, club, debut, last: 0, moves, overall: safeOverall(m), ageNow: Number(m.age) || null, ageless, stage: m.stage || 0 });
  }
  const byStrength = (year) => ALL_TEAMS.slice().sort((a, b) => strengthOf[year][b] - strengthOf[year][a] || a.localeCompare(b));
  for (const c of canonCast(canon, seasons)) {
    // a legend made his name at one of the early era's strong clubs; a star at one of the strong clubs of his debut year
    const club = c.legend ? byStrength(firstYear)[C.int(`legend-club|${c.i}`, 6)] : byStrength(c.debut)[C.int(`star-club|${c.i}`, 8)];
    people.push({ id: c.id, name: c.name, species: c.species, type: c.type, position: c.position, club, debut: c.debut, last: c.last, moves: [], overall: 99, ageNow: null, ageAtDebut: c.ageAtDebut, ageless: false, legend: c.legend, canon: true, star: !c.legend,
      starTalent: c.legend ? null : 1.9 + C.n(`star-talent|${c.i}`) * 0.25, stage: c.stage });
  }

  // --- season by season: who started, what they did
  const posStats = {}; { const by = {}; for (const p of people) if (!p.canon) (by[p.position] ||= []).push(p.overall); for (const [pos, v] of Object.entries(by)) { const m = v.reduce((a, b) => a + b, 0) / v.length; posStats[pos] = { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1 }; } }
  const clubIn = (p, year) => { let c = p.club; for (let i = p.moves.length - 1; i >= 0; i--) if (year < p.moves[i].year) c = p.moves[i].from; return c; };
  const ageIn = (p, year) => (p.canon ? p.ageAtDebut + (year - p.debut) : p.ageNow == null ? null : p.ageless ? p.ageNow : p.ageNow - (1 - year));
  const books = new Map(people.map((p) => [p.id, []]));
  for (const season of years) {
    const year = season.year; const active = people.filter((p) => year >= p.debut && year <= p.last);
    const rated = active.map((p) => { const age = ageIn(p, year); const st = posStats[p.position] || { m: 50, sd: 8 }; const talent = p.legend ? 2.5 + C.n(`legend-form|${p.id}|${year}`) * 0.25 : p.star ? p.starTalent + C.n(`star-form|${p.id}|${year}`) * 0.25 : ((p.overall * maturity(year - p.debut, age)) - st.m) / st.sd; return { p, age, team: clubIn(p, year), talent }; });
    const groups = new Map(); for (const r of rated) { const k = `${r.team}|${r.p.position}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    for (const g of groups.values()) g.sort((a, b) => b.talent - a.talent || String(a.p.id).localeCompare(String(b.p.id)));
    for (const r of rated) {
      const rank = groups.get(`${r.team}|${r.p.position}`).indexOf(r); const key = `${r.p.id}|${year}`; const D = r.p.canon ? C : DS; // a legend's and a star's seasons are canon
      // The clubs of those years also had monsters who have since left; a weak or raw monster sat behind one of them.
      const starter = r.p.canon || (rank < STARTERS[r.p.position] && r.talent + D.n(`${key}|depth`) * 0.5 > -1.1);
      const rec = recordOf(year, r.team); const teamForm = ((rec.w / (rec.w + rec.l)) - 0.5) * 0.5;
      const z = clamp(r.talent * 0.62 + D.n(`${key}|form`) * 0.62 + teamForm, -2.4, 2.6);
      const missed = starter && D.u(`${key}|hurt`) < 0.14 ? 1 + D.int(`${key}|weeks`, 4) : 0;
      const reg = seasonLine(D, key, r.p.position, { starter, z, missed });
      const post = postLine(D, `${key}|post`, reg, playoffGames(year, r.team));
      books.get(r.p.id).push({ year, team: r.team, ...(r.age != null ? { age: r.age } : {}), reg, post });
    }
  }

  // --- awards: the game's own award rules on each season's league table
  for (const season of years) {
    const table = {}; const yearsPro = new Map();
    for (const p of people) { if (!p.canon) continue; const b = books.get(p.id).find((x) => x.year === season.year); if (!b) continue; /* the award races of the past are run among the canon players */ yearsPro.set(p.id, season.year - p.debut); (table[b.team] ||= {})[p.id] = { id: p.id, name: p.name, type: p.type, species: p.species, position: p.position, age: b.age ?? null, yearsPro: season.year - p.debut, team: b.team, ...b.reg }; }
    const records = Object.fromEntries(season.standings.map((r) => [r.club, { w: r.w, l: r.l, t: 0, pf: r.pf, pa: r.pa }]));
    let races = null; try { races = computeAwards({ table, records, n: 1 }); } catch { races = null; }
    for (const kind of ARCHIVE_AWARDS) {
      const w = races?.[kind]?.[0]; if (!w) continue;
      season.awards.league[kind] = { id: w.id, name: w.name, type: w.type, species: w.species, position: w.position, team: w.team, record: w.record, ...(w.why ? { why: w.why } : {}), ...(w.whyL ? { whyL: w.whyL } : {}) };
    }
  }

  const careers = {};
  for (const p of people) {
    const seasonsOf = books.get(p.id); if (!seasonsOf.length) continue;
    careers[p.id] = { id: p.id, name: p.name, species: p.species, type: p.type, position: p.position, ...(p.stage ? { stage: p.stage } : {}), club: p.club, debut: p.debut, ...(p.canon ? { retired: true, retiredYear: p.last } : {}), ...(p.moves.length ? { transfers: p.moves.map((x) => ({ ...x })) } : {}), seasons: seasonsOf };
  }
  return { version: ARCHIVE_VERSION, seed, from: firstYear, to: 0, seasons: years, careers, legends: people.filter((p) => p.legend).map((p) => p.id), stars: people.filter((p) => p.star).map((p) => p.id) };
}

// ------------------------------------------------------------ reading the archive (never writes)
/** The archive of a franchise, or null (a save from before the archive, a non-persistent franchise, or an unreadable draft format). */
export function leagueArchive(f) { const a = f?.preLeagueHistory; return a && a.version === ARCHIVE_VERSION && Array.isArray(a.seasons) && a.careers ? a : null; }
export function archiveCareer(f, id) { return id == null ? null : leagueArchive(f)?.careers?.[String(id)] || null; }
/** Career totals from the season books: sums, and maxima for the longest-play keys. */
export function careerTotals(career) { const reg = {}, post = {}; for (const b of career?.seasons || []) { addInto(reg, b.reg); addInto(post, b.post); } return { reg, post }; }
const memo = new WeakMap();
function cached(archive, key, build) { let m = memo.get(archive); if (!m) memo.set(archive, (m = {})); return (m[key] ||= build()); }
/** The six retired legends with their totals, honours and their club's titles in their years. */
export function archiveLegends(f) {
  const a = leagueArchive(f); if (!a) return [];
  return cached(a, 'legends', () => (a.legends || []).map((id) => a.careers[id]).filter(Boolean).map((c) => {
    const yearsPlayed = c.seasons.map((b) => b.year);
    return { id: c.id, name: c.name, species: c.species, type: c.type, stage: c.stage || 0, position: c.position, club: c.club, debut: c.debut, retiredYear: c.retiredYear, seasons: c.seasons.length, totals: careerTotals(c),
      awards: archiveAwardsFor(f, c.id), titles: a.seasons.filter((s) => yearsPlayed.includes(s.year) && s.champion === c.seasons.find((b) => b.year === s.year)?.team).map((s) => s.year) };
  }));
}
/** Every award a monster won before year 1: [{ year, award, team }]. */
export function archiveAwardsFor(f, id) {
  const a = leagueArchive(f); if (!a || id == null) return [];
  const out = []; for (const s of a.seasons) for (const [award, w] of Object.entries(s.awards?.league || {})) if (w && String(w.id) === String(id)) out.push({ year: s.year, award, team: w.team });
  return out;
}
/** Pre-franchise records: the best single season and the best career total for every record category. */
export function archiveRecords(f) {
  const a = leagueArchive(f); if (!a) return null;
  return cached(a, 'records', () => {
    const season = {}, career = {};
    for (const c of Object.values(a.careers)) {
      const who = { id: c.id, name: c.name, species: c.species, type: c.type, position: c.position, ...(c.stage ? { stage: c.stage } : {}) };
      for (const b of c.seasons) { const d = withDerived(b.reg); for (const cat of RECORD_CATEGORIES) { const v = d[cat.key]; if (!Number.isFinite(v) || v <= 0) continue; const cur = season[cat.id]; if (!cur || v > cur.value || (v === cur.value && (b.year < cur.year || (b.year === cur.year && String(c.id) < String(cur.id))))) season[cat.id] = { ...who, value: v, team: b.team, year: b.year, preLeague: true }; } }
      const t = withDerived(careerTotals(c).reg);
      for (const cat of RECORD_CATEGORIES) { const v = t[cat.key]; if (!Number.isFinite(v) || v <= 0) continue; const cur = career[cat.id]; if (!cur || v > cur.value || (v === cur.value && String(c.id) < String(cur.id))) career[cat.id] = { ...who, value: v, team: c.club, games: t.games || 0, seasons: c.seasons.length, from: c.seasons[0].year, to: c.seasons[c.seasons.length - 1].year, retired: !!c.retired, preLeague: true }; }
    }
    return { season, career };
  });
}

// ------------------------------------------------------------ validation
/** Every inconsistency in an archive, as readable strings ([] when it is sound). Used by the tests and tools/preleague-study.mjs. */
/** The archive is checked against the divisions its seasons were played in (layout 1, see generateLeagueArchive). */
export function validateLeagueArchive(archive, opts = {}) {
  const before = ACTIVE_LAYOUT; useLeagueLayout(ARCHIVE_LAYOUT);
  try { return validateArchive(archive, opts); } finally { useLeagueLayout(before); }
}
function validateArchive(archive, { live = null } = {}) {
  const errors = []; const say = (s) => errors.push(s);
  if (!archive || archive.version !== ARCHIVE_VERSION) return [`Not a version-${ARCHIVE_VERSION} archive`];
  const all = archive.seasons || []; const byYear = new Map(all.map((s) => [s.year, s]));
  if (byYear.size !== all.length) say('Duplicate historical season');
  if (all.some((s, i) => s.year !== i + 1 - all.length || Object.is(s.year, -0))) say('Invalid season chronology');
  if (archive.from !== (all[0]?.year ?? null) || archive.to !== 0) say('Archive span does not match its seasons');
  for (const s of all) {
    const Y = s.year; const rows = s.standings || [];
    if (rows.length !== ALL_TEAMS.length || new Set(rows.map((t) => t.club)).size !== ALL_TEAMS.length || rows.some((t) => !ALL_TEAMS.includes(t.club))) say(`Invalid standings clubs: ${Y}`);
    if (rows.some((t) => t.w + t.l !== REGULAR_GAMES)) say(`Invalid season length: ${Y}`);
    if (rows.reduce((n, t) => n + t.w, 0) !== rows.reduce((n, t) => n + t.l, 0)) say(`Unbalanced standings: ${Y}`);
    if (rows.reduce((n, t) => n + t.pf, 0) !== rows.reduce((n, t) => n + t.pa, 0)) say(`Unbalanced points: ${Y}`);
    const rec = Object.fromEntries(rows.map((t) => [t.club, t])); const pct = (c) => rec[c] ? rec[c].w / REGULAR_GAMES : -1;
    for (const [d, clubs] of Object.entries(DIVISIONS)) { const got = s.divisions?.[d] || []; if (got.length !== clubs.length || clubs.some((c) => !got.includes(c))) say(`Invalid division ${d}: ${Y}`); else if (got.some((c, i) => i && pct(c) > pct(got[i - 1]))) say(`Division ${d} out of order: ${Y}`); }
    for (const conf of CONFERENCE_NAMES) {
      const seeds = s.seeds?.[conf] || []; const divs = Object.keys(DIVISIONS).filter((d) => conferenceFor(d) === conf);
      if (seeds.length !== 4 || new Set(seeds).size !== 4 || seeds.some((c) => conferenceFor(divisionOf(c)) !== conf)) { say(`Invalid ${conf} seeds: ${Y}`); continue; }
      const champs = divs.map((d) => s.divisions?.[d]?.[0]); if (champs.some((c) => !seeds.includes(c))) say(`${conf} division champions are not the seeds: ${Y}`);
      if (seeds.some((c, i) => i && pct(c) > pct(seeds[i - 1]))) say(`${conf} seeds out of order: ${Y}`);
    }
    const po = s.playoffs || []; const round = (r) => po.filter((g) => g.round === r);
    if (po.length !== 7 || round(1).length !== 4 || round(2).length !== 2 || round(3).length !== 1) say(`Invalid playoff rounds: ${Y}`);
    else {
      const expect1 = legacyPlayoffRound(1, [], s.seeds); if (round(1).some((g, i) => g.home !== expect1[i].home || g.away !== expect1[i].away || g.tag !== expect1[i].tag)) say(`Semifinal pairings do not follow the seeds: ${Y}`);
      const expect2 = legacyPlayoffRound(2, po.filter((g) => g.round === 1), s.seeds); if (round(2).some((g, i) => g.home !== expect2[i].home || g.away !== expect2[i].away || g.tag !== expect2[i].tag)) say(`Conference final pairings are wrong: ${Y}`);
      const expect3 = legacyPlayoffRound(3, po.filter((g) => g.round <= 2), s.seeds)[0]; const fin = round(3)[0]; if (fin.home !== expect3.home || fin.away !== expect3.away || fin.tag !== 'Beast Bowl') say(`Beast Bowl pairing is wrong: ${Y}`);
      if (fin.winner !== s.champion) say(`Playoff winner mismatch: ${Y}`);
      if (s.runnerUp === s.champion || ![fin.home, fin.away].includes(s.runnerUp)) say(`Runner-up mismatch: ${Y}`);
      for (const g of po) { if (![g.home, g.away].includes(g.winner)) say(`Playoff winner did not play: ${Y}`); if ((g.winner === g.home) !== (g.homeScore > g.awayScore) || g.homeScore === g.awayScore) say(`Playoff score disagrees with its winner: ${Y}`); }
    }
    if (!rows.some((t) => t.club === s.champion)) say(`Champion absent: ${Y}`);
    for (const kind of Object.keys(s.awards?.league || {})) {
      const w = s.awards.league[kind]; const c = archive.careers?.[w.id]; const book = c?.seasons.find((b) => b.year === Y);
      if (!ARCHIVE_AWARDS.includes(kind)) say(`Award ${kind} cannot be proved for a past season: ${Y}`);
      if (!book || book.team !== w.team || c.name !== w.name || c.position !== w.position) say(`Award mismatch: ${Y} ${kind}`);
      else if (kind === 'opoy' && !OFFENSE_POSITIONS.has(c.position)) say(`OPOY is not an offensive monster: ${Y}`);
      else if (kind === 'dpoy' && !DEFENSE_POSITIONS.has(c.position)) say(`DPOY is not a defensive monster: ${Y}`);
      else if ((book.reg.games || 0) < Math.ceil(REGULAR_GAMES * 0.6)) say(`Award winner barely played: ${Y} ${kind}`);
    }
    for (const kind of ARCHIVE_AWARDS) if (!s.awards?.league?.[kind]) say(`Missing ${kind}: ${Y}`);
  }
  const names = new Map();
  for (const [key, c] of Object.entries(archive.careers || {})) {
    if (String(c.id) !== key) say(`Career key mismatch: ${key}`);
    const lower = String(c.name || '').toLowerCase(); if (names.has(lower)) say(`Duplicate name: ${c.name}`); names.set(lower, c.id);
    const ys = c.seasons.map((b) => b.year);
    if (!ys.length) { say(`Empty career: ${c.id}`); continue; }
    if (new Set(ys).size !== ys.length) say(`Duplicate career season: ${c.id}`);
    if (ys.some((y, i) => y !== ys[0] + i)) say(`Career gap: ${c.id}`);
    if (ys[0] !== c.debut) say(`Debut mismatch: ${c.id}`);
    if (c.retired ? ys.at(-1) !== c.retiredYear : ys.at(-1) !== 0) say(`Career end mismatch: ${c.id}`);
    if (c.seasons.at(-1).team !== c.club) say(`Current club mismatch: ${c.id}`);
    if (!!c.retired !== isArchiveLegendId(c.id) || !!c.retired !== [...(archive.legends || []), ...(archive.stars || [])].includes(c.id)) say(`Legend flag mismatch: ${c.id}`);
    let club = c.seasons[0].team; const moves = (c.transfers || []).slice();
    for (const b of c.seasons) {
      if (!ALL_TEAMS.includes(b.team)) say(`Unknown club: ${c.id}`);
      if (!byYear.has(b.year)) say(`Unknown year: ${c.id} ${b.year}`);
      if (b.team !== club) { const mv = moves.shift(); if (!mv || mv.year !== b.year || mv.from !== club || mv.to !== b.team) say(`Unrecorded transfer: ${c.id} ${b.year}`); club = b.team; }
      for (const e of lineProblems(b.reg, c.position)) say(`${c.id} ${b.year}: ${e}`);
      for (const e of lineProblems(b.post, c.position)) say(`${c.id} ${b.year} playoffs: ${e}`);
      const played = (byYear.get(b.year)?.playoffs || []).filter((g) => g.home === b.team || g.away === b.team).length;
      if ((b.post?.games || 0) > played) say(`${c.id} ${b.year}: more playoff games than his club played`);
      if ((b.reg.games || 0) > REGULAR_GAMES) say(`${c.id} ${b.year}: more games than the season had`);
    }
    if (moves.length) say(`Transfer without a season: ${c.id}`);
    const ages = c.seasons.map((b) => b.age).filter((x) => x != null); if (ages.some((x, i) => i && x !== ages[i - 1] && x !== ages[i - 1] + 1)) say(`Age sequence: ${c.id}`);
  }
  if ((archive.legends || []).length !== ARCHIVE_LEGENDS || new Set(archive.legends).size !== ARCHIVE_LEGENDS) say('Wrong number of retired legends');
  if (archive.stars) { // an archive written before canon awards (no stars) keeps its own award winners
    if (archive.stars.length !== ARCHIVE_STARS.length || new Set(archive.stars).size !== ARCHIVE_STARS.length) say('Wrong number of retired stars');
    const cast = new Set([...(archive.legends || []), ...archive.stars]);
    for (const s of all) for (const [kind, w] of Object.entries(s.awards?.league || {})) if (!cast.has(w.id)) say(`Award winner is not a canon player: ${s.year} ${kind}`);
  }
  if (live) {
    for (const m of live) {
      const c = archive.careers?.[m.id]; const want = Math.min(all.length, Math.max(0, Math.floor(m.yearsPro || 0)));
      if (!want && c) say(`Rookie with a fabricated career: ${m.id}`);
      if (c && (c.seasons.length !== want || c.name !== m.name || c.position !== m.position || c.species !== m.species)) say(`Career does not match the monster: ${m.id}`);
      if (isArchiveLegendId(m.id)) say(`A retired legend is a live monster: ${m.id}`);
    }
  }
  return errors;
}
/** Arithmetic a statistics line must keep. */
export function lineProblems(l, position = null) {
  const p = []; if (!l || !Object.keys(l).length) return p;
  for (const [k, v] of Object.entries(l)) if (!Number.isInteger(v) || (v < 0 && !['rushYds', 'recYds', 'passYds'].includes(k))) p.push(`${k} is ${v}`);
  const le = (a, b) => { if ((l[a] || 0) > (l[b] || 0)) p.push(`${a} ${l[a]} > ${b} ${l[b] || 0}`); };
  le('comp', 'att'); le('rec', 'targets'); le('fgm', 'fga'); le('xpm', 'xpa'); le('starts', 'games'); le('recAllowed', 'covTargets'); le('passTd', 'comp'); le('recTd', 'rec'); le('rushTd', 'rush'); le('intThrown', 'att');
  if ((l.blocksLost || 0) > (l.pbSnaps || 0) + (l.rbSnaps || 0)) p.push('blocksLost exceeds block snaps');
  if (withDerived(l).tacklesTotal !== (l.tackles || 0) + (l.assists || 0)) p.push('tackles total');
  if ('tacklesTotal' in l || 'kickPts' in l || 'tacklesSolo' in l) p.push('stores a derived or unknown key');
  if (position === 'K' && (l.att || l.rush || l.tackles)) p.push('kicker with scrimmage statistics');
  if (position && OFFENSE_POSITIONS.has(position) && (l.sacks || l.int || l.covTargets)) p.push('offensive monster with defensive statistics');
  if (position && DEFENSE_POSITIONS.has(position) && (l.att || l.targets || l.fga)) p.push('defensive monster with offensive statistics');
  return p;
}
