// Monster Career Timeline (GDD §38). Every monster carries a small list of the moments of its career (m.career.ev), keyed
// so nothing is ever written twice; club moves and the draft are read from records the game already keeps (m.history,
// m.drafted, m.joined) instead of being copied. Everything here only reads the game: it never changes a stat, a rating,
// XP, a contract, an award or the Board.
//
// Event: { k: unique key, t: type, y: season (null = before the timeline began), w: week (null when unknown), c: club,
//          x: small extra }. Types and their weight on screen:
//   major:   award, champion, record, hof
//   notable: evolve, first, milestone, season, playoff, bowl, level, growth, star, rival, debut
//   career:  join (stored); drafted, left, signed (derived)

import { withDerived } from './stats.js';
import { monsterOverall, SPECIES_BY_ID } from '../data/monsters.js';
import { t as $t, captured, lineField, fieldText } from '../text/index.js';

export const CAREER_VERSION = 1;
const PAIR_LABEL = { 'QB-RB': $t('franchise.qb_rb'), 'QB-WR': $t('franchise.qb_wr'), 'QB-TE': $t('franchise.qb_te'), 'RB-OL': $t('franchise.rb_ol'), 'OL-OL': $t('franchise.ol_ol'), 'DL-DL': $t('franchise.dl_dl'), 'DL-LB': $t('franchise.dl_lb'), 'DL-CB': $t('franchise.dl_cb') };
const CHEM_LABEL = ['New', 'Developing', 'Established', 'Strong', 'Elite'];
export const TIER = Object.freeze({ award: 'major', champion: 'major', record: 'major', hof: 'major', evolve: 'notable', first: 'notable', milestone: 'notable', season: 'notable', playoff: 'notable', bowl: 'notable', level: 'notable', growth: 'notable', star: 'notable', rival: 'notable', debut: 'notable', join: 'career', drafted: 'career', left: 'career', signed: 'career', captain: 'career', chemistry: 'notable', injury: 'career', 'injury-return': 'notable', 'injury-free': 'notable', retired: 'notable' });

/** Thresholds for a 7-on-7, nine-game season (measured: GDD §38.2). */
export const FIRSTS = Object.freeze([
  { key: 'tdTotal', id: 'td', label: 'touchdown' },
  { key: 'passTd', id: 'passTd', label: 'touchdown pass', pos: ['QB'] },
  { key: 'int', id: 'int', label: 'interception' },
  { key: 'sacks', id: 'sack', label: 'sack' },
]);
export const CAREER_MILESTONES = Object.freeze([
  { key: 'passYds', at: [5000, 10000, 20000], unit: 'passing yards' }, { key: 'passTd', at: [25, 50, 100], unit: 'touchdown passes' },
  { key: 'rushYds', at: [1500, 3000, 6000], unit: 'rushing yards' }, { key: 'recYds', at: [1500, 3000, 6000], unit: 'receiving yards' },
  { key: 'tdTotal', at: [10, 25, 50], unit: 'touchdowns' }, { key: 'sacks', at: [10, 20, 40], unit: 'sacks' },
  { key: 'int', at: [5, 10, 20], unit: 'interceptions' }, { key: 'tacklesTotal', at: [100, 200, 400], unit: 'tackles' },
]);
export const SEASON_MARKS = Object.freeze([
  { key: 'passYds', at: 1500, label: $t('franchise.1_500_yard_passing_season') }, { key: 'passTd', at: 15, label: $t('franchise.15_touchdown_passes_in_a_season') },
  { key: 'rushYds', at: 800, label: '800-yard rushing season' }, { key: 'recYds', at: 600, label: '600-yard receiving season' },
  { key: 'tdTotal', at: 10, label: '10-touchdown season' }, { key: 'sacks', at: 4, label: '4-sack season' },
  { key: 'int', at: 3, label: '3-interception season' }, { key: 'tacklesTotal', at: 40, label: '40-tackle season' },
]);
export const LEVEL_MARKS = Object.freeze([10, 20, 30]);
export const GROWTH_MARK = 7; // overall points gained in one season worth a mention (5 happened to a third of every roster)
/** League records count from the second season on: in the first, every number is a "record". */
export const RECORDS_FROM_SEASON = 2;
/** A single game worth remembering (playoffs and rivalry games only). */
export function bigGame(l) {
  const d = withDerived(l); const bits = [];
  if ((d.passTd || 0) >= 3) bits.push(`${$t('franchise.td_passes', { passTd: d.passTd })}`); else if ((d.passYds || 0) >= 250) bits.push($t('franchise.passing_yards_2', { yards: d.passYds }));
  if ((d.tdTotal || 0) >= 2) bits.push($t('franchise.touchdowns', { touchdowns: d.tdTotal }));
  if ((d.rushYds || 0) >= 100) bits.push($t('franchise.rushing_yards_2', { yards: d.rushYds })); if ((d.recYds || 0) >= 100) bits.push($t('franchise.receiving_yards_2', { yards: d.recYds }));
  if ((d.sacks || 0) >= 2) bits.push($t('franchise.sacks', { sacks: d.sacks })); if ((d.int || 0) >= 1) bits.push($t('franchise.interceptions', { n: d.int }));
  return bits;
}

