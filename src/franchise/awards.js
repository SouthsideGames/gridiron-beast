// Season awards (GDD §16.4): Gridiron Beast's own transparent scoring models
// for MVP, OPOY, DPOY, COY, OROY and DROY. The real awards are media votes;
// these are deterministic evaluations of recorded regular-season performance,
// normalised against this league (position peers, this season's weeks), never
// against NFL thresholds. Points shown to the player are game-generated
// evaluation points, not votes.
//
// Every model: workload gate → component scores → z-scores within the
// position group → weighted sum → deterministic tie-breaks.

import { leagueRows, withDerived, statLine, OFFENSE_POSITIONS, DEFENSE_POSITIONS } from './stats.js';
import { COACH_FIRST_NAMES, COACH_LAST_NAMES } from '../data/staff.js';
import { GYM_BY_CLUB } from '../data/gyms.js';
import { ALL_TEAMS, RIVAL_GMS } from '../data/league.js';
import { hashString } from '../core/rng.js';
import { t as $t, captured, lineField } from '../text/index.js';

// Balance audit R-5 (owner decision 2026-11-25): the three major awards are the Most Valuable Beast (MVB), the Offensive Beast of the Year
// (OBOY) and the Defensive Beast of the Year (DBOY); the save keys (mvp, opoy, dpoy) are unchanged, so every saved season keeps its awards.
// Four awards are added (stboy, mib, cboy, iron) and an All-League First and Second Team (`allLeague`, computeAwards). GM of the Year
// is not added: AI clubs have no general manager to judge (no GM turnover exists), so it would only ever describe the owner.
export const AWARDS = Object.freeze({
  mvp: { label: $t('franchise.most_valuable_monster'), short: 'MVB' }, opoy: { label: $t('franchise.offensive_monster_of_the_year'), short: 'OBOY' }, dpoy: { label: $t('franchise.defensive_monster_of_the_year'), short: 'DBOY' },
  oroy: { label: $t('franchise.offensive_rookie_of_the_year'), short: 'OROY' }, droy: { label: $t('franchise.defensive_rookie_of_the_year'), short: 'DROY' }, coy: { label: $t('franchise.coach_of_the_year'), short: 'COY' },
  smoy: { label: $t('franchise.signature_monster_of_the_year'), short: 'SBOY' },
  stboy: { label: $t('franchise.special_teams_beast_of_the_year'), short: 'STBOY' }, mib: { label: $t('franchise.most_improved_beast'), short: 'MIB' },
  cboy: { label: $t('franchise.comeback_beast_of_the_year'), short: 'CBOY' }, iron: { label: $t('franchise.iron_beast'), short: 'IRON' },
});
/** The awards that count toward the owner's Hall of Fame checklist (GDD §15.9): the original seven, so the new honours (R-5) do not
 *  make the checklist easier. */
