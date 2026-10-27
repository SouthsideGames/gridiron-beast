#!/usr/bin/env node
// Defensive AI reassessment probes (v42.13.0 reassessment, Defensive AI Audit tab "Reassessment (v42.13.0)"). Developer tooling
// only: it runs the real engine through the Attribute Lab setup (src/lab/attr-trials.js: every monster a plain 65, no ability, no
// type, only the tested attribute changes) or full generated-team games, with fixed seeds, so the same command on two trees
// (--root) compares engines play for play. It changes nothing and stores nothing.
//
// Sections (--only=a,b; default all):
//   matrix     every base run play against every base defensive call: yards per carry, runs of 10+; each run call's rank
//              against the runs its playbook text says it beats
//   awareness  yards per carry against the Awareness of the defense's linebackers and defensive backs, 50..95, per matchup;
//              the largest jump between adjacent levels (a threshold shows up as one big jump)
//   pa         play-action passes against run calls and pass calls, real quarterback: completion, yards per attempt, sacks
//   games      full games (--games): rushing by call, by call kind and by play; league yards per carry and runs of 10+
//   keys       what a defender can see early in a play, by play kind: line, quarterback and back movement since the snap
//   man        man-coverage Awareness on breaking routes over three seed ranges
//   zone       underneath zone Coverage with the real quarterback, by concept (and whom he throws to)
//   catching   defensive Catching on contested forced throws
//   calls      Bracket Left and Robber against Cover 1 / Cover 3 on the routes they are meant to take away
//   jukes      Awareness of every defender against jukes
//   offtarget  what happens to off-target throws (the target 3+ yd from the ball), by the coverage players' Awareness
//   deep       the nearest deep zone defender's depth against a vertical receiver at the throw and at arrival
//   mirror     base runs against all calls, as drawn and mirrored left-right (a play-design outlier stays an outlier mirrored)
//   node tools/defense-reassess.mjs [--root=DIR] [--only=matrix,awareness] [--n=200] [--games=120] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const N = Number(args.n) || 200, G = Number(args.games) || 120; const only = args.only ? String(args.only).split(',') : null; const want = (k) => !only || only.includes(k);
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const { simulatePlay } = await import(path.join(ROOT, 'src/sim/engine.js'));
const { PLAYS, OFFENSE_IDS, DEFENSE_IDS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const r2 = (v) => (v == null || !Number.isFinite(v) ? null : +v.toFixed(2));
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const pct = (xs) => { const v = xs.filter((x) => x != null); return v.length ? +(100 * v.filter(Boolean).length / v.length).toFixed(1) : null; };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const seeds = (base, n = N) => Array.from({ length: n }, (_, i) => base + i);
const coverSlots = (def) => PLAYS[def].onField.filter((s) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[s]?.a));
const secondLevel = (def) => PLAYS[def].onField.filter((s) => /^(LB|FS|SS|CB)/.test(s));
const forced = (target, at) => ({ qb: { mode: 'human', at, action: 'throw', target } });
const runs = OFFENSE_IDS.filter((k) => PLAYS[k].type === 'run'); const calls = DEFENSE_IDS;
const isRunCall = (d) => PLAYS[d].tags.includes('run') || PLAYS[d].tags.includes('goalline');
const plain = (off, def, seed, extra = {}) => T.play({ off, def, attr: 'speed', value: 65, seed, ...extra });
function passLine(sims) {
  const thrown = sims.filter((s) => s.events.some((e) => e.kind === 'throw'));
  return { n: sims.length, comp: pct(thrown.map((s) => !!s.stats.receiver)), ypa: mean(thrown.map((s) => s.yards)), yards: mean(sims.map((s) => s.yards)), sep: mean(thrown.map((s) => s.stats.arriveSep)), int: pct(thrown.map((s) => !!s.stats.interceptor)), sack: pct(sims.map((s) => s.result === 'sack')) };
}
const out = { root: ROOT, n: N };
const log = (...a) => { if (!args.quiet) console.log(...a); };