const book = (m) => { const c = (m.career ||= { v: CAREER_VERSION, ev: [] }); c.ev ||= []; return c; };
export const careerEvents = (m) => m.career?.ev || [];
export const hasEvent = (m, k) => careerEvents(m).some((e) => e.k === k);
/** Add one event unless its key is already there. Returns true when added. */
let enabled = true;
/** Tests only: switch every writer off, to prove the timeline never changes the game (GDD §38.6). */
export function setCareerEnabled(on) { enabled = !!on; }
/** A monster new to the league's records (founding, drafted, developer): nothing older to rebuild. */
export function markCareerFresh(m) { if (!enabled) return; const b = book(m); b.bf = 1; b.lv = m.level || 1; }
export function addEvent(m, e) {
  if (!enabled) return false;
  const b = book(m); if (b.ev.some((x) => x.k === e.k)) return false;
  const out = { k: e.k, t: e.t, y: e.y ?? null }; if (e.w != null) out.w = e.w; if (e.c) out.c = e.c; if (e.x && Object.keys(e.x).length) out.x = e.x;
  b.ev.push(out); return true;
}

// ------------------------------------------------------------ joining
/** A monster joins the owner's club: how (founding, draft, encounter, free_agent, trade, developer) and from where. */
export function noteJoin(f, m, via, x = {}) {
  if (!enabled) return false;
  const y = via === 'founding' ? 1 : (m.joined ?? f.season?.year ?? 1);
  const returning = (m.history || []).some((h) => h.club === f.club);
  const g = (m.stats?.career?.reg?.games || 0) + (m.stats?.career?.post?.games || 0); // games on record when he arrives
  return addEvent(m, { k: `${`join:${y}:${f.club}:${(m.history || []).length}`}`, t: 'join', y, c: f.club, x: { via, ...(returning ? { back: 1 } : {}), ...(g ? { g } : {}), ...x } });
}

// ------------------------------------------------------------ after each game
const careerTotals = (m) => { const s = m.stats; if (!s?.career) return {}; return withDerived({ ...sum(s.career.reg, s.career.post) }); };
function sum(a = {}, b = {}) { const o = { ...a }; for (const [k, v] of Object.entries(b)) if (typeof v === 'number') o[k] = (o[k] || 0) + v; return o; }
/** Did this monster's recorded career start in its rookie season (so a "first" really is its first)? */
export function fullRecord(m, year) {
  const s = m.stats; if (!s) return false; const years = [s.season?.year, ...(s.seasons || []).map((x) => x.year)].filter((v) => v != null);
  const rookieYear = (year ?? Math.max(...years, 0)) - (m.yearsPro || 0);
  return years.length > 0 && Math.min(...years) <= rookieYear;
}

/**
 * After one of the owner's games (call after the stats are recorded). `ctx`: { year, week, club, playoffRound, rival,
 * won, opponent, records (f.records) }. Uses the monster's game log entry for this week: no entry, no participation,
 * no event.
 */
