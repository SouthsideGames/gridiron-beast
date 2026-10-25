// Monster Career Presentation (GDD §40): the career profile every career view is drawn from. A summary (identity, clubs,
// seasons, position-relevant totals), the trophy case (honours grouped and counted), the timeline (Phase 1's careerTimeline,
// unchanged) with each event's link to the record behind it, and the presentation tier the career card uses.
//
// Everything here is DERIVED from records the game already keeps: m.stats (season books and the current season's game log),
// m.career (the Phase 1 timeline), m.history and m.drafted (club moves), f.history (awards, schedules, championships), the
// records book, and the league tables (for monsters the save keeps no career for). Nothing is stored and nothing is invented:
// a detail whose record is gone says so, and an event with nothing behind it is not a link. Reading a profile never writes
// the monster or the franchise.

import { careerTimeline, careerEvents, fullRecord } from './career.js';
import { withDerived, addInto, RECORD_CATEGORIES, statLine, seasonGames } from './stats.js';
import { findInLeague } from './league-registry.js';
import { AWARDS } from './awards.js';
import { monsterOverall, SPECIES_BY_ID } from '../data/monsters.js';
import { yearOf } from '../data/calendar.js';

export const PROFILE_VERSION = 1;

/** Position-relevant statistics, in order (the summary shows four, the card three). Keys are the sim's own (stats.js). */
export const FOCUS = Object.freeze({
  QB: [['passYds', 'Pass yards'], ['passTd', 'Pass TD'], ['intThrown', 'INT thrown'], ['compPct', 'Comp %']],
  RB: [['rushYds', 'Rush yards'], ['rushTd', 'Rush TD'], ['ypc', 'Yds / carry'], ['recYds', 'Rec yards']],
  WR: [['rec', 'Catches'], ['recYds', 'Rec yards'], ['recTd', 'Rec TD'], ['ypr', 'Yds / catch']],
  TE: [['rec', 'Catches'], ['recYds', 'Rec yards'], ['recTd', 'Rec TD'], ['blockWinPct', 'Blocks won %']],
  OL: [['starts', 'Starts'], ['blockWinPct', 'Blocks won %'], ['sacksAllowed', 'Sacks allowed'], ['pbSnaps', 'Pass blocks']],
  DL: [['tacklesTotal', 'Tackles'], ['sacks', 'Sacks'], ['tfl', 'Tackles for loss'], ['pressures', 'Pressures']],
  LB: [['tacklesTotal', 'Tackles'], ['sacks', 'Sacks'], ['int', 'Interceptions'], ['tfl', 'Tackles for loss']],
  CB: [['int', 'Interceptions'], ['pd', 'Passes defended'], ['tacklesTotal', 'Tackles'], ['compPctAllowed', 'Comp % allowed']],
  S: [['tacklesTotal', 'Tackles'], ['int', 'Interceptions'], ['pd', 'Passes defended'], ['ff', 'Forced fumbles']],
  K: [['fgm', 'Field goals'], ['fgPct', 'FG %'], ['fgLong', 'Longest FG'], ['kickPts', 'Points']],
});
const RATE_KEYS = new Set(['compPct', 'ypc', 'ypr', 'blockWinPct', 'compPctAllowed', 'fgPct']);
const PCT_KEYS = new Set(['compPct', 'blockWinPct', 'compPctAllowed', 'fgPct']); // shown with a % sign
/** A rate needs this much volume before it means anything (else it shows a dash). */
const RATE_MIN = { compPct: ['att', 10], ypc: ['rush', 8], ypr: ['rec', 5], blockWinPct: ['pbSnaps', 20], compPctAllowed: ['covTargets', 8], fgPct: ['fga', 3] };

/** Trophy kinds, most prestigious first. `award` expands to one shelf per award key. */
export const TROPHY_ORDER = Object.freeze(['hof', 'champion', 'mvp', 'opoy', 'dpoy', 'smoy', 'oroy', 'droy', 'record']);
export const TROPHY_META = Object.freeze({
  hof: { icon: '🏛', label: 'Hall of Fame', tier: 'legend' },
  champion: { icon: '🏆', label: 'Beast Bowl Champion', tier: 'gold' },
  mvp: { icon: '👑', label: AWARDS.mvp.label, short: 'MVP', tier: 'gold' },
  opoy: { icon: '🏅', label: AWARDS.opoy.label, short: 'OPOY', tier: 'gold' },
  dpoy: { icon: '🛡️', label: AWARDS.dpoy.label, short: 'DPOY', tier: 'gold' },
  smoy: { icon: '✨', label: AWARDS.smoy.label, short: 'SMOY', tier: 'silver' },
  oroy: { icon: '🌟', label: AWARDS.oroy.label, short: 'OROY', tier: 'silver' },
  droy: { icon: '🌟', label: AWARDS.droy.label, short: 'DROY', tier: 'silver' },
  record: { icon: '📜', label: 'League record', tier: 'silver' },
});