// What each run call's playbook text says it beats (the runs it should stop), as base play ids.
const CLAIMS = { bear_front: ['inside_zone', 'dive', 'trap'], run_wall: ['inside_zone', 'power_right', 'power_left', 'dive'], goal_line: ['inside_zone', 'dive', 'power_right', 'power_left'], edge_contain: ['outside_zone', 'toss_sweep', 'stretch_left'] };

if (want('matrix')) {
  const per = Math.max(20, Math.round(N / 5)); const cell = {};
  for (const off of runs) for (const def of calls) { const sims = seeds(40000, per).map((s) => plain(off, def, s)); (cell[off] ||= {})[def] = { ypc: mean(sims.map((s) => s.yards)), ten: pct(sims.map((s) => s.yards >= 10)) }; }
  const byCall = Object.fromEntries(calls.map((d) => [d, { runCall: isRunCall(d), ypc: mean(runs.map((o) => cell[o][d].ypc)), ten: mean(runs.map((o) => cell[o][d].ten)) }]));
  const claims = {};
  for (const [d, list] of Object.entries(CLAIMS)) for (const o of list) {
    if (!cell[o] || !cell[o][d]) continue; const col = calls.map((c) => cell[o][c].ypc); const rank = [...col].sort((a, b) => a - b).indexOf(cell[o][d].ypc) + 1;
    (claims[d] ||= {})[o] = { ypc: cell[o][d].ypc, rank, of: calls.length, medianOtherCalls: median(calls.filter((c) => c !== d).map((c) => cell[o][c].ypc)) };
  }
  out.matrix = { playsPerCell: per, cell, byCall, claims };
  log('== matrix: yards per carry by call (plain 65s,', per, 'plays per run play)'); for (const [d, v] of Object.entries(byCall).sort((a, b) => a[1].ypc - b[1].ypc)) log(`  ${d.padEnd(15)} ${String(v.ypc).padStart(5)} yd  10+ ${v.ten}%${v.runCall ? '  (run call)' : ''}`);
  log('  claims:'); for (const [d, v] of Object.entries(claims)) for (const [o, c] of Object.entries(v)) log(`    ${d} vs ${o}: ${c.ypc} yd, rank ${c.rank}/${c.of} (median of the other calls ${c.medianOtherCalls})`);
}

if (want('awareness')) {
  const levels = [50, 55, 58, 60, 65, 70, 75, 80, 85, 90, 95]; const res = {};
  const matchups = []; for (const off of ['inside_zone', 'outside_zone', 'power_right', 'power_left', 'counter', 'toss_sweep', 'dive', 'trap', 'duo', 'iso', 'split_zone']) for (const def of ['cover_3', 'cover_1', 'cover_2_zone', 'run_wall', 'tampa_2', 'bear_front']) if (PLAYS[off] && PLAYS[def]) matchups.push([off, def]);
  const per = Math.max(60, Math.round(N * 0.75));
  for (const [off, def] of matchups) {
    const curve = levels.map((v) => mean(seeds(30000, per).map((s) => T.play({ off, def, defSubjects: secondLevel(def), attr: 'awareness', value: v, seed: s }).yards)));
    const steps = curve.slice(1).map((y, i) => r2(curve[i] - y)); const total = r2(curve[0] - curve.at(-1));
    res[`${off} vs ${def}`] = { levels, ypc: curve, total, largestStep: Math.max(...steps.map(Math.abs)), largestUp: Math.max(0, ...steps.map((s) => -s)) };
  }
  const rows = Object.values(res); const thresholdy = rows.filter((r) => r.largestStep > Math.max(0.8, 0.35 * Math.abs(r.total)));
  out.awareness = { playsPerLevel: per, matchups: res, summary: { matchups: rows.length, meanTotal: mean(rows.map((r) => r.total)), withAThreshold: thresholdy.length, largestStep: Math.max(...rows.map((r) => r.largestStep)) } };
  log('== awareness:', JSON.stringify(out.awareness.summary)); for (const [k, r] of Object.entries(res).filter(([, r]) => r.largestStep > Math.max(0.8, 0.35 * Math.abs(r.total)))) log(`  threshold: ${k}  ${r.ypc.join(' ')}  (largest step ${r.largestStep})`);
}

