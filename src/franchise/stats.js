// Player statistics (GDD §16): one accounting for played and simulated games,
// regular season and playoffs kept apart, game logs, season archives and
// careers for the player's monsters, league tables for everyone.
//
// A "line" is a plain object of counting stats keyed by STAT keys (the same
// keys the sim writes into state.stats[side].players[slot]). Rates are never
// stored; derive() computes them from totals so a season percentage is the
// sum of the games, not the average of game percentages.

import { OFFENSE_BASE, DEFENSE_BASE } from '../data/personnel.js';
import { TEAM_META } from '../data/league.js';

export const STATS_VERSION = 2;

/** Keys that are a maximum (longest play), not a sum. */
export const MAX_KEYS = new Set(['longPass', 'longRec', 'longRush', 'fgLong']);

/** Human labels for every counting key the sim records. */
export const STAT_LABEL = Object.freeze({
  games: 'GP', starts: 'GS', snapsOff: 'Off snaps', snapsDef: 'Def snaps',
  att: 'Att', comp: 'Comp', passYds: 'Pass yds', passTd: 'Pass TD', intThrown: 'INT', sacked: 'Sacked', sackYds: 'Sack yds', passFd: 'Pass 1st', longPass: 'Long', pressured: 'Pressured',
  rush: 'Car', rushYds: 'Rush yds', rushTd: 'Rush TD', rushFd: 'Rush 1st', longRush: 'Long',
  targets: 'Tgt', rec: 'Rec', recYds: 'Rec yds', recTd: 'Rec TD', recFd: 'Rec 1st', longRec: 'Long', yac: 'YAC', drops: 'Drops',
  td: 'TD', fum: 'Fum', fumLost: 'Lost', twoPt: '2-pt', twoPtAtt: '2-pt att',
  pbSnaps: 'Pass blk', rbSnaps: 'Run blk', blocksLost: 'Beaten', sacksAllowed: 'Sacks alw', pressuresAllowed: 'Press alw',
  tackles: 'Solo', assists: 'Ast', tfl: 'TFL', sacks: 'Sacks', pressures: 'Press', ff: 'FF', fr: 'FR', pd: 'PD', int: 'INT', defTd: 'Def TD',
  covTargets: 'Tgt vs', recAllowed: 'Rec alw', ydsAllowed: 'Yds alw', tdAllowed: 'TD alw',
  fga: 'FGA', fgm: 'FGM', fgLong: 'Long', xpa: 'XPA', xpm: 'XPM', fg0a: '<30 A', fg0m: '<30 M', fg30a: '30s A', fg30m: '30s M', fg40a: '40s A', fg40m: '40s M', fg50a: '50+ A', fg50m: '50+ M',
  jukes: 'Jukes', broken: 'Broken tkl', sheds: 'Sheds', abilities: 'Abilities', abilityPlays: 'Ability plays', abilityImpact: 'Ability impact', traitPlays: 'Trait plays',
});

export const OFFENSE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'OL']);
export const DEFENSE_POSITIONS = new Set(['DL', 'LB', 'CB', 'S']);
export const sideOf = (position) => (OFFENSE_POSITIONS.has(position) ? 'offense' : DEFENSE_POSITIONS.has(position) ? 'defense' : 'special');