/** A legend's career split into regular season and playoffs: from his season books when he has them (the stub's `career` is
 * one combined total), else the combined total as the regular season (stubs written without season books). */
function stubCareer(stub) {
  const books = stub.seasons || []; if (!books.length) return { reg: stub.career || {}, post: {} };
  const reg = {}, post = {}; for (const b of books) { addInto(reg, b.reg || {}); addInto(post, b.post || {}); }
  return { reg, post };
}
/** A departed, decorated AI monster's legend stub (GDD §42.6 exits) read as a monster: career totals, honours, his last club. */
function fromStub(stub) { return { id: stub.id, name: stub.name, species: stub.species, position: stub.position, type: stub.type, stage: stub.stage || 0, age: stub.age, level: null, attributes: null, potential: null, stats: { v: 2, career: stubCareer(stub), season: { year: null, reg: {}, post: {} }, log: [], seasons: stub.seasons || [] }, career: { v: 1, ev: stub.ev || [] }, history: stub.history?.length ? stub.history : stub.lastClub ? [{ club: stub.lastClub, from: null, to: stub.left ?? null, reason: 'left' }] : [], legend: true, retired: stub.left ?? null }; }
/** Every place a monster can be found in this franchise, by stable id (never by name). */
export function findMonster(f, id) {
  if (!f || id == null) return null;
  const hit = (m, where) => (m && m.id === id ? { m, where } : null);
  for (const m of f.roster || []) { const h = hit(m, 'roster'); if (h) return h; }
  for (const list of Object.values(f.pool || {})) for (const m of list || []) { const h = hit(m, 'pool'); if (h) return h; }
  for (const m of f.offseason?.market || []) { const h = hit(m, 'market'); if (h) return h; }
  for (const m of f.draft?.class || []) { if (m.id !== id) continue; const pk = (f.draft.picks || []).find((p) => p.id === id && !p.passed); return pk ? { m, where: 'drafted', team: pk.team } : { m, where: 'draft' }; }
  { const hit = findInLeague(f, id); if (hit) return hit.where === 'league' ? { m: hit.m, where: 'league', team: hit.club } : hit.where === 'waivers' ? { m: hit.m, where: 'waivers' } : { m: fromStub(hit.m), where: 'legend', team: hit.club, stub: true }; } // persistent AI rosters (GDD §42.6)
  for (const lists of Object.values(f.draftResults || {})) for (const [team, list] of Object.entries(lists || {})) for (const m of list || []) { if (m.id === id) return { m, where: 'drafted', team }; }
  return null;
}

/** League-table rows for an id (monsters the save keeps no career for: other clubs' players). Newest season first. */
export function leagueRowsFor(f, id) {
  const out = [];
  const scan = (year, reg, post) => { for (const [bucket, table] of [['reg', reg], ['post', post]]) for (const T of Object.values(table || {})) { const r = T?.[id]; if (r) { let e = out.find((x) => x.year === year); if (!e) { e = { year, team: r.team, row: r, reg: {}, post: {} }; out.push(e); } addInto(e[bucket], strip(r)); } } };
  if (f?.season) scan(f.season.year, f.season.leagueStats, f.season.playoffStats);
  for (const h of f?.history || []) if (h.leagueStats) scan(h.year, h.leagueStats, h.playoffStats);
  return out.sort((a, b) => b.year - a.year);
}
const strip = (r) => { const o = {}; for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && !['age', 'yearsPro'].includes(k)) o[k] = v; return o; };

const sumLines = (...ls) => { const o = {}; for (const l of ls) addInto(o, l || {}); return o; };
/** Season books on record, oldest first: [{ year, team, reg, post }] (the current season included when it has games). */
export function seasonBooks(m) {
  const s = m?.stats; if (!s) return [];
  const all = [...(s.seasons || []), ...(s.season?.year != null ? [{ ...s.season, team: s.season.team }] : [])];
  return all.filter((b) => b.year != null && ((b.reg?.games || 0) + (b.post?.games || 0)) > 0).sort((a, b) => a.year - b.year);
}

/** One statistic for display: value and text ('—' for a rate without enough volume, never a misleading 0). */
export function statValue(line, key) {
  const d = withDerived(line || {}); const v = d[key];
  const min = RATE_MIN[key]; if (min && (d[min[0]] || 0) < min[1]) return { key, value: null, text: '—' };
  if (v == null) return { key, value: null, text: '—' };
  return { key, value: v, text: RATE_KEYS.has(key) ? (PCT_KEYS.has(key) ? `${v}%` : String(v)) : Number(v).toLocaleString('en-US') };
}
/** The position's focus statistics for a line. `n` = how many. */
export function focusStats(position, line, n = 4) { return (FOCUS[position] || FOCUS.WR).slice(0, n).map(([key, label]) => ({ label, ...statValue(line, key) })); }

