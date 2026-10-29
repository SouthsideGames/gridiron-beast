#!/usr/bin/env node
// AI Franchise Benchmark (Task 4, diagnostic only). Runs the production franchise lifecycle (tools/franchise-soak.mjs
// runFranchise: the game's own functions, a hands-off owner under a fixed policy) and records, without changing anything the
// game does, what the 15 persistent AI clubs decide and what happens to them: rosters, starters and depth by position, the cap,
// draft picks against the alternatives on the board at that moment, signings by source, contract departures, AI–AI trades
// valued at the time, development, records, playoffs and titles, and integrity checks after every week.
//
// Observation only. The harness reads the franchise object between the game's own steps (the soak's weekly `check` and
// `onSeason` hooks); it never calls a mutating function of its own and never writes a save. `--root` points the imports at
// another tree (the diagnostic variants of tools/ai-benchmark-variant.mjs, which are NOT production behaviour).
//
//   node tools/ai-franchise-benchmark.mjs --seeds=1-20 --seasons=10 [--difficulty=pro] [--root=DIR] [--scenario=NAME]
//        [--label=TEXT] [--json=out.json] [--quiet]
//
// Owner policy (fixed, documented in AI_FRANCHISE_BENCHMARK.md §4): the soak's hands-off owner — staff run every week, the
// trainer spends points, the first commissioner goal, the first postseason option, every expiring contract re-signed when
// possible, the best visible prospect at each pick, the cheapest free agents only up to the roster minimum; no trades, no
// calls answered. A dismissed owner is reinstated after the season (simulation only, the owner's rule of 2026-10-24) so every
// seed runs its full length.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const imp = (p) => import(path.join(ROOT, p));
const F = await imp('src/franchise/franchise.js');
const { runFranchise } = await imp('tools/franchise-soak.mjs');
const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs');
const REG = await imp('src/franchise/league-registry.js');
const LS = await imp('src/franchise/league-season.js');
const { buildDepthChart, lineupProblems, GROUP_SLOTS, teamOverall } = await imp('src/franchise/roster.js');
const { monsterOverall, FULL_ROSTER, ROSTER_MIN, ROSTER_MAX } = await imp('src/data/monsters.js');
const { playerValue, pickValue, positionNeeds, currentClassYear } = await imp('src/franchise/trades.js');
// The position-aware yardstick. The v42.16.0 tree has none, so `--valuation=PATH` (the Task 5 tree's src/franchise/trade-value.js) scores
// both trees' deals with the same function; without it the tree's own is used when it has one.
let marketValue = null;
try { ({ marketValue } = args.valuation ? await import(path.resolve(args.valuation)) : await imp('src/franchise/trade-value.js')); } catch { /* no position-aware valuation available */ }
const { ALL_TEAMS, tierById } = await imp('src/data/league.js');
const Save = await imp('src/franchise/save.js');
const L = await imp('src/franchise/league.js');
const T = await imp('src/franchise/trades.js');
const SCEN = args.scenario ? await import(path.join(path.dirname(new URL(import.meta.url).pathname), 'ai-benchmark-scenarios.mjs')) : null;