export const MAJOR_AWARDS = Object.freeze(['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'coy', 'smoy']);
/** All-League team sizes by position: the base lineup (one QB, RB and TE, two WR, three linemen, two DL, LB, CB and safeties, one K). */
export const ALL_LEAGUE_SLOTS = Object.freeze({ QB: 1, RB: 1, WR: 2, TE: 1, OL: 3, DL: 2, LB: 2, CB: 2, S: 2, K: 1 });

/** The rules, in the words the award sheet shows. */
export const AWARD_RULES = Object.freeze({
  mvp: $t('franchise.individual_production_efficiency_and_impact_each'),
  opoy: $t('franchise.offensive_production_45_efficiency_30_and'),
  dpoy: $t('franchise.pass_rush_takeaways_coverage_and_run'),
  coy: $t('franchise.wins_above_what_the_rosters_talent'),
  oroy: $t('franchise.first_season_monsters_scored_on_the'),
  droy: $t('franchise.first_season_monsters_scored_on_the_2'),
  smoy: $t('franchise.the_monster_whose_ability_did_the'),
  stboy: $t('franchise.rule_special_teams_beast'),
  mib: $t('franchise.rule_most_improved_beast'),
  cboy: $t('franchise.rule_comeback_beast'),
  iron: $t('franchise.rule_iron_beast'),
});

// ------------------------------------------------------------ components
const perGame = (r, v) => v / Math.max(1, r.games || 1);
const OFF = {
  volume: (r) => perGame(r, (r.passYds || 0) / 14 + (r.rushYds || 0) / 10 + (r.recYds || 0) / 10 + (r.rec || 0) * 0.4 + ((r.pbSnaps || 0) + (r.rbSnaps || 0)) / 12),
  // Efficiency per role, weighted by how much of the monster's work each role was (GDD §20.9): a quarterback's 205 throws
  // outweigh his 13 scrambles and kneel-downs, instead of the two being averaged 50/50 as before.
  efficiency: (r) => {
    const d = withDerived(r); let e = 0, w = 0;
    const add = (value, weight) => { e += value * weight; w += weight; };
    if (r.att >= 8) add((d.rating || 0) / 12 + (d.ypa || 0) * 0.6, r.att);
    if (r.rush >= 8) add((d.ypc || 0) * 1.2, r.rush);
    if (r.targets >= 8) add((d.ypr || 0) * 0.5 + (d.catchPct || 0) / 12, r.targets);
    if (r.pbSnaps >= 10 || r.rbSnaps >= 10) add((d.blockWinPct || 0) / 10 - perGame(r, (r.sacksAllowed || 0) * 2 + (r.pressuresAllowed || 0) * 0.3), ((r.pbSnaps || 0) + (r.rbSnaps || 0)) / 3);
    return w ? e / w : 0;
  },
  impact: (r) => perGame(r, (r.passTd || 0) * 4 + (r.rushTd || 0) * 6 + (r.recTd || 0) * 6 + ((r.passFd || 0) + (r.rushFd || 0) + (r.recFd || 0)) * 0.6 + (r.broken || 0) * 0.5 - (r.intThrown || 0) * 5 - (r.fumLost || 0) * 5 - (r.drops || 0) * 0.8),
};
const DEF = {
  passRush: (r) => perGame(r, (r.sacks || 0) * 4 + (r.pressures || 0) * 1 + (r.tfl || 0) * 1.5),
  takeaways: (r) => perGame(r, (r.int || 0) * 4 + (r.ff || 0) * 3 + (r.fr || 0) * 2 + (r.pd || 0) * 1 + (r.defTd || 0) * 4),
  coverage: (r) => { if ((r.covTargets || 0) < 6) return 0; const d = withDerived(r); return (8 - (d.ydsPerTarget || 0)) * 1.0 + (0.6 - (d.compPctAllowed || 0) / 100) * 10 - perGame(r, (r.tdAllowed || 0) * 3) + perGame(r, (r.pd || 0)) * 1.5; },
  runDefense: (r) => perGame(r, (r.tackles || 0) * 1 + (r.assists || 0) * 0.5 + (r.tfl || 0) * 1.5),
};
const DEF_WEIGHTS = { DL: { passRush: 0.4, runDefense: 0.3, takeaways: 0.2, coverage: 0.1 }, LB: { passRush: 0.3, runDefense: 0.3, takeaways: 0.2, coverage: 0.2 }, CB: { coverage: 0.45, takeaways: 0.3, runDefense: 0.15, passRush: 0.1 }, S: { coverage: 0.4, takeaways: 0.3, runDefense: 0.2, passRush: 0.1 } };
/** MVP responsibility: a quarterback touches every snap; a blocker or a defender shapes fewer plays. Never an automatic win. */
export const MVP_RESPONSIBILITY = Object.freeze({ QB: 1.35, RB: 1.0, WR: 1.0, TE: 0.95, OL: 0.8, DEF: 0.85 });
const COMPONENT_LABEL = { volume: 'production', efficiency: 'efficiency', impact: 'impact', passRush: 'pass rush', takeaways: 'takeaways', coverage: 'coverage', runDefense: 'run defense' };

/** z-score of fn within each position group of rows. */
/** A total standardised within each position group of `rows` (or within `rows` as one group when `byPosition` is false), capped at +3 SD. */
function zTotal(rows, fn, byPosition = true) {
  const by = {}; for (const r of rows) (by[byPosition ? r.position : '*'] ||= []).push(fn(r));
  const st = Object.fromEntries(Object.entries(by).map(([p, v]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); return [p, { m, sd }]; }));
  return (r) => { const s = st[byPosition ? r.position : '*']; if (!s || s.sd < 1e-6) return 0; return Math.min(3, (fn(r) - s.m) / s.sd); };
}
function zWithin(rows, fn, cap = false) {
  const by = {}; for (const r of rows) (by[r.position] ||= []).push(fn(r));
  const st = Object.fromEntries(Object.entries(by).map(([p, v]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); return [p, { m, sd }]; }));
  return (r) => { const s = st[r.position]; if (!s || s.sd < 1e-6) return 0; const z = (fn(r) - s.m) / s.sd; return cap ? Math.min(3, z) : z; };
}