/** The clubs a monster has represented, in order, from the records the game keeps (draft, club history, the current club). */
export function clubsOf(f, m, where) {
  const out = []; const add = (club, from, to, how) => { if (!club || club === '__nobody__') return; const last = out[out.length - 1]; if (last && last.club === club && (to == null || last.to == null || from == null || from <= (last.to ?? from) + 1)) { last.to = to ?? last.to; return; } out.push({ club, from: from ?? null, to: to ?? null, how }); };
  if (m.drafted?.club && !(m.history || []).some((h) => h.club === m.drafted.club)) add(m.drafted.club, m.drafted.year + 1, where === 'roster' && m.drafted.club === f.club ? null : m.drafted.year + 1, 'drafted');
  for (const h of (m.history || []).slice().sort((a, b) => (a.from ?? 0) - (b.from ?? 0))) add(h.club, h.from, h.to, h.reason);
  if (where === 'roster') {
    // When he joined this club: the timeline's latest join event here (contract dates reset at every renewal), else the save's fields.
    const j = careerEvents(m).filter((e) => e.t === 'join' && e.c === f.club && e.y != null).sort((a, b) => b.y - a.y)[0];
    add(f.club, j?.y ?? m.joined ?? (m.rookie != null ? m.rookie + 1 : null) ?? m.contract?.signed ?? f.season?.year ?? 1, null, 'current');
  }
  return out;
}

/** Presentation tier of a career (the card's look). Never a gameplay rank: nothing reads it but the career views. */
export function careerTier({ titles = 0, awards = 0, hof = false, seasons = 1, records = 0 }) {
  if (hof) return 'hof';
  if (titles >= 2) return 'dynasty';
  if (titles === 1) return 'champion';
  if (awards >= 1 || records >= 1) return 'decorated';
  if (seasons >= 4) return 'veteran';
  if (seasons <= 1) return 'rookie';
  return 'established';
}
export const TIER_LABEL = Object.freeze({ hof: 'Hall of Famer', dynasty: 'Dynasty', champion: 'Champion', decorated: 'Decorated', veteran: 'Veteran', established: 'Established', rookie: 'Rookie', prospect: 'Prospect' });

/** The record behind a game event, if the save still has it: the current season's game log, else the season's schedule. */
export function gameRecord(f, m, year, week, club = null) {
  // His own line: the current season's log, or (from v39.1) the archived season's packed games.
  const log = (seasonGames(m, year) || []).find((g) => g.week === week && (!club || !g.team || g.team === club));
  if (log) return { source: log.archived ? 'archive' : 'log', year, week, opp: log.opp, home: log.home, playoff: !!log.playoff || week > 10, won: log.won, score: log.score, line: log.line || {}, club: log.team || club };
  const fromSchedule = (sched, c) => { const g = (sched || []).find((x) => x.week === week && x.result); return g ? { source: 'schedule', year, week, opp: g.opponent, home: g.home, playoff: false, won: g.result.won, score: `${g.result.playerScore}-${g.result.oppScore}`, club: c } : null; };
  if (year === f.season?.year && (!club || club === f.club)) { const r = fromSchedule(f.season.schedule, f.club); if (r) return r; }
  const h = (f.history || []).find((x) => x.year === year && (!club || x.club === club));
  if (h) { const r = fromSchedule(h.schedule, h.club); if (r) return r; if (week === 13 && h.championship?.final) { const fin = h.championship.final; return { source: 'championship', year, week, opp: fin.opponent, home: fin.home === h.club, playoff: true, won: true, score: `${fin.us}-${fin.them}`, club: h.club }; } }
  return null;
}
const GAME_EVENTS = new Set(['debut', 'first', 'star', 'rival', 'bowl', 'playoff', 'milestone']);

/** What tapping an event opens, or null when nothing verifiable sits behind it (no misleading link). */
export function eventRef(f, m, e) {
  const x = e.x || {};
  switch (e.t) {
    case 'champion': return { kind: 'title', year: e.y, club: e.c };
    case 'award': return x.key ? { kind: 'award', key: x.key, year: e.y, club: e.c } : null;
    case 'record': return { kind: 'record', scope: x.scope, cat: x.cat, value: x.value, year: e.y, week: e.w ?? null, club: e.c };
    case 'evolve': return x.stage ? { kind: 'evolve', stage: x.stage, from: x.from || null, to: x.to || null, year: e.y, week: e.w ?? null, before: !!x.before } : null;
    case 'hof': return { kind: 'hof', year: e.y, club: e.c, owner: x.owner || null };
    case 'season': case 'growth': return e.y != null && seasonBooks(m).some((b) => b.year === e.y) ? { kind: 'season', year: e.y, club: e.c } : null;
    default:
      if (GAME_EVENTS.has(e.t) && e.y != null && e.w != null) { const g = gameRecord(f, m, e.y, e.w, e.c); return g ? { kind: 'game', year: e.y, week: e.w, club: e.c } : null; }
      return null;
  }
}