/** Default columns per position: [key or derived key, label]. Other groups are reachable from the card. */
export const POSITION_COLUMNS = Object.freeze({
  QB: [['games', 'GP'], ['comp', 'Comp'], ['att', 'Att'], ['compPct', 'Cmp%'], ['passYds', 'Yds'], ['ypa', 'Y/A'], ['passTd', 'TD'], ['intThrown', 'INT'], ['rating', 'Rtg'], ['sacked', 'Sck'], ['rushYds', 'Rush'], ['rushTd', 'RTD'], ['fumLost', 'FL']],
  RB: [['games', 'GP'], ['rush', 'Car'], ['rushYds', 'Yds'], ['ypc', 'Y/C'], ['rushTd', 'TD'], ['longRush', 'Lng'], ['targets', 'Tgt'], ['rec', 'Rec'], ['recYds', 'RecY'], ['recTd', 'RTD'], ['scrimmage', 'Scrim'], ['touches', 'Tch'], ['fumLost', 'FL']],
  WR: [['games', 'GP'], ['targets', 'Tgt'], ['rec', 'Rec'], ['catchPct', 'Ctch%'], ['recYds', 'Yds'], ['ypr', 'Y/R'], ['recTd', 'TD'], ['longRec', 'Lng'], ['yac', 'YAC'], ['recFd', '1st'], ['drops', 'Drp'], ['rushYds', 'Rush'], ['fumLost', 'FL']],
  TE: [['games', 'GP'], ['targets', 'Tgt'], ['rec', 'Rec'], ['catchPct', 'Ctch%'], ['recYds', 'Yds'], ['ypr', 'Y/R'], ['recTd', 'TD'], ['yac', 'YAC'], ['drops', 'Drp'], ['pbSnaps', 'PBlk'], ['rbSnaps', 'RBlk'], ['blocksLost', 'Btn'], ['fumLost', 'FL']],
  OL: [['games', 'GP'], ['starts', 'GS'], ['snapsOff', 'Snaps'], ['pbSnaps', 'PBlk'], ['rbSnaps', 'RBlk'], ['blocksLost', 'Btn'], ['blockWinPct', 'Win%'], ['sacksAllowed', 'SckA'], ['pressuresAllowed', 'PrsA']],
  DL: [['games', 'GP'], ['tackles', 'Solo'], ['assists', 'Ast'], ['tacklesTotal', 'Tot'], ['tfl', 'TFL'], ['sacks', 'Sck'], ['pressures', 'Prs'], ['ff', 'FF'], ['fr', 'FR'], ['pd', 'PD'], ['int', 'INT'], ['defTd', 'TD']],
  LB: [['games', 'GP'], ['tackles', 'Solo'], ['assists', 'Ast'], ['tacklesTotal', 'Tot'], ['tfl', 'TFL'], ['sacks', 'Sck'], ['pressures', 'Prs'], ['ff', 'FF'], ['pd', 'PD'], ['int', 'INT'], ['covTargets', 'TgtV'], ['ydsAllowed', 'YdsA'], ['defTd', 'TD']],
  CB: [['games', 'GP'], ['covTargets', 'Tgt'], ['recAllowed', 'RecA'], ['ydsAllowed', 'YdsA'], ['ydsPerTarget', 'Y/Tgt'], ['tdAllowed', 'TDA'], ['pd', 'PD'], ['int', 'INT'], ['tacklesTotal', 'Tkl'], ['tfl', 'TFL'], ['ff', 'FF'], ['defTd', 'TD']],
  S: [['games', 'GP'], ['covTargets', 'Tgt'], ['recAllowed', 'RecA'], ['ydsAllowed', 'YdsA'], ['ydsPerTarget', 'Y/Tgt'], ['tdAllowed', 'TDA'], ['pd', 'PD'], ['int', 'INT'], ['tacklesTotal', 'Tkl'], ['tfl', 'TFL'], ['sacks', 'Sck'], ['ff', 'FF'], ['defTd', 'TD']],
  K: [['games', 'GP'], ['fgm', 'FGM'], ['fga', 'FGA'], ['fgPct', 'FG%'], ['fgLong', 'Lng'], ['xpm', 'XPM'], ['xpa', 'XPA'], ['kickPts', 'Pts'], ['fg40m', '40s'], ['fg50m', '50+']],
});

/** Stat groups a monster with several roles can switch to. */
export const STAT_GROUPS = Object.freeze({
  passing: ['QB'], rushing: ['RB'], receiving: ['WR'], blocking: ['OL'], pass_rush: ['DL'], coverage: ['CB'], kicking: ['K'],
});
export const GROUP_LABEL = Object.freeze({ passing: 'Passing', rushing: 'Rushing', receiving: 'Receiving', blocking: 'Blocking', pass_rush: 'Defense', coverage: 'Coverage', kicking: 'Kicking' });
/** Which groups a line has anything in. */
export function groupsWithData(line) {
  const has = (...ks) => ks.some((k) => (line?.[k] || 0) > 0);
  const out = [];
  if (has('att', 'sacked')) out.push('passing');
  if (has('rush')) out.push('rushing');
  if (has('targets', 'rec')) out.push('receiving');
  if (has('pbSnaps', 'rbSnaps')) out.push('blocking');
  if (has('tackles', 'assists', 'sacks', 'pressures', 'tfl', 'int', 'ff')) out.push('pass_rush');
  if (has('covTargets')) out.push('coverage');
  if (has('fga', 'xpa')) out.push('kicking');
  return out;
}

