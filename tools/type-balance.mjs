#!/usr/bin/env node
// Type effectiveness balance study (GDD §32.6). Same games, same seeds, three ways:
//   before  types off, no matchup lean in the coach AI (the game before §32)
//   lean    types off, the coach AI's matchup lean on (ratings only)
//   types   the shipped game: football type edges and the lean (ratings + types)
// Then a rating × type grid on single plays, a one-on-one receiver check, and a Dragon check.
//   node tools/type-balance.mjs [--games=200] [--plays=600] [--seed=1]
//   node tools/type-balance.mjs --only=env --games=300   (stadium field bonus, GDD §33.2: same games with the bonus off and on)
//   node tools/type-balance.mjs --only=dragon --games=400 --dragon=0.02,0.01,0   (the Dragon wildcard at several strengths, same games)
import { playGame } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { teamOverall } from '../src/franchise/roster.js';
import { withTypeValues, typeMod } from '../src/sim/type-matchups.js';
import { withoutMatchupLean } from '../src/sim/coach-ai.js';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { CHART_TYPES } from '../src/data/type-chart.js';
import { createRng } from '../src/core/rng.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { stadiumFor } from '../src/data/stadiums.js';
import { lineup } from '../tests/tools/lineup.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const GAMES = Number(args.games || 200), PLAYS_N = Number(args.plays || 600), SEED = Number(args.seed || 1);
const OFF = { strong: 0, weak: 0, dragonNeutral: 0 };
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const r2 = (x) => Math.round(x * 100) / 100;

function newAgg() { return { games: 0, pts: 0, att: 0, cmp: 0, int: 0, sacks: 0, dropbacks: 0, rushes: 0, rushYds: 0, tackles: 0, broken: 0, plays: 0, yds: 0, favWins: 0, favGames: 0, margin: 0, ties: 0 }; }
function addGame(A, state, evs, ovr) {
  A.games++; A.pts += state.score.home + state.score.away; A.margin += Math.abs(state.score.home - state.score.away);
  if (state.score.home === state.score.away) A.ties++;
  const fav = ovr.home > ovr.away + 1 ? 'home' : ovr.away > ovr.home + 1 ? 'away' : null;
  if (fav) { A.favGames++; if (state.winner === fav) A.favWins++; }
  for (const ev of evs) {
    if (ev?.kind !== 'play' || !ev.sim) continue; const sim = ev.sim; const isPass = PLAYS[ev.offensePlayId]?.type === 'pass';
    A.plays++; A.yds += sim.yards;
    if (isPass) { A.dropbacks++; if (sim.result === 'sack') A.sacks++; else if (sim.stats.passer && sim.result !== 'throwaway') { A.att++; if (sim.stats.receiver) A.cmp++; if (sim.result === 'interception' || sim.stats.interceptor) A.int++; } }
    else { A.rushes++; A.rushYds += sim.yards; }
    A.broken += sim.stats.brokenTackles || 0; if (sim.stats.tackler && ['tackle', 'sack'].includes(sim.result)) A.tackles++;
  }
}
function report(A) {
  return { games: A.games, ptsPerGame: r2(A.pts / A.games / 2), cmpPct: pct(A.cmp, A.att), intPct: pct(A.int, A.att), sackPct: pct(A.sacks, A.dropbacks), ypc: r2(A.rushYds / A.rushes), ypp: r2(A.yds / A.plays), tackleSuccess: pct(A.tackles, A.tackles + A.broken), favouriteWins: `${pct(A.favWins, A.favGames)}% of ${A.favGames}`, avgMargin: r2(A.margin / A.games), ties: A.ties };
}

const ONLY = args.only || null;
if (ONLY === 'dragon') { dragonStudy(); process.exit(0); }
if (ONLY === 'env') { envStudy(); process.exit(0); }