/** Honours, grouped and counted, from the timeline's events and the franchise's award history (by id, deduplicated). */
export function trophyCase(f, m, events = careerEvents(m)) {
  const shelves = {}; const put = (kind, entry) => { const s = (shelves[kind] ||= { kind, ...TROPHY_META[kind], entries: [] }); if (!s.entries.some((x) => x.key === entry.key)) s.entries.push(entry); };
  for (const e of events) {
    if (e.t === 'champion') put('champion', { key: `champ:${e.y}`, year: e.y, club: e.c, opp: e.x?.opp || null, score: e.x?.score || null, played: !!e.x?.played });
    if (e.t === 'award' && TROPHY_META[e.x?.key]) put(e.x.key, { key: `award:${e.x.key}:${e.y}`, year: e.y, club: e.c });
    if (e.t === 'record') put('record', { key: e.k, year: e.y, week: e.w ?? null, club: e.c, scope: e.x?.scope, cat: e.x?.cat, value: e.x?.value });
    if (e.t === 'hof') put('hof', { key: e.k, year: e.y, club: e.c, owner: e.x?.owner || null });
  }
  // Awards on the franchise's history that name this monster's id (the same awards; the key dedupes them).
  for (const h of f?.history || []) for (const [k, w] of Object.entries(h.awards?.league || {})) if (w && w.id === m.id && TROPHY_META[k] && k !== 'coy') put(k, { key: `award:${k}:${h.year}`, year: h.year, club: w.team });
  const out = TROPHY_ORDER.filter((k) => shelves[k]).map((k) => { const s = shelves[k]; s.entries.sort((a, b) => (a.year ?? 0) - (b.year ?? 0)); s.count = s.entries.length; return s; });
  return out;
}

/**
 * The whole career profile of a monster in this franchise, by id. kinds:
 *   full    a monster whose career the save keeps (roster, regional pools, free-agent market)
 *   prospect a draft prospect (no professional career: background only)
 *   league  another club's player known only from the league tables (verified season lines and awards)
 * Returns null when the id is not found anywhere.
 */
export function careerProfile(f, id) {
  const found = findMonster(f, id);
  if (found) return found.where === 'draft' ? prospectProfile(f, found.m) : fullProfile(f, found.m, found.where, found.team);
  const rows = leagueRowsFor(f, id); if (rows.length) return leagueProfile(f, id, rows);
  return null;
}

function identity(m) {
  const sp = SPECIES_BY_ID[m.species]; const stage = m.stage || 0;
  const formName = stage > 0 ? sp?.evolution?.[stage - 1]?.name || sp?.name : sp?.name;
  return { id: m.id, name: m.name, species: m.species, stage, speciesName: formName || m.species, type: m.type || sp?.element || null, position: m.position, age: m.age ?? null, level: m.legend ? null : m.level ?? null, ovr: m.legend ? null : m.attributes ? monsterOverall(m) : (m.ovr ?? null), yearsPro: m.yearsPro ?? 0, origin: m.origin || null, cornerstone: !!m.cornerstone }; // a retired legend keeps no ratings: never a made-up current overall
}