/** `lineOf(m)`: the game just played, for monsters who keep no logs (AI clubs, GDD §46); by default the last log entry. */
export function careerAfterGame(roster, ctx, { lineOf = null } = {}) {
  if (!enabled) return 0;
  const { year, week, club } = ctx; let added = 0;
  for (const m of roster) {
    const b = book(m);
    // Levels are tracked whether or not he played (a level is earned at the club); evolutions are noted where they happen.
    if (b.lv == null) b.lv = m.level || 1;
    for (const L of LEVEL_MARKS) if ((m.level || 1) >= L && b.lv < L) added += addEvent(m, { k: `lvl:${L}`, t: 'level', y: year, w: week, c: club, x: { level: L } });
    b.lv = Math.max(b.lv, m.level || 1);
    if (b.o0 == null || b.o0.y !== year) b.o0 = { y: year, ovr: monsterOverall(m) };
    const log = lineOf ? lineOf(m) : m.stats?.log?.[m.stats.log.length - 1];
    if (!log || log.year !== year || log.week !== week) continue;
    const line = withDerived(log.line || {}); if (!Object.values(log.line || {}).some((v) => v > 0)) continue;
    const total = careerTotals(m); const full = fullRecord(m, year);
    // first game: a rookie's professional debut, or a newcomer's first game for this club
    const games = (total.games || 0);
    if (games <= 1 && (m.yearsPro || 0) === 0) added += addEvent(m, { k: 'debut', t: 'debut', y: year, w: week, c: club, x: { opp: log.opp } });
    else { const j = careerEvents(m).filter((e) => e.t === 'join').sort((a, b2) => (b2.y ?? 0) - (a.y ?? 0))[0]; if (j && j.x?.via !== 'founding' && games === (j.x?.g || 0) + 1 && !(hasEvent(m, 'debut') && (j.x?.g || 0) === 0)) added += addEvent(m, { k: `cdebut:${j.k}`, t: 'debut', y: year, w: week, c: club, x: { opp: log.opp, club: 1 } }); }
    for (const F of FIRSTS) {
      if (F.pos && !F.pos.includes(m.position)) continue;
      if ((line[F.key] || 0) > 0 && (total[F.key] || 0) - (line[F.key] || 0) <= 0) added += addEvent(m, { k: `first:${F.id}`, t: 'first', y: year, w: week, c: club, x: { id: F.id, opp: log.opp, ...(full ? {} : { club: 1 }) } });
    }
    for (const M of CAREER_MILESTONES) for (const at of M.at) {
      const before = (total[M.key] || 0) - (line[M.key] || 0);
      if (before < at && (total[M.key] || 0) >= at) added += addEvent(m, { k: `${`mile:${M.key}:${at}`}`, t: 'milestone', y: year, w: week, c: club, x: { key: M.key, at, ...(full ? {} : { club: 1 }) } });
    }
    if (log.playoff) {
      added += addEvent(m, { k: 'po:first', t: 'playoff', y: year, w: week, c: club, x: { opp: log.opp } });
      const big = captured(() => bigGame(log.line).join(', ')); if (big.text) added += addEvent(m, { k: `${`star:${year}:${week}`}`, t: 'star', y: year, w: week, c: club, x: { opp: log.opp, ...lineField('line', big), won: log.won ? 1 : 0, round: ctx.playoffRound || null } });
      if (ctx.playoffRound === 3) added += addEvent(m, log.won ? { k: `champ:${year}`, t: 'champion', y: year, w: week, c: club, x: { opp: log.opp, score: log.score, played: 1 } } : { k: `bowl:${year}`, t: 'bowl', y: year, w: week, c: club, x: { opp: log.opp, score: log.score } });
    } else if (ctx.rival && log.won) {
      const big = captured(() => bigGame(log.line).join(', ')); if (big.text) added += addEvent(m, { k: `${`rival:${year}:${week}`}`, t: 'rival', y: year, w: week, c: club, x: { opp: log.opp, ...lineField('line', big) } });
    }
    // single-game league records set in this very game (the records book keeps names, so match name, club, season, week and value)
    for (const [cat, r] of Object.entries(ctx.records?.game || {})) {
      if (year >= RECORDS_FROM_SEASON && r && r.year === year && r.week === week && r.team === club && (r.id ? r.id === m.id : r.name === m.name) && (line[cat] ?? line[cat === 'tacklesTotal' ? 'tacklesTotal' : cat]) === r.value) added += addEvent(m, { k: `${`rec:game:${cat}:${year}:${week}`}`, t: 'record', y: year, w: week, c: club, x: { scope: 'game', cat, value: r.value } });
    }
  }
  return added;
}
/** Evolution, when it happens (the owner evolves his monsters on the card; AI and auto-evolution report events). */
export function noteEvolution(m, { year, week = null, club, from, to, level = null, ovr = null }) {
  return addEvent(m, { k: `evo:${m.stage}`, t: 'evolve', y: year, w: week, c: club, x: { from, to, stage: m.stage, ...(level ? { lvl: level } : {}), ...(ovr ? { ovr } : {}) } });
}