/** Workload gate: most of the league's weeks, and a starter's share of snaps for the position. */
export function eligibleRows(table) {
  const all = leagueRows(table).filter((r) => (r.games || 0) > 0);
  const weeks = Math.max(1, ...all.map((r) => r.games || 0));
  const minGames = Math.max(1, Math.ceil(weeks * 0.6));
  const maxSnaps = {}; for (const r of all) { const s = (r.snapsOff || 0) + (r.snapsDef || 0); if ((maxSnaps[r.position] || 0) < s) maxSnaps[r.position] = s; }
  const rows = all.filter((r) => (r.games || 0) >= minGames && (r.position === 'K' || (r.snapsOff || 0) + (r.snapsDef || 0) >= 0.5 * (maxSnaps[r.position] || 0)));
  return { rows, minGames, weeks };
}

const tieBreak = (a, b) => b.score - a.score || b.prod - a.prod || (b.games || 0) - (a.games || 0) || a.name.localeCompare(b.name);

/**
 * Award races from a league table and the standings. `records` is
 * {team: {w,l,t,pf,pa}}; `expectations` from the preseason; `coachOf(team)`.
 * Returns {award: [finalist...]} with score, components, why and record.
 */
/**
 * `prior(id)`, optional: what the game knows of a monster beyond this season's table, for the R-5 awards: { gain } (overall gained
 * this season, from the career book's season-start rating), { lastGames, beforeGames } (regular-season games one and two seasons ago).
 * Without it (old callers, tests) the Most Improved and Comeback races are empty.
 */
