#!/usr/bin/env node
// Roster construction over whole seasons at a constant ACTUAL payroll (follow-up brief I-5, observation only).
//
// Corrects tools/balance-audit/roster-strategy.mjs, which held the summed OVERALL constant (constant payroll only under the old linear
// salary). Here the budget is the club's real payroll, the sum of salaryFor(m) (src/data/monsters.js: 18,000 + 280·OVR plus the elite
// premium above OVR 70), so a star costs what he costs and depth is bought with real money. Each strategy raises its target monsters'
// attributes and lowers its donors' one point at a time until the payroll is back at or below the control's (never above it).
//
// A season is 14 games against 14 generated opponents plus 2 postseason games against stronger ones (always played, so every strategy
// is measured under the same accumulated wear), with the production consequences between games: in-game injuries committed from the
// game (commitGameInjuries), afterGame fatigue and injury risk, a normal practice (practiceFatigue) and the weekly recovery
// (recoverWeek). The weekly team is rebuilt from the roster (buildTeam: injured monsters drop out of the chart, the bench and the
// rotation fill in). Development is held at zero (xpScale 0) so ratings are the strategy's, not a season of growth. Rotation
// philosophy comes from the coach (heavy / balanced / starters), varied by the *_heavy / *_starters strategies. The same club, the same
// opponents and the same seeds are played once per strategy; the paired difference against the control is the strategy's effect.
// No artificial depth reward exists or is added. Nothing in the game is changed.
//
//   node tools/balance-audit/roster-season.mjs [--seasons=24] [--quality=60] [--only=depth,superstars] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const { generatedTeam, buildTeam, buildDepthChart, GROUP_SLOTS, borrowedSlots } = await import(path.join(root, 'src/franchise/roster.js'));
const { playGame } = await import(path.join(root, 'src/sim/game-runner.js'));
const { monsterOverall, salaryFor } = await import(path.join(root, 'src/data/monsters.js'));
const { afterGame, recoverWeek } = await import(path.join(root, 'src/franchise/progression.js'));
const { commitGameInjuries } = await import(path.join(root, 'src/sim/substitutions.js'));
const { practiceFatigue } = await import(path.join(root, 'src/franchise/franchise.js'));
const { createRng } = await import(path.join(root, 'src/core/rng.js'));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const SEASONS = Number(args.seasons) || 24, Q = Number(args.quality) || 60;
const OFF = ['QB', 'RB', 'WR', 'TE', 'OL'], DEF = ['DL', 'LB', 'CB', 'S'];
const startersOf = (roster) => { const c = buildDepthChart(roster); return new Set(Object.values(GROUP_SLOTS).flat().map((s) => c[s]).filter(Boolean)); };
const payroll = (roster) => roster.reduce((s, m) => s + salaryFor(m), 0);
const addAll = (m, d, keys = null) => { for (const k of keys || Object.keys(m.attributes)) m.attributes[k] = Math.max(20, Math.min(99, m.attributes[k] + d)); };
function rebalance(roster, targets, donors, boost, { keys = null, donorKeys = null } = {}) {
  const budget = payroll(roster);
  for (const m of targets) addAll(m, boost, keys);
  let guard = 0; while (payroll(roster) > budget && guard++ < 80) for (const m of donors) { addAll(m, -1, donorKeys); if (payroll(roster) <= budget) break; }
  return roster;
}
const nonK = (m) => m.position !== 'K';
const STRATEGIES = {
  control: { make: (r) => r },
  superstars: { make: (r) => { const st = startersOf(r); const s = r.filter((m) => st.has(m.id) && nonK(m)).sort((a, b) => monsterOverall(b) - monsterOverall(a)); return rebalance(r, s.slice(0, 3), s.slice(3), 15); } },
  eliteQB: { make: (r) => { const st = startersOf(r); return rebalance(r, r.filter((m) => st.has(m.id) && m.position === 'QB'), r.filter((m) => st.has(m.id) && m.position !== 'QB' && nonK(m)), 15); } },
  depth: { make: (r) => { const st = startersOf(r); return rebalance(r, r.filter((m) => !st.has(m.id) && nonK(m)), r.filter((m) => st.has(m.id) && nonK(m)), 10); } },
  thinBench: { make: (r) => { const st = startersOf(r); return rebalance(r, r.filter((m) => st.has(m.id) && nonK(m)), r.filter((m) => !st.has(m.id) && nonK(m)), 6); } }, // starters bought with the bench's money (the depth strategy's opposite)
  balanced: { make: (r) => r, note: 'control roster (same money) — listed for the rotation variants' },
  control_heavy: { make: (r) => r, rotation: 'heavy' },
  control_starters: { make: (r) => r, rotation: 'starters' },
  depth_heavy: { make: (r) => STRATEGIES.depth.make(r), rotation: 'heavy' },
  thinBench_starters: { make: (r) => STRATEGIES.thinBench.make(r), rotation: 'starters' },
};
delete STRATEGIES.balanced;
const pick = Object.entries(STRATEGIES).filter(([n]) => !args.only || n === 'control' || String(args.only).split(',').includes(n));
function season(i, name, strat) {
  let info = null;
  const base = generatedTeam(5000 + i, { id: 'h', name: 'Home', quality: Q, afterRoster: (r) => { const before = payroll(r); const out = strat.make(r); info = { payrollBefore: before, payrollAfter: payroll(out) }; return out; } });
  const roster = base.roster; for (const m of roster) { m.fatigue = 0; m.injury = null; }
  const coach = { ...(base.coach || {}), substitution: strat.rotation || 'balanced' };
  const rng = createRng(77000 + i);
  const S = { w: 0, l: 0, t: 0, margin: 0, lateMargin: 0, poMargin: 0, poWins: 0, injuries: 0, starterGamesMissed: 0, borrowed: 0, fatigueAtKick: [], forfeits: 0 };
  const starters0 = startersOf(roster);
  for (let wk = 1; wk <= 16; wk++) {
    const post = wk > 14;
    const opp = generatedTeam(8000 + i * 31 + wk, { id: 'a', name: 'Away', quality: post ? Q + 3 : Q - 4 + ((wk * 5 + i) % 9) });
    const home = buildTeam({ id: 'h', name: 'Home', roster, coach, offensePlays: base.offensePlays, defensePlays: base.defensePlays });
    S.starterGamesMissed += [...starters0].filter((id) => roster.find((m) => m.id === id)?.injury).length;
    S.borrowed += borrowedSlots(roster, home.chart).length;
    const onChart = Object.values(home.chart).filter(Boolean); S.fatigueAtKick.push(onChart.reduce((s, id) => s + (roster.find((m) => m.id === id)?.fatigue || 0), 0) / Math.max(1, onChart.length));
    const g = playGame({ home, away: opp, seed: 90000 + i * 101 + wk, quarterLength: 180, otPeriods: 1, frames: 'last' });
    const margin = g.score.home - g.score.away; S.margin += margin; if (wk >= 10) S.lateMargin += margin; if (post) { S.poMargin += margin; if (margin > 0) S.poWins++; }
    if (margin > 0) S.w++; else if (margin < 0) S.l++; else S.t++;
    const ev = afterGame(roster, home.chart, g.stats?.home?.players || {}, rng, { won: margin > 0, autoSpend: false, autoEvolve: false, xpScale: 0, liveInjuries: !!g.rotation });
    ev.push(...commitGameInjuries(roster, g)); S.injuries += ev.filter((e) => e.kind === 'injury').length;
    practiceFatigue(roster, 'normal'); recoverWeek(roster);
  }
  return { ...S, fatigueAtKick: S.fatigueAtKick.reduce((a, b) => a + b, 0) / S.fatigueAtKick.length, ...info };
}
const acc = {};
for (let i = 1; i <= SEASONS; i++) {
  let base = null;
  for (const [name, strat] of pick) {
    const s = season(i, name, strat); if (name === 'control') base = s;
    const a = (acc[name] ||= { n: 0, wins: 0, dWins: [], dMargin: [], dLate: [], dPO: [], poWins: 0, injuries: 0, missed: 0, borrowed: 0, fatigue: 0, payDiff: 0 });
    a.n++; a.wins += s.w + s.t / 2; a.dWins.push(s.w + s.t / 2 - (base.w + base.t / 2)); a.dMargin.push((s.margin - base.margin) / 16); a.dLate.push((s.lateMargin - base.lateMargin) / 7); a.dPO.push((s.poMargin - base.poMargin) / 2);
    a.poWins += s.poWins; a.injuries += s.injuries; a.missed += s.starterGamesMissed; a.borrowed += s.borrowed; a.fatigue += s.fatigueAtKick; a.payDiff += s.payrollAfter - s.payrollBefore;
  }
  if (!args.quiet) console.error(`season ${i}/${SEASONS}`);
}
const ms = (v) => { const m = v.reduce((x, y) => x + y, 0) / v.length; const sd = Math.sqrt(Math.max(0, v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length)); return [+m.toFixed(2), +(sd / Math.sqrt(v.length)).toFixed(2)]; };
const rows = Object.fromEntries(Object.entries(acc).map(([k, a]) => { const [dw, dwse] = ms(a.dWins), [dm, dmse] = ms(a.dMargin), [dl, dlse] = ms(a.dLate), [dp, dpse] = ms(a.dPO);
  return [k, { seasons: a.n, winsOf14plus2: +(a.wins / a.n).toFixed(2), winsVsControl: dw, se: dwse, marginPerGameVsControl: dm, marginSe: dmse, lateSeasonMarginVsControl: dl, lateSe: dlse, postseasonMarginVsControl: dp, postSe: dpse,
    postseasonWinsPerSeason: +(a.poWins / a.n).toFixed(2), injuriesPerSeason: +(a.injuries / a.n).toFixed(1), starterGamesMissedPerSeason: +(a.missed / a.n).toFixed(1), borrowedSlotsPerSeason: +(a.borrowed / a.n).toFixed(2), meanStarterFatigueAtKickoff: +(a.fatigue / a.n).toFixed(1), payrollChange: Math.round(a.payDiff / a.n) }]; }));
const out = { tool: 'balance-audit/roster-season', seasons: SEASONS, quality: Q, rows };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