// ------------------------------------------------------------ season end
/**
 * At the end of the owner's season (after awards and records are settled). `ctx`: { year, club, awards (s.awards),
 * records (f.records), champion }. Awards, season records, season marks, the season's growth, and the title for monsters
 * who played in that postseason but not in the final itself.
 */
export function careerSeasonEnd(roster, ctx) {
  if (!enabled) return 0;
  const { year, club } = ctx; let added = 0;
  for (const m of roster) {
    const b = book(m); const s = m.stats; const bookY = s?.season?.year === year ? s.season : (s?.seasons || []).find((x) => x.year === year);
    const reg = withDerived(bookY?.reg || {}), post = bookY?.post || {};
    for (const [key, w] of Object.entries(ctx.awards?.league || {})) if (w && w.id === m.id && w.team === club && key !== 'coy') added += addEvent(m, { k: `${`award:${key}:${year}`}`, t: 'award', y: year, c: club, x: { key } });
    for (const [cat, r] of Object.entries(ctx.records?.season || {})) if (year >= RECORDS_FROM_SEASON && r && r.year === year && r.team === club && (r.id ? r.id === m.id : r.name === m.name) && (reg[cat] || 0) === r.value) added += addEvent(m, { k: `${`rec:season:${cat}:${year}`}`, t: 'record', y: year, c: club, x: { scope: 'season', cat, value: r.value } });
    for (const S of SEASON_MARKS) if ((reg[S.key] || 0) >= S.at) added += addEvent(m, { k: `${`season:${S.key}:${year}`}`, t: 'season', y: year, c: club, x: { key: S.key, value: reg[S.key], at: S.at } });
    if (ctx.champion === club && (post.games || 0) > 0) added += addEvent(m, { k: `champ:${year}`, t: 'champion', y: year, c: club, x: { run: 1 } });
    if (b.o0?.y === year) { const gain = monsterOverall(m) - b.o0.ovr; if (gain >= GROWTH_MARK) added += addEvent(m, { k: `grow:${year}`, t: 'growth', y: year, c: club, x: { from: b.o0.ovr, to: b.o0.ovr + gain } }); }
  }
  return added;
}
/** The owner retires: the monsters on his Hall of Fame card. */
export function noteHallOfFame(roster, ids, { year, club, owner }) { let n = 0; for (const m of roster) if (ids.includes(m.id)) n += addEvent(m, { k: `${`hof:${year}:${club}`}`, t: 'hof', y: year, c: club, x: { owner } }); return n; }

// ------------------------------------------------------------ older saves
/**
 * Rebuild what the save can prove, once per monster: evolutions (stage reached, season unknown), firsts and career
 * milestones by season from the archived season books, season marks, playoff appearances, awards and titles from the
 * franchise history. Nothing whose season or club cannot be shown is invented. Marks the monster `bf` so it runs once.
 */
