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
import { GYM_BY_CLUB } from '../data/gyms.js';
import { hashString } from '../core/rng.js';

export const AWARDS = Object.freeze({
  mvp: { label: 'Most Valuable Monster', short: 'MVP' }, opoy: { label: 'Offensive Monster of the Year', short: 'OPOY' }, dpoy: { label: 'Defensive Monster of the Year', short: 'DPOY' },
  oroy: { label: 'Offensive Rookie of the Year', short: 'OROY' }, droy: { label: 'Defensive Rookie of the Year', short: 'DROY' }, coy: { label: 'Coach of the Year', short: 'COY' },
  smoy: { label: 'Signature Monster of the Year', short: 'SMOY' },
});

/** The rules, in the words the award sheet shows. */
export const AWARD_RULES = Object.freeze({
  mvp: 'Individual production, efficiency and impact (each compared with others at the same position), then the club’s win rate and availability. Quarterbacks carry a 1.25× responsibility factor, linemen 0.8×; defenders are judged on their DPOY score at 0.85×. Turnovers count against.',
  opoy: 'Offensive production (45%), efficiency (30%) and impact — touchdowns, first downs, minus turnovers (25%) — each as a position-adjusted score. Versatile monsters (a back who catches, a receiver who runs) get a small bonus. Team record does not count.',
  dpoy: 'Pass rush, takeaways, coverage and run defence, weighted by position: linemen on rush and run defence, linebackers evenly, corners and safeties on coverage and takeaways. Compared with others at the same position, so a shutdown corner with two interceptions can beat a sack leader.',
  coy: 'Wins above what the roster’s talent predicted before the season, improvement on last season, and point margin. Expectations are recorded in week 1, not after the fact.',
  oroy: 'First-season monsters, scored on the OPOY scale against the whole league.',
  droy: 'First-season monsters, scored on the DPOY scale against the whole league.',
  smoy: 'The monster whose ability did the most: on every play where it fired, yards beyond (or short of) a normal play, touchdowns and takeaways, totalled per game and compared across the league. Firing often is not enough; it has to change plays.',
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
const COMPONENT_LABEL = { volume: 'production', efficiency: 'efficiency', impact: 'impact', passRush: 'pass rush', takeaways: 'takeaways', coverage: 'coverage', runDefense: 'run defence' };

/** z-score of fn within each position group of rows. */
function zWithin(rows, fn) {
  const by = {}; for (const r of rows) (by[r.position] ||= []).push(fn(r));
  const st = Object.fromEntries(Object.entries(by).map(([p, v]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); return [p, { m, sd }]; }));
  return (r) => { const s = st[r.position]; if (!s || s.sd < 1e-6) return 0; return (fn(r) - s.m) / s.sd; };
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
export function computeAwards({ table, records, expectations = {}, coachOf = (t) => `${t} staff`, n = 5 }) {
  const { rows, minGames, weeks } = eligibleRows(table);
  const off = rows.filter((r) => OFFENSE_POSITIONS.has(r.position)), def = rows.filter((r) => DEFENSE_POSITIONS.has(r.position));
  const Z = { volume: zWithin(off, OFF.volume), efficiency: zWithin(off, OFF.efficiency), impact: zWithin(off, OFF.impact), passRush: zWithin(def, DEF.passRush), takeaways: zWithin(def, DEF.takeaways), coverage: zWithin(def, DEF.coverage), runDefense: zWithin(def, DEF.runDefense) };
  const winPct = (team) => { const r = records[team]; return r && r.w + r.l ? r.w / (r.w + r.l) : 0.5; };
  const recordOf = (team) => { const r = records[team] || { w: 0, l: 0 }; return `${r.w}–${r.l}${r.t ? '–' + r.t : ''}`; };
  const avail = (r) => Math.min(1, (r.games || 0) / weeks);
  const offScore = (r) => { const c = { volume: Z.volume(r), efficiency: Z.efficiency(r), impact: Z.impact(r) }; let s = 0.45 * c.volume + 0.3 * c.efficiency + 0.25 * c.impact; if ((r.position === 'RB' && (r.rec || 0) >= 12) || ((r.position === 'WR' || r.position === 'TE') && (r.rush || 0) >= 8)) { s += 0.1; c.versatility = 0.1; } return { s, c, prod: OFF.volume(r) }; };
  const defScore = (r) => { const w = DEF_WEIGHTS[r.position] || DEF_WEIGHTS.LB; const c = { passRush: Z.passRush(r), takeaways: Z.takeaways(r), coverage: Z.coverage(r), runDefense: Z.runDefense(r) }; const s = Object.entries(w).reduce((a, [k, wt]) => a + wt * c[k], 0); return { s, c, prod: DEF.passRush(r) + DEF.runDefense(r) + DEF.takeaways(r) }; };
  const finalist = (r, { s, c, prod }, extraWhy = '') => {
    const best = Object.entries(c).filter(([k]) => COMPONENT_LABEL[k]).sort((a, b) => b[1] - a[1])[0];
    const why = `${best && best[1] > 0.5 ? `Elite ${COMPONENT_LABEL[best[0]]} for a ${r.position}` : `Solid across the board for a ${r.position}`}${extraWhy} · ${statLine(r)}`;
    return { ...r, score: Math.round(s * 100) / 100, prod, components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v * 100) / 100])), why, record: recordOf(r.team), minGames, rookie: r.yearsPro === 0 };
  };
  const top = (list) => list.sort(tieBreak).slice(0, n);
  const opoy = top(off.map((r) => finalist(r, offScore(r))));
  const dpoy = top(def.map((r) => finalist(r, defScore(r))));
  const mvp = top([
    ...off.map((r) => { const o = offScore(r); const indiv = o.s * (MVP_RESPONSIBILITY[r.position] || 1); const team = (winPct(r.team) - 0.5) * 3; const s = indiv * 0.75 + team * 0.2 + avail(r) * 0.3; return finalist(r, { s, c: { ...o.c, team: team }, prod: o.prod }, `, ${recordOf(r.team)} club`); }),
    ...def.map((r) => { const d = defScore(r); const team = (winPct(r.team) - 0.5) * 3; const s = d.s * MVP_RESPONSIBILITY.DEF * 0.75 + team * 0.2 + avail(r) * 0.3; return finalist(r, { s, c: { ...d.c, team }, prod: d.prod }, `, ${recordOf(r.team)} club`); }),
  ]);
  const oroy = top(off.filter((r) => r.yearsPro === 0).map((r) => finalist(r, offScore(r), ', rookie')));
  const droy = top(def.filter((r) => r.yearsPro === 0).map((r) => finalist(r, defScore(r), ', rookie')));
  const coy = Object.entries(records).map(([team, rec]) => {
    const g = rec.w + rec.l + (rec.t || 0); if (!g) return null;
    const ex = expectations[team] || {}; const expected = ex.expectedWinPct ?? 0.5; const last = ex.lastWinPct;
    const actual = rec.w / g; const over = actual - expected; const improve = last == null ? 0 : actual - last; const margin = ((rec.pf || 0) - (rec.pa || 0)) / g;
    const score = over * g * 2 + improve * g * 1 + margin * 0.08 + rec.w * 0.15;
    const why = `${over >= 0 ? '+' : ''}${(over * g).toFixed(1)} wins vs the preseason forecast (${(expected * g).toFixed(1)} from ${ex.talent ?? '?'} OVR)${last != null ? `, ${improve >= 0 ? 'up' : 'down'} ${Math.abs(improve * g).toFixed(1)} on last season` : ''}, ${margin >= 0 ? '+' : ''}${margin.toFixed(1)} points per game`;
    return { team, coach: coachOf(team), w: rec.w, l: rec.l, pf: rec.pf || 0, pa: rec.pa || 0, talent: ex.talent ?? null, expected: Math.round(expected * g * 10) / 10, score: Math.round(score * 100) / 100, why, record: recordOf(team), name: coachOf(team), prod: over, games: g };
  }).filter(Boolean).sort(tieBreak).slice(0, n);
  // Signature Monster of the Year: ability impact per game across the whole league (position-free), at least one firing per game.
  // Effectiveness = impact per firing × √(firings per game, capped at 6): a clutch ability that changes a few plays a game beats one that fires every snap for a yard.
  const sig = rows.filter((r) => (r.abilityPlays || 0) >= (r.games || 1));
  const eff = (r) => ((r.abilityImpact || 0) / Math.max(1, r.abilityPlays || 0)) * Math.sqrt(Math.min(6, perGame(r, r.abilityPlays || 0)));
  const zSig = (() => { const v = sig.map(eff); const m = v.reduce((a, b) => a + b, 0) / (v.length || 1); const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length || 1)); return (r) => (sd < 1e-6 ? 0 : (eff(r) - m) / sd); })();
  const smoy = top(sig.map((r) => { const s = zSig(r); return { ...r, score: Math.round(s * 100) / 100, prod: r.abilityImpact || 0, components: { effectiveness: Math.round(zSig(r) * 100) / 100 }, why: `Ability fired ${r.abilityPlays} times, ${((r.abilityImpact || 0) / Math.max(1, r.abilityPlays)).toFixed(1)} impact per firing (${(r.abilityImpact || 0) >= 0 ? '+' : ''}${r.abilityImpact || 0} total) · ${statLine(r)}`, record: recordOf(r.team), minGames, rookie: r.yearsPro === 0 }; }));
  return { mvp, opoy, dpoy, oroy, droy, coy, smoy, minGames, weeks };
}

/** A club's head coach by name: the gym coach, the player's hired coach, or a stable generated name. */
const FIRST = ['Ray', 'Marcus', 'Dale', 'Tomas', 'Lionel', 'Harvey', 'Odell', 'Kurt', 'Rosa', 'Ivan', 'Gus', 'Priya', 'Walt', 'Nico', 'Benny', 'Clara'];
const LAST = ['Okafor', 'Brandt', 'Castellano', 'Hughes', 'Mbeki', 'Lindqvist', 'Reyes', 'Donnelly', 'Kowalski', 'Tanaka', 'Moreau', 'Baptiste', 'Ferraro', 'Whitlock', 'Haddad', 'Olsen'];
export function headCoachName(team, { seed = 0, playerClub = null, playerCoach = null } = {}) {
  if (team === playerClub) return playerCoach || 'Your head coach';
  const gym = GYM_BY_CLUB[team]; if (gym) return gym.coach.name;
  const h = hashString(`coach|${team}|${seed}`); return `${FIRST[h % FIRST.length]} ${LAST[(h >>> 8) % LAST.length]}`;
}