if (want('pa')) {
  const paPlays = OFFENSE_IDS.filter((k) => ['play_action', 'boot'].includes(PLAYS[k].assignments.QB?.a)); const res = {};
  for (const off of paPlays) for (const def of calls) res[`${off} vs ${def}`] = { runCall: isRunCall(def), ...passLine(seeds(41000, Math.max(30, Math.round(N / 4))).map((s) => plain(off, def, s))) };
  const agg = (rc) => { const v = Object.values(res).filter((r) => r.runCall === rc); return { cells: v.length, comp: mean(v.map((r) => r.comp)), ypa: mean(v.map((r) => r.ypa)), sack: mean(v.map((r) => r.sack)) }; };
  out.pa = { plays: paPlays, cells: res, vsRunCalls: agg(true), vsPassCalls: agg(false) };
  log('== play-action:', paPlays.join(', '), '\n  vs run calls ', JSON.stringify(out.pa.vsRunCalls), '\n  vs other calls', JSON.stringify(out.pa.vsPassCalls));
}

if (want('games')) {
  const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js')); const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
  const by = {}; const add = (k, s) => { const b = (by[k] ||= { n: 0, y: 0, ten: 0 }); b.n++; b.y += s.yards; if (s.yards >= 10) b.ten++; };
  for (let i = 1; i <= G; i++) {
    const home = generatedTeam(500 + i, { id: 'h', name: 'H' }), away = generatedTeam(700 + i, { id: 'a', name: 'A' });
    playGame({ home, away, seed: 900 + i, onStep: (ev) => { const s = ev?.sim; if (ev?.kind !== 'play' || !s || PLAYS[s.offensePlay]?.type !== 'run') return; const d = s.defensePlay, tags = PLAYS[d]?.tags || [];
      add('all', s); add(`kind:${isRunCall(d) ? 'run/goal-line calls' : tags.includes('blitz') ? 'blitz calls' : tags.includes('man') ? 'man calls' : 'zone calls'}`, s); add(`call:${d}`, s); add(`play:${s.offensePlay}`, s); } });
  }
  const fmt = (b) => ({ carries: b.n, ypc: r2(b.y / b.n), tenPlus: +(100 * b.ten / b.n).toFixed(1) });
  out.games = { games: G, rushing: Object.fromEntries(Object.entries(by).sort((a, b) => b[1].n - a[1].n).map(([k, b]) => [k, fmt(b)])) };
  log('== games:', G, 'designed runs', JSON.stringify(out.games.rushing.all)); for (const [k, v] of Object.entries(out.games.rushing)) if (k.startsWith('kind:') || (k.startsWith('call:') && v.carries >= 40)) log(`  ${k.padEnd(28)} ${JSON.stringify(v)}`);
}

if (want('keys')) {
  const OL = ['LT', 'LG', 'C', 'RG', 'RT']; const kindOf = (p) => p.type === 'run' ? (['keep', 'option'].includes(p.assignments.QB?.a) ? 'run (QB keep or option)' : p.tags.includes('misdirection') ? 'run (misdirection)' : 'run') : ['play_action', 'boot'].includes(p.assignments.QB?.a) ? 'play-action' : p.tags.includes('screen') ? 'screen' : 'pass';
  const acc = {};
  for (const off of OFFENSE_IDS) for (const s of seeds(50000, 6)) {
    const sim = plain(off, 'cover_3', s); const f0 = sim.frames[0]; const a = (acc[kindOf(PLAYS[off])] ||= {});
    for (const t of [0.15, 0.3, 0.5]) { const f = sim.frames.find((x) => x.t >= t - 1e-6); if (!f) continue; const dx = (slot) => { const p0 = f0.off.find((q) => q[0] === slot), p1 = f.off.find((q) => q[0] === slot); return p0 && p1 ? p1[1] - p0[1] : null; };
      const ol = OL.map(dx).filter((v) => v != null); const k = (a[t] ||= { ol: [], fwd: [], qb: [], rb: [] }); k.ol.push(ol.reduce((x, y) => x + y, 0) / ol.length); k.fwd.push(ol.filter((v) => v > 0.15).length / ol.length); k.qb.push(dx('QB') ?? 0); k.rb.push(dx('RB') ?? 0); }
  }
  out.keys = Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, Object.fromEntries(Object.entries(a).map(([t, v]) => [t, { lineDx: mean(v.ol), lineForwardShare: mean(v.fwd), qbDx: mean(v.qb), rbDx: mean(v.rb) }]))]));
  log('== keys (yards moved since the snap; + is downfield):'); for (const [k, a] of Object.entries(out.keys)) log(`  ${k.padEnd(24)}`, Object.entries(a).map(([t, v]) => `t=${t}: line ${v.lineDx} (${Math.round(100 * v.lineForwardShare)}% forward) QB ${v.qbDx} back ${v.rbDx}`).join(' | '));
}