export function backfillCareer(f, m) {
  if (!enabled) return 0;
  const b = book(m); if (b.bf) return 0; let added = 0;
  const sp = SPECIES_BY_ID[m.species];
  for (let st = 1; st <= (m.stage || 0); st++) { const from = st === 1 ? sp?.name : sp?.evolution?.[st - 2]?.name; const to = sp?.evolution?.[st - 1]?.name; added += addEvent(m, { k: `evo:${st}`, t: 'evolve', y: null, x: { from: from || null, to: to || null, stage: st, before: 1 } }); }
  const s = m.stats; const seasons = s ? [...(s.seasons || []), ...(s.season?.year != null ? [s.season] : [])].filter((x) => x.year != null).sort((a, c) => a.year - c.year) : [];
  const run = {}; const full = fullRecord(m, f.season?.year);
  for (const bk of seasons) {
    const line = withDerived(sum(bk.reg, bk.post)); const club = bk.team || f.club;
    if ((line.games || 0) > 0 && (m.yearsPro || 0) - ((f.season?.year ?? bk.year) - bk.year) === 0) added += addEvent(m, { k: 'debut', t: 'debut', y: bk.year, c: club });
    for (const F of FIRSTS) { if (F.pos && !F.pos.includes(m.position)) continue; if ((line[F.key] || 0) > 0 && !(run[F.key] > 0)) added += addEvent(m, { k: `first:${F.id}`, t: 'first', y: bk.year, c: club, x: { id: F.id, ...(full ? {} : { club: 1 }) } }); }
    for (const M of CAREER_MILESTONES) { const before = run[M.key] || 0, after = before + (line[M.key] || 0); for (const at of M.at) if (before < at && after >= at) added += addEvent(m, { k: `${`mile:${M.key}:${at}`}`, t: 'milestone', y: bk.year, c: club, x: { key: M.key, at, ...(full ? {} : { club: 1 }) } }); }
    for (const [k, v] of Object.entries(line)) if (typeof v === 'number') run[k] = (run[k] || 0) + v;
    if ((bk.post?.games || 0) > 0) added += addEvent(m, { k: 'po:first', t: 'playoff', y: bk.year, c: club });
    if (bk.year !== f.season?.year || f.season?.finished) { const reg = withDerived(bk.reg || {}); for (const S of SEASON_MARKS) if ((reg[S.key] || 0) >= S.at) added += addEvent(m, { k: `${`season:${S.key}:${bk.year}`}`, t: 'season', y: bk.year, c: club, x: { key: S.key, value: reg[S.key], at: S.at } }); }
  }
  for (const h of f.history || []) {
    for (const [key, w] of Object.entries(h.awards?.league || {})) if (w && w.id === m.id && w.team === h.club && key !== 'coy') added += addEvent(m, { k: `${`award:${key}:${h.year}`}`, t: 'award', y: h.year, c: h.club, x: { key } });
    const bk = seasons.find((x) => x.year === h.year);
    if (h.champion && h.champion === h.club && (bk?.post?.games || 0) > 0) added += addEvent(m, { k: `champ:${h.year}`, t: 'champion', y: h.year, c: h.club, x: { run: 1 } });
  }
  if (m.cornerstone && !careerEvents(m).some((e) => e.t === 'join') && !(m.history || []).length) added += addEvent(m, { k: `join:1:${f.club}:0`, t: 'join', y: 1, c: f.club, x: { via: 'founding', cornerstone: 1 } });
  b.lv = m.level || 1; b.bf = 1;
  return added;
}

// ------------------------------------------------------------ the timeline
const TD_LABEL = Object.fromEntries(FIRSTS.map((x) => [x.id, x.label]));
const AWARD = { mvp: [$t('franchise.most_valuable_monster'), 'Named the league\'s Most Valuable Monster.'], opoy: [$t('franchise.offensive_monster_of_the_year'), 'The league\'s best offensive monster this season.'], dpoy: [$t('franchise.defensive_monster_of_the_year'), 'The league\'s best defensive monster this season.'], oroy: [$t('franchise.offensive_rookie_of_the_year'), 'The best offensive rookie in the league.'], droy: [$t('franchise.defensive_rookie_of_the_year'), 'The best defensive rookie in the league.'], smoy: [$t('franchise.signature_monster_of_the_year'), 'No signature ability made a bigger difference.'] };
const STAT_LABEL = { passYds: 'passing yards', passTd: 'touchdown passes', rushYds: 'rushing yards', rushTd: 'rushing touchdowns', recYds: 'receiving yards', rec: 'receptions', recTd: 'receiving touchdowns', tacklesTotal: 'tackles', sacks: 'sacks', int: 'interceptions', pd: 'passes defended', fgLong: 'longest field goal' };
const fmt = (n) => Number(n).toLocaleString('en-US');
const ord = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th'}`;