export function emptyLine() { return {}; }

/** Sum `line` into `target` (maxima for the long-play keys). Returns target. */
export function addInto(target, line) {
  for (const [k, v] of Object.entries(line || {})) {
    if (typeof v !== 'number' || !v) continue;
    if (MAX_KEYS.has(k)) { if ((target[k] || 0) < v) target[k] = v; } else target[k] = (target[k] || 0) + v;
  }
  return target;
}

const ratio = (a, b, digits = 1) => (b ? +(a / b).toFixed(digits) : null);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

/** NFL passer rating from totals. null with no attempts. */
export function passerRating(l) {
  const att = l.att || 0; if (!att) return null;
  const c = (v) => Math.max(0, Math.min(2.375, v));
  const a = c(((l.comp || 0) / att - 0.3) * 5), b = c(((l.passYds || 0) / att - 3) * 0.25), t = c(((l.passTd || 0) / att) * 20), i = c(2.375 - ((l.intThrown || 0) / att) * 25);
  return Math.round(((a + b + t + i) / 6) * 1000) / 10;
}

/** Derived values from a line. Every value is null when its denominator is zero, never a misleading 0. */
export function derive(l) {
  l = l || {};
  const g = l.games || 0;
  const tacklesTotal = (l.tackles || 0) + (l.assists || 0);
  const blocks = (l.pbSnaps || 0) + (l.rbSnaps || 0);
  return {
    compPct: pct(l.comp || 0, l.att), ypa: ratio(l.passYds || 0, l.att), passYpg: ratio(l.passYds || 0, g), rating: passerRating(l), sackRateTaken: pct(l.sacked || 0, (l.att || 0) + (l.sacked || 0)),
    ypc: ratio(l.rushYds || 0, l.rush), rushYpg: ratio(l.rushYds || 0, g),
    ypr: ratio(l.recYds || 0, l.rec), catchPct: pct(l.rec || 0, l.targets), recYpg: ratio(l.recYds || 0, g), yacPerRec: ratio(l.yac || 0, l.rec),
    scrimmage: (l.rushYds || 0) + (l.recYds || 0), touches: (l.rush || 0) + (l.rec || 0), tdTotal: (l.rushTd || 0) + (l.recTd || 0) + (l.defTd || 0),
    blockWinPct: blocks ? Math.round((1 - Math.min(1, (l.blocksLost || 0) / blocks)) * 1000) / 10 : null, pressureRateAllowed: pct(l.pressuresAllowed || 0, l.pbSnaps),
    tacklesTotal, tacklesPg: ratio(tacklesTotal, g), pressureRate: pct(l.pressures || 0, l.snapsDef), takeaways: (l.int || 0) + (l.fr || 0),
    ydsPerTarget: ratio(l.ydsAllowed || 0, l.covTargets), compPctAllowed: pct(l.recAllowed || 0, l.covTargets),
    fgPct: pct(l.fgm || 0, l.fga), xpPct: pct(l.xpm || 0, l.xpa), kickPts: (l.fgm || 0) * 3 + (l.xpm || 0),
  };
}

/** A line plus its derived values, for display and scoring. */
export function withDerived(l) { return { ...(l || {}), ...derive(l) }; }