if (want('man')) {
  out.man = {};
  for (const [label, off, target, at] of [['comeback WR1', 'curl_flat', 'WR1', 1.9], ['curl WR2', 'curl_flat', 'WR2', 1.8], ['dig WR1', 'dagger', 'WR1', 2.0], ['slant WR1', 'quick_slants', 'WR1', 1.0], ['go WR1', 'three_verticals', 'WR1', 2.4]].filter((x) => PLAYS[x[1]]))
    for (const base of [9300, 19300, 29300]) { const r = {}; for (const v of [50, 95]) r[v] = passLine(seeds(base).map((s) => T.play({ off, def: 'cover_1', defSubjects: coverSlots('cover_1'), attr: 'awareness', value: v, seed: s, options: forced(target, at) }))); (out.man[label] ||= {})[base] = r; }
  log('== man Awareness (Cover 1, completion 50 -> 95 by seed range):'); for (const [k, v] of Object.entries(out.man)) log(`  ${k.padEnd(13)}`, Object.values(v).map((r) => `${r[50].comp}% -> ${r[95].comp}% (${r[50].yards} -> ${r[95].yards} yd)`).join(' | '));
}

if (want('zone')) {
  out.zone = {};
  for (const [off, def] of [['curl_flat', 'cover_3'], ['flood', 'cover_3'], ['spacing', 'cover_3'], ['stick', 'cover_3'], ['mesh', 'cover_2_zone'], ['smash', 'cover_2_zone'], ['levels', 'tampa_2']].filter(([o, d]) => PLAYS[o] && PLAYS[d])) {
    const r = {}; for (const v of [50, 95]) { const sims = seeds(9500).map((s) => T.play({ off, def, defSubjects: coverSlots(def), attr: 'coverage', value: v, seed: s })); const tg = {}; for (const s of sims) if (s.stats.target) tg[s.stats.target] = (tg[s.stats.target] || 0) + 1; r[v] = { ...passLine(sims), targets: tg }; }
    out.zone[`${off} vs ${def}`] = r;
  }
  log('== underneath zone Coverage, real QB (completion 50 -> 95):'); for (const [k, r] of Object.entries(out.zone)) log(`  ${k.padEnd(24)} ${r[50].comp}% -> ${r[95].comp}%  targets ${JSON.stringify(r[50].targets)}`);
}

if (want('catching')) {
  out.catching = {};
  for (const [label, off, def, target, at] of [['go vs press man', 'three_verticals', 'man_press', 'WR1', 2.4], ['go vs cover 1', 'three_verticals', 'cover_1', 'WR1', 2.4], ['curl vs cover 1', 'curl_flat', 'cover_1', 'WR2', 1.8], ['slant vs cover 3', 'quick_slants', 'cover_3', 'WR1', 1.0]].filter((x) => PLAYS[x[1]] && PLAYS[x[2]])) {
    const r = {}; for (const v of [50, 95]) r[v] = passLine(seeds(9700, N * 4).map((s) => T.play({ off, def, defSubjects: coverSlots(def), attr: 'catching', value: v, seed: s, options: forced(target, at) }))); out.catching[label] = r;
  }
  log('== defensive Catching (interceptions 50 -> 95):'); for (const [k, r] of Object.entries(out.catching)) log(`  ${k.padEnd(18)} ${r[50].int}% -> ${r[95].int}%`);
}