const [s0, s1] = String(args.seeds || '1-2').split('-').map(Number); const SEEDS = []; for (let s = s0; s <= (s1 || s0); s++) SEEDS.push(s);
const SEASONS = Number(args.seasons || 2), DIFF = args.difficulty || 'pro', quiet = !!args.quiet;
const POS = Object.keys(GROUP_SLOTS);
const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/** One club's state now: what a season-end row and the decision logs are built from. */
function clubState(f, club) {
  const roster = REG.clubRoster(f, club); const chart = buildDepthChart(roster);
  const byPos = {}; for (const m of roster) (byPos[m.position] ||= []).push(m);
  for (const l of Object.values(byPos)) l.sort((a, b) => monsterOverall(b) - monsterOverall(a));
  const starters = {}; const backups = {}; const startIds = new Set();
  for (const pos of POS) { const at = byPos[pos] || []; const n = GROUP_SLOTS[pos].length; starters[pos] = at.slice(0, n).map(monsterOverall); backups[pos] = at.slice(n).map(monsterOverall); for (const m of at.slice(0, n)) startIds.add(m.id); }
  return { roster, chart, byPos, starters, backups, startIds, problems: lineupProblems(roster, chart) };
}
/** Unused picks a club holds in one class year, by round [r1, r2, r3] (harness v3, read only). */
function picksHeld(f, club, year) { const out = [0, 0, 0]; for (const p of T.picksOwnedBy(f, club, year, ALL_TEAMS)) if (!T.pickUsed(f, p) && p.round >= 1 && p.round <= 3) out[p.round - 1]++; return out; }
/** Where a monster came from, read from his own history and the harness's record of where he was seen before arriving. */
function originOf(m, club, seenSource) {
  const h = (m.history || []); const stint = [...h].reverse().find((x) => x.club === club);
  const via = stint?.reason || 'unknown';
  if (via === 'signed') return `signed:${seenSource.get(m.id) || 'generated'}`;
  if (via === 'drafted') return 'drafted';
  if (via === 'traded') return 'traded';
  if (via === 'persistent') return 'original';
  return via;
}