// ------------------------------------------------------------ monster careers
/** m.stats v2 shape; migrates the legacy {games,yards,td,...} and m.season objects in place. */
export function ensureStats(m, year = null) {
  let s = m.stats;
  if (!s || s.v !== STATS_VERSION) {
    const legacy = s && typeof s.games === 'number' ? s : null;
    const career = { reg: {}, post: {} };
    if (legacy) { const L = { games: legacy.games, td: legacy.td, rec: legacy.catches, tackles: legacy.tackles, sacks: legacy.sacks, int: legacy.int }; addInto(career.reg, L); }
    const season = { year: year ?? m.season?.year ?? null, reg: {}, post: {} };
    if (m.season && typeof m.season.games === 'number') addInto(season.reg, { games: m.season.games, rushYds: m.season.rushYds, recYds: m.season.recYds, passYds: m.season.passYds, td: m.season.td, tackles: m.season.tackles, sacks: m.season.sacks, int: m.season.int, rec: m.season.catches });
    s = m.stats = { v: STATS_VERSION, career, season, log: [], seasons: [] };
    delete m.season;
  }
  if (year != null && s.season.year == null) s.season.year = year;
  return s;
}
// ------------------------------------------------------------ archived game lines (GDD §41.1)
/**
 * The box-score keys a past season keeps for each game (snap counts, ability bookkeeping, first downs and other detail stay in
 * the season totals only). Short aliases keep a game to about 50 bytes. A packed game is
 * [week, opponent abbreviation, flags (1 home, 2 won, 4 playoff), score, line].
 */
export const GAME_KEYS = Object.freeze({ att: 'a', comp: 'c', passYds: 'py', passTd: 'pt', intThrown: 'pi', sacked: 'sk', rush: 'r', rushYds: 'ry', rushTd: 'rt', targets: 'tg', rec: 'rc', recYds: 'cy', recTd: 'ct', fumLost: 'fl', tackles: 'tk', assists: 'as', tfl: 'tf', sacks: 'sa', pressures: 'pr', int: 'in', pd: 'pd', ff: 'ff', fr: 'fr', defTd: 'dt', covTargets: 'cv', recAllowed: 'ra', ydsAllowed: 'ya', tdAllowed: 'ta', pbSnaps: 'pb', rbSnaps: 'rb', blocksLost: 'bl', sacksAllowed: 'sx', fga: 'ga', fgm: 'gm', fgLong: 'gl', xpa: 'xa', xpm: 'xm', abilityPlays: 'ap' });
const ALIAS_KEY = Object.fromEntries(Object.entries(GAME_KEYS).map(([k, a]) => [a, k]));
const ABBR_TEAM = Object.fromEntries(Object.entries(TEAM_META).map(([t, m]) => [m.abbr, t]));
export function packGame(g) {
  const line = {}; for (const [k, a] of Object.entries(GAME_KEYS)) { const v = g.line?.[k]; if (typeof v === 'number' && v) line[a] = v; }
  return [g.week, TEAM_META[g.opp]?.abbr || g.opp || '', (g.home ? 1 : 0) | (g.won ? 2 : 0) | (g.playoff ? 4 : 0), g.score || '', line];
}
export function unpackGame(p, year = null, team = null) {
  const [week, opp, flags, score, packed] = p; const line = {}; for (const [a, v] of Object.entries(packed || {})) line[ALIAS_KEY[a] || a] = v;
  return { year, week, opp: ABBR_TEAM[opp] || opp, home: !!(flags & 1), won: !!(flags & 2), playoff: !!(flags & 4), score, line, team, archived: true };
}
/** A monster's game lines for a season, newest last: the current log, or the archived season's packed games (null when not kept). */
export function seasonGames(m, year) {
  const s = m?.stats; if (!s) return null;
  if (s.season?.year === year && s.log?.length && s.log.every((g) => g.year === year)) return s.log.map((g) => ({ ...g }));
  const b = (s.seasons || []).find((x) => x.year === year);
  return b?.g ? b.g.map((p) => unpackGame(p, year, b.team || null)) : null;
}