// ---- A. league games, three ways
const variants = { before: newAgg(), lean: newAgg(), types: newAgg() };
const rng = createRng(SEED);
for (let g = 0; g < GAMES; g++) {
  const qa = 50 + rng.int(18), qb = 50 + rng.int(18), sa = rng.int(1e9), sb = rng.int(1e9), gs = rng.int(1e9);
  const mk = () => ({ home: generatedTeam(sa, { id: 'h', name: 'Home', abbr: 'HOM', color: '#f00', quality: qa }), away: generatedTeam(sb, { id: 'a', name: 'Away', abbr: 'AWY', color: '#00f', quality: qb }) });
  for (const v of Object.keys(variants)) {
    const T = mk(); const ovr = { home: teamOverall(T.home), away: teamOverall(T.away) }; const evs = [];
    const run = () => playGame({ home: T.home, away: T.away, seed: gs, onStep: (ev) => evs.push(ev) });
    const st = v === 'before' ? withTypeValues(OFF, () => withoutMatchupLean(run)) : v === 'lean' ? withTypeValues(OFF, run) : run();
    addGame(variants[v], st, evs, ovr);
  }
}
console.log('A. Full AI-vs-AI games, identical teams and seeds');
console.table(Object.fromEntries(Object.entries(variants).map(([k, A]) => [k, report(A)])));

// ---- B. rating × type on single plays (whole units, one type each side)
const RUN = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'run'), PASS = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'pass');
const typed = (lu, t) => Object.fromEntries(Object.entries(lu).map(([s, p]) => [s, { ...p, type: t }]));
function unitRun(qo, qd, offT, defT, ids) {
  const lo = lineup(31, qo), ld = lineup(32, qd); const o = typed(lo.offense, offT), d = typed(ld.defense, defT);
  let yds = 0, cmp = 0, att = 0, int = 0, sacks = 0;
  for (let k = 0; k < PLAYS_N; k++) {
    const r = simulatePlay({ offensePlay: PLAYS[ids[k % ids.length]], defensePlay: PLAYS[DEFENSE_IDS[k % DEFENSE_IDS.length]], offense: o, defense: d, seed: 7000 + k, ballOn: 30 });
    yds += r.yards; if (r.result === 'sack') sacks++; else if (r.stats.passer) { att++; if (r.stats.receiver) cmp++; if (r.stats.interceptor) int++; }
  }
  return { ypp: r2(yds / PLAYS_N), cmp: pct(cmp, att), int: pct(int, att), sack: pct(sacks, PLAYS_N) };
}
const grid = {};
for (const [qo, qd] of [[62, 62], [68, 62], [62, 68], [74, 62], [62, 74]]) for (const [label, ot, dt] of [['offense favoured', 'Fire', 'Nature'], ['neutral', 'Psychic', 'Fire'], ['defense favoured', 'Nature', 'Fire']]) {
  grid[`off ${qo} vs def ${qd} · ${label}`] = { runYpp: unitRun(qo, qd, ot, dt, RUN).ypp, ...Object.fromEntries(Object.entries(unitRun(qo, qd, ot, dt, PASS)).map(([k, v]) => [`pass ${k}`, v])) };
}
console.log('\nB. Rating × type, single plays (every monster on a side the same type)');
console.table(grid);