export function fullProfile(f, m, where = 'roster', team = null) {
  const id0 = identity(m); const books = seasonBooks(m);
  // Career and season totals follow the game's own definition (the statistics screens, awards and records book): regular
  // season, with the playoffs kept apart. Rates are derived from the summed totals, never averaged across seasons.
  const careerReg = m.stats?.career ? sumLines(m.stats.career.reg) : sumLines(...books.map((b) => b.reg));
  const careerPost = m.stats?.career ? sumLines(m.stats.career.post) : sumLines(...books.map((b) => b.post));
  const career = careerReg;
  const cur = m.stats?.season?.year === f.season?.year ? m.stats.season : null;
  const season = cur ? sumLines(cur.reg) : {}; const seasonPost = cur ? sumLines(cur.post) : {};
  const club = where === 'roster' ? f.club : where === 'drafted' ? team || m.drafted?.club || null : (m.history || []).slice(-1)[0]?.club || null;
  const clubs = clubsOf(f, m, where); if (where === 'drafted' && club && !clubs.some((c) => c.club === club)) clubs.push({ club, from: null, to: null, how: 'drafted' });
  const seasons = Math.max(books.length, (m.yearsPro || 0) + (where === 'roster' ? 1 : 0));
  const onRecord = books.length;
  const complete = fullRecord(m, f.season?.year) || (m.yearsPro || 0) === 0;
  const trophies = trophyCase(f, m);
  const count = (k) => trophies.find((t) => t.kind === k)?.count || 0;
  const titles = count('champion'); const awards = ['mvp', 'opoy', 'dpoy', 'smoy', 'oroy', 'droy'].reduce((a, k) => a + count(k), 0); const records = count('record'); const hof = count('hof') > 0;
  const timeline = careerTimeline(m, { club: where === 'roster' ? f.club : null }).map((e) => ({ ...e, ref: eventRef(f, m, e) }));
  return {
    v: PROFILE_VERSION, kind: 'full', where, ...id0, club, clubs, seasons, onRecord, complete,
    stats: { career, careerReg, careerPost, season, seasonPost, seasonYear: cur ? cur.year : null, games: career.games || 0, seasonGames: season.games || 0, postGames: careerPost.games || 0, seasonPostGames: seasonPost.games || 0,
      focus: focusStats(m.position, career), seasonFocus: cur && (season.games || 0) > 0 ? focusStats(m.position, season) : null,
      post: (careerPost.games || 0) > 0 ? { games: careerPost.games, text: statLine(careerPost) } : null, seasonPostLine: (seasonPost.games || 0) > 0 ? { games: seasonPost.games, text: statLine(seasonPost) } : null },
    books: books.map((b) => ({ year: b.year, team: b.team || null, games: (b.reg?.games || 0) + (b.post?.games || 0) })),
    honours: { titles, awards, records, hof }, trophies, timeline,
    tier: careerTier({ titles, awards, hof, seasons, records }),
    notes: careerNotes({ where, complete, onRecord, seasons, club: clubs.find((c) => c.how === 'current')?.club || club }),
  };
}
function careerNotes({ where, complete, onRecord, seasons }) {
  const n = [];
  if (!complete && seasons > onRecord) n.push(`Career totals count the ${onRecord} season${onRecord === 1 ? '' : 's'} on record; earlier seasons were played before this franchise kept his stats.`);
  if (where === 'pool' || where === 'market') n.push('A free agent: his record runs to the day he left his last club.');
  return n;
}

function prospectProfile(f, m) {
  const id0 = identity(m);
  return { v: PROFILE_VERSION, kind: 'prospect', where: 'draft', ...id0, club: null, clubs: [], seasons: 0, onRecord: 0, complete: true, stats: { career: {}, season: {}, games: 0, focus: [], seasonFocus: null }, books: [], honours: { titles: 0, awards: 0, records: 0, hof: false }, trophies: [], timeline: [], tier: 'prospect', notes: ['A draft prospect: no professional games yet. What the scouts know is his background.'], boardRank: m.boardRank ?? null };
}

/** Another club's player: only what the league tables and the award history prove, for the seasons kept. */
function leagueProfile(f, id, rows) {
  const r0 = rows[0].row; const sp = SPECIES_BY_ID[r0.species];
  const career = sumLines(...rows.map((r) => r.reg)); const careerPost = sumLines(...rows.map((r) => r.post));
  const trophies = trophyCase(f, { id }, []);
  // The current season's frozen award winners, before the season is archived.
  for (const [k, w] of Object.entries(f.season?.awardsFinal?.winners || {})) if (w && w.id === id && TROPHY_META[k] && k !== 'coy') { let s = trophies.find((t) => t.kind === k); if (!s) { s = { kind: k, ...TROPHY_META[k], entries: [], count: 0 }; trophies.push(s); } if (!s.entries.some((e) => e.year === f.season.year)) { s.entries.push({ key: `award:${k}:${f.season.year}`, year: f.season.year, club: w.team }); s.count = s.entries.length; } }
  trophies.sort((a, b) => TROPHY_ORDER.indexOf(a.kind) - TROPHY_ORDER.indexOf(b.kind));
  const awards = trophies.filter((t) => t.kind !== 'champion' && t.kind !== 'record' && t.kind !== 'hof').reduce((a, t) => a + t.count, 0);
  const clubs = []; for (const r of rows.slice().reverse()) if (!clubs.length || clubs[clubs.length - 1].club !== r.team) clubs.push({ club: r.team, from: r.year, to: r.year, how: 'league' }); else clubs[clubs.length - 1].to = r.year;
  return {
    v: PROFILE_VERSION, kind: 'league', where: 'league', id, name: r0.name, species: r0.species, stage: 0, speciesName: sp?.name || r0.species, type: r0.type || sp?.element || null, position: r0.position, age: r0.age ?? null, level: null, ovr: null, yearsPro: r0.yearsPro ?? null,
    club: rows[0].team, clubs, seasons: rows.length, onRecord: rows.length, complete: false,
    stats: { career, careerReg: career, careerPost, season: rows[0].year === f.season?.year ? sumLines(rows[0].reg) : {}, seasonYear: rows[0].year === f.season?.year ? rows[0].year : null, games: career.games || 0, seasonGames: 0, postGames: careerPost.games || 0, focus: focusStats(r0.position, career), seasonFocus: null, post: (careerPost.games || 0) > 0 ? { games: careerPost.games, text: statLine(careerPost) } : null },
    books: rows.map((r) => ({ year: r.year, team: r.team, games: (r.reg.games || 0) + (r.post.games || 0), line: statLine(sumLines(r.reg, r.post)) })).sort((a, b) => a.year - b.year),
    honours: { titles: 0, awards, records: 0, hof: false }, trophies, timeline: [], tier: careerTier({ awards, seasons: rows.length }),
    notes: [`Another club's player: the league keeps his season lines (${rows.length} season${rows.length === 1 ? '' : 's'} on record), not a full career.`],
  };
}