/** Close the monster's season book: archive totals under its year (and, from v39.1, its games compactly) and start a fresh one. */
export function rolloverMonster(m, { year, team }) {
  const s = ensureStats(m, year);
  if (s.season.year != null && s.season.year !== year) {
    const games = (s.log || []).filter((g) => g.year === s.season.year);
    if (Object.keys(s.season.reg).length || Object.keys(s.season.post).length) s.seasons.push({ year: s.season.year, team, reg: s.season.reg, post: s.season.post, ...(games.length ? { g: games.map(packGame) } : {}) });
    s.season = { year, reg: {}, post: {} }; s.log = [];
  } else if (s.season.year == null) s.season.year = year;
  return s;
}

/**
 * Totals for a monster. `scope`: 'season' (the current one) | 'career' | a year (the current year or an archived one).
 * `bucket`: 'reg' | 'post' | 'all' (regular season and playoffs added together; the season × game-type filters of the
 * statistics screens, 2026-10-22).
 */
export function monsterLine(m, scope = 'season', bucket = 'reg') {
  const s = ensureStats(m);
  const book = scope === 'career' ? s.career : scope === 'season' || scope === s.season.year ? s.season : s.seasons.find((x) => x.year === scope);
  if (!book) return {};
  if (bucket === 'all') return addInto(addInto({}, book.reg), book.post);
  return book[bucket] || {};
}
/** The seasons a monster has stats for, newest first: the current season (even with no games yet) and every archived one. */
export function monsterSeasons(m, currentYear = null) {
  const s = ensureStats(m, currentYear);
  const years = s.seasons.map((x) => x.year); const cur = s.season.year ?? currentYear;
  return [...(cur != null ? [cur] : []), ...years.filter((y) => y !== cur)].sort((a, b) => b - a);
}
/** A league table with regular season and playoffs added together (rows keyed by player id, as the tables are). */
export function combinedTable(reg, post) {
  const out = {};
  for (const table of [reg, post]) for (const [team, T] of Object.entries(table || {})) { const O = (out[team] ||= {}); for (const [id, row] of Object.entries(T)) { const { id: _i, name, type, species, position, age, yearsPro, team: tm, ...nums } = row; const r = (O[id] ||= { id: row.id, name, type, species, position, age, yearsPro, team: tm }); addInto(r, nums); /* identity once, numbers added once: copying the row here counted the regular season twice */ } }
  return out;
}
/** The league tables of a season: the current one, or an archived one from the history (ARCHIVE_SEASONS kept). */
export function seasonTables(f, year) {
  if (year == null || year === f.season?.year) return { reg: f.season?.leagueStats || {}, post: f.season?.playoffStats || {}, year: f.season?.year, current: true };
  const h = (f.history || []).find((x) => x.year === year);
  return { reg: h?.leagueStats || {}, post: h?.playoffStats || {}, year, current: false, archived: !!(h?.leagueStats) };
}
/** Seasons with league tables: the current one plus archived ones, newest first. */
export function leagueSeasons(f) {
  const years = (f.history || []).filter((h) => h.leagueStats).map((h) => h.year);
  return [...new Set([f.season?.year, ...years].filter((y) => y != null))].sort((a, b) => b - a);
}
/** How many past seasons keep their full league tables in the save (older entries keep records, awards and leaders snapshots). */
export const ARCHIVE_SEASONS = 8;
export function archiveSeasonTables(f) {
  const h = f.history?.[f.history.length - 1]; if (!h || h.year !== f.season?.year) return;
  h.leagueStats = f.season.leagueStats || {}; h.playoffStats = f.season.playoffStats || {};
  const withTables = f.history.filter((x) => x.leagueStats).sort((a, b) => b.year - a.year);
  for (const old of withTables.slice(ARCHIVE_SEASONS)) { delete old.leagueStats; delete old.playoffStats; }
}

// ------------------------------------------------------------ recording a game
const BASE_STARTERS = new Set([...OFFENSE_BASE, ...DEFENSE_BASE, 'K']);

/**
 * Record one finished game into the franchise: league tables (regular or
 * playoff), and the player's monsters' logs, season and career totals.
 * Idempotent per game; returns false if that game was already recorded.
 */