if (want('calls')) {
  out.calls = {};
  for (const [label, off, def, opts] of [['go to WR1, forced 2.4 s', 'three_verticals', 'cover_1', forced('WR1', 2.4)], ['go to WR1, forced 2.4 s', 'three_verticals', 'bracket_left', forced('WR1', 2.4)], ['three verticals, real QB', 'three_verticals', 'cover_1', {}], ['three verticals, real QB', 'three_verticals', 'bracket_left', {}], ['slant WR1, forced 1.0 s', 'quick_slants', 'cover_1', forced('WR1', 1.0)], ['slant WR1, forced 1.0 s', 'quick_slants', 'robber', forced('WR1', 1.0)], ['levels, real QB', 'levels', 'cover_1', {}], ['levels, real QB', 'levels', 'robber', {}], ['levels, real QB', 'levels', 'cover_3', {}]].filter((x) => PLAYS[x[1]] && PLAYS[x[2]])) {
    const sims = seeds(9900, N * 2).map((s) => plain(off, def, s, { options: opts })); out.calls[`${label} · ${def}`] = { ...passLine(sims), wr1Share: pct(sims.filter((s) => s.stats.target).map((s) => s.stats.target === 'WR1')) };
  }
  log('== calls:'); for (const [k, v] of Object.entries(out.calls)) log(`  ${k.padEnd(44)} comp ${v.comp}% yards ${v.yards} WR1 share ${v.wr1Share}%`);
}

if (want('jukes')) {
  out.jukes = {};
  for (const [off, def] of [['outside_zone', 'cover_3'], ['inside_zone', 'cover_3'], ['toss_sweep', 'cover_1']].filter(([o, d]) => PLAYS[o] && PLAYS[d])) {
    const r = {}; for (const v of [50, 95]) { const sims = seeds(10100).map((s) => T.play({ off, def, defSubjects: [...PLAYS[def].onField], attr: 'awareness', value: v, seed: s })); r[v] = { yards: mean(sims.map((s) => s.yards)), jukesPerPlay: r2(sims.reduce((a, s) => a + s.events.filter((e) => e.kind === 'juke').length, 0) / sims.length) }; }
    out.jukes[`${off} vs ${def}`] = r;
  }
  log('== jukes (every defender rated):', JSON.stringify(out.jukes));
}

if (want('offtarget')) {
  out.offtarget = {};
  for (const v of [50, 95]) {
    const r = { thrown: 0, offTarget: 0, caught: 0, intercepted: 0, incomplete: 0, defenderCloser: 0 };
    for (const [off, def, target, at] of [['deep_post', 'cover_3', 'WR1', 2.2], ['three_verticals', 'cover_1', 'WR1', 2.4], ['dagger', 'cover_4', 'WR1', 2.0], ['curl_flat', 'cover_3', 'WR2', 1.8], ['four_verticals', 'cover_3', 'WR1', 2.3]].filter((x) => PLAYS[x[0]] && PLAYS[x[1]]))
      for (const s of seeds(10300)) {
        const sim = T.play({ off, def, defSubjects: coverSlots(def), attr: 'awareness', value: v, seed: s, options: forced(target, at) }); const th = sim.events.find((e) => e.kind === 'throw'); if (!th) continue; r.thrown++;
        const arr = sim.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > th.t); if (!arr) continue;
        const fa = sim.frames.find((f) => f.t >= arr.t - 1e-6) || sim.frames.at(-1); const rp = fa.off.find((p) => p[0] === target); const b = fa.ball; const dR = Math.hypot(rp[1] - b[0], rp[2] - b[1]);
        if (dR < 3) continue; r.offTarget++; if (Math.min(...fa.def.map((d) => Math.hypot(d[1] - b[0], d[2] - b[1]))) < dR) r.defenderCloser++;
        if (arr.kind === 'catch' && sim.stats.receiver) r.caught++; else if (arr.kind === 'interception' || sim.stats.interceptor) r.intercepted++; else r.incomplete++;
      }
    out.offtarget[v] = r;
  }
  log('== off-target throws:', JSON.stringify(out.offtarget));
}