export async function benchmarkSeed(seed, { seasons = SEASONS, difficulty = DIFF, scenario = null } = {}) {
  const t0 = Date.now(); let peak = process.memoryUsage().heapUsed;
  const rows = []; const decisions = { draft: [], departures: [], arrivals: [], trades: [], nudge: [], calls: [], tradeFollow: [] }; const integrity = [];
  const seenSource = new Map();          // id -> 'pool' | 'waivers': where an unrostered monster was last seen
  let prev = null;                        // last weekly snapshot: club -> Map(id -> {m, ovr, age, starter, pos})
  let prevOvr = new Map();                // id -> season-end ovr (development)
  const tradesSeen = new Set(); const drafted = new Map(); // id -> {club, year, round, overall}
  const mid = {};
  let applied = false; let scenarioSetup = null;

  const snap = (f) => { const out = {}; for (const c of REG.leagueClubs(f)) { const st = clubState(f, c); const mp = new Map(); for (const m of st.roster) mp.set(m.id, { m, ovr: monsterOverall(m), age: m.age, starter: st.startIds.has(m.id), pos: m.position }); out[c] = mp; } return out; };
  // Harness v3 (Task 5.5, recording only): cap room per club at each check, so a deal's cap effect can be read against the check before it.
  const capSnap = (f) => { const cap = tierById(f.tier).cap; return Object.fromEntries(REG.leagueClubs(f).map((c) => [c, REG.clubCapRoom(f, c, cap)])); };
  let prevCap = null; const callsSeen = new Set();
  /** Depth at one position in a snapshot: players there, the starter floor, the best backup. */
  const depthAt = (snapMap, pos) => { const xs = [...(snapMap?.values() || [])].filter((x) => x.pos === pos); const st = xs.filter((x) => x.starter).map((x) => x.ovr); const bk = xs.filter((x) => !x.starter).map((x) => x.ovr); return { n: xs.length, floor: st.length ? Math.min(...st) : null, mean: st.length ? r1(st.reduce((a, v) => a + v, 0) / st.length) : null, backup: bk.length ? Math.max(...bk) : null }; };
  /** An incoming offer to the owner (GDD §19.6), as it stands: who calls, what moves each way, and how it sits against the owner's own depth chart. Read only. */
  const noteCall = (f) => {
    const c = f.tradeCall; if (!c) return; const key = `${c.expires}|${c.team}|${c.kind || 'legacy'}`; if (callsSeen.has(key)) return; callsSeen.add(key);
    const sends = c.sends || (c.player ? [{ ...c.player, id: c.playerId }] : []); const asks = c.asks || [];
    const pos = c.position || sends[0]?.position || asks[0]?.position; const mine = f.roster.filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)); const n = GROUP_SLOTS[pos]?.length || 1;
    const floor = mine.length >= n ? monsterOverall(mine[n - 1]) : 0;
    decisions.calls.push({ year: f.season.year, week: f.season.finished ? 0 : f.season.week, offseason: !!f.offseason || !!f.season.finished, team: c.team, kind: c.kind || 'legacy', pos, sends: sends.map((m) => ({ pos: m.position, ovr: m.ovr, age: m.age, salary: m.salary ?? null })), asks: asks.map((m) => ({ pos: m.position, ovr: m.ovr, age: m.age, salary: m.salary ?? null })), give: (c.give || []).map((p) => `${p.year}R${p.round}`), sendPicks: (c.sendPicks || []).map((p) => `${p.year}R${p.round}`), value: c.value ?? null, ownerCountAtPos: mine.length, ownerFloorAtPos: floor, ownerBestAtPos: mine[0] ? monsterOverall(mine[0]) : null, wouldStart: sends[0] ? sends[0].ovr > floor : null, ownerRoster: f.roster.length });
  };
  const notePools = (f) => { for (const m of f.league?.waivers || []) seenSource.set(m.id, 'waivers'); for (const m of Object.values(f.pool || {}).flat()) seenSource.set(m.id, 'pool'); };

  // Roster movement between two snapshots: arrivals (with source) and departures (with reason), per club.
  const diff = (f, before, after, phase) => {
    const year = f.season.year;
    for (const c of Object.keys(after)) {
      const A = after[c], B = before?.[c]; if (!B) continue;
      for (const [id, x] of A) if (!B.has(id)) decisions.arrivals.push({ year, phase, club: c, id, pos: x.pos, ovr: x.ovr, age: x.age, origin: originOf(x.m, c, seenSource), starterNow: x.starter, rookie: x.m.rookie != null && x.m.drafted?.club === c });
      for (const [id, x] of B) if (!A.has(id)) { const stint = [...(x.m.history || [])].reverse().find((h) => h.club === c); decisions.departures.push({ year, phase, club: c, id, pos: x.pos, ovr: x.ovr, age: x.age, wasStarter: x.starter, reason: stint?.reason || 'unknown', why: null, potential: x.m.potential ?? null }); }
    }
  };

  const base = withBoardReset(leagueInvariants);
  const check = (f, where) => {
    if (scenario && !applied && F.hasLeague(f)) { scenarioSetup = scenario.apply(f, { REG, LS, L, T, monsterOverall, GROUP_SLOTS, ALL_TEAMS }); applied = true; }
    const p = base(f, where); for (const x of p) integrity.push(x);
    if (!F.hasLeague(f)) return p;
    const now = snap(f); const capNow = capSnap(f); noteCall(f);
    if (prev) diff(f, prev, now, f.season.finished ? 'season-end' : where.endsWith('start') ? 'offseason' : 'in-season');
    notePools(f);
    // AI–AI trades, valued at the first observation after the deal (ratings do not change between a deal and the next check).
    for (const t of f.league.trades || []) {
      const key = `${t.year}|${t.week}|${t.A}|${t.B}|${t.toA}`; if (tradesSeen.has(key)) continue; tradesSeen.add(key);
      const mA = f.league.monsters[t.toA]; const mB = t.toB ? f.league.monsters[t.toB] : null; const mBs = (t.toBAll || (t.toB ? [t.toB] : [])).map((id) => f.league.monsters[id]).filter(Boolean);
      // The class year AT THE DEAL (not at the first check after it: by then the season may have rolled over): an offseason deal (week 0) is made as the
      // season ends, so the next draft's class is the deal's year; an in-season deal sees next season's class, except in year 1 before the creation draft closes (week 10).
      const y0 = t.week === 0 ? t.year : (t.year === 1 && t.week <= 9 ? 1 : t.year + 1);
      const picksV = (t.picks || []).reduce((s, p) => s + pickValue(p, { yearsAhead: Math.max(0, p.year - y0) }), 0);
      const gotA = mA ? playerValue(mA) : null; const gotB = mBs.reduce((s, m) => s + playerValue(m), 0) + picksV; // the position-blind yardstick of the Task 4 baseline
      const mvYear = t.year; let mvA = mA && marketValue ? marketValue(mA, { year: mvYear }) : null; let mvB = marketValue ? mBs.reduce((s, m) => s + marketValue(m, { year: mvYear }), 0) + picksV : null; if (t.mv) { mvA = t.mv[0]; mvB = t.mv[1]; } // the deal's own record (Task 5 tree) is the values the clubs saw at the time // the position-aware one (Task 5 tree only)
      const stA = clubState(f, t.A);
      const startersOf = (snapMap) => [...(snapMap?.values() || [])].filter((x) => x.starter); const meanOf = (xs) => (xs.length ? xs.reduce((s, x) => s + x.ovr, 0) / xs.length : null);
      const floorOf = (snapMap, pos) => { const xs = startersOf(snapMap).filter((x) => x.pos === pos).map((x) => x.ovr); return xs.length ? Math.min(...xs) : null; };
      const pre = prev?.[t.A], post = now[t.A], preB = prev?.[t.B], postB = now[t.B];
      decisions.trades.push({ year: t.year, week: t.week, kind: t.kind, A: t.A, B: t.B, toA: t.toA, toAPos: mA?.position, toAOvr: mA ? monsterOverall(mA) : null, toAAge: mA?.age, toAStarter: mA ? stA.startIds.has(mA.id) : null, toB: t.toB || null, toBPos: mB?.position || null, toBOvr: mB ? monsterOverall(mB) : null, picks: (t.picks || []).map((p) => `${p.year}R${p.round}:${p.original}`), valueToA: r1(gotA), valueToB: r1(gotB), ratio: gotA && gotB ? r1(gotA / gotB * 100) / 100 : null, toBAllPos: mBs.map((m) => m.position), mvToA: r1(mvA), mvToB: r1(mvB), mvRatio: mvA && mvB ? r1(mvA / mvB * 100) / 100 : null, aFloorBefore: mA ? floorOf(pre, mA.position) : null, aFloorAfter: mA ? floorOf(post, mA.position) : null, aMeanBefore: r1(meanOf(startersOf(pre))), aMeanAfter: r1(meanOf(startersOf(post))), bMeanBefore: r1(meanOf(startersOf(preB))), bMeanAfter: r1(meanOf(startersOf(postB))), inSeason: !f.season.finished && t.week > 0, dealFloor: t.fl || null, dealMeans: t.sm || null,
        // harness v3 (recording only): salaries, cap room before (the check before the deal) and after, depth at the position on both sides, protection flags
        toASalary: mA?.salary ?? null, toBSalaries: mBs.map((m) => m.salary ?? null), toAContractEnds: mA?.contract?.ends ?? null, toAProtected: !!(mA && REG.isProtected(mA)), toBProtected: mBs.some((m) => REG.isProtected(m)),
        aCapBefore: prevCap?.[t.A] ?? null, aCapAfter: capNow[t.A] ?? null, bCapBefore: prevCap?.[t.B] ?? null, bCapAfter: capNow[t.B] ?? null,
        aDepthBefore: mA ? depthAt(pre, mA.position) : null, aDepthAfter: mA ? depthAt(post, mA.position) : null, bDepthBefore: mA ? depthAt(preB, mA.position) : null, bDepthAfter: mA ? depthAt(postB, mA.position) : null,
        bGotStarter: mB ? clubState(f, t.B).startIds.has(mB.id) : null, toBAge: mB?.age ?? null, toBAll: t.toBAll || (t.toB ? [t.toB] : []) });
    }
    if (f.season.week === 6 && !f.season.finished && !mid[f.season.year]) mid[f.season.year] = Object.fromEntries(REG.leagueClubs(f).map((c) => [c, teamOverall(F.aiTeam(f, c))]));
    prev = now; prevCap = capNow; peak = Math.max(peak, process.memoryUsage().heapUsed);
    return p;
  };

  const onSeason = (f) => {
    const year = f.season.year; const cap = tierById(f.tier).cap; const clubs = REG.leagueClubs(f).slice().sort();
    const s = f.season; const seeds = Object.values(s.playoffs?.seeds || {}).flat(); const fin = (s.playoffs?.results || []).find((x) => x.round === 3);
    const lo = f.leagueOffseason || {};
    const d = f.draft && !f.draft.creation ? f.draft : null;
    // Draft: every AI pick against the board at that moment (the class minus earlier picks) and the club's depth before the draft.
    if (d) {
      const clsById = Object.fromEntries(d.class.map((m) => [m.id, m]));
      const taken = new Set(); const thisDraft = {}; for (const p of d.picks) if (!p.mine && p.id) (thisDraft[p.team] ||= new Set()).add(p.id);
      for (const p of d.picks) {
        if (p.passed || !p.id) continue; const m = clsById[p.id];
        const avail = d.class.filter((x) => !taken.has(x.id) && x.id !== p.id);
        taken.add(p.id); if (p.mine) continue;
        const roster = REG.clubRoster(f, p.team).filter((x) => !thisDraft[p.team]?.has(x.id));
        const at = roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a)); const n = GROUP_SLOTS[m.position]?.length || 1;
        const need = positionNeeds(roster)[m.position] ?? null;
        const bestOvr = avail.reduce((b, x) => (monsterOverall(x) > monsterOverall(b || x) || !b ? x : b), null);
        const bestPot = avail.reduce((b, x) => (!b || (x.potential || 0) > (b.potential || 0) ? x : b), null);
        const needs = positionNeeds(roster); const topNeed = Object.entries(needs).sort((a, b) => b[1] - a[1])[0];
        const bestAtNeed = avail.filter((x) => x.position === topNeed?.[0]).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
        const rec = { year, club: p.team, round: p.round, overall: p.overall, id: m.id, pos: m.position, ovr: monsterOverall(m), pot: m.potential, age: m.age, boardRank: m.boardRank,
          needAtPos: r1(need), topNeedPos: topNeed?.[0] || null, topNeed: r1(topNeed?.[1]), countAtPos: at.length, slots: n, starterFloorAtPos: at.length >= n ? monsterOverall(at[n - 1]) : 0, wouldStart: at.length < n || monsterOverall(m) > monsterOverall(at[n - 1]),
          bestAvailOvr: bestOvr ? monsterOverall(bestOvr) : null, bestAvailPot: bestPot?.potential ?? null, bestAtNeedOvr: bestAtNeed ? monsterOverall(bestAtNeed) : null, sameDraftDup: d.picks.filter((q) => q.team === p.team && q.position === m.position && q.overall < p.overall).length };
        decisions.draft.push(rec); drafted.set(m.id, { club: p.team, year, round: p.round, overall: p.overall });
      }
    }
    const tableSnap = snap(f);
    for (const c of clubs) {
      const st = clubState(f, c); const rec = s.records[c]; const roster = st.roster;
      const startersAll = Object.values(st.starters).flat(); const avgStart = mean(startersAll) || 0;
      const groupAvg = Object.fromEntries(POS.filter((p) => p !== 'K').map((p) => [p, st.starters[p].length ? mean(st.starters[p]) : null]));
      const weak = Object.entries(groupAvg).filter(([p, v]) => v == null || v <= avgStart - 6 || st.starters[p].length < GROUP_SLOTS[p].length).map(([p]) => p);
      const surplus = POS.filter((p) => p !== 'K' && st.backups[p].length >= GROUP_SLOTS[p].length + 1 && (mean(st.backups[p]) || 0) >= (groupAvg[p] || 0) - 2);
      const prov = {}; const provStart = {};
      for (const m of roster) { const o = originOf(m, c, seenSource); prov[o] = (prov[o] || 0) + 1; if (st.startIds.has(m.id)) provStart[o] = (provStart[o] || 0) + 1; }
      const devs = roster.filter((m) => prevOvr.has(m.id)).map((m) => monsterOverall(m) - prevOvr.get(m.id));
      const evolved = roster.filter((m) => (m.career?.ev || []).some((e) => e.t === 'evolve' && e.y === year)).length;
      const strat = REG.clubRecord(f, c).strategy;
      const ages = roster.filter((m) => !REG.isProtected(m)).map((m) => m.age);
      rows.push({ seed, year, club: c, isRival: f.rivals?.[f.tier]?.team === c, w: rec.w, l: rec.l, pf: rec.pf, pa: rec.pa, playoffs: seeds.includes(c), finalist: !!fin && (fin.home === c || fin.away === c), champion: s.champion === c,
        teamOvr: teamOverall(F.aiTeam(f, c, year)), midOvr: mid[year]?.[c] ?? null, preOvr: strat.pre ?? null, grew: strat.grew ?? null, target: strat.today ?? null, quality: F.clubQuality(f, c, year),
        slowed: strat.slow || 0, boosted: strat.boost || 0, rosterSize: roster.length, payroll: REG.clubPayroll(f, c), capRoom: REG.clubCapRoom(f, c, cap), lineupProblems: st.problems.length,
        starters: Object.fromEntries(POS.map((p) => [p, st.starters[p]])), backupMean: Object.fromEntries(POS.map((p) => [p, r1(mean(st.backups[p]))])), backupCount: Object.fromEntries(POS.map((p) => [p, st.backups[p].length])),
        count: Object.fromEntries(POS.map((p) => [p, (st.byPos[p] || []).length])), avgStarter: r1(avgStart), weakGroups: weak, surplusGroups: surplus,
        meanAge: r1(mean(ages)), age30plus: ages.filter((a) => a >= 30).length, age24minus: ages.filter((a) => a <= 24).length, starterAge: r1(mean(roster.filter((m) => st.startIds.has(m.id) && !REG.isProtected(m)).map((m) => m.age))),
        provenance: prov, provenanceStarters: provStart, devMean: r1(mean(devs)), devN: devs.length, evolved, meanLevel: r1(mean(roster.map((m) => m.level))), stage2: roster.filter((m) => (m.stage || 0) >= 2).length, stage1: roster.filter((m) => (m.stage || 0) === 1).length,
        protected: roster.filter((m) => REG.isProtected(m)).length, injured: roster.filter((m) => m.injury).length,
        draftedStarters: roster.filter((m) => drafted.get(m.id)?.club === c && st.startIds.has(m.id)).length, draftedOnRoster: roster.filter((m) => drafted.get(m.id)?.club === c).length,
        // harness v3 (recording only): draft capital for the next two classes by round, and each starter and backup as [overall, age, (potential,) protected]
        picksNext: picksHeld(f, c, year + 2), picksNext2: picksHeld(f, c, year + 3),
        startersDetail: Object.fromEntries(POS.map((p) => [p, (st.byPos[p] || []).slice(0, GROUP_SLOTS[p].length).map((m) => [monsterOverall(m), m.age, REG.isProtected(m) ? 1 : 0])])),
        backupsDetail: Object.fromEntries(POS.map((p) => [p, (st.byPos[p] || []).slice(GROUP_SLOTS[p].length).map((m) => [monsterOverall(m), m.age, m.potential ?? null, REG.isProtected(m) ? 1 : 0])])) });
    }
    // harness v3: every pick of the next four classes has exactly one owner and it is a club of the league (draft-asset integrity)
    for (let y = year + 1; y <= year + 4; y++) for (let round = 1; round <= 3; round++) for (const original of ALL_TEAMS) { const o = T.pickOwner(f, { year: y, round, original }); if (!ALL_TEAMS.includes(o)) integrity.push(`season ${year}: pick ${y}R${round}:${original} owned by unknown club ${o}`); }
    // harness v3: where every monster a trade moved is now (club, starter, overall), season by season after the deal
    { const where = new Map(); for (const c of clubs) for (const [id, x] of tableSnap[c]) where.set(id, { club: c, starter: x.starter, ovr: x.ovr, age: x.age }); for (const m of f.roster) where.set(m.id, { club: f.club, starter: null, ovr: monsterOverall(m), age: m.age });
      decisions.trades.forEach((t, ti) => { if (t.year > year) return; const follow = (side, id, club) => { const w = where.get(id); decisions.tradeFollow.push([ti, year, side, id, w?.club ?? null, w ? (w.club === club ? 1 : 0) : 0, w?.starter == null ? null : (w.starter ? 1 : 0), w?.ovr ?? null, w?.age ?? null]); };
        if (t.toA) follow('A', t.toA, t.A); for (const id of t.toBAll || []) follow('B', id, t.B); }); }
    noteCall(f);
    // the owner's club, labelled (not one of the 15)
    { const rec = s.records[f.club]; rows.push({ seed, year, club: f.club, owner: true, w: rec.w, l: rec.l, playoffs: seeds.includes(f.club), finalist: !!fin && (fin.home === f.club || fin.away === f.club), champion: s.champion === f.club, teamOvr: teamOverall(F.playerTeam(f)), rosterSize: f.roster.length }); }
    decisions.nudge.push({ year, contracts: lo.contracts ? { resigned: lo.contracts.resigned, walked: lo.contracts.walked, released: lo.contracts.released, runaway: lo.contracts.runaway || [], overCap: lo.contracts.overCap || [] } : null, freeAgency: lo.opened === year ? lo.freeAgency : null, nudge: lo.opened === year && lo.nudge ? { boosted: lo.nudge.boosted, slowed: lo.nudge.slowed } : null, offseasonTrades: lo.opened === year ? lo.trades : null, problems: lo.problems || [] });
    prevOvr = new Map(); for (const mp of Object.values(tableSnap)) for (const [id, x] of mp) prevOvr.set(id, x.ovr);
    // Save integrity at the season boundary: the whole league registry survives an export/import round trip unchanged.
    try { const back = Save.importJson(Save.exportJson(f)); if (!back) integrity.push(`season ${year}: save import failed`); else if (JSON.stringify(back.league) !== JSON.stringify(f.league)) integrity.push(`season ${year}: save round trip changed the league registry`); } catch (e) { integrity.push(`season ${year}: save round trip threw ${e.message}`); }
  };

  let res;
  try { res = runFranchise(seed, { seasons, difficulty, check, onSeason }); }
  catch (e) { return { seed, error: String(e?.stack || e).slice(0, 2000), rows, decisions, integrity, seconds: Math.round((Date.now() - t0) / 1000) }; }
  const { f, problems, log } = res;
  // Later contribution of AI draftees: where each one is at the end of the run.
  const draftOutcome = [...drafted.entries()].map(([id, x]) => { const m = f.league.monsters[id]; const club = m ? REG.leagueClubs(f).find((c) => REG.clubRecord(f, c).roster.includes(id)) : null; const st = club ? clubState(f, club) : null; return { id, ...x, endClub: club, sameClub: club === x.club, endOvr: m ? monsterOverall(m) : null, endStarter: st ? st.startIds.has(id) : false, inLeague: !!m }; });
  return { seed, difficulty, scenarioSetup, seasons: log.seasons.length, ownerClub: f.club, rival: f.rivals?.[f.tier]?.team || null, problems: [...new Set([...problems, ...integrity])].slice(0, 50), problemCount: problems.length, rows, decisions, draftOutcome, seconds: Math.round((Date.now() - t0) / 1000), peakHeapMB: Math.round(peak / 1048576), fired: log.fired };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scenario = SCEN && args.scenario ? SCEN.SCENARIOS[args.scenario] : null; if (args.scenario && !scenario) { console.error(`unknown scenario ${args.scenario}`); process.exit(2); }
  const out = { harnessV: 3, label: args.label || null, root: ROOT, difficulty: DIFF, seasonsRequested: SEASONS, seeds: SEEDS, scenario: args.scenario || null, node: process.version, started: new Date().toISOString(), runs: [] };
  for (const seed of SEEDS) {
    const r = await benchmarkSeed(seed, { scenario });
    out.runs.push(r);
    if (!quiet) console.error(`seed ${seed}: ${r.seasons ?? '?'} seasons, ${r.seconds}s, heap ${r.peakHeapMB} MB, problems ${r.problemCount ?? 'n/a'}${r.error ? ' ERROR ' + r.error.split('\n')[0] : ''}`);
  }
  out.hash = createHash('sha256').update(JSON.stringify(out.runs.map(({ seconds, peakHeapMB, ...x }) => x))).digest('hex');
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(out));
  console.log(JSON.stringify({ hash: out.hash, seeds: SEEDS.length, seconds: out.runs.reduce((s, r) => s + r.seconds, 0), errors: out.runs.filter((r) => r.error).length, problems: out.runs.reduce((s, r) => s + (r.problemCount || 0), 0) }));
}