export function computeAwards({ table, records, expectations = {}, coachOf = (t) => `${t} staff`, n = 5, priorRookieAwardIds = [], prior = null }) {
  const { rows, minGames, weeks } = eligibleRows(table);
  const off = rows.filter((r) => OFFENSE_POSITIONS.has(r.position)), def = rows.filter((r) => DEFENSE_POSITIONS.has(r.position));
  const Z = { volume: zWithin(off, OFF.volume), efficiency: zWithin(off, OFF.efficiency), impact: zWithin(off, OFF.impact), passRush: zWithin(def, DEF.passRush), takeaways: zWithin(def, DEF.takeaways), coverage: zWithin(def, DEF.coverage), runDefense: zWithin(def, DEF.runDefense) };
  const MVP_Z = { volume: zWithin(off, OFF.volume, true), efficiency: zWithin(off, OFF.efficiency, true), impact: zWithin(off, OFF.impact, true), passRush: zWithin(def, DEF.passRush, true), takeaways: zWithin(def, DEF.takeaways, true), coverage: zWithin(def, DEF.coverage, true), runDefense: zWithin(def, DEF.runDefense, true) };
  const winPct = (team) => { const r = records[team]; return r && r.w + r.l ? r.w / (r.w + r.l) : 0.5; };
  const recordOf = (team) => { const r = records[team] || { w: 0, l: 0 }; return `${r.w}-${r.l}${r.t ? '-' + r.t : ''}`; };
  const avail = (r) => Math.min(1, (r.games || 0) / weeks);
  const offScore = (r, scores = Z) => { const c = { volume: scores.volume(r), efficiency: scores.efficiency(r), impact: scores.impact(r) }; let s = 0.45 * c.volume + 0.3 * c.efficiency + 0.25 * c.impact; if ((r.position === 'RB' && (r.rec || 0) >= 12) || ((r.position === 'WR' || r.position === 'TE') && (r.rush || 0) >= 8)) { s += 0.1; c.versatility = 0.1; } return { s, c, prod: OFF.volume(r) }; };
  const defScore = (r, scores = Z) => { const w = DEF_WEIGHTS[r.position] || DEF_WEIGHTS.LB; const c = { passRush: scores.passRush(r), takeaways: scores.takeaways(r), coverage: scores.coverage(r), runDefense: scores.runDefense(r) }; const s = Object.entries(w).reduce((a, [k, wt]) => a + wt * c[k], 0); return { s, c, prod: DEF.passRush(r) + DEF.runDefense(r) + DEF.takeaways(r) }; };
  const finalist = (r, { s, c, prod }, extraWhy = '') => {
    const best = Object.entries(c).filter(([k]) => COMPONENT_LABEL[k]).sort((a, b) => b[1] - a[1])[0];
    const why = captured(() => `${best && best[1] > 0.5 ? `${$t('franchise.elite_for_a', { componentLabel: COMPONENT_LABEL[best[0]], position: r.position })}` : `${$t('franchise.solid_across_the_board_for_a', { position: r.position })}`}${typeof extraWhy === 'function' ? extraWhy() : extraWhy} · ${statLine(r)}`);
    return { ...r, score: Math.round(s * 100) / 100, prod, components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v * 100) / 100])), ...lineField('why', why), record: recordOf(r.team), minGames, rookie: r.yearsPro === 0 };
  };
  const top = (list) => list.sort(tieBreak).slice(0, n);
  const opoy = top(off.map((r) => finalist(r, offScore(r))));
  // R-5 (2026-11-25): the DBOY scores each component capped at +3 SD within the position, as the MVB does. Uncapped, a lineman's sack
  // count (a long-tailed statistic) decided it: DL won 68 of 75 audit seasons.
  // Final runs (2026-11-26): capping alone left DL with 77 of 90 DBOYs. A lineman's two heaviest components (pass rush, run defence) share
  // his sacks and tackles for loss, so his weighted total spreads wider than a corner's, whose coverage and takeaways barely move together.
  // The DBOY therefore also standardises the capped total within the position (`zTotal`): every position's best is measured by how far he
  // stands above his own peers, on the same scale. The components, weights and the sheet are unchanged, and nothing forces a position.
  const dZ = zTotal(def, (r) => defScore(r, MVP_Z).s);
  const dpoy = top(def.map((r) => { const raw = defScore(r); return finalist(r, { s: dZ(r), c: raw.c, prod: raw.prod }); })); // the sheet shows the real (uncapped) components
  // Task 10 (owner 2026-11-13): MVP alone scores its statistical components with each capped at +3 SD within the position
  // (MVP_Z), so one skewed statistic cannot decide it. No repeat limit and no penalty for past wins: a repeat winner wins on merit.
  const mvp = top([
    ...off.map((r) => { const o = offScore(r, MVP_Z); const indiv = o.s * (MVP_RESPONSIBILITY[r.position] || 1); const team = (winPct(r.team) - 0.5) * 3; const s = indiv * 0.75 + team * 0.2 + avail(r) * 0.3; return finalist(r, { s, c: { ...o.c, team: team }, prod: o.prod }, () => $t('franchise.club', { record: recordOf(r.team) })); }),
    ...def.map((r) => { const d = defScore(r, MVP_Z); const team = (winPct(r.team) - 0.5) * 3; const s = d.s * MVP_RESPONSIBILITY.DEF * 0.75 + team * 0.2 + avail(r) * 0.3; return finalist(r, { s, c: { ...d.c, team }, prod: d.prod }, () => $t('franchise.club', { record: recordOf(r.team) })); }),
  ]);
  const priorRookies = new Set(priorRookieAwardIds);
  const oroy = top(off.filter((r) => r.yearsPro === 0 && !priorRookies.has(r.id)).map((r) => finalist(r, offScore(r), () => $t('franchise.rookie'))));
  const droy = top(def.filter((r) => r.yearsPro === 0 && !priorRookies.has(r.id)).map((r) => finalist(r, defScore(r), () => $t('franchise.rookie'))));
  const coy = Object.entries(records).map(([team, rec]) => {
    const g = rec.w + rec.l + (rec.t || 0); if (!g) return null;
    const ex = expectations[team] || {}; const expected = ex.expectedWinPct ?? 0.5; const last = ex.lastWinPct;
    const actual = rec.w / g; const over = actual - expected; const improve = last == null ? 0 : actual - last; const margin = ((rec.pf || 0) - (rec.pa || 0)) / g;
    const score = over * g * 2 + improve * g * 1 + margin * 0.08 + rec.w * 0.15;
    const why = captured(() => `${$t('franchise.wins_vs_the_preseason_forecast_from', { over: over >= 0 ? '+' : '', over2: Math.round(over * g), expected: Math.round(expected * g), talent: ex.talent ?? '?' })}${last != null ? `${$t('franchise.on_last_season', { improve: improve >= 0 ? 'up' : 'down', improve2: Math.round(Math.abs(improve * g)) })}` : ''}${$t('franchise.points_per_game', { margin: margin >= 0 ? '+' : '', toFixed: margin.toFixed(1) })}`);
    return { team, coach: coachOf(team), w: rec.w, l: rec.l, pf: rec.pf || 0, pa: rec.pa || 0, talent: ex.talent ?? null, expected: Math.round(expected * g * 10) / 10, score: Math.round(score * 100) / 100, ...lineField('why', why), record: recordOf(team), name: coachOf(team), prod: over, games: g };
  }).filter(Boolean).sort(tieBreak).slice(0, n);
  // Signature Monster of the Year: ability impact per game across the whole league (position-free), at least one firing per game.
  // Effectiveness = impact per firing × √(firings per game, capped at 6): a clutch ability that changes a few plays a game beats one that fires every snap for a yard.
  const sig = rows.filter((r) => (r.abilityPlays || 0) >= (r.games || 1));
  const eff = (r) => ((r.abilityImpact || 0) / Math.max(1, r.abilityPlays || 0)) * Math.sqrt(Math.min(6, perGame(r, r.abilityPlays || 0)));
  const zSig = (() => { const v = sig.map(eff); const m = v.reduce((a, b) => a + b, 0) / (v.length || 1); const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length || 1)); return (r) => (sd < 1e-6 ? 0 : (eff(r) - m) / sd); })();
  const smoy = top(sig.map((r) => { const s = zSig(r); return { ...r, score: Math.round(s * 100) / 100, prod: r.abilityImpact || 0, components: { effectiveness: Math.round(zSig(r) * 100) / 100 }, ...lineField('why', captured(() => `${$t('franchise.ability_fired_times_impact_per_firing', { abilityPlays: r.abilityPlays, abilityImpact: ((r.abilityImpact || 0) / Math.max(1, r.abilityPlays)).toFixed(1), abilityImpact2: (r.abilityImpact || 0) >= 0 ? '+' : '', abilityImpact3: r.abilityImpact || 0, statLine: statLine(r) })}`)), record: recordOf(r.team), minGames, rookie: r.yearsPro === 0 }; }));
  // ---- R-5 additions. Each is scored on the models above; none repeats another award's question.
  const posScore = (r) => (OFFENSE_POSITIONS.has(r.position) ? offScore(r, MVP_Z) : defScore(r, MVP_Z));
  const zList = (list, fn) => { const v = list.map(fn); const m = v.reduce((a, b) => a + b, 0) / (v.length || 1); const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length || 1)); return (r) => (sd < 1e-6 ? 0 : Math.min(3, (fn(r) - m) / sd)); };
  // Special Teams Beast: the best kicker (points per game and accuracy) or returner (yards per return and return touchdowns), each
  // judged against his own group; the better of the two scores counts.
  const kickers = rows.filter((r) => r.position === 'K' && (r.fga || 0) + (r.xpa || 0) >= r.games);
  const kZ = { pts: zList(kickers, (r) => perGame(r, (r.fgm || 0) * 3 + (r.xpm || 0))), acc: zList(kickers, (r) => (r.fgm || 0) / Math.max(1, r.fga || 0)), long: zList(kickers, (r) => r.fgLong || 0) };
  const kScore = (r) => 0.45 * kZ.pts(r) + 0.4 * kZ.acc(r) + 0.15 * kZ.long(r);
  const returners = rows.filter((r) => (r.krAtt || 0) >= 8);
  const rZ = { avg: zList(returners, (r) => (r.krYds || 0) / Math.max(1, r.krAtt || 0)), td: zList(returners, (r) => r.krTd || 0), vol: zList(returners, (r) => perGame(r, r.krYds || 0)) };
  const rScore = (r) => 0.5 * rZ.avg(r) + 0.25 * rZ.td(r) + 0.25 * rZ.vol(r);
  // Each group's total is standardised within the group (as the DBOY's), so a long-tailed statistic such as return touchdowns cannot
  // make the returners' best look more exceptional than the kickers' best (final runs, 2026-11-26: returners took 81 of 90).
  const kT = zTotal(kickers, kScore, false), rT = zTotal(returners, rScore, false);
  const st = new Map(); for (const r of kickers) st.set(r.id, { r, s: kT(r), c: { kicking: kScore(r) } }); for (const r of returners) { const s = rT(r); const cur = st.get(r.id); if (!cur || s > cur.s) st.set(r.id, { r, s, c: { returns: rScore(r) } }); }
  const stboy = top([...st.values()].map(({ r, s, c }) => finalist(r, { s, c, prod: s })));
  // Most Improved Beast: the most overall gained this season by a regular (not a rookie), production as the tie-break.
  const mib = !prior ? [] : top(rows.filter((r) => (r.yearsPro || 0) >= 1 && r.position !== 'K' && (prior(r.id)?.gain ?? 0) >= 2)
    .map((r) => { const g = prior(r.id).gain; const p = posScore(r); return finalist(r, { s: g + Math.max(-1, Math.min(1, p.s)) * 0.5, c: { growth: g, production: p.s }, prod: p.s }, () => $t('franchise.why_gained_overall', { gain: g })); }));
  // Comeback Beast: a veteran who played under half of last season after a full one before it, and starred this season.
  const cboy = !prior ? [] : top(rows.filter((r) => { const x = prior(r.id); return x && (r.yearsPro || 0) >= 2 && r.position !== 'K' && (x.lastGames ?? (x.beforeGames != null ? 0 : weeks)) < weeks * 0.5 && (x.beforeGames ?? 0) >= weeks * 0.6; }) // no book last season after a full one before it: he missed it
    .map((r) => { const p = posScore(r); return finalist(r, { s: p.s + avail(r) * 0.3, c: { ...p.c }, prod: p.prod }, () => $t('franchise.why_comeback', { games: prior(r.id).lastGames ?? 0 })); }).filter((x) => x.score > 0));
  // Iron Beast: every game of the season and the most snaps (offence, defence and special teams together).
  const snapsOf = (r) => (r.snapsOff || 0) + (r.snapsDef || 0) + (r.stSnaps || 0);
  const iron = top(rows.filter((r) => (r.games || 0) >= weeks).map((r) => finalist(r, { s: snapsOf(r) / 100, c: { snaps: snapsOf(r) }, prod: snapsOf(r) }, () => $t('franchise.why_iron', { snaps: snapsOf(r), games: r.games }))));
  // All-League First and Second Team: by position, on the position scores above (each component capped at +3 SD); kickers on the
  // Special Teams kicking score. A monster is named once, at his own position.
  const slim = (r, s) => ({ id: r.id, name: r.name, team: r.team, position: r.position, type: r.type, species: r.species, score: Math.round(s * 100) / 100 });
  const allLeague = { first: {}, second: {} };
  for (const [pos, k] of Object.entries(ALL_LEAGUE_SLOTS)) {
    const ranked = (pos === 'K' ? kickers.map((r) => [r, kScore(r)]) : rows.filter((r) => r.position === pos).map((r) => [r, posScore(r).s])).sort((a, b) => b[1] - a[1] || (b[0].games || 0) - (a[0].games || 0) || a[0].name.localeCompare(b[0].name));
    allLeague.first[pos] = ranked.slice(0, k).map(([r, s2]) => slim(r, s2)); allLeague.second[pos] = ranked.slice(k, 2 * k).map(([r, s2]) => slim(r, s2));
  }
  return { mvp, opoy, dpoy, oroy, droy, coy, smoy, stboy, mib, cboy, iron, allLeague, minGames, weeks };
}