// ---- C. one-on-one: WR1 against CB1 only, every other monster neutral; balls forced to WR1
function oneOnOne(wrQ, cbQ, wrT, cbT) {
  const lo = lineup(41, 62), ld = lineup(42, 62); const o = typed(lo.offense, 'Psychic'), d = typed(ld.defense, 'Fire');
  o.WR1 = { ...o.WR1, type: wrT, attrs: Object.fromEntries(Object.entries(o.WR1.attrs).map(([k, v]) => [k, Math.min(99, v + wrQ)])) };
  d.CB1 = { ...d.CB1, type: cbT, attrs: Object.fromEntries(Object.entries(d.CB1.attrs).map(([k, v]) => [k, Math.min(99, v + cbQ)])) };
  let cmp = 0, att = 0;
  for (let k = 0; k < PLAYS_N; k++) {
    const op = PLAYS[PASS[k % PASS.length]]; if (!op.onField.includes('WR1') || op.assignments.WR1?.a !== 'route') continue;
    const r = simulatePlay({ offensePlay: op, defensePlay: PLAYS.cover_2_man, offense: o, defense: d, seed: 9100 + k, ballOn: 30, options: { forcedTarget: 'WR1' } });
    if (r.stats.passer && r.result !== 'sack') { att++; if (r.stats.receiver === 'WR1') cmp++; }
  }
  return `${pct(cmp, att)}% (${att})`;
}
console.log('\nC. One-on-one, every throw to WR1 against CB1 in man (completion %)');
console.table({
  'equal ratings, neutral': { result: oneOnOne(0, 0, 'Psychic', 'Fire') },
  'equal ratings, WR strong (Fire vs Nature)': { result: oneOnOne(0, 0, 'Fire', 'Nature') },
  'equal ratings, WR weak (Nature vs Fire)': { result: oneOnOne(0, 0, 'Nature', 'Fire') },
  'WR +10, WR weak': { result: oneOnOne(10, 0, 'Nature', 'Fire') },
  'CB +10, WR strong': { result: oneOnOne(0, 10, 'Fire', 'Nature') },
});

// ---- D. Dragon
let dragonSum = 0, otherSum = 0;
for (const b of CHART_TYPES) { dragonSum += typeMod('Dragon', b) - typeMod(b, 'Dragon'); }
for (const a of CHART_TYPES.filter((t) => t !== 'Dragon')) for (const b of CHART_TYPES) otherSum += typeMod(a, b) - typeMod(b, a);
console.log(`\nD. Dragon. Average net edge per contest against a random opponent type: Dragon ${r2(dragonSum / 12 * 100)}%, every other type ${r2(otherSum / (11 * 12) * 100)}%`);
const DT = {}; const rd = createRng(SEED + 77);
for (const [label, t] of [['all Dragon', 'Dragon'], ['all Fire', 'Fire'], ['all Psychic', 'Psychic'], ['natural mix', null]]) {
  let w = 0, l = 0, pf = 0, pa = 0;
  for (let g = 0; g < Math.max(40, GAMES / 2); g++) {
    const sa = rd.int(1e9), sb = rd.int(1e9), gs = rd.int(1e9), q = 56 + rd.int(8);
    const home = generatedTeam(sa, { id: 'h', name: 'H', abbr: 'H', color: '#f00', quality: q, afterRoster: t ? (r) => { for (const m of r) m.type = t; return r; } : null });
    const away = generatedTeam(sb, { id: 'a', name: 'A', abbr: 'A', color: '#00f', quality: q });
    const st = playGame({ home, away, seed: gs }); pf += st.score.home; pa += st.score.away; if (st.winner === 'home') w++; else if (st.winner === 'away') l++;
  }
  DT[label] = { record: `${w}-${l}`, winPct: pct(w, w + l), ptsFor: r2(pf / (w + l || 1)), ptsAgainst: r2(pa / (w + l || 1)) };
}
console.log('Teams of one type (same quality) against natural mixed-type clubs:');
console.table(DT);