export function recordGame(f, state, teams, { playoff = false, week = f.season.week, year = f.season.year, playerClub = f.club } = {}) {
  const key = `${year}|${week}|${teams.home.name}|${teams.away.name}|${playoff ? 'p' : 'r'}`;
  const done = (f.season.recorded ||= []);
  if (done.includes(key)) return false;
  done.push(key);
  const bucket = playoff ? 'post' : 'reg';
  const table = playoff ? (f.season.playoffStats ||= {}) : (f.season.leagueStats ||= {});
  updateGameRecords(f, state, teams, { year, week, playoff });
  for (const side of ['home', 'away']) {
    const team = teams[side]; const opp = teams[side === 'home' ? 'away' : 'home'];
    const won = state.winner ? state.winner === side : state.score[side] > state.score[side === 'home' ? 'away' : 'home'];
    const byId = {};
    for (const [slot, line] of Object.entries(state.stats[side].players || {})) {
      const p = team.offense?.[slot] || team.defense?.[slot] || (slot === 'K' ? team.kicker : null); if (!p?.id) continue;
      const e = (byId[p.id] ||= { p, line: {}, start: false });
      addInto(e.line, line); if (BASE_STARTERS.has(slot)) e.start = true;
    }
    const T = (table[team.name] ||= {});
    for (const [id, e] of Object.entries(byId)) {
      const played = Object.values(e.line).some((v) => v > 0); if (!played) continue;
      const src = team.roster?.find?.((m) => m.id === id);
      const row = (T[id] ||= { id, name: e.p.name, type: e.p.type, species: e.p.species, position: e.p.position, age: e.p.age, yearsPro: src?.yearsPro ?? e.p.yearsPro ?? null, team: team.name, games: 0, starts: 0 });
      row.games += 1; if (e.start) row.starts += 1; addInto(row, e.line);
      if (team.name === playerClub && src) {
        const s = rolloverMonster(src, { year, team: playerClub });
        const gl = { games: 1, starts: e.start ? 1 : 0, ...e.line };
        addInto(s.season[bucket], gl); addInto(s.career[bucket], gl);
        s.log.push({ year, week, opp: opp.name, home: side === 'home', playoff, won, score: `${state.score[side]}-${state.score[side === 'home' ? 'away' : 'home']}`, line: e.line });
        if (s.log.length > 20) s.log.shift();
      }
    }
  }
  return true;
}

/** Flatten a league table into rows (with team) for leaders and awards. */
export function leagueRows(table) { return Object.values(table || {}).flatMap((T) => Object.values(T)); }

/** League leaders: top n by a key or derived key, with a minimum opportunity for rates. */
export const LEADER_CATEGORIES = Object.freeze([
  { id: 'passYds', label: 'Passing yards', key: 'passYds' }, { id: 'passTd', label: 'Passing TD', key: 'passTd' }, { id: 'rating', label: 'Passer rating', key: 'rating', min: ['att', 10] },
  { id: 'rushYds', label: 'Rushing yards', key: 'rushYds' }, { id: 'rushTd', label: 'Rushing TD', key: 'rushTd' }, { id: 'ypc', label: 'Yards per carry', key: 'ypc', min: ['rush', 8] },
  { id: 'recYds', label: 'Receiving yards', key: 'recYds' }, { id: 'rec', label: 'Receptions', key: 'rec' }, { id: 'recTd', label: 'Receiving TD', key: 'recTd' },
  { id: 'scrimmage', label: 'Scrimmage yards', key: 'scrimmage' }, { id: 'tdTotal', label: 'Touchdowns', key: 'tdTotal' },
  { id: 'tacklesTotal', label: 'Tackles', key: 'tacklesTotal' }, { id: 'tfl', label: 'Tackles for loss', key: 'tfl' }, { id: 'sacks', label: 'Sacks', key: 'sacks' }, { id: 'pressures', label: 'Pressures', key: 'pressures' },
  { id: 'int', label: 'Interceptions', key: 'int' }, { id: 'pd', label: 'Passes defended', key: 'pd' }, { id: 'ff', label: 'Forced fumbles', key: 'ff' }, { id: 'ydsPerTarget', label: 'Yards allowed per target', key: 'ydsPerTarget', min: ['covTargets', 8], asc: true },
  { id: 'blockWinPct', label: 'Block win rate', key: 'blockWinPct', min: ['pbSnaps', 20] }, { id: 'kickPts', label: 'Kicking points', key: 'kickPts' }, { id: 'fgPct', label: 'Field goal %', key: 'fgPct', min: ['fga', 4] },
  { id: 'abilityPlays', label: 'Ability plays', key: 'abilityPlays' }, { id: 'abilityImpact', label: 'Ability impact', key: 'abilityImpact' },
]);
export function leaders(table, catId, { n = 10, teams = null } = {}) {
  const cat = LEADER_CATEGORIES.find((c) => c.id === catId); if (!cat) return [];
  return leagueRows(table).filter((r) => !teams || teams.includes(r.team)).map((r) => ({ ...r, ...derive(r) })).filter((r) => r[cat.key] != null && (!cat.min || (r[cat.min[0]] || 0) >= cat.min[1]) && (cat.asc || r[cat.key] > 0))
    .sort((a, b) => (cat.asc ? a[cat.key] - b[cat.key] : b[cat.key] - a[cat.key]) || (b.games || 0) - (a.games || 0) || a.name.localeCompare(b.name)).slice(0, n);
}