/** A club's head coach by name: the gym coach, the player's hired coach, or a stable generated name. */
const FIRST = ['Ray', 'Marcus', 'Dale', 'Tomas', 'Lionel', 'Harvey', 'Odell', 'Kurt', 'Rosa', 'Ivan', 'Gus', 'Priya', 'Walt', 'Nico', 'Benny', 'Clara'];
const LAST = ['Okafor', 'Brandt', 'Castellano', 'Hughes', 'Mbeki', 'Lindqvist', 'Reyes', 'Donnelly', 'Kowalski', 'Tanaka', 'Moreau', 'Baptiste', 'Ferraro', 'Whitlock', 'Haddad', 'Olsen'];
/** Which name lists a franchise draws its generated coaches from: 1 (the original 16 × 16) or 2 (the owner's 400 × 400 lists). */
const COACH_LISTS = { 1: [FIRST, LAST], 2: [COACH_FIRST_NAMES, COACH_LAST_NAMES] };
export function headCoachName(team, { seed = 0, playerClub = null, playerCoach = null, names = 1 } = {}) {
  if (team === playerClub) return playerCoach || $t('franchise.your_head_coach');
  const gym = GYM_BY_CLUB[team]; if (gym) return gym.coach.name;
  const [A, B] = COACH_LISTS[names] || COACH_LISTS[1];
  return generatedCoaches(seed, names)[team] || (() => { const h = hashString(`${`coach|${team}|${seed}`}`); return `${A[h % A.length]} ${B[(h >>> 8) % B.length]}`; })();
}
/**
 * The generated head coaches of one franchise seed, club by club in league order. A name already taken, by an earlier club's
 * coach, a Gym Leader or a general manager, is drawn again: with 32 clubs and 256 names two clubs otherwise shared a coach in
 * most leagues (identity audit, 2026-11-23). The first draw is the old one, so most clubs keep the coach they had.
 */
const COACH_CACHE = new Map();
function generatedCoaches(seed, names = 1) {
  const key = `${names}|${seed}`; let out = COACH_CACHE.get(key); if (out) return out; const [A, B] = COACH_LISTS[names] || COACH_LISTS[1];
  out = {}; const taken = new Set([...Object.values(RIVAL_GMS), ...Object.values(GYM_BY_CLUB).map((g) => g.coach.name)]);
  for (const team of ALL_TEAMS) { if (GYM_BY_CLUB[team]) continue;
    for (let n = 0; n < 400; n++) { const h = hashString(`coach|${team}|${seed}${n ? `|${n}` : ''}`); const name = `${A[h % A.length]} ${B[(h >>> 8) % B.length]}`; if (!taken.has(name)) { out[team] = name; taken.add(name); break; } } }
  if (COACH_CACHE.size > 64) COACH_CACHE.clear(); COACH_CACHE.set(key, out); return out;
}