// ------------------------------------------------------------ details behind an event or a trophy
const STAT_NAME = Object.fromEntries(RECORD_CATEGORIES.map((c) => [c.id, c.label.toLowerCase()]));
/**
 * The verified details behind a ref: a plain object of facts the UI lays out, with `missing` naming what the save no longer
 * keeps. Never fabricates: every field is read from a record.
 */
export function eventDetail(f, m, ref) {
  if (!ref) return null;
  const book = (year) => seasonBooks(m).find((b) => b.year === year) || null;
  switch (ref.kind) {
    case 'title': {
      const h = (f.history || []).find((x) => x.year === ref.year && x.club === ref.club);
      const ch = h?.championship; const fin = ch?.final; const starter = ch?.starters?.find((s) => s.id === m.id); const onRoster = !starter && ch?.roster?.some((s) => s.id === m.id);
      const post = book(ref.year)?.post || null; const ev = careerEvents(m).find((e) => e.k === `champ:${ref.year}`);
      return { kind: 'title', year: ref.year, club: ref.club, opp: fin?.opponent || ev?.x?.opp || null, score: fin ? `${fin.us}-${fin.them}` : ev?.x?.score || null, ot: !!fin?.ot, venue: fin?.venue || null, record: ch?.record || h?.record || null, playoffs: ch?.playoffs || null,
        role: starter ? `Started at ${starter.slot}` : onRoster ? 'On the title roster' : ev?.x?.played ? 'Played in the Beast Bowl' : 'Played in the title run',
        line: post && (post.games || 0) > 0 ? { games: post.games, text: statLine(post) } : null, ceremony: !!ch, missing: fin ? null : 'The final\'s full result was not kept for this season.' };
    }
    case 'award': {
      const h = (f.history || []).find((x) => x.year === ref.year); const w = h?.awards?.league?.[ref.key] || (f.season?.awardsFinal?.year === ref.year ? f.season.awardsFinal.winners?.[ref.key] : null);
      const mine = w && w.id === m.id ? w : null; const reg = book(ref.year)?.reg || null;
      return { kind: 'award', key: ref.key, label: TROPHY_META[ref.key]?.label || ref.key, year: ref.year, club: ref.club || mine?.team || null, why: mine?.why || null, record: mine?.record || null, line: reg && (reg.games || 0) > 0 ? { games: reg.games, text: statLine(reg) } : mine ? { games: mine.games || null, text: statLine(mine) } : null, missing: mine || reg ? null : 'The season\'s award sheet was not kept.' };
    }
    case 'record': {
      const R = f.records || {}; const cur = ref.scope === 'game' ? R.game?.[ref.cat] : R.season?.[ref.cat];
      const holder = cur ? resolveRecordHolder(f, cur, { scope: ref.scope, cat: ref.cat }).id : null;
      const standing = cur && cur.year === ref.year && (ref.scope !== 'game' || cur.week === ref.week) && cur.value === ref.value && (holder ? holder === m.id : !cur.id && cur.name === m.name && cur.team === ref.club);
      const g = ref.scope === 'game' && ref.week != null ? gameRecord(f, m, ref.year, ref.week, ref.club) : null;
      return { kind: 'record', scope: ref.scope, cat: ref.cat, stat: STAT_NAME[ref.cat] || ref.cat, value: ref.value, year: ref.year, week: ref.week, club: ref.club, opp: standing ? cur.opp || null : g?.opp || null,
        standing: !!standing, brokenBy: !standing && cur ? { name: cur.name, team: cur.team, value: cur.value, year: cur.year } : null, prev: standing && cur.prev ? cur.prev : null, game: g };
    }
    case 'evolve': return { kind: 'evolve', stage: ref.stage, from: ref.from, to: ref.to, year: ref.year, week: ref.week, before: ref.before, fromStage: ref.stage - 1, species: m.species };
    case 'game': { const g = gameRecord(f, m, ref.year, ref.week, ref.club); return g ? { kind: 'game', ...g, club: g.club || ref.club, lineText: g.line && Object.keys(g.line).length ? statLine(g.line) : null, missing: g.source === 'log' || g.source === 'archive' ? null : 'His own line from this game was not kept (seasons before v39.1 keep the club\'s result only).' } : null; }
    case 'season': {
      const b = book(ref.year); if (!b) return null; const games = seasonGames(m, ref.year);
      return { kind: 'season', year: ref.year, club: b.team || ref.club, reg: { games: b.reg?.games || 0, text: statLine(b.reg || {}) }, post: (b.post?.games || 0) > 0 ? { games: b.post.games, text: statLine(b.post) } : null,
        games: games ? games.map((g) => ({ week: g.week, opp: g.opp, home: g.home, won: g.won, score: g.score, playoff: !!g.playoff || g.week > 10, text: statLine(g.line || {}) })) : null, missing: games ? null : 'Game-by-game lines are kept from v39.1 on: this season keeps its totals.' };
    }
    case 'hof': return { kind: 'hof', year: ref.year, club: ref.club, owner: ref.owner };
    default: return null;
  }
}