// ---- E. Dragon wildcard strengths on identical games: all-Dragon clubs and their opponents
function dragonStudy() {
  const values = String(args.dragon || '0.02,0.01,0').split(',').map(Number);
  const out = {};
  for (const v of values) {
    const rd = createRng(SEED + 99); let w = 0, l = 0, mw = 0, ml = 0;
    withTypeValues({ dragonNeutral: v }, () => {
      for (let g = 0; g < GAMES; g++) {
        const sa = rd.int(1e9), sb = rd.int(1e9), gs = rd.int(1e9), q = 54 + rd.int(10);
        const mk = (dragon) => ({ home: generatedTeam(sa, { id: 'h', name: 'H', abbr: 'H', color: '#f00', quality: q, afterRoster: dragon ? (r) => { for (const m of r) m.type = 'Dragon'; return r; } : null }), away: generatedTeam(sb, { id: 'a', name: 'A', abbr: 'A', color: '#00f', quality: q }) });
        const D = mk(true); const a = playGame({ home: D.home, away: D.away, seed: gs }); if (a.winner === 'home') w++; else if (a.winner === 'away') l++;
        const M = mk(false); const b = playGame({ home: M.home, away: M.away, seed: gs }); if (b.winner === 'home') mw++; else if (b.winner === 'away') ml++;
      }
    });
    out[`Dragon +${Math.round(v * 100)}%`] = { allDragon: `${w}-${l} (${pct(w, w + l)}%)`, sameClubsNaturalTypes: `${mw}-${ml} (${pct(mw, mw + ml)}%)`, dragonLift: `${r2(pct(w, w + l) - pct(mw, mw + ml))} pts` };
  }
  console.log('E. The same clubs with every monster Dragon, against the same opponents and seeds, at several wildcard strengths');
  console.table(out);
}

// ---- F. Stadium field bonus (GDD §33.2): identical games at real clubs' stadiums with the bonus off and on, and a home club
// stacked with the field's type (the most a field can do for one side) against the same club with its natural types.
function envStudy() {
  const variants = { fieldOff: newAgg(), fieldOn: newAgg() }; const home = { fieldOff: 0, fieldOn: 0 }; const rd = createRng(SEED + 5);
  const stack = { natural: [0, 0], stacked: [0, 0], stackedNoBonus: [0, 0] };
  for (let g = 0; g < GAMES; g++) {
    const themed = ALL_TEAMS.filter((c) => stadiumFor(c).type); const hn = themed[rd.int(themed.length)], an = ALL_TEAMS.filter((c) => c !== hn)[rd.int(15)];
    const qa = 52 + rd.int(14), qb = 52 + rd.int(14), sa = rd.int(1e9), sb = rd.int(1e9), gs = rd.int(1e9);
    const mk = (stackType = null) => ({ home: generatedTeam(sa, { id: 'h', name: hn, abbr: 'HOM', color: '#f00', quality: qa, afterRoster: stackType ? (r) => { for (const m of r) m.type = stackType; return r; } : null }), away: generatedTeam(sb, { id: 'a', name: an, abbr: 'AWY', color: '#00f', quality: qb }) });
    for (const v of Object.keys(variants)) {
      const T = mk(); const evs = []; const run = () => playGame({ home: T.home, away: T.away, seed: gs, onStep: (ev) => evs.push(ev) });
      const st = v === 'fieldOff' ? withTypeValues({ envMatch: 0 }, run) : run();
      addGame(variants[v], st, evs, { home: teamOverall(T.home), away: teamOverall(T.away) }); if (st.winner === 'home') home[v]++;
    }
    const type = stadiumFor(hn).type;
    for (const [k, stk, off] of [['natural', null, false], ['stacked', type, false], ['stackedNoBonus', type, true]]) {
      const T = mk(stk); const run = () => playGame({ home: T.home, away: T.away, seed: gs }); const st = off ? withTypeValues({ envMatch: 0 }, run) : run();
      if (st.winner === 'home') stack[k][0]++; else if (st.winner === 'away') stack[k][1]++;
    }
  }
  console.log('F. Stadium field bonus on identical games at themed stadiums');
  console.table(Object.fromEntries(Object.entries(variants).map(([k, A]) => [k, { ...report(A), homeWins: `${pct(home[k], A.games)}%` }])));
  console.log('Home club with every monster of the field\'s type, against the same opponents (win % of decisive games):');
  console.table(Object.fromEntries(Object.entries(stack).map(([k, [w, l]]) => [k, `${w}-${l} (${pct(w, w + l)}%)`])));
}