/** Season leaders snapshot for the history book (top 3 per category). */
export function leadersSnapshot(table) {
  const out = {};
  for (const c of LEADER_CATEGORIES) { const top = leaders(table, c.id, { n: 3 }).map((r) => ({ id: r.id, name: r.name, team: r.team, position: r.position, species: r.species, type: r.type, value: r[c.key] })); if (top.length) out[c.id] = top; }
  return out;
}

/** Short stat line for a row, position-aware (used by award sheets and leaders). */
export function statLine(r) {
  const d = withDerived(r); const b = [];
  if (d.att) b.push(`${d.comp || 0}/${d.att}, ${d.passYds || 0} yds, ${d.passTd || 0} TD, ${d.intThrown || 0} INT${d.rating != null ? `, ${d.rating} rtg` : ''}`);
  if (d.rush) b.push(`${d.rush} car, ${d.rushYds || 0} yds${d.rushTd ? `, ${d.rushTd} TD` : ''}`);
  if (d.rec || d.targets) b.push(`${d.rec || 0}/${d.targets || 0} rec, ${d.recYds || 0} yds${d.recTd ? `, ${d.recTd} TD` : ''}`);
  if (d.pbSnaps && !d.att && !d.rush && !d.rec) b.push(`${d.blockWinPct ?? '·'}% blocks won, ${d.sacksAllowed || 0} sacks allowed`);
  if (d.tacklesTotal) b.push(`${d.tacklesTotal} tkl${d.tfl ? `, ${d.tfl} TFL` : ''}`);
  if (d.sacks) b.push(`${d.sacks} sacks`); if (d.pressures) b.push(`${d.pressures} press`);
  if (d.int) b.push(`${d.int} INT`); if (d.pd) b.push(`${d.pd} PD`); if (d.ff) b.push(`${d.ff} FF`);
  if (d.covTargets) b.push(`${d.recAllowed || 0}/${d.covTargets} allowed, ${d.ydsAllowed || 0} yds`);
  if (d.fga || d.xpa) b.push(`${d.fgm || 0}/${d.fga || 0} FG, ${d.xpm || 0}/${d.xpa || 0} XP`);
  if (d.fumLost) b.push(`${d.fumLost} FL`);
  return b.join(' · ');
}