// ------------------------------------------------------------ Hall of Fame snapshot
/**
 * A compact, self-contained copy of a career for a Hall of Fame card (the card outlives the franchise). About 1 KB.
 * Only facts: the summary, the trophy case and the highlights of the timeline.
 */
export function careerSnapshot(f, m) {
  const p = fullProfile(f, m, 'roster');
  return { v: PROFILE_VERSION, id: p.id, name: p.name, species: p.species, stage: p.stage, speciesName: p.speciesName, type: p.type, position: p.position, level: p.level, ovr: p.ovr, club: p.club, seasons: p.seasons, onRecord: p.onRecord, complete: p.complete, clubs: p.clubs.map((c) => ({ club: c.club, from: c.from, to: c.to })),
    focus: p.stats.focus.map(({ label, text, key }) => ({ label, text, key })), games: p.stats.games, honours: p.honours, tier: p.tier,
    trophies: p.trophies.map((t) => ({ kind: t.kind, count: t.count, years: t.entries.map((e) => e.year) })),
    highlights: p.timeline.filter((e) => e.tier !== 'career').slice(0, 12).map((e) => ({ t: e.t, y: e.y, title: e.title, desc: e.desc, icon: e.icon, tier: e.tier })) };
}
/** A profile rebuilt from a snapshot (kind 'snapshot': read-only, no links). */
export function snapshotProfile(s) {
  if (!s) return null;
  return { v: PROFILE_VERSION, kind: 'snapshot', where: 'hof', id: s.id, name: s.name, species: s.species, stage: s.stage || 0, speciesName: s.speciesName, type: s.type, position: s.position, level: s.level, ovr: s.ovr, yearsPro: null, club: s.club, clubs: s.clubs || [], seasons: s.seasons, onRecord: s.onRecord, complete: s.complete,
    stats: { career: {}, season: {}, games: s.games || 0, focus: s.focus || [], seasonFocus: null }, books: [], honours: s.honours || {}, tier: s.tier,
    trophies: (s.trophies || []).map((t) => ({ kind: t.kind, ...TROPHY_META[t.kind], count: t.count, entries: (t.years || []).map((y, i) => ({ key: `${t.kind}:${i}`, year: y })) })),
    timeline: (s.highlights || []).map((e, i) => ({ ...e, k: `snap:${i}`, ref: null })), notes: ['From the Hall of Fame card: the career as it stood at retirement.'] };
}
/** Honours on a monster's timeline (titles, awards, records, Hall of Fame), cheap enough for every roster row. */
export function honoursCount(m) { let n = 0; for (const e of careerEvents(m)) if (e.t === 'champion' || e.t === 'award' || e.t === 'record' || e.t === 'hof') n++; return n; }

// ------------------------------------------------------------ older records without an id (GDD §41.2)
const recordKey = (cat) => RECORD_CATEGORIES.find((c) => c.id === cat)?.key || cat;
const valueIn = (line, cat) => { const v = withDerived(line || {})[recordKey(cat)]; return typeof v === 'number' ? v : 0; };
/**
 * Who holds a records-book entry. An entry with an id is that monster. An older entry (name, club, season, week, value) is
 * linked only when the evidence leaves exactly one candidate:
 *   - monsters the save keeps whose season book for that year is with that club, and whose numbers fit: the very game's line
 *     equals the value (when the game is archived), else the season total can contain it; for a season record, the regular-
 *     season total equals it;
 *   - league-table rows of that season and club with that name and numbers that fit the same way.
 * Two candidates (namesakes on one club in one season) or none: unlinked. Returns { id, how, candidates }.
 */