if (want('deep')) {
  out.deep = {};
  for (const [off, def, at] of [['three_verticals', 'cover_3', 2.4], ['three_verticals', 'cover_4', 2.4], ['three_verticals', 'cover_2_zone', 2.4], ['three_verticals', 'bracket_left', 2.4], ['four_verticals', 'cover_3', 2.4], ['deep_post', 'cover_3', 2.2]].filter((x) => PLAYS[x[0]] && PLAYS[x[1]])) {
    const deep = PLAYS[def].onField.filter((s) => PLAYS[def].assignments[s]?.a === 'zone' && PLAYS[def].assignments[s].role === 'deep'); const atThrow = [], atArr = [], over = [], sims = [];
    for (const s of seeds(9900, Math.max(100, N))) {
      const sim = plain(off, def, s, { options: forced('WR1', at) }); const th = sim.events.find((e) => e.kind === 'throw'); if (!th) continue; const arr = sim.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > th.t); if (!arr) continue; sims.push(sim);
      const f0 = sim.frames.find((f) => f.t >= th.t - 1e-6), f1 = sim.frames.find((f) => f.t >= arr.t - 1e-6); const w0 = f0.off.find((p) => p[0] === 'WR1'), w1 = f1.off.find((p) => p[0] === 'WR1');
      const d0 = deep.map((sl) => f0.def.find((p) => p[0] === sl)).sort((a, b) => Math.hypot(a[1] - w0[1], a[2] - w0[2]) - Math.hypot(b[1] - w0[1], b[2] - w0[2]))[0]; const d1 = f1.def.find((p) => p[0] === d0[0]);
      atThrow.push(d0[1] - w0[1]); atArr.push(d1[1] - w1[1]); over.push(d1[1] - w1[1] > 0);
    }
    out.deep[`${off} vs ${def}`] = { depthOverReceiverAtThrow: mean(atThrow), atArrival: mean(atArr), overTheTopPct: pct(over), ...passLine(sims) };
  }
  log('== deep cushion:'); for (const [k, v] of Object.entries(out.deep)) log(`  ${k.padEnd(32)} at throw ${v.depthOverReceiverAtThrow} yd, over the top ${v.overTheTopPct}%, comp ${v.comp}%`);
}

if (want('mirror')) {
  const flip = (o) => Array.isArray(o) ? (o.length === 2 && o.every((x) => typeof x === 'number') ? [o[0], -o[1]] : o.map(flip)) : (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, flip(v)])) : o);
  out.mirror = {};
  for (const base of ['stretch_left', 'pin_pull', 'power_left', 'power_right', 'outside_zone', 'counter'].filter((k) => PLAYS[k])) {
    const m = JSON.parse(JSON.stringify(PLAYS[base])); m.align = flip(m.align); m.assignments = flip(m.assignments); m.id = `${base}_mirrored`; const res = {};
    for (const op of [PLAYS[base], m]) { const ys = calls.map((def) => mean(seeds(40000, 30).map((s) => simulatePlay({ offensePlay: op, defensePlay: PLAYS[def], offense: T.side(base), defense: T.side(def), ballOn: 30, ballLat: 0, seed: s, options: { frameEvery: 1 } }).yards))); res[op === m ? 'mirrored' : 'asDrawn'] = { median: median(ys), mean: mean(ys) }; }
    out.mirror[base] = res;
  }
  log('== mirror (yards per carry against all calls):'); for (const [k, v] of Object.entries(out.mirror)) log(`  ${k.padEnd(13)} as drawn median ${v.asDrawn.median} / mirrored ${v.mirrored.median}`);
}

if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
