#!/usr/bin/env node
// Balance audit 2026-11-25 (observation only): roster-construction strategies at a constant payroll. Salary is linear in overall
// (src/data/monsters.js salaryFor = 18000 + 280 * OVR), so a constant payroll is a constant SUM of roster overall. Each strategy
// raises its target monsters' attributes and lowers its donor monsters' attributes uniformly until the roster's summed overall is
// back to the control's (never above it). The same generated club, the same opponent and the same game seed are played once per
// strategy; the paired difference against the unchanged club (control) is the strategy's effect. The production engine plays.
//   node tools/balance-audit/roster-strategy.mjs [--games=200] [--quality=60] [--json=FILE]
import fs from 'node:fs';
import { generatedTeam, buildDepthChart, GROUP_SLOTS } from '../../src/franchise/roster.js';
import { playGame } from '../../src/sim/game-runner.js';
import { monsterOverall } from '../../src/data/monsters.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const G = Number(args.games || 200), Q = Number(args.quality || 60);
const OFF = ['QB', 'RB', 'WR', 'TE', 'OL'], DEF = ['DL', 'LB', 'CB', 'S'];
const starters = (roster) => { const c = buildDepthChart(roster); const ids = new Set(Object.values(GROUP_SLOTS).flat().map((s) => c[s]).filter(Boolean)); return ids; };
const sumOvr = (roster) => roster.reduce((s, m) => s + monsterOverall(m), 0);
const addAll = (m, d, keys = null) => { for (const k of keys || Object.keys(m.attributes)) m.attributes[k] = Math.max(20, Math.min(99, m.attributes[k] + d)); };
/** Raise targets, then lower donors one point at a time until the summed overall is back at the control's. */
function rebalance(roster, targets, donors, boost, { keys = null, donorKeys = null } = {}) {
  const budget = sumOvr(roster);
  for (const m of targets) addAll(m, boost, keys);
  let guard = 0; while (sumOvr(roster) > budget && guard++ < 60) for (const m of donors) { addAll(m, -1, donorKeys); if (sumOvr(roster) <= budget) break; }
  return roster;
}
const STRATEGIES = {
  control: () => (r) => r,
  eliteQB: () => (r) => { const st = starters(r); const t = r.filter((m) => st.has(m.id) && m.position === 'QB'); return rebalance(r, t, r.filter((m) => st.has(m.id) && m.position !== 'QB' && m.position !== 'K'), 15); },
  passing: () => (r) => { const st = starters(r); const tp = ['QB', 'WR', 'TE']; return rebalance(r, r.filter((m) => st.has(m.id) && tp.includes(m.position)), r.filter((m) => st.has(m.id) && !tp.includes(m.position) && m.position !== 'K'), 8); },
  rushing: () => (r) => { const st = starters(r); const tp = ['RB', 'OL', 'TE']; return rebalance(r, r.filter((m) => st.has(m.id) && tp.includes(m.position)), r.filter((m) => st.has(m.id) && !tp.includes(m.position) && m.position !== 'K'), 8); },
  defense: () => (r) => { const st = starters(r); return rebalance(r, r.filter((m) => st.has(m.id) && DEF.includes(m.position)), r.filter((m) => st.has(m.id) && OFF.includes(m.position)), 8); },
  offense: () => (r) => { const st = starters(r); return rebalance(r, r.filter((m) => st.has(m.id) && OFF.includes(m.position)), r.filter((m) => st.has(m.id) && DEF.includes(m.position)), 8); },
  speed: () => (r) => { const st = starters(r); const s = r.filter((m) => st.has(m.id) && m.position !== 'K'); return rebalance(r, s, s, 12, { keys: ['speed'], donorKeys: ['strength', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'agility'] }); },
  strength: () => (r) => { const st = starters(r); const s = r.filter((m) => st.has(m.id) && m.position !== 'K'); return rebalance(r, s, s, 12, { keys: ['strength'], donorKeys: ['speed', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'agility'] }); },
  superstars: () => (r) => { const st = starters(r); const s = r.filter((m) => st.has(m.id) && m.position !== 'K').sort((a, b) => monsterOverall(b) - monsterOverall(a)); return rebalance(r, s.slice(0, 3), s.slice(3), 15); },
  depth: () => (r) => { const st = starters(r); return rebalance(r, r.filter((m) => !st.has(m.id) && m.position !== 'K'), r.filter((m) => st.has(m.id) && m.position !== 'K'), 10); },
};
const acc = {}; const audit = {};
for (let i = 1; i <= G; i++) {
  const away = () => generatedTeam(7000 + i, { id: 'a', name: 'Away', quality: Q });
  let base = null;
  for (const [name, mk] of Object.entries(STRATEGIES)) {
    let info = null;
    const home = generatedTeam(5000 + i, { id: 'h', name: 'Home', quality: Q, afterRoster: (r) => { const before = { sum: sumOvr(r), st: [...starters(r)] }; const out = mk()(r); const stIds = starters(out); info = { sumBefore: before.sum, sumAfter: sumOvr(out), starterOvr: out.filter((m) => stIds.has(m.id)).reduce((s, m) => s + monsterOverall(m), 0) / Math.max(1, stIds.size) }; return out; } });
    const g = playGame({ home, away: away(), seed: 9000 + i, quarterLength: 180, otPeriods: 1 });
    const margin = g.score.home - g.score.away; const win = g.score.home > g.score.away ? 1 : g.score.home === g.score.away ? 0.5 : 0;
    if (name === 'control') base = { margin, win };
    const a = (acc[name] ||= { n: 0, d: 0, d2: 0, win: 0, dWin: 0, pf: 0 }); a.n++; a.d += margin - base.margin; a.d2 += (margin - base.margin) ** 2; a.win += win; a.dWin += win - base.win; a.pf += g.score.home;
    const b = (audit[name] ||= { budgetDiff: 0, starterOvr: 0 }); b.budgetDiff += info.sumAfter - info.sumBefore; b.starterOvr += info.starterOvr;
  }
}
const rows = Object.fromEntries(Object.entries(acc).map(([k, a]) => { const m = a.d / a.n; const sd = Math.sqrt(Math.max(0, a.d2 / a.n - m * m)); return [k, { games: a.n, marginVsControl: +m.toFixed(2), se: +(sd / Math.sqrt(a.n)).toFixed(2), winPct: +(100 * a.win / a.n).toFixed(1), winPctVsControl: +(100 * a.dWin / a.n).toFixed(1), pointsFor: +(a.pf / a.n).toFixed(1), meanBudgetDiffOvr: +(audit[k].budgetDiff / a.n).toFixed(2), meanStarterOvr: +(audit[k].starterOvr / a.n).toFixed(1) }]; }));
const out = { tool: 'balance-audit/roster-strategy', games: G, quality: Q, rows };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
