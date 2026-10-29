#!/usr/bin/env node
// Phase C run-game probes (offensive run-play audit and Phase C1). Developer tooling only: it runs the real engine through the
// Attribute Lab setup (src/lab/attr-trials.js: every monster a plain 65, no ability, no type) or full generated-team games, with
// fixed seeds, so the same command on two trees (--root) compares engines play for play. It changes nothing and stores nothing.
//
// Sections (--only=a,b; default matrix,blockers,claims):
//   matrix    every live run against every defensive call (--n plays per cell): yards per carry, success (4+), negative, 10+ and
//             20+ runs, yards before contact, share of tackles by a defender no blocker ever engaged, who tackles; by play and by call
//   blockers  every designed blocker on every live run: how often he engages anyone, before or after the handoff, and whom
//   claims    each run's lesson (beats / loses) and each call's lesson naming a run, checked against the matrix: the cell's rank
//             among that run's 26 calls (a "beats" holds in the top third for the side that beats, a "loses" in the bottom third)
//   games     full games (--games, --offset): points, drives, yards per carry and per pass, run success, by play
//   node tools/run-study.mjs [--root=DIR] [--only=matrix,games] [--n=100] [--games=120] [--offset=0] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const N = Number(args.n) || 100, G = Number(args.games) || 120, OFF = Number(args.offset) || 0;
const only = args.only ? String(args.only).split(',') : ['matrix', 'blockers', 'claims']; const want = (k) => only.includes(k);
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const { PLAYS, OFFENSE_IDS, DEFENSE_IDS, LESSONS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const RUNS = OFFENSE_IDS.filter((k) => PLAYS[k].type === 'run');
const r2 = (v) => +v.toFixed(2); const mean = (a) => (a.length ? r2(a.reduce((x, y) => x + y, 0) / a.length) : null); const pct = (a) => (a.length ? +(100 * a.filter(Boolean).length / a.length).toFixed(1) : null);
const pos = (f, side, slot) => f[side].find((p) => p[0] === slot);
const log = (...a) => { if (!args.quiet) console.log(...a); };
const out = { root: ROOT, n: N };

function analyse(s) {
  const fr = s.frames.filter((f) => f.t >= 0); const ho = s.events.find((e) => ['handoff', 'pitch'].includes(e.kind)); const tH = ho ? ho.t : 0; const carrier = s.stats.carrier || 'QB';
  let ybc = null; for (const f of fr) { if (f.t < tH || f.holder !== carrier) continue; const c = pos(f, 'off', carrier); if (c && f.def.some((d) => !d[3] && Math.hypot(d[1] - c[1], d[2] - c[2]) < 1.0)) { ybc = c[1]; break; } }
  const tk = s.events.find((e) => e.kind === 'tackle'); const tackler = s.stats.tackler;
  const engaged = tackler ? fr.some((f) => f.t < (tk?.t ?? 99) && pos(f, 'def', tackler)?.[3]) : null;
  return { yards: s.yards, ybc: ybc ?? s.yards, tackler, unblocked: tackler ? !engaged : null, kind: tackler ? tackler.replace(/\d/g, '') : null };
}
const line = (rows) => ({ n: rows.length, ypc: mean(rows.map((r) => r.yards)), success: pct(rows.map((r) => r.yards >= 4)), negative: pct(rows.map((r) => r.yards < 0)), ten: pct(rows.map((r) => r.yards >= 10)), twenty: pct(rows.map((r) => r.yards >= 20)), beforeContact: mean(rows.map((r) => r.ybc)), unblockedTackler: pct(rows.filter((r) => r.tackler).map((r) => r.unblocked)), byDL: pct(rows.filter((r) => r.tackler).map((r) => r.kind === 'DL')), byLB: pct(rows.filter((r) => r.tackler).map((r) => r.kind === 'LB')), byDB: pct(rows.filter((r) => r.tackler).map((r) => ['CB', 'FS', 'SS'].includes(r.kind))) });

if (want('matrix') || want('claims')) {
  const cell = {}, byPlay = {}, byCall = {};
  for (const off of RUNS) for (const def of DEFENSE_IDS) { const rows = Array.from({ length: N }, (_, i) => analyse(T.play({ off, def, attr: 'speed', value: 65, seed: 70000 + i }))); (cell[off] ||= {})[def] = line(rows); (byPlay[off] ||= []).push(...rows); (byCall[def] ||= []).push(...rows); }
  out.matrix = { cell, byPlay: Object.fromEntries(Object.entries(byPlay).map(([k, v]) => [k, line(v)])), byCall: Object.fromEntries(Object.entries(byCall).map(([k, v]) => [k, line(v)])), all: line(Object.values(byPlay).flat()) };
  log('== matrix (plain 65s,', N, 'plays per cell)'); for (const [k, v] of Object.entries({ ...out.matrix.byPlay, ALL: out.matrix.all })) log(`  ${k.padEnd(13)} ${JSON.stringify(v)}`);
  log('  by call:'); for (const [k, v] of Object.entries(out.matrix.byCall).sort((a, b) => a[1].ypc - b[1].ypc)) log(`  ${k.padEnd(14)} ${v.ypc} yd, success ${v.success}%, 10+ ${v.ten}%`);
}

if (want('claims')) {
  const M = out.matrix.cell; const rank = (o, d) => DEFENSE_IDS.map((c) => M[o][c].ypc).sort((a, b) => a - b).indexOf(M[o][d].ypc) + 1;
  const named = (txt, ids) => ids.filter((id) => txt && txt.includes(PLAYS[id].name)); const rows = [];
  for (const o of RUNS) { const L = LESSONS[o]; if (!L) continue; for (const d of named(L.beats, DEFENSE_IDS)) rows.push({ claim: `${o} beats ${d}`, ypc: M[o][d].ypc, rank: rank(o, d), holds: rank(o, d) >= 18 }); for (const d of named(L.loses, DEFENSE_IDS)) rows.push({ claim: `${o} loses to ${d}`, ypc: M[o][d].ypc, rank: rank(o, d), holds: rank(o, d) <= 9 }); }
  for (const d of DEFENSE_IDS) { const L = LESSONS[d]; if (!L) continue; for (const o of named(L.beats, RUNS)) rows.push({ claim: `${d} beats ${o}`, ypc: M[o][d].ypc, rank: rank(o, d), holds: rank(o, d) <= 9 }); for (const o of named(L.loses, RUNS)) rows.push({ claim: `${d} loses to ${o}`, ypc: M[o][d].ypc, rank: rank(o, d), holds: rank(o, d) >= 18 }); }
  out.claims = { holds: rows.filter((r) => r.holds).length, of: rows.length, rows };
  log(`== claims: ${out.claims.holds} of ${out.claims.of} hold`); for (const r of rows) log(`  ${r.holds ? 'holds' : 'NO   '} ${r.claim}: ${r.ypc} yd, rank ${r.rank}/26`);
}

if (want('blockers')) {
  out.blockers = {}; const per = Math.max(5, Math.round(N / 7));
  for (const off of RUNS) { const P = PLAYS[off]; const acc = {};
    for (const def of DEFENSE_IDS) for (let i = 0; i < per; i++) { const s = T.play({ off, def, attr: 'speed', value: 65, seed: 70000 + i }); const ho = s.events.find((e) => ['handoff', 'pitch'].includes(e.kind));
      for (const sl of P.onField) { const a = P.assignments[sl].a; if (!['run_block', 'pull', 'stalk', 'block'].includes(a)) continue; const q = (acc[`${sl}:${a}`] ||= { n: 0, engaged: 0, beforeHandoff: 0, vs: {} }); q.n++;
        const f = s.frames.find((x) => pos(x, 'off', sl)?.[3]); if (!f) continue; q.engaged++; if (!ho || f.t <= ho.t) q.beforeHandoff++; const me = pos(f, 'off', sl);
        const d = f.def.filter((p) => p[3]).sort((p, r) => Math.hypot(p[1] - me[1], p[2] - me[2]) - Math.hypot(r[1] - me[1], r[2] - me[2]))[0]; const k = (d?.[0] || '?').replace(/\d/, ''); q.vs[k] = (q.vs[k] || 0) + 1; } }
    out.blockers[off] = Object.fromEntries(Object.entries(acc).map(([k, q]) => [k, { engaged: pct(Array.from({ length: q.n }, (_, i) => i < q.engaged)), beforeHandoff: pct(Array.from({ length: q.n }, (_, i) => i < q.beforeHandoff)), vs: Object.fromEntries(Object.entries(q.vs).map(([v, c]) => [v, +(100 * c / q.n).toFixed(1)])) }]));
    log(`== blockers ${off}:`, Object.entries(out.blockers[off]).map(([k, v]) => `${k} ${v.engaged}% (${v.beforeHandoff}% before the handoff) vs ${JSON.stringify(v.vs)}`).join(' | '));
  }
}

if (want('games')) {
  const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js')); const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
  const acc = { pts: 0, drives: 0, plays: 0, runs: [], passes: [] }; const byPlay = {};
  for (let i = 1; i <= G; i++) {
    const home = generatedTeam(500 + OFF + i, { id: 'h', name: 'H' }), away = generatedTeam(700 + OFF + i, { id: 'a', name: 'A' }); let drive = null;
    const st = playGame({ home, away, seed: 900 + OFF + i, onStep: (ev, state) => { if (state.drive !== drive) { acc.drives++; drive = state.drive; } if (ev?.kind !== 'play' || !ev.sim) return; acc.plays++; const s = ev.sim;
      if (PLAYS[s.offensePlay]?.type === 'run') { acc.runs.push(s.yards); (byPlay[s.offensePlay] ||= []).push(s.yards); } else acc.passes.push(s.yards); } });
    acc.pts += st.score.home + st.score.away;
  }
  const tg = 2 * G; const runLine = (ys) => ({ n: ys.length, ypc: mean(ys), success: pct(ys.map((y) => y >= 4)), negative: pct(ys.map((y) => y < 0)), ten: pct(ys.map((y) => y >= 10)) });
  out.games = { games: G, offset: OFF, pointsPerTeamGame: r2(acc.pts / tg), drivesPerTeamGame: r2(acc.drives / tg), pointsPerDrive: r2(acc.pts / acc.drives), runShare: pct([...acc.runs.map(() => true), ...acc.passes.map(() => false)]), rushing: runLine(acc.runs), yardsPerPassPlay: mean(acc.passes), byPlay: Object.fromEntries(Object.entries(byPlay).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k, runLine(v)])) };
  log('== games:', JSON.stringify({ ...out.games, byPlay: undefined })); for (const [k, v] of Object.entries(out.games.byPlay)) log(`  ${k.padEnd(13)} ${JSON.stringify(v)}`);
}

if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
