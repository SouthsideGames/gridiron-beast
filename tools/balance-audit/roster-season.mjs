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
// F-13 experiment (in this process only; the game's recoverWeek is unchanged): --recovery=N replaces the weekly fatigue recovery (production
// 28) with N, otherwise exactly as recoverWeek (injury weeks count down, fatigue floored at 0).
const RECOVERY = args.recovery != null ? Number(args.recovery) : null;
// D-7 experiment (owner 2026-11-26; in this process only, nothing in the game changes): --fatigueStart=K lets weekly fatigue lower the
// stamina a monster STARTS a game with. Production (A, K = 0): every game starts at full stamina (capacity = permanent Durability) and
// weekly fatigue never reaches game stamina. B / C: at the first step of each game every home monster's record is lowered by
// round(capacity * K * fatigue / 100) points (bounded: K <= 0.35, never to exhaustion); capacity, the drain, halftime and the
// rotation rules are unchanged. Opponents are generated fresh each week (fatigue 0), so the paired comparison is between strategies
// under the same variant.
const FSTART = Math.min(0.35, Math.max(0, Number(args.fatigueStart) || 0));
const SR = await import(path.join(root, 'src/sim/t8/stamina-runtime.js'));
const ratioOf = (st, id) => { const r = st.t8?.stamina?.[id]; if (!r) return null; const v = typeof r.stamina === 'number' ? r.stamina : (r.stamina.n ?? r.stamina[0]) / (r.stamina.d ?? r.stamina[1] ?? 1); return v / r.capacity; };
const qs = (a) => { const s = a.slice().sort((x, y) => x - y); const q = (p) => (s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null); return { p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: s.length ? s.at(-1) : null }; };
const weekRecover = (roster) => { if (RECOVERY == null) return recoverWeek(roster); for (const m of roster) { m.fatigue = Math.max(0, (m.fatigue || 0) - RECOVERY); if (m.injury) { m.injury.weeks -= 1; if (m.injury.weeks <= 0) m.injury = null; } } return []; };
const OFF = ['QB', 'RB', 'WR', 'TE', 'OL'], DEF = ['DL', 'LB', 'CB', 'S'];
const startersOf = (roster) => { const c = buildDepthChart(roster); return new Set(Object.values(GROUP_SLOTS).flat().map((s) => c[s]).filter(Boolean)); };
const payroll = (roster) => roster.reduce((s, m) => s + salaryFor(m), 0);
const addAll = (m, d, keys = null) => { for (const k of keys || Object.keys(m.attributes)) m.attributes[k] = Math.max(20, Math.min(99, m.attributes[k] + d)); };
// F-13 (2026-11-26) corrections:
// 1. Never above the control's payroll. When the donors reach their rating floor before the money balances (the thin-bench case: the
//    bench is already cheap), the targets' boost is taken back one point at a time until the payroll fits. Unused money is reported.
// 2. The strategy's ratings are written into the development record (dev.current). afterGame → applyAward → syncFromDev rebuilds
//    `attributes` from dev.current after every game, so before this fix every strategy's roster reverted to the unchanged roster after
//    game 1: from week 2 on all strategies played the same club (the duplicated late-season and postseason figures).
function rebalance(roster, targets, donors, boost, { keys = null, donorKeys = null } = {}) {
  const budget = payroll(roster);
  for (const m of targets) addAll(m, boost, keys);
  let guard = 0; while (payroll(roster) > budget && guard++ < 80) for (const m of donors) { addAll(m, -1, donorKeys); if (payroll(roster) <= budget) break; }
  guard = 0; while (payroll(roster) > budget && guard++ < 80) for (const m of targets) { addAll(m, -1, keys); if (payroll(roster) <= budget) break; }
  if (payroll(roster) > budget) throw new Error(`rebalance could not reach the payroll budget (${payroll(roster)} > ${budget})`);
  return roster;
}
const commitRatings = (roster) => { for (const m of roster) if (m.dev?.current) m.dev.current = { ...m.dev.current, ...m.attributes }; return roster; };
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
  const base = generatedTeam(5000 + i, { id: 'h', name: 'Home', quality: Q, afterRoster: (r) => { const before = payroll(r); const out = commitRatings(strat.make(r)); info = { payrollBefore: before, payrollAfter: payroll(out) }; return out; } });
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
    const fat = Object.fromEntries(roster.map((m) => [m.id, m.fatigue || 0])); const st0 = new Set(onChart);
    for (const id of onChart) (S.fatStarters ||= []).push(fat[id]); for (const m of roster) if (!st0.has(m.id)) (S.fatBench ||= []).push(fat[m.id]);
    let hooked = false, lastQ = 1, subs = 0, subsFatigue = 0, lastPlay = -1; const qRatio = [];
    const starterRatio = (st) => { const v = onChart.map((id) => ratioOf(st, id)).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const onStep = (ev, st) => {
      if (!hooked) { hooked = true; const inputs = home.rotationInputs || [];
        if (FSTART > 0) for (const x of inputs) { const rec = SR.staminaOf(st, x); const pts = Math.round(rec.capacity * FSTART * (fat[x.id] || 0) / 100); if (pts > 0) SR.drainPoints(st, x, Math.min(pts, rec.capacity - 1)); }
        const r = starterRatio(st); if (r != null) (S.startRatio ||= []).push(r); }
      if (st.quarter !== lastQ) { qRatio[lastQ] = starterRatio(st); lastQ = st.quarter; }
      for (const n of st.rotation?.notices || []) if (n.side === 'home' && n.play > lastPlay) { subs++; if (n.reason === 'fatigue') subsFatigue++; }
      lastPlay = Math.max(lastPlay, ...((st.rotation?.notices || []).map((n) => n.play)), -1);
    };
    const g = playGame({ home, away: opp, seed: 90000 + i * 101 + wk, quarterLength: 180, otPeriods: 1, frames: 'last', onStep });
    qRatio[Math.min(4, lastQ)] ??= starterRatio(g); for (let q = 1; q <= 4; q++) if (qRatio[q] != null) ((S.qRatio ||= [[], [], [], [], []])[q]).push(qRatio[q]);
    S.subs = (S.subs || 0) + subs; S.subsFatigue = (S.subsFatigue || 0) + subsFatigue; S.exhausted = (S.exhausted || 0) + Object.entries(g.t8?.stamina || {}).filter(([id, r]) => r.exhausted && roster.some((m) => m.id === id)).length;
    const margin = g.score.home - g.score.away; S.margin += margin; if (wk >= 10) S.lateMargin += margin; if (post) { S.poMargin += margin; if (margin > 0) S.poWins++; }
    if (margin > 0) S.w++; else if (margin < 0) S.l++; else S.t++;
    { const pl = g.stats?.home?.players || {}; const byId = Object.fromEntries(roster.map((m) => [m.id, m])); let bench = 0, all = 0; for (const [k, st] of Object.entries(pl)) { const n = (st.snapsOff || 0) + (st.snapsDef || 0); all += n; const id = byId[k] ? k : home.chart[k]; if (id && !starters0.has(id)) bench += n; } S.benchShare = (S.benchShare || 0) + (all ? bench / all : 0); }
    if (args.trace) { const pl = g.stats?.home?.players || {}; const byId = Object.fromEntries(roster.map((m) => [m.id, m])); let bench = 0, all = 0; for (const [k, st] of Object.entries(pl)) { const n = (st.snapsOff || 0) + (st.snapsDef || 0); all += n; const id = byId[k] ? k : home.chart[k]; if (id && !starters0.has(id)) bench += n; } (S.trace ||= []).push(`${margin}/${all ? Math.round(100 * bench / all) : 0}%`); }
    const ev = afterGame(roster, home.chart, g.stats?.home?.players || {}, rng, { won: margin > 0, autoSpend: false, autoEvolve: false, xpScale: 0, liveInjuries: !!g.rotation });
    ev.push(...commitGameInjuries(roster, g)); S.injuries += ev.filter((e) => e.kind === 'injury').length;
    practiceFatigue(roster, 'normal'); weekRecover(roster);
  }
  const mean = (a) => (a?.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : null);
  S.dist = { starterFatigueAtKickoff: qs(S.fatStarters || []), benchFatigueAtKickoff: qs(S.fatBench || []), starterStartStamina: mean(S.startRatio), starterStaminaAt_Q2start_Q3startAfterHalftime_Q4start_final: [1, 2, 3, 4].map((q) => mean(S.qRatio?.[q])), subsPerGame: +(S.subs / 16).toFixed(2), fatigueSubsPerGame: +(S.subsFatigue / 16).toFixed(2), exhaustedPerGame: +(S.exhausted / 16).toFixed(2), payroll: payroll(roster), rosterSize: roster.length };
  delete S.fatStarters; delete S.fatBench; delete S.startRatio; delete S.qRatio;
  return { ...S, endFatigue: S.fatigueAtKick.at(-1), peakFatigue: Math.max(...S.fatigueAtKick), fatigueAtKick: S.fatigueAtKick.reduce((a, b) => a + b, 0) / S.fatigueAtKick.length, benchShare: S.benchShare / 16, ...info };
}
const acc = {};
for (let i = 1; i <= SEASONS; i++) {
  let base = null;
  for (const [name, strat] of pick) {
    const s = season(i, name, strat); if (name === 'control') base = s;
    if (args.trace) console.error(`season ${i} ${name.padEnd(20)} ${s.trace.join(' ')} pay ${s.payrollBefore}->${s.payrollAfter}`);
    const a = (acc[name] ||= { n: 0, wins: 0, dWins: [], dMargin: [], dLate: [], dPO: [], poWins: 0, injuries: 0, missed: 0, borrowed: 0, fatigue: 0, payDiff: 0 });
    (a.dists ||= []).push(s.dist); a.n++; a.wins += s.w + s.t / 2; a.dWins.push(s.w + s.t / 2 - (base.w + base.t / 2)); a.dMargin.push((s.margin - base.margin) / 16); a.dLate.push((s.lateMargin - base.lateMargin) / 7); a.dPO.push((s.poMargin - base.poMargin) / 2);
    a.poWins += s.poWins; a.injuries += s.injuries; a.missed += s.starterGamesMissed; a.borrowed += s.borrowed; a.fatigue += s.fatigueAtKick; a.payDiff += s.payrollAfter - s.payrollBefore; a.endF = (a.endF || 0) + s.endFatigue; a.peakF = (a.peakF || 0) + s.peakFatigue; a.bench = (a.bench || 0) + s.benchShare; a.unused = Math.max(a.unused || 0, s.payrollBefore - s.payrollAfter);
  }
  if (!args.quiet) console.error(`season ${i}/${SEASONS}`);
}
const ms = (v) => { const m = v.reduce((x, y) => x + y, 0) / v.length; const sd = Math.sqrt(Math.max(0, v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length)); return [+m.toFixed(2), +(sd / Math.sqrt(v.length)).toFixed(2)]; };
const avgDist = (L) => { const o = {}; for (const d of L) for (const [k, v] of Object.entries(d)) { if (typeof v === 'number') (o[k] ||= []).push(v); else if (Array.isArray(v)) (o[k] ||= v.map(() => [])).forEach((b, i) => v[i] != null && b.push(v[i])); else if (v && typeof v === 'object') for (const [q, x] of Object.entries(v)) if (x != null) ((o[k] ||= {})[q] ||= []).push(x); }
  const m = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? (Array.isArray(v[0]) ? v.map((b) => (b.length ? m(b) : null)) : m(v)) : Object.fromEntries(Object.entries(v).map(([q, b]) => [q, m(b)]))])); };