// ------------------------------------------------------------ records book (GDD §17.8)
export const RECORD_CATEGORIES = Object.freeze([
  { id: 'passYds', label: 'Passing yards', key: 'passYds' }, { id: 'passTd', label: 'Passing TD', key: 'passTd' }, { id: 'rushYds', label: 'Rushing yards', key: 'rushYds' }, { id: 'rushTd', label: 'Rushing TD', key: 'rushTd' },
  { id: 'recYds', label: 'Receiving yards', key: 'recYds' }, { id: 'rec', label: 'Receptions', key: 'rec' }, { id: 'recTd', label: 'Receiving TD', key: 'recTd' }, { id: 'tacklesTotal', label: 'Tackles', key: 'tacklesTotal' },
  { id: 'sacks', label: 'Sacks', key: 'sacks' }, { id: 'int', label: 'Interceptions', key: 'int' }, { id: 'pd', label: 'Passes defended', key: 'pd' }, { id: 'fgLong', label: 'Longest field goal', key: 'fgLong' },
]);
export const TEAM_RECORDS = Object.freeze([{ id: 'points', label: 'Points in a game' }, { id: 'margin', label: 'Margin of victory' }, { id: 'yards', label: 'Total yards in a game' }]);
export function ensureRecords(f) { return (f.records ||= { game: {}, season: {}, team: {} }); }
function better(cur, value) { return value > 0 && (!cur || value > cur.value); }
/**
 * The record that stood before (League News names it, GDD §39). Broken twice in one week (or season), it keeps the mark that
 * stood before the week, never a chain of older ones.
 */
function prevOf(cur, year, week = null) {
  if (!cur) return null;
  if (cur.year === year && (week == null || cur.week === week)) return cur.prev || null;
  const { prev, ...rest } = cur; return { value: rest.value, name: rest.name || null, team: rest.team || null, year: rest.year ?? null };
}
/** After a game: single-game player and team records. */
export function updateGameRecords(f, state, teams, { year, week, playoff }) {
  const R = ensureRecords(f);
  for (const side of ['home', 'away']) {
    const team = teams[side]; const opp = teams[side === 'home' ? 'away' : 'home'];
    const byId = {};
    for (const [slot, line] of Object.entries(state.stats[side].players || {})) { const p = team.offense?.[slot] || team.defense?.[slot] || (slot === 'K' ? team.kicker : null); if (!p?.id) continue; addInto((byId[p.id] ||= { p, line: {} }).line, line); }
    for (const { p, line } of Object.values(byId)) {
      const d = withDerived(line);
      for (const c of RECORD_CATEGORIES) { const v = d[c.key]; if (better(R.game[c.id], v)) R.game[c.id] = { value: v, id: p.id, name: p.name, position: p.position, species: p.species, type: p.type, team: team.name, opp: opp.name, year, week, playoff: !!playoff, prev: prevOf(R.game[c.id], year, week) }; }
    }
    const pts = state.score[side], margin = state.score[side] - state.score[side === 'home' ? 'away' : 'home'], yards = state.stats[side].yards || 0;
    const t = (id, v) => { if (better(R.team[id], v)) R.team[id] = { value: v, team: team.name, opp: opp.name, year, week, playoff: !!playoff, prev: prevOf(R.team[id], year, week), score: `${state.score[side]}-${state.score[side === 'home' ? 'away' : 'home']}` }; };
    t('points', pts); t('margin', margin); t('yards', yards);
  }
}
/** At season end: single-season records from the regular-season table. */
export function updateSeasonRecords(f, year = f.season.year) {
  const R = ensureRecords(f);
  for (const c of RECORD_CATEGORIES) { const top = leagueRows(f.season.leagueStats).map((r) => ({ ...r, ...derive(r) })).filter((r) => (r[c.key] || 0) > 0).sort((a, b) => b[c.key] - a[c.key])[0]; if (top && better(R.season[c.id], top[c.key])) R.season[c.id] = { value: top[c.key], id: top.id, name: top.name, position: top.position, species: top.species, type: top.type, team: top.team, year, prev: prevOf(R.season[c.id], year) }; }
  return R;
}
/** Career leaders among the owner's monsters (regular season), live. */
export function careerLeaders(roster, { n = 1 } = {}) {
  const out = {};
  for (const c of RECORD_CATEGORIES) { const rows = roster.map((m) => ({ m, d: withDerived(monsterLine(m, 'career', 'reg')) })).filter((x) => (x.d[c.key] || 0) > 0).sort((a, b) => b.d[c.key] - a.d[c.key]).slice(0, n); if (rows.length) out[c.id] = rows.map((x) => ({ value: x.d[c.key], name: x.m.name, position: x.m.position, species: x.m.species, type: x.m.type, id: x.m.id })); }
  return out;
}