/** Title, description, icon and weight for an event. */
export function describeEvent(e, m) {
  const x = e.x || {}; const c = e.c || $t('franchise.the_club'); const at = (s) => (x.club ? `${$t('franchise.with_the_2', { s, c })}` : s);
  switch (e.t) {
    case 'join': {
      const v = x.via; const back = x.back ? $t('franchise.returned_to') : 'Joined';
      const how = v === 'founding' ? (x.cornerstone ? `${$t('franchise.chosen_as_a_cornerstone_of_the', { c })}` : `${$t('franchise.on_the_founding_roster', { c })}`) : v === 'draft' ? `${$t('franchise.drafted')}${x.round ? ` ${$t('franchise.in_round_pick', { round: x.round, overall: x.overall })}` : ''} ${$t('franchise.by_the_2', { c })}` : v === 'encounter' ? `${$t('franchise.recruited_after_a_tuesday_beast_clash')}${x.region ? ` in ${x.region}` : ''}.` : v === 'free_agent' ? `${$t('franchise.signed_as_a_free_agent')}${x.region ? ` ${$t('franchise.from_the_pool', { region: x.region })}` : ''}.` : v === 'trade' ? `${$t('franchise.acquired_in_a_trade')}${x.from ? ` ${$t('franchise.with_the_3', { from: x.from })}` : ''}.` : v === 'developer' ? $t('franchise.added_with_the_developer_tools') : `${$t('franchise.the', { back, c })}`;
      return { icon: x.back ? '↩' : v === 'draft' ? '📋' : v === 'encounter' ? '⚔️' : v === 'trade' ? '🔁' : v === 'free_agent' ? '✍️' : '🏟', title: v === 'draft' ? 'Drafted' : v === 'encounter' ? 'Recruited' : v === 'trade' ? $t('franchise.traded_in') : v === 'free_agent' ? (x.back ? $t('franchise.returned_home') : $t('franchise.free_agent_signing')) : v === 'founding' ? (x.cornerstone ? $t('franchise.founding_cornerstone') : $t('franchise.founding_roster')) : `${back} the ${c}`, desc: how };
    }
    case 'retired': return { icon: '🌅', title: $t('franchise.retired'), desc: `${$t('franchise.retired')}${x.age ? ` at ${x.age}` : ''} ${$t('franchise.after_his_last_season_with_the', { c })}` };
    case 'drafted': return { icon: '📋', title: $t('franchise.drafted'), desc: `${$t('franchise.selected_in_round_pick_by_the', { round: x.round, overall: x.overall, c })}` };
    case 'signed': return { icon: '✍️', title: `${$t('franchise.signed_with_the', { c })}`, desc: $t('franchise.signed_out_of_a_regional_pool') };
    case 'left': return { icon: x.reason === 'traded' ? '🔁' : '🚪', title: x.reason === 'walked' ? $t('franchise.left_as_a_free_agent') : x.reason === 'commissioner' ? $t('franchise.cut_by_the_commissioner') : x.reason === 'traded' ? `${$t('franchise.traded_by_the', { c })}` : `${$t('franchise.released_by_the', { c })}`, desc: x.reason === 'walked' ? `${$t('franchise.his_contract_ran_out_and_he', { c })}` : x.reason === 'commissioner' ? `${$t('franchise.let_go_to_bring_the_under', { c })}` : x.reason === 'traded' ? `${$t('franchise.moved_on_from_the', { c })}` : `${$t('franchise.back_to_the_regional_pool_his')}` };
    case 'debut': return x.club ? { icon: '🆕', title: `${$t('franchise.first_game_for_the', { c })}`, desc: x.opp ? `${$t('franchise.debuted_for_his_new_club_against', { opp: x.opp })}` : $t('franchise.his_first_game_for_his_new') } : { icon: '🆕', title: $t('franchise.first_professional_game'), desc: x.opp ? `${$t('franchise.took_the_field_for_the_first', { opp: x.opp })}` : $t('franchise.his_first_season_in_the_league') };
    case 'first': return { icon: x.id === 'sack' ? '💥' : x.id === 'int' ? '🧤' : '🏈', title: at(`${$t('franchise.first', { club: x.club ? '' : 'career ', tdLabel: TD_LABEL[x.id] || x.id })}`).replace('  ', ' '), desc: x.opp ? `${$t('franchise.against_the', { opp: x.opp })}` : $t('franchise.the_first_of_his_career_in') };
    case 'milestone': return { icon: '📈', title: `${fmt(x.at)} career ${STAT_LABEL[x.key] || x.key}`, desc: x.club ? `${$t('franchise.counting_his_games_with_the_earlier', { c })}` : $t('franchise.a_career_milestone') };
    case 'season': return { icon: '⭐', title: (SEASON_MARKS.find((s) => s.key === x.key)?.label || $t('franchise.big_season')).replace(/^./, (a) => a.toUpperCase()), desc: `${$t('franchise.in_the_regular_season', { amount: fmt(x.value), statLabel: STAT_LABEL[x.key] || x.key })}` };
    case 'level': return { icon: '⬆️', title: `${$t('franchise.reached_level', { level: x.level })}`, desc: x.level >= 30 ? $t('franchise.among_the_most_experienced_monsters_in') : x.level >= 20 ? $t('franchise.a_seasoned_veteran_now') : $t('franchise.ten_levels_of_hard_won_experience') };
    case 'growth': return { icon: '💪', title: `${$t('franchise.overall', { from: x.to - x.from })}`, desc: `${$t('franchise.from_to_ovr_in_one_season', { from: x.from, to: x.to })}` };
    case 'evolve': return { icon: '✨', title: x.before ? 'Evolved' : `${$t('franchise.evolved_into', { to: x.to || $t('franchise.a_new_form') })}`, desc: x.before ? `${x.from ? `${x.from} → ` : ''}${$t('franchise.before_the_timeline_began', { to: x.to || 'its next form' })}` : `${x.from || 'He'} evolved into ${x.to || 'its next form'}${x.lvl ? ` ${$t('franchise.at_level', { lvl: x.lvl })}` : ''}${x.ovr && x.ovr[1] > x.ovr[0] ? ` ${$t('franchise.overall_2', { ovr: x.ovr[0], ovr2: x.ovr[1] })}` : ''}.` };
    case 'playoff': return { icon: '🎟', title: $t('franchise.first_playoff_game'), desc: x.opp ? `${$t('franchise.played_in_the_postseason_against_the', { opp: x.opp })}` : $t('franchise.played_in_the_postseason') };
    case 'star': return { icon: '🔥', title: x.round === 3 ? $t('franchise.beast_bowl_star') : $t('franchise.playoff_performance'), desc: `${$t('franchise.against_the_2', { line: fieldText(x, 'line'), opp: x.opp, won: x.won ? $t('franchise.in_a_win') : '' })}` };
    case 'rival': return { icon: '⚔️', title: $t('franchise.rivalry_hero'), desc: `${$t('franchise.in_a_win_over_the_rival', { line: fieldText(x, 'line'), opp: x.opp })}` };
    case 'bowl': return { icon: '🏟', title: $t('franchise.played_in_the_beast_bowl'), desc: `${$t('franchise.lost_the_final_to_the', { opp: x.opp })}${x.score ? `, ${x.score}` : ''}.` };
    case 'champion': return { icon: '🏆', title: $t('franchise.beast_bowl_champion_2'), desc: x.played ? `${$t('franchise.helped_the_win_the_title', { c })}${x.opp ? ` ${$t('franchise.against_the_3', { opp: x.opp })}` : ''}${x.score ? `, ${x.score}` : ''}.` : `${$t('franchise.played_in_the_s_title_run', { c })}` };
    case 'award': return { icon: '🏅', title: AWARD[x.key]?.[0] || x.key, desc: AWARD[x.key]?.[1] || $t('franchise.a_league_award') };
    case 'record': return { icon: '📜', title: x.scope === 'game' ? $t('franchise.league_record_one_game') : $t('franchise.league_record_one_season'), desc: `${$t('franchise.the_most_since_league_records_began', { amount: fmt(x.value), statLabel: STAT_LABEL[x.cat] || x.cat, scope: x.scope === 'game' ? $t('franchise.in_one_game') : $t('franchise.in_one_season') })}` };
    case 'hof': return { icon: '🏛', title: $t('franchise.hall_of_fame'), desc: `${$t('franchise.named_on_s_hall_of_fame', { owner: x.owner || $t('franchise.the_owner') })}` };
    // Injury History (GDD §50): the game's own injury words (severity, body part); never a diagnosis
    case 'injury': return { icon: '🩹', title: $t('franchise.first_career_injury'), desc: `${[x.sev, x.type].filter(Boolean).join(' ') || $t('franchise.injured')}${x.vs ? ` ${$t('franchise.in_the_game_against_the', { vs: x.vs })}` : ''}.` };
    case 'injury-return': return { icon: '💪', title: `${$t('franchise.returned_after_missing_games', { missed: x.missed })}`, desc: `${$t('franchise.back_from_his', { type: x.type || 'injury' })}` };
    case 'injury-free': return { icon: '🛡️', title: $t('franchise.played_every_game_of_a_season'), desc: `${$t('franchise.all_regular_season_games_none_missed', { games: x.games })}` };
    // Captain Partnerships (GDD §27.4B)
    case 'captain': return { icon: '©', title: `${$t('franchise.named_captain', { side: x.side === 'defense' ? 'defensive' : 'offensive' })}`, desc: `${$t('franchise.paired_with_for_the_s_season', { pname: x.pname || $t('franchise.a_teammate'), pairLabel: PAIR_LABEL[x.type] || 'captain pair', c })}` };
    case 'chemistry': return { icon: '🤝', title: `${$t('franchise.chemistry_with', { chemLabel: CHEM_LABEL[x.level] || $t('franchise.new'), pname: x.pname || $t('franchise.his_partner') })}`, desc: `${$t('franchise.their_captain_partnership_reached_when_both', { chemLabel: CHEM_LABEL[x.level] || $t('franchise.a_new_level'), level: x.level })}` };
    default: return { icon: '•', title: e.t, desc: '' };
  }
}