const rows = Object.fromEntries(Object.entries(acc).map(([k, a]) => { const [dw, dwse] = ms(a.dWins), [dm, dmse] = ms(a.dMargin), [dl, dlse] = ms(a.dLate), [dp, dpse] = ms(a.dPO);
  return [k, { seasons: a.n, winsOf14plus2: +(a.wins / a.n).toFixed(2), winsVsControl: dw, se: dwse, marginPerGameVsControl: dm, marginSe: dmse, lateSeasonMarginVsControl: dl, lateSe: dlse, postseasonMarginVsControl: dp, postSe: dpse,
    postseasonWinsPerSeason: +(a.poWins / a.n).toFixed(2), injuriesPerSeason: +(a.injuries / a.n).toFixed(1), starterGamesMissedPerSeason: +(a.missed / a.n).toFixed(1), borrowedSlotsPerSeason: +(a.borrowed / a.n).toFixed(2), meanStarterFatigueAtKickoff: +(a.fatigue / a.n).toFixed(1), endOfSeasonFatigue: +(a.endF / a.n).toFixed(1), peakFatigue: +(a.peakF / a.n).toFixed(1), benchSnapSharePct: +(100 * a.bench / a.n).toFixed(1), payrollChange: Math.round(a.payDiff / a.n), maxUnusedPayroll: a.unused }]; }));
for (const [k, a] of Object.entries(acc)) rows[k].distributions = avgDist(a.dists); // per-season quantiles, averaged over seasons
const out = { tool: 'balance-audit/roster-season', seasons: SEASONS, quality: Q, recovery: RECOVERY ?? 'production (28)', fatigueStart: FSTART || 'production (A: none)', season: 'fixed 16-game study: 14 regular games + 2 postseason games always played (a real season has 14 games and a postseason only for qualifiers)', rows };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