export function resolveRecordHolder(f, r, { scope = 'game', cat } = {}) {
  if (!r) return { id: null, how: null, candidates: 0 };
  if (r.id) return { id: r.id, how: 'id', candidates: 1 };
  if (!r.name || r.year == null || !r.team) return { id: null, how: null, candidates: 0 };
  const ids = new Set();
  const known = [...(f.roster || []).map((m) => [m, 'roster']), ...Object.values(f.pool || {}).flat().map((m) => [m, 'pool']), ...(f.offseason?.market || []).map((m) => [m, 'market'])];
  for (const [m, where] of known) {
    if (m.name !== r.name) continue;
    const s = m.stats; const cur = s?.season?.year === r.year ? s.season : null; const bk = cur || (s?.seasons || []).find((b) => b.year === r.year);
    if (!bk) continue;
    const team = bk.team || (cur && where === 'roster' ? f.club : null); if (team !== r.team) continue;
    if (scope === 'season') { if (valueIn(bk.reg, cat) === r.value) ids.add(m.id); continue; }
    const games = seasonGames(m, r.year);
    if (games) { if (games.some((g) => g.week === r.week && valueIn(g.line, cat) === r.value)) ids.add(m.id); continue; }
    if (valueIn(r.playoff ? bk.post : bk.reg, cat) >= r.value) ids.add(m.id);
  }
  const tables = r.year === f.season?.year ? [f.season.leagueStats, f.season.playoffStats] : (() => { const h = (f.history || []).find((x) => x.year === r.year); return [h?.leagueStats, h?.playoffStats]; })();
  const [reg, post] = tables;
  for (const row of Object.values((scope === 'game' && r.playoff ? post : reg)?.[r.team] || {})) {
    if (row.name !== r.name) continue;
    if (scope === 'season' ? valueIn(row, cat) === r.value : valueIn(row, cat) >= r.value) ids.add(row.id);
  }
  return ids.size === 1 ? { id: [...ids][0], how: 'evidence', candidates: 1 } : { id: null, how: null, candidates: ids.size };
}

// ------------------------------------------------------------ Hall of Fame cards written before careers were kept (GDD §41.3)
/**
 * A partial career for a monster on an older Hall of Fame card (no `careers` snapshot). The franchise save is cleared at
 * retirement, so the card is the only record: his name, species, position, rating and level at retirement, and the card
 * itself (his Hall of Fame recognition). The club's titles in that era are shown as the club's, never as his.
 */
export function legacyHofProfile(card, i) {
  const b = card?.bestMonsters?.[i]; if (!b) return null;
  const sp = SPECIES_BY_ID[b.species]; const base = String(b.name || '').replace(/ (II|III|IV|V|VI|\d+)$/, '');
  const stage = sp ? (sp.evolution || []).findIndex((e) => e.name === base) + 1 : 0;
  const years = (card.seasonsList || []).map((s) => s.year).filter((y) => y != null);
  const last = years.length ? Math.max(...years) : null; const titles = (card.seasonsList || []).filter((s) => s.champion).map((s) => s.year);
  const notes = ['Partial history: this Hall of Fame card was written before careers were kept (v39.0). It records his name, position, rating and level at retirement; his games, honours and earlier clubs were not saved.'];
  notes.push(`${card.club} under ${card.owner}: ${card.seasons} season${card.seasons === 1 ? '' : 's'}, ${card.record?.w ?? 0}-${card.record?.l ?? 0}${titles.length ? `. The club won the Beast Bowl in ${titles.map((y) => yearOf(y)).join(', ')}; the card does not record which games he played` : ''}.`);
  return { v: PROFILE_VERSION, kind: 'snapshot', legacy: true, where: 'hof', id: `${card.id}:${i}`, name: b.name, species: b.species, stage: Math.max(0, stage), speciesName: stage > 0 ? base : sp?.name || b.species, type: sp?.element || null, position: b.position, level: b.level ?? null, ovr: b.ovr ?? null, yearsPro: null,
    club: card.club, clubs: [{ club: card.club, from: null, to: null }], seasons: null, onRecord: 0, complete: false,
    stats: { career: {}, season: {}, games: 0, focus: [], seasonFocus: null }, books: [], honours: { titles: 0, awards: 0, records: 0, hof: true }, tier: 'hof',
    trophies: [{ kind: 'hof', ...TROPHY_META.hof, count: 1, entries: [{ key: 'hof:card', year: last, club: card.club, owner: card.owner }] }],
    timeline: [], emptyText: 'No timeline was kept on Hall of Fame cards written before v39.0.', notes };
}