/**
 * The monster's whole timeline, newest first: stored events plus what the club records already prove (the draft, club
 * moves). Each item: { ...event, tier, title, desc, icon }. `club` is the owner's current club.
 */
export function careerTimeline(m, { club = null } = {}) {
  const ev = careerEvents(m).slice();
  if (m.drafted && !ev.some((e) => e.t === 'join' && e.x?.via === 'draft')) ev.push({ k: 'drafted', t: 'drafted', y: m.drafted.year, c: m.drafted.club, x: { round: m.drafted.round, overall: m.drafted.overall } });
  (m.history || []).forEach((h, i) => {
    if (!h.club) return;
    if (['released', 'walked', 'commissioner'].includes(h.reason)) ev.push({ k: `left:${i}`, t: 'left', y: h.to ?? null, c: h.club, x: { reason: h.reason } });
    else if (h.reason === 'signed' && h.club !== club) ev.push({ k: `signed:${i}`, t: 'signed', y: h.from ?? null, c: h.club });
  });
  const wk = (e) => (e.w != null ? e.w : ['join', 'drafted', 'signed'].includes(e.t) ? -1 : 99);
  const order = { join: 0, drafted: 0, signed: 0, captain: 0.5, injury: 2.5, 'injury-return': 2.6, 'injury-free': 6.5, debut: 1, first: 2, level: 3, evolve: 3, chemistry: 3.5, milestone: 4, playoff: 4, rival: 4, star: 5, bowl: 5, season: 6, growth: 6, record: 7, award: 8, champion: 9, left: 10, hof: 11 };
  // Count repeat honours oldest first, so the first title, the second MVP and the first Beast Bowl appearance read as such.
  const seen = {}; const nth = {};
  for (const e of ev.slice().sort((a, b) => (a.y ?? -1) - (b.y ?? -1) || (a.w ?? 0) - (b.w ?? 0))) {
    const key = e.t === 'award' ? `award:${e.x?.key}` : e.t === 'champion' ? 'champion' : e.t === 'bowl' || (e.t === 'champion' && e.x?.played) ? 'bowl' : null;
    if (key) { seen[key] = (seen[key] || 0) + 1; nth[e.k] = seen[key]; }
    if (e.t === 'champion' && e.x?.played) { seen.app = (seen.app || 0) + 1; nth[`app:${e.k}`] = seen.app; } else if (e.t === 'bowl') { seen.app = (seen.app || 0) + 1; nth[`app:${e.k}`] = seen.app; }
  }
  const annotate = (e, d) => {
    const n = nth[e.k];
    if (e.t === 'champion') return { ...d, title: n === 1 ? $t('franchise.beast_bowl_champion_2') : `${$t('franchise.beast_bowl_champion_3', { n })}`, desc: `${n === 1 ? $t('franchise.his_first_title') : `${$t('franchise.title_number', { n })} `}${d.desc}` };
    if (e.t === 'award' && n > 1) return { ...d, title: `${d.title} ×${n}`, desc: `${ord(n)} time. ${d.desc}` };
    if (e.t === 'bowl' && nth[`app:${e.k}`] === 1) return { ...d, title: $t('franchise.first_beast_bowl_appearance'), desc: d.desc };
    return d;
  };
  return ev.map((e) => ({ ...e, tier: TIER[e.t] || 'career', ...annotate(e, describeEvent(e, m)) }))
    // Within a season: season-end entries (no week) on top, then weeks newest first, arrivals (no week) at the bottom.
    .sort((a, b) => (b.y ?? -1) - (a.y ?? -1) || wk(b) - wk(a) || (order[b.t] ?? 5) - (order[a.t] ?? 5));
}
/** Counts for the header: seasons with an event, highlights (major + notable). */
export function careerSummary(items) { return { total: items.length, major: items.filter((i) => i.tier === 'major').length, highlights: items.filter((i) => i.tier !== 'career').length, seasons: new Set(items.map((i) => i.y).filter((y) => y != null)).size }; }
